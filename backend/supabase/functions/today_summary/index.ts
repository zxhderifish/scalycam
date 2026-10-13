import { handleCors, requireUserId, getAdminClient, jsonResponse, cachedJsonResponse } from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { userId } = await requireUserId(req);
    const adminClient = getAdminClient();

    const { data: settings } = await adminClient.from("user_settings").select("*").eq("user_id", userId).single();
    const timezone = settings?.timezone ?? "UTC";

    // Today's date in user's timezone, with correct UTC bounds.
    // new Date(`${date}T00:00:00`) would be parsed as UTC midnight, not local midnight.
    // Fix: compute the timezone offset and shift accordingly.
    const now = new Date();
    const localDateStr = now.toLocaleDateString("en-CA", { timeZone: timezone });

    // Find the UTC offset for this timezone right now (handles DST automatically).
    // "sv" locale gives ISO-like string without TZ suffix; treating both as UTC
    // and diffing gives the offset in ms.
    const nowAsUTC = new Date(now.toLocaleString("sv", { timeZone: "UTC" }) + "Z");
    const nowAsTZ  = new Date(now.toLocaleString("sv", { timeZone: timezone }) + "Z");
    const offsetMs = nowAsTZ.getTime() - nowAsUTC.getTime(); // e.g. +8h for Asia/Shanghai

    // Midnight UTC of localDateStr, then shift back by offset → local midnight in UTC terms.
    const dayStart = new Date(new Date(`${localDateStr}T00:00:00Z`).getTime() - offsetMs);
    const dayEnd   = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    // Fetch today's meals with food_entries
    const { data: meals } = await adminClient
      .from("meals")
      .select("id, captured_at, total_weight_g, recognition_status, food_entries(food_name, calories_kcal, protein_g, carbs_g, fat_g)")
      .eq("user_id", userId)
      .gte("captured_at", dayStart.toISOString())
      .lt("captured_at", dayEnd.toISOString())
      .order("captured_at", { ascending: false });

    // Aggregate intake
    let totalKcal = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;
    const mealSummaries = (meals ?? []).map((meal: Record<string, unknown>) => {
      const entries = (meal.food_entries as Array<{ food_name: string; calories_kcal: number; protein_g: number; carbs_g: number; fat_g: number }>) ?? [];
      const mealKcal = entries.reduce((s: number, e) => s + (e.calories_kcal ?? 0), 0);
      totalKcal += mealKcal;
      totalProtein += entries.reduce((s: number, e) => s + (e.protein_g ?? 0), 0);
      totalCarbs += entries.reduce((s: number, e) => s + (e.carbs_g ?? 0), 0);
      totalFat += entries.reduce((s: number, e) => s + (e.fat_g ?? 0), 0);
      return {
        id: meal.id,
        captured_at: meal.captured_at,
        total_weight_g: meal.total_weight_g,
        total_kcal: Math.round(mealKcal),
        recognition_status: meal.recognition_status,
        item_names: entries.map((e) => e.food_name),
      };
    });

    const target = {
      kcal: settings?.daily_calorie_target ?? 2000,
      protein_g: settings?.daily_protein_g ?? 150,
      carbs_g: settings?.daily_carbs_g ?? 200,
      fat_g: settings?.daily_fat_g ?? 70,
    };

    return cachedJsonResponse({
      date: localDateStr,
      intake: { kcal: Math.round(totalKcal), protein_g: Math.round(totalProtein), carbs_g: Math.round(totalCarbs), fat_g: Math.round(totalFat) },
      target,
      remaining: {
        kcal: Math.round(target.kcal - totalKcal),
        protein_g: Math.round(target.protein_g - totalProtein),
        carbs_g: Math.round(target.carbs_g - totalCarbs),
        fat_g: Math.round(target.fat_g - totalFat),
      },
      meals: mealSummaries,
    }, 60, 300); // 60s fresh, 5min stale-while-revalidate
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
