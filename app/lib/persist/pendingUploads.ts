import { mmkvGet, mmkvSet, mmkvDelete, mmkvKeys } from "./mmkv";

export type PendingStatus = "staged" | "uploaded" | "persisted" | "acked";

export interface PendingUpload {
  client_event_id: string;
  blob: number[];           // Uint8Array serialized as array for JSON storage
  weight_g: number;
  captured_at: string;
  seq: number;
  status: PendingStatus;
  image_path?: string;
}

const PREFIX = "pending:";

export function setPendingUpload(upload: PendingUpload): void {
  mmkvSet(`${PREFIX}${upload.client_event_id}`, upload);
}

export function getPendingUpload(clientEventId: string): PendingUpload | null {
  return mmkvGet<PendingUpload>(`${PREFIX}${clientEventId}`);
}

export function deletePendingUpload(clientEventId: string): void {
  mmkvDelete(`${PREFIX}${clientEventId}`);
}

export function listPendingUploads(): PendingUpload[] {
  return mmkvKeys()
    .filter((k) => k.startsWith(PREFIX))
    .map((k) => mmkvGet<PendingUpload>(k))
    .filter((v): v is PendingUpload => v !== null);
}

export function blobToUint8Array(blob: number[]): Uint8Array {
  return new Uint8Array(blob);
}

export function uint8ArrayToBlob(arr: Uint8Array): number[] {
  return Array.from(arr);
}
