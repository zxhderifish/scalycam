import { useState, useEffect, useRef, useCallback } from "react";
import { Device, Subscription } from "react-native-ble-plx";
import { v5 as uuidv5 } from "uuid";
import pLimit from "p-limit";
import { bleManager } from "./manager";
import {
  CHAR_CURRENT_WEIGHT, CHAR_STATUS, CHAR_MEAL_EVENT_HEADER,
  CHAR_MEAL_EVENT_CHUNK, CHAR_MEAL_EVENT_ACK, SCALY_SERVICE_UUID,
  SCALY_NAMESPACE, STATUS,
  parseMealEventHeader, parseMealEventChunk, assembleJpegInOrder, encodeAck,
  MealEventHeader,
} from "./protocol";
import { setPendingUpload, getPendingUpload, deletePendingUpload, listPendingUploads, uint8ArrayToBlob, blobToUint8Array } from "../persist/pendingUploads";
import { api, uploadToStorage } from "../api";
import { useDeviceStore } from "../store/device";

export type BleStatus = "disconnected" | "scanning" | "connecting" | "connected";

interface PartialMeal {
  total_chunks: number;
  weight_g: number;
  seconds_since_capture: number;
  chunks: Map<number, Uint8Array>;
  timer: ReturnType<typeof setTimeout>;
}

const REASSEMBLY_TIMEOUT_MS = 15_000;
const ORPHAN_CHUNK_BUFFER_MS = 500;
const UPLOAD_CONCURRENCY = 2;

