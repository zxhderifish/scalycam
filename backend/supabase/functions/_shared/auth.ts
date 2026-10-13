import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

export function getUserClient(req: Request): SupabaseClient {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Response("Missing Authorization header", { status: 401 });
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
}

export function getAdminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

export async function requireUserId(req: Request): Promise<{ userId: string; userClient: SupabaseClient }> {
  const userClient = getUserClient(req);
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) throw new Response("Unauthorized", { status: 401 });
  return { userId: user.id, userClient };
}

export function verifyCronKey(req: Request): void {
  const cronKey = Deno.env.get("CRON_KEY");
  const authHeader = req.headers.get("Authorization");
  if (!cronKey || authHeader !== `Bearer ${cronKey}`) {
    throw new Response("Unauthorized", { status: 401 });
  }
}

export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }
  return null;
}

/** Convenience: JSON response with CORS headers always included */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

/**
 * JSON response with Cache-Control for read-heavy endpoints.
 * maxAge: browser won't refetch for this many seconds.
 * swr: serve stale while revalidating in background for this many seconds.
 * Responses are private (per-user) so CDN caching is disabled.
 */
export function cachedJsonResponse(data: unknown, maxAge = 60, swr = 300): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `private, max-age=${maxAge}, stale-while-revalidate=${swr}`,
      ...corsHeaders(),
    },
  });
}
