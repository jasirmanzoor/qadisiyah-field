import type { Dealership, MarketId, Snapshot } from "./types";
import { MARKET_CENTERS } from "./geo";

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

export function dealerMarket(d: Pick<Dealership, "lat" | "flags">): MarketId {
  if (d.flags.market === "shifa") return "shifa";
  if (d.flags.market === "qadisiyah") return "qadisiyah";
  const sd = d.flags.sdId ?? "";
  if (sd.startsWith("S")) return "shifa";
  if (sd.startsWith("D")) return "qadisiyah";
  // Field-added pins without a market tag: south Riyadh strip vs east Riyadh.
  if (d.lat < 24.62) return "shifa";
  return "qadisiyah";
}

export function dealersInMarket(dealers: Dealership[], market: MarketId): Dealership[] {
  return dealers.filter((d) => dealerMarket(d) === market);
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
  const out: Record<MarketId, number> = { qadisiyah: 0, shifa: 0 };
  for (const d of dealers) out[dealerMarket(d)] += 1;
  return out;
}
