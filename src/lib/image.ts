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


export type PhotoPrep =
  | { ok: true; ai: string; store: string }
  | { ok: false; error: string };

/** On-device HEIC/JPEG normalise. Never throws — the sheet shows the reason. */
export async function prepareFieldPhoto(file: File): Promise<PhotoPrep> {
  const name = file.name.toLowerCase();
  const heic = name.endsWith(".heic") || name.endsWith(".heif") || file.type === "image/heic" || file.type === "image/heif";
  if (file.size > 18_000_000) return { ok: false, error: "Too large — photo is over 18 MB." };
  try {
    const [ai, store] = await Promise.all([compressForAi(file), compressImage(file)]);
    if (!ai || !store) return { ok: false, error: heic ? "Unreadable HEIC — export as JPEG and retry." : "Unreadable photo." };
    if (ai.length > 2_400_000) return { ok: false, error: "Too large after compress — move closer and retry." };
    return { ok: true, ai, store };
  } catch {
    return { ok: false, error: heic ? "Unreadable HEIC — export as JPEG and retry." : "Unreadable photo." };
  }
}

export function classifyPhotoError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("timeout") || m.includes("aborted")) return "Timeout — retry this photo.";
  if (m.includes("network") || m.includes("failed to fetch") || m.includes("offline")) return "Network — queued, will retry online.";
  if (m.includes("too large") || m.includes("payload")) return "Too large — retake closer.";
  if (m.includes("heic") || m.includes("unreadable") || m.includes("empty")) return "Unreadable — retake in JPEG.";
  return message || "Analysis failed.";
}
