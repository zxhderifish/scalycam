import { supabase } from "./supabase";

const FUNCTIONS_URL = process.env.EXPO_PUBLIC_SUPABASE_URL + "/functions/v1";

async function callFunction<T>(name: string, body?: unknown, method = "POST"): Promise<T> {
  const session = (await supabase.auth.getSession()).data.session;
  const token = session?.access_token ?? "";
  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const error = Object.assign(new Error(err.error ?? "Request failed"), { status: res.status, retryAfter: res.headers.get("Retry-After") });
    throw error;
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Upload flow
  uploadSignedUrl: (clientEventId: string) =>
    callFunction<{ upload_url: string; image_path: string; expires_at: string }>(
      "upload_signed_url", { client_event_id: clientEventId }
    ),

  uploadMeal: (body: { client_event_id: string; captured_at: string; weight_g: number; image_path: string; device_id?: string }) =>
    callFunction<{ meal_id: string; status: string }>("upload_meal", body),

  // Meal operations
  reidentifyMeal: (mealId: string, hintText?: string) =>
    callFunction<{ food_entries: unknown[] }>("reidentify_meal", { meal_id: mealId, hint_text: hintText }),

  updateFoodEntry: (entryId: string, updates: { food_name?: string; weight_g?: number }) =>
    callFunction<Record<string, unknown>>("update_food_entry", { entry_id: entryId, ...updates }),

  createFoodEntry: (mealId: string, foodName: string, weightG: number) =>
    callFunction<Record<string, unknown>>("create_food_entry", { meal_id: mealId, food_name: foodName, weight_g: weightG }),

  swapAlternative: (entryId: string, alternativeIndex: number) =>
    callFunction<Record<string, unknown>>("food_entries_swap_alternative", { entry_id: entryId, alternative_index: alternativeIndex }),

  // Dashboard
  todaySummary: () => callFunction<unknown>("today_summary", undefined, "GET"),
  history: (days = 30) => callFunction<unknown>(`history?days=${days}`, undefined, "GET"),

  // Weight
  logWeight: (weightKg: number, loggedAt?: string) =>
    callFunction<unknown>("weight", { weight_kg: weightKg, logged_at: loggedAt }),

  // Devices
  pairDevice: (chipId: string, bleAddress: string, firmwareVersion?: string) =>
    callFunction<unknown>("devices_pair", { chip_id: chipId, ble_address: bleAddress, firmware_version: firmwareVersion }),

  unpairDevice: (deviceId: string) =>
    callFunction<unknown>("devices_unpair", { device_id: deviceId }),

  // Push
  registerPushToken: (expoToken: string, platform: "ios" | "android") =>
    callFunction<unknown>("push_register", { expo_token: expoToken, platform }),
};

// Upload JPEG bytes to a signed URL
export async function uploadToStorage(signedUrl: string, jpegBytes: Uint8Array): Promise<void> {
  const res = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg" },
    body: jpegBytes as BodyInit,
  });
  if (!res.ok) throw new Error(`Storage upload failed: ${res.status}`);
}
