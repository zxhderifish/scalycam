import { handleCors, requireUserId, getAdminClient, jsonResponse } from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { userId } = await requireUserId(req);
    const { expo_token, platform } = await req.json();

    if (!expo_token || !platform) {
      return jsonResponse({ error: "expo_token and platform required" }, 400);
    }

    const adminClient = getAdminClient();
    const { error } = await adminClient.from("push_tokens").upsert({
      user_id: userId,
      expo_token,
      platform,
      updated_at: new Date().toISOString(),
    }, { onConflict: "expo_token" });

    if (error) {
      return jsonResponse({ error: "Failed to register token" }, 500);
    }

    return jsonResponse({ success: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
