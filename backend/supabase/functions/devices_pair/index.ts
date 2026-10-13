import { handleCors, requireUserId, getAdminClient, jsonResponse } from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { userId } = await requireUserId(req);
    const { chip_id, ble_address, firmware_version, device_name } = await req.json();

    if (!chip_id || !ble_address) {
      return jsonResponse({ error: "chip_id and ble_address required" }, 400)
    }

    const adminClient = getAdminClient();
    const { data, error } = await adminClient
      .from("devices")
      .upsert({
        user_id: userId,
        chip_id,
        ble_address,
        device_name: device_name ?? null,
        firmware_version: firmware_version ?? null,
        paired_at: new Date().toISOString(),
      }, { onConflict: "user_id,chip_id" })
      .select()
      .single();

    if (error) {
      return jsonResponse({ error: "Failed to pair device" }, 500)
    }

    return jsonResponse(data)
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonResponse({ error: "Internal server error" }, 500)
  }
});
