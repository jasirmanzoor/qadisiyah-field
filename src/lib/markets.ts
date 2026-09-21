import type { Dealership, MarketId, Snapshot } from "./types";
import { MARKET_CENTERS } from "./geo";
import { collapseShifaDuplicates } from "./shifa-dedupe";

export type { MarketId };

export const MARKET_IDS: MarketId[] = ["qadisiyah", "shifa"];

export const MARKET_META: Record<
  MarketId,
  {
    id: MarketId;
    labelEn: string;
    labelAr: string;
    subEn: string;
    subAr: string;
    lat: number;
    lng: number;
    zoom: number;
  }
> = {
  qadisiyah: {
    id: "qadisiyah",
    labelEn: "Al Qadisiyah",
    labelAr: "القادسية",
    subEn: "Exit 8 · walked census",
    subAr: "مخرج 8 · مسح ميداني",
    ...MARKET_CENTERS.qadisiyah,
  },
  shifa: {
    id: "shifa",
    labelEn: "Al Shifa",
    labelAr: "الشفا",
    subEn: "Used-car strip · survey starting",
    subAr: "سوق المستعمل · المسح يبدأ",
    ...MARKET_CENTERS.shifa,
  },
};

/** Same operator with a desk in both markets. Shifa id first, Qadisiyah second. */
export const DUAL_PAIRS: [string, string][] = [
  ["S0004", "D0309"],
  ["S0056", "D0146"],
  ["S0057", "D0187"],
  ["S0018", "D0052"],
  ["S0040", "D0109"],
  ["S0034", "D0180"],
  ["S0042", "D0066"],
];

const DUAL_OTHER = new Map<string, string>();
for (const [a, b] of DUAL_PAIRS) {
  DUAL_OTHER.set(a, b);
  DUAL_OTHER.set(b, a);
}

export function dealerMarket(d: Pick<Dealership, "lat" | "flags">): MarketId {
  const flags = d.flags ?? {};
  if (flags.market === "shifa") return "shifa";
  if (flags.market === "qadisiyah") return "qadisiyah";
  const sd = flags.sdId ?? "";
  if (sd.startsWith("S")) return "shifa";
  if (sd.startsWith("D")) return "qadisiyah";
  if (d.lat < 24.62) return "shifa";
  return "qadisiyah";
}

export function dealersInMarket(dealers: Dealership[], market: MarketId): Dealership[] {
  const scoped = dealers.filter((d) => !d.flags?.hidden && dealerMarket(d) === market);
  if (market !== "shifa") return scoped;
  return collapseShifaDuplicates(scoped);
}

export function sliceSnapshot(snapshot: Snapshot, market: MarketId): Snapshot {
  const ids = new Set(dealersInMarket(snapshot.dealerships, market).map((d) => d.id));
  return {
    ...snapshot,
    dealerships: snapshot.dealerships.filter((d) => ids.has(d.id)),
    surveys: snapshot.surveys.filter((s) => ids.has(s.dealershipId)),
    photos: snapshot.photos.filter((p) => ids.has(p.dealershipId)),
    followups: snapshot.followups.filter((f) => ids.has(f.dealershipId)),
    findings: snapshot.findings.filter((f) => !f.dealershipId || ids.has(f.dealershipId)),
    pipeline: snapshot.pipeline.filter((p) => ids.has(p.dealershipId)),
  };
}

export function marketCounts(dealers: Dealership[]): Record<MarketId, number> {
  return {
    qadisiyah: dealersInMarket(dealers, "qadisiyah").length,
    shifa: dealersInMarket(dealers, "shifa").length,
  };
}

export function sdKey(d: Pick<Dealership, "id" | "flags">): string {
  if (d.flags?.sdId) return d.flags.sdId;
  const tail = d.id.split("::").pop() ?? d.id;
  return tail;
}

function partnerSd(d: Pick<Dealership, "id" | "flags">): string | null {
  if (d.flags?.relatedSdId) return d.flags.relatedSdId;
  return DUAL_OTHER.get(sdKey(d)) ?? null;
}

export function isDualLocation(d: Pick<Dealership, "id" | "flags">, all?: Dealership[]): boolean {
  if (partnerSd(d)) return true;
  if (!all) return false;
  const sd = sdKey(d);
  return all.some((x) => x.id !== d.id && x.flags?.relatedSdId === sd);
}

export function dualPartner(d: Pick<Dealership, "id" | "flags">, all: Dealership[]): Dealership | null {
  const target = partnerSd(d);
  if (target) {
    const hit = all.find((x) => sdKey(x) === target);
    if (hit) return hit;
  }
  const sd = sdKey(d);
  return all.find((x) => x.id !== d.id && x.flags?.relatedSdId === sd) ?? null;
}
