import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

/**
 * Creates a TanStack Query persister backed by MMKV.
 * Returns null on web / when MMKV is unavailable so the app still works.
 */
function buildPersister() {
  try {
    // Lazy-require so web doesn't crash (MMKV is native-only)
    const { storage } = require("@/lib/persist/mmkv") as typeof import("./mmkv");
    const mmkvStorage = {
      getItem: (key: string): string | null => storage.getString(key) ?? null,
      setItem: (key: string, value: string): void => storage.set(key, value),
      removeItem: (key: string): void => { storage.remove(key); },
    };
    return createSyncStoragePersister({
      storage: mmkvStorage,
      key: "SCALYCAM_QUERY_CACHE_v1",
      throttleTime: 1_000, // write at most once per second
    });
  } catch {
    return null;
  }
}

export const queryPersister = buildPersister();
