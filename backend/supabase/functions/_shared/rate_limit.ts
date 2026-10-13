import { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { RateLimitResult } from "./types.ts";

const LIMITS: Record<string, number> = {
  upload_signed_url: 15,
  upload_meal: 15,
  reidentify_meal: 5,
  update_food_entry: 30,
  create_food_entry: 30,
  food_entries_swap_alternative: 30,
};

export async function checkRateLimit(
  adminClient: SupabaseClient,
  userId: string,
  endpoint: string
): Promise<RateLimitResult> {
  const limit = LIMITS[endpoint] ?? 30;
  const bucketAt = new Date(Math.floor(Date.now() / 60000) * 60000).toISOString();

  const { data, error } = await adminClient.rpc("atomic_rate_limit", {
    p_user_id: userId,
    p_endpoint: endpoint,
    p_bucket_at: bucketAt,
  });

  if (error) {
    // Fallback: allow on DB error (don't block users due to rate-limit table issues)
    console.error("rate_limit error", error);
    return { allowed: true, count: 0 };
  }

  const count = data as number;
  return { allowed: count <= limit, count };
}

export function rateLimitResponse(endpoint: string): Response {
  const bucketAt = new Date(Math.floor(Date.now() / 60000) * 60000);
  const nextBucket = new Date(bucketAt.getTime() + 60000);
  const retryAfter = Math.ceil((nextBucket.getTime() - Date.now()) / 1000);
  return new Response(
    JSON.stringify({ error: "Rate limit exceeded", endpoint }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    }
  );
}
