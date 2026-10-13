import { handleCors, requireUserId, getAdminClient, jsonResponse } from "../_shared/auth.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate_limit.ts";
import { callClaudeText } from "../_shared/llm.ts";
import { resolveNormalized } from "../_shared/normalize.ts";

Deno.serve(async (req: Request) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { userId } = await requireUserId(req);
    const { entry_id, food_name, weight_g } = await req.json();

    const adminClient = getAdminClient();
    const rl = await checkRateLimit(adminClient, userId, "update_food_entry");
    if (!rl.allowed) return rateLimitResponse("update_food_entry");

    // Fetch existing entry
    const { data: entry } = await adminClient
      .from("food_entries")
      .select("*")
      .eq("id", entry_id)
      .eq("user_id", userId)
      .single();

    if (!entry) return jsonResponse({ error: "Entry not found" }, 404);

    let per100g = {
      calories_kcal: (entry.calories_kcal / entry.weight_g) * 100,
      protein_g: (entry.protein_g / entry.weight_g) * 100,
      carbs_g: (entry.carbs_g / entry.weight_g) * 100,
      fat_g: (entry.fat_g / entry.weight_g) * 100,
    };

    let newFoodName = entry.food_name;

    if (food_name && food_name !== entry.food_name) {
      newFoodName = food_name;
      const canonicalName = await resolveNormalized(adminClient, food_name);

      // Try foods_cache first
      const { data: cached } = await adminClient
        .from("foods_cache")
        .select("*")
        .eq("food_name_normalized", canonicalName)
        .maybeSingle();

      if (cached) {
        per100g = {
          calories_kcal: cached.calories_kcal_per_100g,
          protein_g: cached.protein_g_per_100g,
          carbs_g: cached.carbs_g_per_100g,
          fat_g: cached.fat_g_per_100g,
        };
        await adminClient.from("foods_cache").update({ hit_count: cached.hit_count + 1, last_used_at: new Date().toISOString() }).eq("food_name_normalized", canonicalName);
      } else {
        // LLM text lookup
        const nutrition = await callClaudeText(food_name);
        per100g = nutrition;
        await adminClient.from("foods_cache").upsert({
          food_name_normalized: canonicalName,
          calories_kcal_per_100g: nutrition.calories_kcal,
          protein_g_per_100g: nutrition.protein_g,
          carbs_g_per_100g: nutrition.carbs_g,
          fat_g_per_100g: nutrition.fat_g,
          source: "llm",
          hit_count: 1,
          last_used_at: new Date().toISOString(),
        }, { onConflict: "food_name_normalized" });
      }
    }

    const newWeightG = weight_g ?? entry.weight_g;
    const updates = {
      food_name: newFoodName,
      weight_g: newWeightG,
      calories_kcal: (per100g.calories_kcal * newWeightG) / 100,
      protein_g: (per100g.protein_g * newWeightG) / 100,
      carbs_g: (per100g.carbs_g * newWeightG) / 100,
      fat_g: (per100g.fat_g * newWeightG) / 100,
      is_user_edited: true,
    };

    const { data: updated } = await adminClient
      .from("food_entries")
      .update(updates)
      .eq("id", entry_id)
      .select()
      .single();

    return jsonResponse(updated)
  } catch (err) {
    if (err instanceof Response) return err;
    console.error(err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
