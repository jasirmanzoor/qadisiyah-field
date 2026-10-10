import { useCallback, useEffect, useRef, useState } from "react";

type OrientationEvt = DeviceOrientationEvent & { webkitCompassHeading?: number };

/**
 * Device compass heading in degrees (0 = north), or null when the phone has no
 * compass or the surveyor has not allowed motion access. iOS only asks for
 * permission from a tap, so `enable()` must be wired to a button.
 */
export function useHeading() {
  const [heading, setHeading] = useState<number | null>(null);
  const [needsPermission, setNeedsPermission] = useState(false);
  const attached = useRef(false);
  const smooth = useRef<number | null>(null);

  const onEvent = useCallback((e: Event) => {
    const ev = e as OrientationEvt;
    let h: number | null = null;
    if (typeof ev.webkitCompassHeading === "number") h = ev.webkitCompassHeading;
    else if (ev.absolute && typeof ev.alpha === "number") h = 360 - ev.alpha;
    if (h == null || Number.isNaN(h)) return;
    // Low-pass along the shortest arc so the arrow does not jitter.
    const prev = smooth.current;
    if (prev == null) smooth.current = h;
    else {
      const delta = ((h - prev + 540) % 360) - 180;
      smooth.current = (prev + delta * 0.25 + 360) % 360;
    }
    setHeading(Math.round(smooth.current));
  }, []);

  const attach = useCallback(() => {
    if (attached.current || typeof window === "undefined") return;
    attached.current = true;
    window.addEventListener("deviceorientationabsolute", onEvent, true);
    window.addEventListener("deviceorientation", onEvent, true);
  }, [onEvent]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof DeviceOrientationEvent === "undefined") return;
    const ctor = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof ctor.requestPermission === "function") setNeedsPermission(true);
    else attach();
    return () => {
      window.removeEventListener("deviceorientationabsolute", onEvent, true);
      window.removeEventListener("deviceorientation", onEvent, true);
      attached.current = false;
    };
  }, [attach, onEvent]);

  const enable = useCallback(async () => {
    const ctor = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof ctor.requestPermission !== "function") return;
    try {
      if ((await ctor.requestPermission()) === "granted") {
        setNeedsPermission(false);
        attach();
      }
    } catch {
      /* denied */
    }
  }, [attach]);

  return { heading, needsPermission, enable };
}
