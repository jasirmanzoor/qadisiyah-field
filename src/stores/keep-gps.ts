import type { Snapshot } from "@/lib/types";

const PROTECTED = new Set(["field_device_gps", "manual_pin", "survey"]);

export function keepLocalGps(prev: Snapshot, next: Snapshot): Snapshot {
  if (!prev?.dealerships?.length) return next;
  const older = new Map(prev.dealerships.map((d) => [d.id, d]));
  return {
    ...next,
    dealerships: next.dealerships.map((d) => {
      const p = older.get(d.id);
      if (!p) return d;
      const src = p.flags?.gpsSource;
      const protectedGps = Boolean(src && PROTECTED.has(src));
      const newerLocal = Date.parse(p.updatedAt || "0") >= Date.parse(d.updatedAt || "0");
      if ((protectedGps || newerLocal) && (p.lat !== d.lat || p.lng !== d.lng)) {
        return {
          ...d,
          lat: p.lat,
          lng: p.lng,
          flags: { ...d.flags, ...p.flags, needsGps: false, gpsSource: src || d.flags?.gpsSource },
          updatedAt: p.updatedAt || d.updatedAt,
        };
      }
      return d;
    }),
  };
}
