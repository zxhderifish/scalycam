import { verifyCronKey, getAdminClient } from "../_shared/auth.ts";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

async function sendExpoPush(tokens: string[], title: string, body: string): Promise<void> {
  const messages = tokens.map((to) => ({ to, title, body, sound: "default" }));
  await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(messages),
  });
}

Deno.serve(async (req: Request) => {
  try {
    verifyCronKey(req);
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const adminClient = getAdminClient();

  // Get users whose local time is in 21:00–21:29 with evening_recap enabled
  const now = new Date();

  const { data: users } = await adminClient
    .from("user_settings")
    .select("user_id, timezone, notification_prefs")
    .filter("notification_prefs->>evening_recap", "eq", "true");

  if (!users) return new Response("ok");

  const eligible = users.filter((u) => {
    try {
      const localHour = parseInt(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: u.timezone }).format(now), 10);
      const localMinute = parseInt(new Intl.DateTimeFormat("en-US", { minute: "numeric", timeZone: u.timezone }).format(now), 10);
      return localHour === 21 && localMinute < 30;
    } catch { return false; }
  });

  for (const user of eligible) {
    // Count today's meals
    const localDateStr = now.toLocaleDateString("en-CA", { timeZone: user.timezone });
    const dayStart = new Date(`${localDateStr}T00:00:00`).toISOString();

    const { count: todayCount } = await adminClient
      .from("meals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.user_id)
      .gte("captured_at", dayStart);

    // 7-day median
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: weekMeals } = await adminClient
      .from("meals")
      .select("captured_at")
      .eq("user_id", user.user_id)
      .gte("captured_at", weekAgo);

    const dayCounts = new Map<string, number>();
    for (const m of weekMeals ?? []) {
      const d = m.captured_at.substring(0, 10);
      dayCounts.set(d, (dayCounts.get(d) ?? 0) + 1);
    }
    const counts = Array.from(dayCounts.values()).sort((a, b) => a - b);
    const median = counts.length ? counts[Math.floor(counts.length / 2)] : 0;
    const threshold = Math.max(2, median * 0.7);

    if ((todayCount ?? 0) < threshold) {
      const { data: tokens } = await adminClient
        .from("push_tokens")
        .select("expo_token")
        .eq("user_id", user.user_id);

      if (tokens && tokens.length > 0) {
        const expoTokens = tokens.map((t: { expo_token: string }) => t.expo_token);
        await sendExpoPush(expoTokens, "ScalyCam", "Don't forget to log your meals today! Tap to add a quick entry.");

        // Cleanup invalid tokens on response (simplified — full impl checks Expo receipts)
      }
    }
  }

  return new Response("ok");
});
