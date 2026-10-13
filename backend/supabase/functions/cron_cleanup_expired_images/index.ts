import { verifyCronKey, getAdminClient } from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
  try {
    verifyCronKey(req);
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const adminClient = getAdminClient();
  const cutoff = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();  // 25 hours

  // Fetch up to 500 meals with expired images
  const { data: meals } = await adminClient
    .from("meals")
    .select("id, image_path")
    .not("image_path", "is", null)
    .lt("created_at", cutoff)
    .limit(500);

  if (!meals || meals.length === 0) return new Response("ok — nothing to clean");

  for (const meal of meals) {
    // Clear image_path first (source of truth)
    await adminClient.from("meals").update({ image_path: null }).eq("id", meal.id);
    // Then delete from Storage
    await adminClient.storage.from("meals").remove([meal.image_path]);
  }

  return new Response(`ok — cleaned ${meals.length} images`);
});
