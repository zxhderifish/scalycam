import { handleCors, requireUserId, getAdminClient, jsonResponse } from "../_shared/auth.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate_limit.ts";
import { callClaudeText } from "../_shared/llm.ts";
import { resolveNormalized } from "../_shared/normalize.ts";

Deno.serve(async (req: Request) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { userId } = await requireUserId(req);
    const { entry_id, alternative_index } = await req.json();

    if (entry_id === undefined || alternative_index === undefined) {
      return jsonResponse({ error: "entry_id and alternative_index required" }, 400);
    }

    const adminClient = getAdminClient();
    const rl = await checkRateLimit(adminClient, userId, "food_entries_swap_alternative");
    if (!rl.allowed) return rateLimitResponse("food_entries_swap_alternative");

    const { data: entry } = await adminClient.from("food_entries").select("*").eq("id", entry_id).eq("user_id", userId).single();
    if (!entry) return jsonResponse({ error: "Entry not found" }, 404);

    const alternatives: string[] = entry.alternative_names ?? [];
    const newFoodName = alternatives[alternative_index];
    if (!newFoodName) return jsonResponse({ error: "Alternative index out of range" }, 400);

    const canonicalName = await resolveNormalized(adminClient, newFoodName);
    let per100g: { calories_kcal: number; protein_g: number; carbs_g: number; fat_g: number };

    const { data: cached } = await adminClient.from("foods_cache").select("*").eq("food_name_normalized", canonicalName).maybeSingle();
    if (cached) {
      per100g = { calories_kcal: cached.calories_kcal_per_100g, protein_g: cached.protein_g_per_100g, carbs_g: cached.carbs_g_per_100g, fat_g: cached.fat_g_per_100g };
    } else {
      per100g = await callClaudeText(newFoodName);
      await adminClient.from("foods_cache").upsert({ food_name_normalized: canonicalName, calories_kcal_per_100g: per100g.calories_kcal, protein_g_per_100g: per100g.protein_g, carbs_g_per_100g: per100g.carbs_g, fat_g_per_100g: per100g.fat_g, source: "llm", hit_count: 1, last_used_at: new Date().toISOString() }, { onConflict: "food_name_normalized" });
    }

    const weightG = entry.weight_g;
    const { data: updated } = await adminClient.from("food_entries").update({
      food_name: newFoodName,
      calories_kcal: (per100g.calories_kcal * weightG) / 100,
      protein_g: (per100g.protein_g * weightG) / 100,
      carbs_g: (per100g.carbs_g * weightG) / 100,
      fat_g: (per100g.fat_g * weightG) / 100,
      is_user_edited: true,
    }).eq("id", entry_id).select().single();

    return jsonResponse(updated);
  } catch (err) {
    if (err instanceof Response) return err;
    console.error(err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
