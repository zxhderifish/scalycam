import { handleCors, requireUserId, getAdminClient, jsonResponse } from "../_shared/auth.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate_limit.ts";
import { callClaudeText } from "../_shared/llm.ts";
import { resolveNormalized } from "../_shared/normalize.ts";

Deno.serve(async (req: Request) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { userId } = await requireUserId(req);
    const { meal_id, food_name, weight_g } = await req.json();

    if (!meal_id || !food_name || !weight_g) {
      return jsonResponse({ error: "meal_id, food_name, weight_g required" }, 400);
    }

    const adminClient = getAdminClient();
    const rl = await checkRateLimit(adminClient, userId, "create_food_entry");
    if (!rl.allowed) return rateLimitResponse("create_food_entry");

    // Verify meal belongs to user
    const { data: meal } = await adminClient.from("meals").select("id, recognition_status").eq("id", meal_id).eq("user_id", userId).single();
    if (!meal) return jsonResponse({ error: "Meal not found" }, 404);

    const canonicalName = await resolveNormalized(adminClient, food_name);
    let per100g: { calories_kcal: number; protein_g: number; carbs_g: number; fat_g: number };

    const { data: cached } = await adminClient.from("foods_cache").select("*").eq("food_name_normalized", canonicalName).maybeSingle();
    if (cached) {
      per100g = { calories_kcal: cached.calories_kcal_per_100g, protein_g: cached.protein_g_per_100g, carbs_g: cached.carbs_g_per_100g, fat_g: cached.fat_g_per_100g };
      await adminClient.from("foods_cache").update({ hit_count: cached.hit_count + 1 }).eq("food_name_normalized", canonicalName);
    } else {
      per100g = await callClaudeText(food_name);
      await adminClient.from("foods_cache").upsert({ food_name_normalized: canonicalName, calories_kcal_per_100g: per100g.calories_kcal, protein_g_per_100g: per100g.protein_g, carbs_g_per_100g: per100g.carbs_g, fat_g_per_100g: per100g.fat_g, source: "llm", hit_count: 1, last_used_at: new Date().toISOString() }, { onConflict: "food_name_normalized" });
    }

    const { data: entry } = await adminClient.from("food_entries").insert({
      meal_id, user_id: userId, food_name,
      weight_g,
      calories_kcal: (per100g.calories_kcal * weight_g) / 100,
      protein_g: (per100g.protein_g * weight_g) / 100,
      carbs_g: (per100g.carbs_g * weight_g) / 100,
      fat_g: (per100g.fat_g * weight_g) / 100,
      is_user_edited: true,
      confidence: null,
      alternative_names: null,
    }).select().single();

    // If meal was failed, promote to recognized
    if (meal.recognition_status === "failed") {
      await adminClient.from("meals").update({ recognition_status: "recognized" }).eq("id", meal_id);
    }

    return jsonResponse(entry);
  } catch (err) {
    if (err instanceof Response) return err;
    console.error(err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
