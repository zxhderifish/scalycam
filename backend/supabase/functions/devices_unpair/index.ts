import { handleCors, requireUserId, getAdminClient, jsonResponse } from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { userId } = await requireUserId(req);
    const { device_id } = await req.json();

    const adminClient = getAdminClient();
    const { error } = await adminClient.from("devices").delete().eq("id", device_id).eq("user_id", userId);

    if (error) return jsonResponse({ error: "Failed to unpair" }, 500);

    return jsonResponse({ success: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
