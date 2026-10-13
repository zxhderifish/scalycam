import { SupabaseClient } from "npm:@supabase/supabase-js@2";

export async function downloadImage(
  adminClient: SupabaseClient,
  imagePath: string
): Promise<Uint8Array | null> {
  const { data, error } = await adminClient.storage.from("meals").download(imagePath);
  if (error || !data) return null;
  const arrayBuffer = await data.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

export async function uploadThumbnail(
  adminClient: SupabaseClient,
  thumbnailBytes: Uint8Array,
  thumbnailPath: string
): Promise<void> {
  await adminClient.storage.from("thumbnails").upload(thumbnailPath, thumbnailBytes, {
    contentType: "image/jpeg",
    upsert: true,
  });
}

export function imagePathFromClientEventId(userId: string, clientEventId: string): string {
  return `${userId}/${clientEventId}.jpg`;
}

export function thumbnailPathFromClientEventId(userId: string, clientEventId: string): string {
  return `${userId}/${clientEventId}.jpg`;
}
