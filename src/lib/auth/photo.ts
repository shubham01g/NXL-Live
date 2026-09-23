/**
 * Profile photo handling.
 *
 * The session lives in localStorage, which holds roughly 5MB for the whole
 * origin — a phone camera JPEG is several times that on its own. So an upload
 * is centre-cropped to a square, scaled to 256px and re-encoded, which lands
 * around 15KB and survives a page reload. M3 uploads the original to storage
 * and keeps a URL here instead; the call site does not change.
 */

/** Refuse absurd files before decoding them. */
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

const OUTPUT_PX = 256;
const QUALITY = 0.82;

export type PhotoResult =
  | { ok: true; dataUrl: string }
  | { ok: false; error: string };

export async function readProfilePhoto(file: File): Promise<PhotoResult> {
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "Choose a JPG or PNG image." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "That image is too large. Pick one under 12MB." };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { ok: false, error: "That image could not be read. Try another one." };
  }

  try {
    // Centre-crop to a square so the avatar is never distorted.
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_PX;
    canvas.height = OUTPUT_PX;

    const ctx = canvas.getContext("2d");
    if (!ctx) return { ok: false, error: "This browser cannot process images." };

    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, OUTPUT_PX, OUTPUT_PX);
    return { ok: true, dataUrl: canvas.toDataURL("image/jpeg", QUALITY) };
  } finally {
    bitmap.close();
  }
}
