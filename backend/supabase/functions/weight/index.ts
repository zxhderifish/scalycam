import { handleCors, requireUserId, getAdminClient, jsonResponse } from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { userId } = await requireUserId(req);
    const { weight_kg, logged_at } = await req.json();

    if (!weight_kg) return jsonResponse({ error: "weight_kg required" }, 400);

    const adminClient = getAdminClient();
    const loggedAtTs = logged_at ?? new Date().toISOString();

    // Insert weight log and update user_settings snapshot in one transaction via RPC, or two calls
    const [logResult] = await Promise.all([
      adminClient.from("weight_logs").insert({ user_id: userId, weight_kg, logged_at: loggedAtTs, source: "manual" }).select().single(),
      adminClient.from("user_settings").upsert({ user_id: userId, weight_kg, updated_at: new Date().toISOString() }, { onConflict: "user_id" }),
    ]);

    return jsonResponse(logResult.data);
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
