import { handleCors, requireUserId, getAdminClient, jsonResponse } from "../_shared/auth.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate_limit.ts";
import { callClaudeVision, validateAndNormalizeItems } from "../_shared/llm.ts";
import { downloadImage } from "../_shared/storage.ts";
import { resolveNormalized } from "../_shared/normalize.ts";

Deno.serve(async (req: Request) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { userId } = await requireUserId(req);
    const { meal_id, hint_text } = await req.json();

    const adminClient = getAdminClient();
    const rl = await checkRateLimit(adminClient, userId, "reidentify_meal");
    if (!rl.allowed) return rateLimitResponse("reidentify_meal");

    // Fetch meal
    const { data: meal } = await adminClient
      .from("meals")
      .select("id, user_id, image_path, total_weight_g")
      .eq("id", meal_id)
      .eq("user_id", userId)
      .single();

    if (!meal) return jsonResponse({ error: "Meal not found" }, 404);
    if (!meal.image_path) return jsonResponse({ error: "Image no longer available" }, 410);

    const imageBytes = await downloadImage(adminClient, meal.image_path);
    if (!imageBytes) {
      await adminClient.from("meals").update({ image_path: null }).eq("id", meal_id);
      return jsonResponse({ error: "Image no longer available" }, 410);
    }

    const base64 = btoa(String.fromCharCode(...imageBytes));
    const llmResponse = await callClaudeVision(base64, meal.total_weight_g, hint_text);
    const items = validateAndNormalizeItems(llmResponse, meal.total_weight_g);

    if (!items || items.length === 0) {
      return jsonResponse({ error: "Recognition failed" }, 422);
    }

    // Replace existing food_entries
    await adminClient.from("food_entries").delete().eq("meal_id", meal_id);

    const insertedEntries = [];
    for (const item of items) {
      const canonicalName = await resolveNormalized(adminClient, item.food_name);
      void canonicalName; // used for cache resolution but not stored on entry
      const { data: entry } = await adminClient.from("food_entries").insert({
        meal_id,
        user_id: userId,
        food_name: item.food_name,
        weight_g: item.weight_g,
        calories_kcal: item.calories_kcal,
        protein_g: item.protein_g,
        carbs_g: item.carbs_g,
        fat_g: item.fat_g,
        confidence: item.confidence,
        alternative_names: item.alternative_names,
      }).select().single();
      if (entry) insertedEntries.push(entry);
    }

    await adminClient.from("meals").update({
      recognition_status: "recognized",
      llm_raw_response: llmResponse,
    }).eq("id", meal_id);

    return jsonResponse({ food_entries: insertedEntries })
  } catch (err) {
    if (err instanceof Response) return err;
    console.error(err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
