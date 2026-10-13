import { createMMKV } from "react-native-mmkv";

export const storage = createMMKV({ id: "scalycam-main" });

export function mmkvGet<T>(key: string): T | null {
  const raw = storage.getString(key);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export function mmkvSet<T>(key: string, value: T): void {
  storage.set(key, JSON.stringify(value));
}

export function mmkvDelete(key: string): void {
  storage.remove(key);
}

export function mmkvKeys(): string[] {
  return storage.getAllKeys();
}
