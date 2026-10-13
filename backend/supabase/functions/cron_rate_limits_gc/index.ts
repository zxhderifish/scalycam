import { verifyCronKey, getAdminClient } from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
  try {
    verifyCronKey(req);
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const adminClient = getAdminClient();
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();  // 1 hour

  const { error } = await adminClient.from("rate_limits").delete().lt("bucket_at", cutoff);
  if (error) console.error("rate_limits gc error", error);

  return new Response("ok");
});
