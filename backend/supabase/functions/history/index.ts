import { handleCors, requireUserId, getAdminClient, jsonResponse, cachedJsonResponse } from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { userId } = await requireUserId(req);
    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get("days") ?? "30", 10);
    const adminClient = getAdminClient();

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const [mealsResult, weightsResult, settingsResult] = await Promise.all([
      adminClient
        .from("food_entries")
        .select("created_at, calories_kcal, protein_g, carbs_g, fat_g, meal_id, meals!inner(captured_at, user_id)")
        .eq("meals.user_id", userId)
        .gte("created_at", since),
      adminClient
        .from("weight_logs")
        .select("weight_kg, logged_at")
        .eq("user_id", userId)
        .gte("logged_at", since)
        .order("logged_at", { ascending: true }),
      adminClient
        .from("user_settings")
        .select("daily_calorie_target, daily_protein_g, daily_carbs_g, daily_fat_g")
        .eq("user_id", userId)
        .single(),
    ]);

    // Group food_entries by day
    const dayMap = new Map<string, { kcal: number; protein_g: number; carbs_g: number; fat_g: number; meal_count: Set<string> }>();
    for (const entry of mealsResult.data ?? []) {
      const meal = entry.meals as { captured_at: string };
      const day = meal.captured_at.substring(0, 10);
      if (!dayMap.has(day)) dayMap.set(day, { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, meal_count: new Set() });
      const d = dayMap.get(day)!;
      d.kcal += entry.calories_kcal ?? 0;
      d.protein_g += entry.protein_g ?? 0;
      d.carbs_g += entry.carbs_g ?? 0;
      d.fat_g += entry.fat_g ?? 0;
      d.meal_count.add(entry.meal_id);
    }

    const dayArray = Array.from(dayMap.entries())
      .map(([date, d]) => ({
        date,
        kcal: Math.round(d.kcal),
        protein_g: Math.round(d.protein_g),
        carbs_g: Math.round(d.carbs_g),
        fat_g: Math.round(d.fat_g),
        meal_count: d.meal_count.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const settings = settingsResult.data;
    return cachedJsonResponse({
      days: dayArray,
      weights: weightsResult.data ?? [],
      target: {
        kcal: settings?.daily_calorie_target ?? 2000,
        protein_g: settings?.daily_protein_g ?? 150,
        carbs_g: settings?.daily_carbs_g ?? 200,
        fat_g: settings?.daily_fat_g ?? 70,
      },
    }, 300, 600); // 5min fresh, 10min stale-while-revalidate
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
