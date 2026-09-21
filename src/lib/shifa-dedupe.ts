import type { Dealership, DealershipFlags } from "./types";

const STRIP = /\b(cars?|car|showroom|motor|motors|auto|group|co|ltd|llc|company|exhibition|complex|cluster|branch|al shifa|ash shifa|used|new)\b/gi;
const AR_STRIP = /معرض|للسيارات|السيارات|شركة|مجموعة|فرع|الشفا|الشفاء/g;

export function normName(value: string): string {
  return value
    .toLowerCase()
    .replace(AR_STRIP, " ")
    .replace(STRIP, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function haversineM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isProtectedGps(flags: DealershipFlags | undefined): boolean {
  const src = flags?.gpsSource;
  return src === "field_device_gps" || src === "manual_pin" || src === "survey";
}

export function isQadisiyahRow(d: {
  id: string;
  lat: number;
  flags?: DealershipFlags;
}): boolean {
  const flags = d.flags ?? {};
  if (flags.market === "qadisiyah") return true;
  if (flags.market === "shifa") return false;
  const sd = flags.sdId ?? "";
  if (sd.startsWith("D") || d.id.startsWith("D")) return true;
  if (sd.startsWith("S") || d.id.startsWith("S")) return false;
  return d.lat >= 24.62;
}

export function canonicalSd(d: { id: string; flags?: DealershipFlags }): string | null {
  const flags = d.flags ?? {};
  const raw = flags.sdId || d.id;
  return /^S\d{4}$/.test(raw) ? raw : null;
}

/** Collapse duplicate Shifa pins for the map HUD. Never drops a unique S-id. */
export function collapseShifaDuplicates(dealers: Dealership[]): Dealership[] {
  const visible = dealers.filter((d) => !d.flags?.hidden);
  const bySd = new Map<string, Dealership>();
  const leftover: Dealership[] = [];

  for (const d of visible) {
    const sd = canonicalSd(d);
    if (!sd) {
      leftover.push(d);
      continue;
    }
    const prev = bySd.get(sd);
    if (!prev) {
      bySd.set(sd, d);
      continue;
    }
    const prefer =
      d.id === sd ? d : prev.id === sd ? prev : isProtectedGps(d.flags) ? d : prev;
    bySd.set(sd, prefer);
  }

  const kept = [...bySd.values()];
  const extras: Dealership[] = [];
  for (const d of leftover) {
    const n = normName(`${d.nameEn} ${d.nameAr}`);
    const hit = n
      ? kept.find((k) => {
          const kn = normName(`${k.nameEn} ${k.nameAr}`);
          if (!kn) return false;
          if (kn === n || kn.includes(n) || n.includes(kn)) return haversineM(d, k) < 80;
          return haversineM(d, k) < 18;
        })
      : kept.find((k) => haversineM(d, k) < 18);
    if (hit) continue;
    extras.push(d);
  }
  return [...kept, ...extras];
}
