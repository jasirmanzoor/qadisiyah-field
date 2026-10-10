/** Short tactile ticks on phones that support it. Silent everywhere else. */
export function haptic(kind: "tap" | "success" | "warn" = "tap") {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(kind === "success" ? [10, 40, 18] : kind === "warn" ? [24, 60, 24] : 8);
  } catch {
    /* some browsers throw when the page has not been interacted with */
  }
}
