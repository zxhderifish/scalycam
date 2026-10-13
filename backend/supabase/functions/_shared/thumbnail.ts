import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts";

export async function generateThumbnail(
  jpegBytes: Uint8Array,
  size = 200
): Promise<Uint8Array> {
  const image = await Image.decode(jpegBytes);
  const thumbnail = image.resize(size, size);
  return await thumbnail.encode(80);  // JPEG quality 80
}
