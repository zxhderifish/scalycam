export function normalizeFood(name: string): string {
  // 1. NFKC unicode normalization
  let normalized = name.normalize("NFKC");
  // 2. Strip punctuation and parentheses
  normalized = normalized.replace(/[^\p{L}\p{N}\s]/gu, " ");
  // 3. Collapse whitespace
  normalized = normalized.replace(/\s+/g, " ").trim();
  // 4. Lowercase ASCII only
  normalized = normalized.toLowerCase();
  return normalized;
}

export async function resolveNormalized(
  adminClient: import("npm:@supabase/supabase-js@2").SupabaseClient,
  raw: string
): Promise<string> {
  const normalized = normalizeFood(raw);
  // Check food_aliases for canonical form
  const { data } = await adminClient
    .from("food_aliases")
    .select("canonical_normalized")
    .eq("alias_normalized", normalized)
    .maybeSingle();
  return data?.canonical_normalized ?? normalized;
}
