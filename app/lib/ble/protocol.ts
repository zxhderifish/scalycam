// BLE service and characteristic UUIDs — must match hardware spec §6
export const SCALY_SERVICE_UUID = "5ca1ec0c-0000-1000-8000-00805f9b34fb";

export const CHAR_DEVICE_INFO   = "5ca1ec0c-0000-1000-8000-00805f9b34fb0000"; // Read, Encrypted
export const CHAR_CURRENT_WEIGHT = "5ca1ec0c-0000-1000-8000-00805f9b34fb0001"; // Read, Notify
export const CHAR_STATUS         = "5ca1ec0c-0000-1000-8000-00805f9b34fb0002"; // Read, Notify
export const CHAR_MEAL_EVENT_HEADER = "5ca1ec0c-0000-1000-8000-00805f9b34fb0003"; // Notify, Encrypted
export const CHAR_MEAL_EVENT_CHUNK  = "5ca1ec0c-0000-1000-8000-00805f9b34fb0004"; // Notify, Encrypted
export const CHAR_MEAL_EVENT_ACK    = "5ca1ec0c-0000-1000-8000-00805f9b34fb0005"; // Write, Encrypted
export const CHAR_CONTROL           = "5ca1ec0c-0000-1000-8000-00805f9b34fb0006"; // Write, Encrypted

// Status byte values (hardware spec §6.3)
export const STATUS = {
  IDLE: 0x00,
  WEIGHING_UNSTABLE: 0x01,
  STABLE_NOT_TRIGGERED: 0x02,
  CAPTURING: 0x03,
  SENDING_CHUNKS: 0x04,
  AWAITING_ACK: 0x05,
  QUEUE_PENDING: 0xF0,
  CAMERA_FAIL: 0xF1,
  UNCONFIGURED: 0xFF,
} as const;

// Control commands (hardware spec §6.4)
export const CONTROL = {
  TARE: 0x01,
  ENTER_CALIBRATION: 0x02,
  SUBMIT_WEIGHT: 0x03,
  FACTORY_RESET: 0x10,
} as const;

// Namespace UUID for deterministic client_event_id generation
// uuidv5(SCALY_NAMESPACE, `${chip_id}:${seq}`) → client_event_id
export const SCALY_NAMESPACE = "5ca1ec0c-cafe-5000-b000-000000000000";

// MealEvent header layout: seq(u16) + total_chunks(u16) + weight_g(f32) + seconds_since_capture(u32) = 14 bytes
export interface MealEventHeader {
  seq: number;
  total_chunks: number;
  weight_g: number;
  seconds_since_capture: number;
}

// MealEvent chunk layout: seq(u16) + chunk_idx(u16) + data(bytes)
export interface MealEventChunk {
  seq: number;
  chunk_idx: number;
  data: Uint8Array;
}

export function parseMealEventHeader(bytes: Uint8Array): MealEventHeader {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    seq: view.getUint16(0, true),
    total_chunks: view.getUint16(2, true),
    weight_g: view.getFloat32(4, true),
    seconds_since_capture: view.getUint32(10, true),
  };
}

export function parseMealEventChunk(bytes: Uint8Array): MealEventChunk {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    seq: view.getUint16(0, true),
    chunk_idx: view.getUint16(2, true),
    data: bytes.slice(4),
  };
}

export function encodeAck(seq: number): Uint8Array {
  const buf = new Uint8Array(2);
  new DataView(buf.buffer).setUint16(0, seq, true);
  return buf;
}

export function decodeDeviceInfo(bytes: Uint8Array): { chip_id: string; firmware_version: string } {
  const chipIdBytes = bytes.slice(0, 12);
  const firmwareBytes = bytes.slice(12, 28);
  const chip_id = String.fromCharCode(...chipIdBytes);
  // Trim null bytes from firmware version
  let fw = String.fromCharCode(...firmwareBytes);
  fw = fw.replace(/\0+$/, "");
  return { chip_id, firmware_version: fw };
}

export function assembleJpegInOrder(chunks: Map<number, Uint8Array>): Uint8Array {
  // MUST iterate in ascending chunk_idx order
  const sortedKeys = Array.from(chunks.keys()).sort((a, b) => a - b);
  const parts = sortedKeys.map((k) => chunks.get(k)!);
  const totalLength = parts.reduce((s, p) => s + p.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}
