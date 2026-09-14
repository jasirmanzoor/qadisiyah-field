/**
 * Client-side photo normalisation. Field photos are compressed before they are
 * stored or sent for AI analysis — full-resolution images are never uploaded
 * blindly to a provider.
 */

async function drawToDataUrl(file: File, max: number, quality: number): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return canvas.toDataURL("image/jpeg", quality);
}

/** Storage copy — small, offline-sync friendly. */
export function compressImage(file: File): Promise<string> {
  return drawToDataUrl(file, 960, 0.55);
}

/**
 * Analysis copy — keep signboard text readable without blowing the
 * serverless request body (6 phone photos at 1600/0.82 overflow Seroval).
 */
export function compressForAi(file: File): Promise<string> {
  return drawToDataUrl(file, 1280, 0.68);
}
