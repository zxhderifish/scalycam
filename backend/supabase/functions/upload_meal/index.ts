import { handleCors, requireUserId, getAdminClient, jsonResponse } from "../_shared/auth.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate_limit.ts";
import { callClaudeVision, validateAndNormalizeItems, logLLMCall } from "../_shared/llm.ts";
import { downloadImage, uploadThumbnail, thumbnailPathFromClientEventId } from "../_shared/storage.ts";
import { generateThumbnail } from "../_shared/thumbnail.ts";
import { resolveNormalized } from "../_shared/normalize.ts";

function deriveMealType(capturedAt: string, timezone: string): string {
  try {
    const date = new Date(capturedAt);
    const localHour = new Intl.DateTimeFormat("en-US", {
      hour: "numeric", hour12: false, timeZone: timezone,
    }).format(date);
    const h = parseInt(localHour, 10);
    if (h >= 4 && h < 10) return "breakfast";
    if (h >= 10 && h < 15) return "lunch";
    if (h >= 15 && h < 19) return "snack";
    return "dinner";
  } catch {
    return "dinner";
  }
}

Deno.serve(async (req: Request) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  const { userId } = await requireUserId(req).catch(() => { throw new Response("Unauthorized", { status: 401 }); });
  try {
    const body = await req.json();
    const { client_event_id, captured_at, weight_g, image_path, device_id } = body;

    if (!client_event_id || !captured_at || !weight_g || !image_path) {
      return jsonResponse({ error: "Missing required fields" }, 400)
    }

    const adminClient = getAdminClient();

    // Rate limit check
    const rl = await checkRateLimit(adminClient, userId, "upload_meal");
    if (!rl.allowed) return rateLimitResponse("upload_meal");

    // Fetch user timezone
    const { data: settings } = await adminClient
      .from("user_settings")
      .select("timezone")
      .eq("user_id", userId)
      .maybeSingle();
    const timezone = settings?.timezone ?? "UTC";
    const mealType = deriveMealType(captured_at, timezone);

    // UPSERT meal
    const { data: meal, error: upsertError } = await adminClient
      .from("meals")
      .upsert({
        user_id: userId,
        client_event_id,
        captured_at,
        meal_type: mealType,
        total_weight_g: weight_g,
        image_path,
        device_id: device_id ?? null,
        recognition_status: "pending",
      }, { onConflict: "user_id,client_event_id", ignoreDuplicates: false })
      .select()
      .single();

    if (upsertError || !meal) {
      console.error("meal upsert error", upsertError);
      return jsonResponse({ error: "Failed to create meal" }, 500)
    }

    // Check if already processed (duplicate request)
    if (meal.recognition_status !== "pending") {
      return new Response(
        JSON.stringify({ meal_id: meal.id, status: meal.recognition_status }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Respond immediately; do async recognition
    const mealId = meal.id;
    const responseBody = JSON.stringify({ meal_id: mealId, status: "recognizing" });

    // @ts-ignore — EdgeRuntime global
    EdgeRuntime.waitUntil(
      Promise.race([
        (async () => {
          const startMs = Date.now();
          let llmStatus = "ok";
          try {
            // Download image
            const imageBytes = await downloadImage(adminClient, image_path);
            if (!imageBytes) {
              await adminClient.from("meals").update({ recognition_status: "failed" }).eq("id", mealId);
              return;
            }

            // Convert to base64
            const base64 = btoa(String.fromCharCode(...imageBytes));

            // Call Claude Vision
            const llmResponse = await callClaudeVision(base64, weight_g);
            const items = validateAndNormalizeItems(llmResponse, weight_g);

            if (!items || items.length === 0) {
              llmStatus = "malformed_json";
              await adminClient.from("meals").update({
                recognition_status: "failed",
                llm_raw_response: llmResponse,
              }).eq("id", mealId);
              return;
            }

            // Insert food entries
            for (const item of items) {
              const canonicalName = await resolveNormalized(adminClient, item.food_name);

              // Upsert foods_cache
              await adminClient.from("foods_cache").upsert({
                food_name_normalized: canonicalName,
                calories_kcal_per_100g: (item.calories_kcal / item.weight_g) * 100,
                protein_g_per_100g: (item.protein_g / item.weight_g) * 100,
                carbs_g_per_100g: (item.carbs_g / item.weight_g) * 100,
                fat_g_per_100g: (item.fat_g / item.weight_g) * 100,
                source: "llm",
                hit_count: 1,
                last_used_at: new Date().toISOString(),
              }, {
                onConflict: "food_name_normalized",
                ignoreDuplicates: false,
              });

              await adminClient.from("food_entries").insert({
                meal_id: mealId,
                user_id: userId,
                food_name: item.food_name,
                weight_g: item.weight_g,
                calories_kcal: item.calories_kcal,
                protein_g: item.protein_g,
                carbs_g: item.carbs_g,
                fat_g: item.fat_g,
                confidence: item.confidence,
                alternative_names: item.alternative_names,
              });
            }

            // Generate thumbnail
            try {
              const thumbnailBytes = await generateThumbnail(imageBytes);
              const thumbPath = thumbnailPathFromClientEventId(userId, client_event_id);
              await uploadThumbnail(adminClient, thumbnailBytes, thumbPath);
              await adminClient.from("meals").update({
                recognition_status: "recognized",
                llm_raw_response: llmResponse,
                thumbnail_path: thumbPath,
              }).eq("id", mealId);
            } catch (thumbErr) {
              console.error("thumbnail error (non-fatal)", thumbErr);
              await adminClient.from("meals").update({
                recognition_status: "recognized",
                llm_raw_response: llmResponse,
              }).eq("id", mealId);
            }
          } catch (err) {
            llmStatus = "error";
            console.error("upload_meal async error", err);
            await adminClient.from("meals").update({ recognition_status: "failed" }).eq("id", mealId);
          } finally {
            await logLLMCall(adminClient, {
              user_id: userId,
              meal_id: mealId,
              endpoint: "upload_meal",
              model: "claude-sonnet-4-6",
              latency_ms: Date.now() - startMs,
              status: llmStatus,
            });
          }
        })(),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 110_000)
        ).catch(async () => {
          await adminClient.from("meals").update({ recognition_status: "failed" }).eq("id", mealId);
        }),
      ])
    );

    return new Response(responseBody, { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error(err);
    return jsonResponse({ error: "Internal server error" }, 500)
  }
});
