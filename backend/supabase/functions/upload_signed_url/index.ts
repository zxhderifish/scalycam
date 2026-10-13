import { handleCors, requireUserId, getAdminClient, jsonResponse } from "../_shared/auth.ts";
import { imagePathFromClientEventId } from "../_shared/storage.ts";

Deno.serve(async (req: Request) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { userId } = await requireUserId(req);
    const { client_event_id } = await req.json();

    if (!client_event_id) {
      return jsonResponse({ error: "client_event_id required" }, 400)
    }

    const adminClient = getAdminClient();
    const imagePath = imagePathFromClientEventId(userId, client_event_id);

    // Check rate limit
    const { checkRateLimit, rateLimitResponse } = await import("../_shared/rate_limit.ts");
    const rl = await checkRateLimit(adminClient, userId, "upload_signed_url");
    if (!rl.allowed) return rateLimitResponse("upload_signed_url");

    const { data, error } = await adminClient.storage
      .from("meals")
      .createSignedUploadUrl(imagePath);

    if (error || !data) {
      console.error("createSignedUploadUrl error", error);
      return jsonResponse({ error: "Failed to create signed URL" }, 500)
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    return new Response(
      JSON.stringify({ upload_url: data.signedUrl, image_path: imagePath, expires_at: expiresAt }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    if (err instanceof Response) return err;
    console.error(err);
    return jsonResponse({ error: "Internal server error" }, 500)
  }
});