export function useScale() {
  const [status, setStatus] = useState<BleStatus>("disconnected");
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<number>(STATUS.IDLE);
  const deviceRef = useRef<Device | null>(null);
  const chipIdRef = useRef<string | null>(null);
  const subsRef = useRef<Subscription[]>([]);
  const reassemblyRef = useRef<Map<number, PartialMeal>>(new Map());
  const orphanChunksRef = useRef<Map<number, Array<{ chunk_idx: number; data: Uint8Array }>>>(new Map());
  const { chipId } = useDeviceStore();
  const limit = useRef(pLimit(UPLOAD_CONCURRENCY));

  chipIdRef.current = chipId;

  const writeAck = useCallback(async (seq: number): Promise<void> => {
    if (!deviceRef.current) return;
    const ackBytes = encodeAck(seq);
    const base64 = btoa(String.fromCharCode(...Array.from(ackBytes)));
    await deviceRef.current.writeCharacteristicWithResponseForService(
      SCALY_SERVICE_UUID, CHAR_MEAL_EVENT_ACK, base64
    );
  }, []);

  async function drainPending(clientEventId: string): Promise<void> {
    const pending = getPendingUpload(clientEventId);
    if (!pending) return;
    try {
      if (pending.status === "staged") {
        const { upload_url, image_path } = await api.uploadSignedUrl(clientEventId);
        const jpegBytes = blobToUint8Array(pending.blob);
        await uploadToStorage(upload_url, jpegBytes);
        pending.image_path = image_path;
        pending.status = "uploaded";
        setPendingUpload(pending);
      }
      if (pending.status === "uploaded") {
        const { deviceId } = useDeviceStore.getState();
        await api.uploadMeal({
          client_event_id: clientEventId,
          captured_at: pending.captured_at,
          weight_g: pending.weight_g,
          image_path: pending.image_path!,
          device_id: deviceId ?? undefined,
        });
        pending.status = "persisted";
        setPendingUpload(pending);
      }
      if (pending.status === "persisted") {
        await writeAck(pending.seq);
        deletePendingUpload(clientEventId);
      }
    } catch (err: unknown) {
      const apiErr = err as { status?: number; retryAfter?: string | null };
      if (apiErr.status === 429) {
        const retryAfter = parseInt(apiErr.retryAfter ?? "5", 10);
        setTimeout(() => drainPending(clientEventId), retryAfter * 1000);
      }
      // Other errors: leave in current state, retry on next launch/reconnect
    }
  }

  function maybeComplete(seq: number): void {
    const partial = reassemblyRef.current.get(seq);
    if (!partial) return;
    if (partial.chunks.size !== partial.total_chunks) return;
    clearTimeout(partial.timer);
    reassemblyRef.current.delete(seq);
    void handleCompleteMeal(seq, partial);
  }

  async function handleCompleteMeal(seq: number, partial: PartialMeal): Promise<void> {
    const cid = chipIdRef.current ?? "unknown";
    const capturedAt = new Date(Date.now() - partial.seconds_since_capture * 1000).toISOString();
    const clientEventId = uuidv5(`${cid}:${seq}`, SCALY_NAMESPACE);
    const jpegBytes = assembleJpegInOrder(partial.chunks);

    const pendingUpload = {
      client_event_id: clientEventId,
      blob: uint8ArrayToBlob(jpegBytes),
      weight_g: partial.weight_g,
      captured_at: capturedAt,
      seq,
      status: "staged" as const,
    };
    setPendingUpload(pendingUpload);
    await limit.current(() => drainPending(clientEventId));
  }

  function attachCharacteristicListeners(device: Device): void {
    // Current weight (not encrypted — readable pre-bond)
    const weightSub = device.monitorCharacteristicForService(
      SCALY_SERVICE_UUID, CHAR_CURRENT_WEIGHT, (err, char) => {
        if (err || !char?.value) return;
        const bytes = Uint8Array.from(atob(char.value), c => c.charCodeAt(0));
        const view = new DataView(bytes.buffer);
        setCurrentWeight(view.getFloat32(0, true));
      }
    );
    subsRef.current.push(weightSub);

    // Status byte
    const statusSub = device.monitorCharacteristicForService(
      SCALY_SERVICE_UUID, CHAR_STATUS, (err, char) => {
        if (err || !char?.value) return;
        const bytes = Uint8Array.from(atob(char.value), c => c.charCodeAt(0));
        setDeviceStatus(bytes[0]);
      }
    );
    subsRef.current.push(statusSub);

    // Meal event header
    const headerSub = device.monitorCharacteristicForService(
      SCALY_SERVICE_UUID, CHAR_MEAL_EVENT_HEADER, (err, char) => {
        if (err || !char?.value) return;
        const bytes = Uint8Array.from(atob(char.value), c => c.charCodeAt(0));
        const header = parseMealEventHeader(bytes);
        const { seq } = header;

        if (reassemblyRef.current.has(seq)) return; // duplicate

        const partial: PartialMeal = {
          total_chunks: header.total_chunks,
          weight_g: header.weight_g,
          seconds_since_capture: header.seconds_since_capture,
          chunks: new Map(),
          timer: setTimeout(() => reassemblyRef.current.delete(seq), REASSEMBLY_TIMEOUT_MS),
        };

        // Drain orphan chunks buffered before this header
        const orphans = orphanChunksRef.current.get(seq) ?? [];
        orphanChunksRef.current.delete(seq);
        for (const c of orphans) partial.chunks.set(c.chunk_idx, c.data);

        reassemblyRef.current.set(seq, partial);
        maybeComplete(seq);
      }
    );
    subsRef.current.push(headerSub);

    // Meal event chunk
    const chunkSub = device.monitorCharacteristicForService(
      SCALY_SERVICE_UUID, CHAR_MEAL_EVENT_CHUNK, (err, char) => {
        if (err || !char?.value) return;
        const bytes = Uint8Array.from(atob(char.value), c => c.charCodeAt(0));
        const chunk = parseMealEventChunk(bytes);
        const partial = reassemblyRef.current.get(chunk.seq);
        if (!partial) {
          // Buffer orphan chunk for 500ms in case header arrives late
          const orphans = orphanChunksRef.current.get(chunk.seq) ?? [];
          orphans.push({ chunk_idx: chunk.chunk_idx, data: chunk.data });
          orphanChunksRef.current.set(chunk.seq, orphans);
          setTimeout(() => orphanChunksRef.current.delete(chunk.seq), ORPHAN_CHUNK_BUFFER_MS);
          return;
        }
        partial.chunks.set(chunk.chunk_idx, chunk.data);
        maybeComplete(chunk.seq);
      }
    );
    subsRef.current.push(chunkSub);
  }

  // Drain pending uploads on mount + ack persisted on reconnect
  useEffect(() => {
    const all = listPendingUploads();
    if (all.length === 0) return;
    for (const p of all) {
      limit.current(() => drainPending(p.client_event_id));
    }
  }, []);

  const connect = useCallback(async (device: Device): Promise<void> => {
    setStatus("connecting");
    try {
      deviceRef.current = device;
      attachCharacteristicListeners(device);
      setStatus("connected");

      // Ack any persisted-but-not-acked uploads
      const persisted = listPendingUploads().filter((p) => p.status === "persisted");
      for (const p of persisted) {
        try {
          await writeAck(p.seq);
          deletePendingUpload(p.client_event_id);
        } catch {
          // Retry on next reconnect
        }
      }

      device.onDisconnected(() => {
        setStatus("disconnected");
        subsRef.current.forEach((s) => s.remove());
        subsRef.current = [];
        deviceRef.current = null;
        setCurrentWeight(null);
      });
    } catch (err) {
      setStatus("disconnected");
      throw err;
    }
  }, [writeAck]);

  const queuedCount = deviceStatus === STATUS.QUEUE_PENDING ? listPendingUploads().length : 0;

  return {
    status,
    currentWeight,
    deviceStatus,
    queuedCount,
    connect,
    writeAck,
  };
}
