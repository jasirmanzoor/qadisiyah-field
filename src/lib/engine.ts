import { isObservedFigure } from "@/lib/scoring";
import { monthlyFinancedMid, monthlySoldMid } from "@/lib/survey-schema";
import type { Dealership, Snapshot, SurveyPayload } from "@/lib/types";
import { formatNumber, formatPct, formatSarCompact } from "@/lib/utils";

type Lang = "en" | "ar";

export type InsightCategory =
  | "coverage"
  | "market"
  | "financing"
  | "unit"
  | "targeting"
  | "risk"
  | "scenario";

export type Evidence = {
  n: number;
  of: number;
  quality: "high" | "medium" | "low" | "thin";
  observedOnly: boolean;
};

export type Insight = {
  id: string;
  category: InsightCategory;
  title: string;
  headline: string;
  body: string;
  why: string;
  evidence: Evidence;
};

export type MixSlice = { key: string; label: string; n: number; share: number };
export type RankedDealer = {
  id: string;
  name: string;
  sdId?: string;
  value: number;
  label: string;
  note: string;
};

export type EngineResult = {
  universe: number;
  independents: number;
  authorised: number;
  competitors: number;
  closed: number;
  walked: number;
  complete: number;
  needsGps: number;
  withPhone: number;
  withStreet: number;
  withMaps: number;
  trained: number;
  trainingPriority: number;
  trainingHold: number;
  trainingScheduled: number;
  inventoryUnits: number;
  inventoryN: number;
  stockValue: number | null;
  stockValueN: number;
  medianAsp: number | null;
  aspN: number;
  medianSize: number | null;
  sizeN: number;
  avgSalesmen: number | null;
  salesmenN: number;
  sampleSold: number;
  sampleFinanced: number;
  sampleGmv: number;
  sampleGapGmv: number;
  sampleFpr: number | null;
  sampleN: number;
  impliedMonthlyGmv: number | null;
  impliedGapGmv: number | null;
  impliedWalkinGapGmv: number | null;
  walkinPct: number | null;
  walkinN: number;
  capturePct: number;
  takePct: number;
  approvalPct: number;
  capturedMonthlyGmv: number | null;
  monthlyOrigination: number | null;
  annualOrigination: number | null;
  monthlyDeals: number | null;
  typeMix: MixSlice[];
  aspMix: MixSlice[];
  brandMix: MixSlice[];
  streetMix: MixSlice[];
  bankMix: MixSlice[];
  credibilityMix: MixSlice[];
  gpsMix: MixSlice[];
  topByStock: RankedDealer[];
  topByGap: RankedDealer[];
  whiteSpace: RankedDealer[];
  insights: Insight[];
};

export const DEFAULT_CAPTURE = 15;
export const DEFAULT_TAKE = 1.5;
export const DEFAULT_APPROVAL = 60;

const CHINESE = new Set([
  "Changan",
  "Haval",
  "Geely",
  "MG",
  "Jetour",
  "GAC",
  "JAC",
  "BAIC",
  "Foton",
  "Jaecoo",
  "Exeed",
  "Dongfeng",
  "GWM",
  "Tank",
  "Sitrak",
]);
const LUXURY = new Set([
  "Mercedes",
  "BMW",
  "Lexus",
  "Land Rover",
  "Porsche",
  "Cadillac",
  "Genesis",
  "Infiniti",
  "Bentley",
  "Lamborghini",
  "Rolls-Royce",
  "Maybach",
  "Brabus",
  "McLaren",
  "Audi",
]);

type Row = {
  d: Dealership;
  p: SurveyPayload;
  independent: boolean;
  sold: number | null;
  financed: number | null;
  asp: number | null;
  inv: number | null;
  size: number | null;
  salesmen: number | null;
  fpr: number | null;
  gapDeals: number | null;
  gmv: number | null;
  gapGmv: number | null;
  stockValue: number | null;
  walkPct: number | null;
  brands: string[];
  banks: string[];
  vtype: string;
  street: string;
};

function tx(lang: Lang, en: string, ar: string) {
  return lang === "ar" ? ar : en;
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

function sum(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0);
}

function evidence(n: number, of: number, observedOnly: boolean): Evidence {
  const ratio = of ? n / of : 0;
  const quality: Evidence["quality"] =
    n < 8 ? "thin" : ratio < 0.15 ? "low" : ratio < 0.45 ? "medium" : "high";
  return { n, of, quality, observedOnly };
}

function mix(counts: Record<string, number>, labels: Record<string, string>): MixSlice[] {
  const total = sum(Object.values(counts)) || 1;
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([key, n]) => ({ key, label: labels[key] ?? key, n, share: n / total }));
}

function brandFamily(b: string): "toyota" | "hyundai_kia" | "chinese" | "luxury" | "other" {
  if (b === "Toyota") return "toyota";
  if (b === "Hyundai" || b === "Kia") return "hyundai_kia";
  if (CHINESE.has(b)) return "chinese";
  if (LUXURY.has(b)) return "luxury";
  return "other";
}

function aspBand(asp: number): "economy" | "core" | "upper" | "premium" {
  if (asp < 70_000) return "economy";
  if (asp < 120_000) return "core";
  if (asp < 250_000) return "upper";
  return "premium";
}

function pickNum(
  value: number | null | undefined,
  source: string | undefined,
  observedOnly: boolean,
): number | null {
  if (value == null || Number.isNaN(value)) return null;
  if (!isObservedFigure(source, observedOnly)) return null;
  return value;
}

function soldOf(p: SurveyPayload, observedOnly: boolean): number | null {
  const exact = pickNum(p.monthlySoldExact ?? null, p.volumeFiguresAre, observedOnly);
  if (exact != null) return exact;
  if (observedOnly) return null;
  return monthlySoldMid(p.avgMonthlySold);
}

function financedOf(p: SurveyPayload, observedOnly: boolean): number | null {
  const exact = pickNum(p.monthlyFinancedExact ?? null, p.volumeFiguresAre, observedOnly);
  if (exact != null) return exact;
  if (observedOnly) return null;
  return monthlyFinancedMid(p.avgMonthlyFinanced);
}

function walkShare(p: SurveyPayload): number | null {
  if (p.leadOnlinePct == null || p.leadOnlinePct === 0) return null;
  const online = p.leadOnlinePct > 1 ? p.leadOnlinePct / 100 : p.leadOnlinePct;
  if (online < 0 || online > 1) return null;
  return Math.max(0, Math.min(1, 1 - online));
}

export function runEngine(
  snapshot: Snapshot,
  opts: {
    observedOnly: boolean;
    capturePct: number;
    takePct: number;
    approvalPct: number;
    lang: Lang;
  },
): EngineResult {
  const { observedOnly, capturePct, takePct, approvalPct, lang } = opts;
  const dealers = snapshot.dealerships;
  const rows: Row[] = dealers.map((d) => {
    const p = snapshot.surveys.find((s) => s.dealershipId === d.id)?.payload ?? {};
    const independent = !d.flags.authorised && !d.flags.competitor && d.status !== "closed" && d.status !== "competitor";
    const sold = soldOf(p, observedOnly);
    const financed = financedOf(p, observedOnly);
    const asp = pickNum(p.avgSellingPriceSar ?? null, p.avgPriceSource, observedOnly);
    const inv = pickNum(p.inventoryUnits ?? null, p.inventorySource, observedOnly);
    const size = pickNum(p.showroomSizeSqm ?? null, p.showroomSizeSource, observedOnly);
    const salesmen = pickNum(p.salesmenCount ?? null, p.salesmenSource, observedOnly);
    const fpr =
      sold != null && financed != null && sold > 0
        ? Math.max(0, Math.min(1, financed / sold))
        : p.fpr != null && !observedOnly
          ? p.fpr
          : null;
    const gapDeals = sold != null && financed != null ? Math.max(0, sold - financed) : null;
    const gmv = sold != null && asp != null ? sold * asp : null;
    const gapGmv = gapDeals != null && asp != null ? gapDeals * asp : null;
    const stockValue = inv != null && asp != null ? inv * asp : null;
    return {
      d,
      p,
      independent,
      sold,
      financed,
      asp,
      inv,
      size,
      salesmen,
      fpr,
      gapDeals,
      gmv,
      gapGmv,
      stockValue,
      walkPct: walkShare(p),
      brands: p.mainBrands ?? [],
      banks: p.banksPartnered ?? [],
      vtype: p.vehicleType || "unset",
      street: (p.street || d.flags.street || "").trim(),
    };
  });

  const live = rows.filter((r) => r.independent);
  const sample = live.filter((r) => r.sold != null && r.asp != null);
  const sampleGap = live.filter((r) => r.gapGmv != null);
  const invRows = live.filter((r) => r.inv != null);
  const aspRows = live.filter((r) => r.asp != null);
  const sizeRows = live.filter((r) => r.size != null);
  const salesmenRows = live.filter((r) => r.salesmen != null);
  const stockRows = live.filter((r) => r.stockValue != null);
  const walkRows = live.filter((r) => r.walkPct != null);
  const fprRows = live.filter((r) => r.fpr != null);

  const inventoryUnits = sum(invRows.map((r) => r.inv!));
  const medianAsp = median(aspRows.map((r) => r.asp!));
  const sampleSold = sum(sample.map((r) => r.sold!));
  const sampleFinanced = sum(sample.map((r) => r.financed ?? 0));
  const sampleGmv = sum(sample.map((r) => r.gmv!));
  const sampleGapGmv = sum(sampleGap.map((r) => r.gapGmv!));
  const sampleFpr = sampleSold > 0 ? sampleFinanced / sampleSold : median(fprRows.map((r) => r.fpr!));
  const turnRows = sample.filter((r) => r.inv != null && r.inv > 0 && r.sold != null);
  const medianTurns = median(turnRows.map((r) => r.sold! / r.inv!));
  const impliedMonthlyGmv =
    medianTurns != null && inventoryUnits > 0 && medianAsp != null ? medianTurns * inventoryUnits * medianAsp : null;
  const impliedGapGmv =
    impliedMonthlyGmv != null && sampleFpr != null ? impliedMonthlyGmv * (1 - sampleFpr) : sampleGapGmv || null;
  const walkinPct = walkRows.length ? median(walkRows.map((r) => r.walkPct!)) : null;
  const impliedWalkinGapGmv =
    impliedGapGmv != null && walkinPct != null ? impliedGapGmv * walkinPct : null;

  const capture = capturePct / 100;
  const take = takePct / 100;
  const approval = approvalPct / 100;
  const capturedMonthlyGmv = impliedWalkinGapGmv != null ? impliedWalkinGapGmv * capture * approval : null;
  const monthlyOrigination = capturedMonthlyGmv != null ? capturedMonthlyGmv * take : null;
  const annualOrigination = monthlyOrigination != null ? monthlyOrigination * 12 : null;
  const monthlyDeals =
    impliedWalkinGapGmv != null && medianAsp
      ? (impliedWalkinGapGmv * capture * approval) / medianAsp
      : null;

  const typeLabels: Record<string, string> = {
    new_only: tx(lang, "New", "جديد"),
    used_only: tx(lang, "Used", "مستعمل"),
    mix: tx(lang, "Mix", "مختلط"),
    unset: tx(lang, "Unset", "غير محدد"),
  };
  const aspLabels: Record<string, string> = {
    economy: tx(lang, "Economy <70k", "اقتصادي <70 ألف"),
    core: tx(lang, "Core 70–120k", "أساسي 70–120 ألف"),
    upper: tx(lang, "Upper 120–250k", "أعلى 120–250 ألف"),
    premium: tx(lang, "Premium 250k+", "فاخر 250 ألف+"),
  };
  const brandLabels: Record<string, string> = {
    toyota: "Toyota",
    hyundai_kia: "Hyundai / Kia",
    chinese: tx(lang, "Chinese", "صيني"),
    luxury: tx(lang, "Luxury", "فاخر"),
    other: tx(lang, "Other", "أخرى"),
  };
  const credLabels: Record<string, string> = {
    high: tx(lang, "High", "عالية"),
    medium: tx(lang, "Medium", "متوسطة"),
    low: tx(lang, "Low", "منخفضة"),
  };
  const gpsLabels: Record<string, string> = {
    survey: tx(lang, "Captured", "ملتقط"),
    maps_link: "Maps",
    mapping_seed: tx(lang, "Mapping", "خرائط قديمة"),
    interpolated: tx(lang, "Interpolated", "تقديري"),
    related: tx(lang, "Related", "مرتبط"),
    outlier_corrected: tx(lang, "Corrected", "مصحح"),
  };

  const typeCounts: Record<string, number> = {};
  const aspCounts: Record<string, number> = {};
  const brandCounts: Record<string, number> = { toyota: 0, hyundai_kia: 0, chinese: 0, luxury: 0, other: 0 };
  const streetCounts: Record<string, number> = {};
  const bankCounts: Record<string, number> = {};
  const credCounts: Record<string, number> = {};
  const gpsCounts: Record<string, number> = {};

  for (const r of live) {
    typeCounts[r.vtype] = (typeCounts[r.vtype] ?? 0) + 1;
    if (r.asp != null) {
      const b = aspBand(r.asp);
      aspCounts[b] = (aspCounts[b] ?? 0) + 1;
    }
    const families = new Set(r.brands.map(brandFamily));
    if (!families.size) brandCounts.other += 1;
    else for (const f of families) brandCounts[f] += 1;
    const street = r.street || tx(lang, "Unnamed", "بدون شارع");
    streetCounts[street] = (streetCounts[street] ?? 0) + 1;
    for (const b of r.banks) bankCounts[b] = (bankCounts[b] ?? 0) + 1;
    const cred = r.d.flags.credibility || r.p.informationCredibility || "medium";
    credCounts[cred] = (credCounts[cred] ?? 0) + 1;
  }
  for (const r of rows) {
    const g = r.d.flags.gpsSource || "survey";
    gpsCounts[g] = (gpsCounts[g] ?? 0) + 1;
  }

  const topByStock: RankedDealer[] = live
    .filter((r) => r.stockValue != null)
    .sort((a, b) => b.stockValue! - a.stockValue!)
    .slice(0, 8)
    .map((r) => ({
      id: r.d.id,
      name: r.d.nameEn,
      sdId: r.d.flags.sdId,
      value: r.stockValue!,
      label: formatSarCompact(r.stockValue),
      note: `${formatNumber(r.inv)} u · ${formatSarCompact(r.asp)}`,
    }));

  const topByGap: RankedDealer[] = live
    .filter((r) => r.gapGmv != null && r.gapGmv > 0)
    .sort((a, b) => b.gapGmv! - a.gapGmv!)
    .slice(0, 8)
    .map((r) => ({
      id: r.d.id,
      name: r.d.nameEn,
      sdId: r.d.flags.sdId,
      value: r.gapGmv!,
      label: formatSarCompact(r.gapGmv),
      note: `${formatNumber(r.gapDeals)} deals/mo · FPR ${formatPct((r.fpr ?? 0) * 100)}`,
    }));

  const whiteSpace: RankedDealer[] = live
    .filter((r) => r.inv != null && r.inv >= 40 && r.banks.length === 0 && !r.p.bankRepOnSite)
    .sort((a, b) => (b.stockValue ?? b.inv! * (medianAsp ?? 0)) - (a.stockValue ?? a.inv! * (medianAsp ?? 0)))
    .slice(0, 8)
    .map((r) => ({
      id: r.d.id,
      name: r.d.nameEn,
      sdId: r.d.flags.sdId,
      value: r.inv!,
      label: `${formatNumber(r.inv)} u`,
      note: tx(lang, "No bank named on-site", "لا بنك مسمّى في المعرض"),
    }));

  const insights = buildInsights({
    lang,
    observedOnly,
    rows,
    live,
    sample,
    universe: dealers.length,
    independents: live.length,
    authorised: rows.filter((r) => r.d.flags.authorised).length,
    competitors: rows.filter((r) => r.d.flags.competitor || r.d.status === "competitor").length,
    closed: rows.filter((r) => r.d.status === "closed").length,
    walked: rows.filter((r) => r.d.status !== "not_visited").length,
    complete: rows.filter((r) => r.d.status === "completed").length,
    needsGps: rows.filter((r) => r.d.flags.needsGps).length,
    withPhone: rows.filter((r) => r.d.listedPhone.trim()).length,
    inventoryUnits,
    inventoryN: invRows.length,
    stockValue: stockRows.length ? sum(stockRows.map((r) => r.stockValue!)) : null,
    stockValueN: stockRows.length,
    medianAsp,
    aspN: aspRows.length,
    medianSize: median(sizeRows.map((r) => r.size!)),
    sizeN: sizeRows.length,
    avgSalesmen: salesmenRows.length ? sum(salesmenRows.map((r) => r.salesmen!)) / salesmenRows.length : null,
    salesmenN: salesmenRows.length,
    sampleSold,
    sampleFinanced,
    sampleGmv,
    sampleGapGmv,
    sampleFpr,
    sampleN: sample.length,
    impliedMonthlyGmv,
    impliedGapGmv,
    impliedWalkinGapGmv,
    walkinPct,
    walkinN: walkRows.length,
    capturePct,
    takePct,
    approvalPct,
    capturedMonthlyGmv,
    monthlyOrigination,
    annualOrigination,
    monthlyDeals,
    typeMix: mix(typeCounts, typeLabels),
    aspMix: mix(aspCounts, aspLabels),
    brandMix: mix(brandCounts, brandLabels),
    streetMix: mix(streetCounts, Object.fromEntries(Object.keys(streetCounts).map((k) => [k, k]))).slice(0, 6),
    bankMix: mix(bankCounts, Object.fromEntries(Object.keys(bankCounts).map((k) => [k, k]))).slice(0, 6),
    topByStock,
    whiteSpace,
  });

  return {
    universe: dealers.length,
    independents: live.length,
    authorised: rows.filter((r) => r.d.flags.authorised).length,
    competitors: rows.filter((r) => r.d.flags.competitor || r.d.status === "competitor").length,
    closed: rows.filter((r) => r.d.status === "closed").length,
    walked: rows.filter((r) => r.d.status !== "not_visited").length,
    complete: rows.filter((r) => r.d.status === "completed").length,
    needsGps: rows.filter((r) => r.d.flags.needsGps).length,
    withPhone: rows.filter((r) => r.d.listedPhone.trim()).length,
    withStreet: live.filter((r) => r.street).length,
    withMaps: rows.filter((r) => r.d.flags.mapsUrl).length,
    trained: rows.filter((r) => r.d.flags.trainingStage === "trained").length,
    trainingPriority: rows.filter((r) => r.d.flags.trainingPriority === "active").length,
    trainingHold: rows.filter((r) => r.d.flags.trainingStage === "hold").length,
    trainingScheduled: rows.filter(
      (r) => r.d.flags.trainingStage === "scheduled" || r.d.flags.trainingPriority === "scheduled",
    ).length,
    inventoryUnits,
    inventoryN: invRows.length,
    stockValue: stockRows.length ? sum(stockRows.map((r) => r.stockValue!)) : null,
    stockValueN: stockRows.length,
    medianAsp,
    aspN: aspRows.length,
    medianSize: median(sizeRows.map((r) => r.size!)),
    sizeN: sizeRows.length,
    avgSalesmen: salesmenRows.length ? sum(salesmenRows.map((r) => r.salesmen!)) / salesmenRows.length : null,
    salesmenN: salesmenRows.length,
    sampleSold,
    sampleFinanced,
    sampleGmv,
    sampleGapGmv,
    sampleFpr,
    sampleN: sample.length,
    impliedMonthlyGmv,
    impliedGapGmv,
    impliedWalkinGapGmv,
    walkinPct,
    walkinN: walkRows.length,
    capturePct,
    takePct,
    approvalPct,
    capturedMonthlyGmv,
    monthlyOrigination,
    annualOrigination,
    monthlyDeals,
    typeMix: mix(typeCounts, typeLabels),
    aspMix: mix(aspCounts, aspLabels),
    brandMix: mix(brandCounts, brandLabels),
    streetMix: mix(streetCounts, Object.fromEntries(Object.keys(streetCounts).map((k) => [k, k]))).slice(0, 6),
    bankMix: mix(bankCounts, Object.fromEntries(Object.keys(bankCounts).map((k) => [k, k]))).slice(0, 6),
    credibilityMix: mix(credCounts, credLabels),
    gpsMix: mix(gpsCounts, gpsLabels),
    topByStock,
    topByGap,
    whiteSpace,
    insights,
  };
}

function buildInsights(f: {
  lang: Lang;
  observedOnly: boolean;
  rows: Row[];
  live: Row[];
  sample: Row[];
  universe: number;
  independents: number;
  authorised: number;
  competitors: number;
  closed: number;
  walked: number;
  complete: number;
  needsGps: number;
  withPhone: number;
  inventoryUnits: number;
  inventoryN: number;
  stockValue: number | null;
  stockValueN: number;
  medianAsp: number | null;
  aspN: number;
  medianSize: number | null;
  sizeN: number;
  avgSalesmen: number | null;
  salesmenN: number;
  sampleSold: number;
  sampleFinanced: number;
  sampleGmv: number;
  sampleGapGmv: number;
  sampleFpr: number | null;
  sampleN: number;
  impliedMonthlyGmv: number | null;
  impliedGapGmv: number | null;
  impliedWalkinGapGmv: number | null;
  walkinPct: number | null;
  walkinN: number;
  capturePct: number;
  takePct: number;
  approvalPct: number;
  capturedMonthlyGmv: number | null;
  monthlyOrigination: number | null;
  annualOrigination: number | null;
  monthlyDeals: number | null;
  typeMix: MixSlice[];
  aspMix: MixSlice[];
  brandMix: MixSlice[];
  streetMix: MixSlice[];
  bankMix: MixSlice[];
  topByStock: RankedDealer[];
  whiteSpace: RankedDealer[];
}): Insight[] {
  const L = f.lang;
  const of = f.independents;
  const out: Insight[] = [];
  const add = (i: Insight | null) => {
    if (i) out.push(i);
  };

  add({
    id: "census-size",
    category: "coverage",
    title: tx(L, "Walking census", "المسح الميداني"),
    headline: tx(L, `${f.independents} independents`, `${f.independents} معرض مستقل`),
    body: tx(
      L,
      `${f.universe} pins on the roster · ${f.authorised} authorised contrast cases · ${f.competitors} competitors · ${f.closed} closed. This is the SAM frame for embedded desk finance.`,
      `${f.universe} دبوس في القائمة · ${f.authorised} وكيل معتمد للمقارنة · ${f.competitors} منافس · ${f.closed} مغلق. هذا إطار السوق المستهدف للتمويل داخل المعرض.`,
    ),
    why: tx(
      L,
      "Authorised OEM desks already have captive banks. The operating model is built on unauthorised independents.",
      "وكلاء العلامات لديهم بنوك أسيرة. النموذج التشغيلي يُبنى على المعارض المستقلة غير المعتمدة.",
    ),
    evidence: evidence(f.independents, f.universe, false),
  });

  const trainedRows = f.rows.filter((r) => r.d.flags.trainingStage === "trained");
  const activeRows = f.rows.filter((r) => r.d.flags.trainingPriority === "active");
  const holdRows = f.rows.filter((r) => r.d.flags.trainingStage === "hold");
  const scheduledRows = f.rows.filter(
    (r) => r.d.flags.trainingStage === "scheduled" || r.d.flags.trainingPriority === "scheduled",
  );
  const declinedRows = f.rows.filter((r) => r.d.flags.trainingStage === "declined");
  if (trainedRows.length || holdRows.length || scheduledRows.length) {
    add({
      id: "autolink-trained",
      category: "targeting",
      title: tx(L, "AutoLink induction", "تدريب أوتو لينك"),
      headline: tx(L, `${trainedRows.length} trained desks`, `${trainedRows.length} مكتب مُدرَّب`),
      body: tx(
        L,
        `${activeRows.map((r) => r.d.nameEn).join(", ") || "—"} are active users. ${holdRows.length} on hold with full interest (${holdRows.map((r) => r.d.nameEn).join(", ") || "—"}). ${scheduledRows.length} scheduled · ${declinedRows.length} declined. Sequence the next walk around hold + scheduled, not the full 300.`,
        `${activeRows.map((r) => r.d.nameEn).join("، ") || "—"} مستخدمون نشطون. ${holdRows.length} معلّق باهتمام كامل (${holdRows.map((r) => r.d.nameEn).join("، ") || "—"}). ${scheduledRows.length} موعد · ${declinedRows.length} رفض. رتّب الجولة التالية حول التعليق والمواعيد لا حول الـ 300.`,
      ),
      why: tx(
        L,
        "Trained desks are the only ones that can originate this week. Protect them with follow-up before expanding the intro list.",
        "المكاتب المُدرَّبة هي الوحيدة التي تُصدر هذا الأسبوع. احمِها بالمتابعة قبل توسيع قائمة التعارف.",
      ),
      evidence: evidence(trainedRows.length + holdRows.length + scheduledRows.length, f.independents, false),
    });
  }

  add({
    id: "gps-quality",
    category: "coverage",
    title: tx(L, "Pin accuracy", "دقة المواقع"),
    headline: tx(L, `${f.universe - f.needsGps} exact pins`, `${f.universe - f.needsGps} موقع دقيق`),
    body: tx(
      L,
      `${f.needsGps} still sit on interpolated walking-order coordinates. Open Maps uses the Google pin when a maps link was captured.`,
      `${f.needsGps} ما زالت على إحداثيات تقديرية من مسار المشي. زر الخرائط يستخدم رابط Google عند توفره.`,
    ),
    why: tx(
      L,
      "Route planning and showroom-density heat are only as good as the pins. Confirm the remaining ${n} on the next walk.".replace(
        "${n}",
        String(f.needsGps),
      ),
      `تخطيط المسار وكثافة المعارض تعتمد على دقة الدبابيس. أكّد المتبقي (${f.needsGps}) في الجولة القادمة.`,
    ),
    evidence: evidence(f.universe - f.needsGps, f.universe, true),
  });

  if (f.inventoryN >= 8) {
    add({
      id: "stock-on-lot",
      category: "market",
      title: tx(L, "Sellable stock on lot", "المخزون القابل للبيع"),
      headline: `${formatNumber(f.inventoryUnits)} u`,
      body: tx(
        L,
        `Visual count across ${f.inventoryN} independents. ${f.stockValue != null ? `Stock value on disclosed ASP is ${formatSarCompact(f.stockValue)} (${f.stockValueN} showrooms).` : "ASP is missing on some lots, so stock value is incomplete."}`,
        `عدّ بصري في ${f.inventoryN} معرض مستقل. ${f.stockValue != null ? `قيمة المخزون حسب الأسعار المصرّح بها ${formatSarCompact(f.stockValue)} (${f.stockValueN} معرض).` : "متوسط السعر ناقص في بعض المعارض، فقيمة المخزون غير مكتملة."}`,
      ),
      why: tx(
        L,
        "Lot size is the observable proxy for throughput until monthly sales are collected at the desk.",
        "حجم الساحة هو المؤشر المرئي للنشاط حتى تُجمع المبيعات الشهرية من المكتب.",
      ),
      evidence: evidence(f.inventoryN, of, f.observedOnly),
    });
  }

  if (f.medianAsp != null && f.aspN >= 8) {
    add({
      id: "median-asp",
      category: "market",
      title: tx(L, "Median asking price", "وسيط سعر البيع"),
      headline: formatSarCompact(f.medianAsp),
      body: tx(
        L,
        `Across ${f.aspN} independents. Core 70–120k is the SAMA personal-finance ticket; premium lots need a different underwriting path.`,
        `عبر ${f.aspN} معرض مستقل. الشريحة 70–120 ألف هي تذكرة التمويل الشخصي لساما؛ المعارض الفاخرة تحتاج مساراً ائتمانياً مختلفاً.`,
      ),
      why: tx(
        L,
        "Bank product design (tenor, down-payment, balloon) must match this ASP, not a Riyadh-wide average.",
        "تصميم منتج البنك (المدة، الدفعة، البالون) يجب أن يطابق هذا السعر لا متوسط الرياض.",
      ),
      evidence: evidence(f.aspN, of, f.observedOnly),
    });
  }

  const coreShare = f.aspMix.find((s) => s.key === "core");
  const premShare = f.aspMix.find((s) => s.key === "premium");
  if (coreShare) {
    add({
      id: "asp-core",
      category: "market",
      title: tx(L, "Core ticket share", "حصة الشريحة الأساسية"),
      headline: formatPct(coreShare.share * 100),
      body: tx(
        L,
        `${formatNumber(coreShare.n)} independents sit in 70–120k ASP. ${premShare ? `${formatPct(premShare.share * 100)} are premium 250k+ — a second product, not the launch SKU.` : ""}`,
        `${formatNumber(coreShare.n)} معرض في شريحة 70–120 ألف. ${premShare ? `${formatPct(premShare.share * 100)} فاخر 250 ألف+ — منتج ثانٍ وليس إطلاق المرحلة الأولى.` : ""}`,
      ),
      why: tx(
        L,
        "Launch with the modal independent ticket. Do not let luxury lots pull the first bank programme off-centre.",
        "أطلق على تذكرة المعرض المستقل الشائعة. لا تدع المعارض الفاخرة تجرّ برنامج البنك الأول بعيداً.",
      ),
      evidence: evidence(f.aspN, of, f.observedOnly),
    });
  }

  const used = f.typeMix.find((s) => s.key === "used_only");
  const neu = f.typeMix.find((s) => s.key === "new_only");
  const mixT = f.typeMix.find((s) => s.key === "mix");
  if (neu || used) {
    add({
      id: "new-vs-used",
      category: "market",
      title: tx(L, "New vs used mix", "جديد مقابل مستعمل"),
      headline: tx(
        L,
        `${formatPct((neu?.share ?? 0) * 100)} new`,
        `${formatPct((neu?.share ?? 0) * 100)} جديد`,
      ),
      body: tx(
        L,
        `${formatNumber(neu?.n ?? 0)} new-only · ${formatNumber(used?.n ?? 0)} used-only · ${formatNumber(mixT?.n ?? 0)} mixed. Eligibility rules (age, mileage, brand) split the book in two.`,
        `${formatNumber(neu?.n ?? 0)} جديد فقط · ${formatNumber(used?.n ?? 0)} مستعمل فقط · ${formatNumber(mixT?.n ?? 0)} مختلط. قواعد الأهلية (العمر، الكمية، العلامة) تقسم المحفظة نصفين.`,
      ),
      why: tx(
        L,
        "A single credit policy will reject half the desk. Bank partners need a new-car programme and a used-car programme.",
        "سياسة ائتمان واحدة سترفض نصف المكتب. الشركاء البنكيون يحتاجون برنامجاً للجديد وآخر للمستعمل.",
      ),
      evidence: evidence(f.live.filter((r) => r.vtype !== "unset").length, of, true),
    });
  }

  const toyota = f.brandMix.find((s) => s.key === "toyota");
  const chinese = f.brandMix.find((s) => s.key === "chinese");
  const lux = f.brandMix.find((s) => s.key === "luxury");
  if (toyota) {
    add({
      id: "toyota-gravity",
      category: "market",
      title: tx(L, "Toyota gravity", "ثقل تويوتا"),
      headline: formatPct(toyota.share * 100),
      body: tx(
        L,
        `Toyota appears on ${formatNumber(toyota.n)} independent lots. Chinese brands on ${formatNumber(chinese?.n ?? 0)}, luxury on ${formatNumber(lux?.n ?? 0)}. Residual and eligibility tables must start with Land Cruiser / Camry / Hilux.`,
        `تويوتا على ${formatNumber(toyota.n)} ساحة مستقلة. العلامات الصينية على ${formatNumber(chinese?.n ?? 0)}، الفاخر على ${formatNumber(lux?.n ?? 0)}. جداول القيمة والأهلية تبدأ بـ لاندكروزر / كامري / هايلكس.`,
      ),
      why: tx(
        L,
        "If the first bank programme cannot clear Toyota, the desk is dead on arrival in Al Qadisiyah.",
        "إذا لم يستطع برنامج البنك الأول تمرير تويوتا، فالمكتب ميت في القادسية.",
      ),
      evidence: evidence(f.live.filter((r) => r.brands.length).length, of, true),
    });
  }

  if (f.sampleN >= 3 && f.sampleFpr != null) {
    add({
      id: "sample-fpr",
      category: "financing",
      title: tx(L, "Disclosed finance penetration", "اختراق التمويل المصرّح"),
      headline: formatPct(f.sampleFpr * 100),
      body: tx(
        L,
        `${formatNumber(f.sampleSold)} sold / ${formatNumber(f.sampleFinanced)} financed on ${f.sampleN} lots that disclosed monthly volume. Gap GMV on that sample is ${formatSarCompact(f.sampleGapGmv)} / month. Treat as an interval — this is a thin financial sample.`,
        `${formatNumber(f.sampleSold)} مباع / ${formatNumber(f.sampleFinanced)} ممول في ${f.sampleN} معارض صرّحت بالحجم الشهري. فجوة التمويل في العينة ${formatSarCompact(f.sampleGapGmv)} / شهر. اعتبره نطاقاً — العينة المالية رفيعة.`,
      ),
      why: tx(
        L,
        "FPR is the core KPI. Every additional sit-down survey that captures sold vs financed tightens this number.",
        "معدل اختراق التمويل هو المؤشر الجوهري. كل زيارة مكتبية تضيف مبيعاً مقابل تمويل تضيّق هذا الرقم.",
      ),
      evidence: evidence(f.sampleN, of, f.observedOnly),
    });
  }

  if (f.sampleGmv > 0) {
    add({
      id: "disclosed-gmv",
      category: "financing",
      title: tx(L, "Disclosed GMV only", "الحجم المصرّح فقط"),
      headline: tx(L, `${formatSarCompact(f.sampleGmv)} / mo`, `${formatSarCompact(f.sampleGmv)} / شهر`),
      body: tx(
        L,
        `Sum of monthly sold × ASP on the ${f.sampleN} lots that actually disclosed volume. This is the floor — everything above it is implied from inventory turns.`,
        `مجموع المباع الشهري × السعر في ${f.sampleN} معارض صرّحت بالحجم. هذا القاع — كل ما فوقه مستنتج من دوران المخزون.`,
      ),
      why: tx(
        L,
        "Never present the implied TAM to a bank partner without this floor sitting next to it.",
        "لا تعرض حجم السوق الضمني على شريك بنك دون هذا القاع بجانبه.",
      ),
      evidence: evidence(f.sampleN, of, f.observedOnly),
    });
  }

  if (f.impliedMonthlyGmv != null) {
    add({
      id: "implied-gmv",
      category: "financing",
      title: tx(L, "Implied independent GMV", "حجم السوق المستقل الضمني"),
      headline: tx(L, `${formatSarCompact(f.impliedMonthlyGmv)} / mo`, `${formatSarCompact(f.impliedMonthlyGmv)} / شهر`),
      body: tx(
        L,
        `Method: median (sold ÷ inventory) on ${f.sampleN} volume lots × ${formatNumber(f.inventoryUnits)} units × median ASP ${formatSarCompact(f.medianAsp)}. Disclosed GMV on those lots is ${formatSarCompact(f.sampleGmv)} — the rest is an extrapolation, not a census.`,
        `الطريقة: وسيط (مباع ÷ مخزون) في ${f.sampleN} معارض حجم × ${formatNumber(f.inventoryUnits)} وحدة × وسيط السعر ${formatSarCompact(f.medianAsp)}. الحجم المصرّح في تلك المعارض ${formatSarCompact(f.sampleGmv)} — الباقي إسقاط لا حصر.`,
      ),
      why: tx(
        L,
        "This is the TAM skeleton for the business plan. It widens automatically as more monthly-sold figures are surveyed.",
        "هذا هيكل حجم السوق لخطة العمل. يتسع تلقائياً كلما أُضيفت أرقام مبيعات شهرية من الميدان.",
      ),
      evidence: evidence(f.sampleN, of, f.observedOnly),
    });
  }

  if (f.impliedGapGmv != null) {
    add({
      id: "finance-gap",
      category: "financing",
      title: tx(L, "Unfinanced GMV (SAM)", "حجم غير الممول (السوق المتاح)"),
      headline: tx(L, `${formatSarCompact(f.impliedGapGmv)} / mo`, `${formatSarCompact(f.impliedGapGmv)} / شهر`),
      body: tx(
        L,
        `Implied independent GMV × (1 − sample FPR ${formatPct((f.sampleFpr ?? 0) * 100)}). These are units leaving the lot without a bank contract through this showroom.`,
        `حجم المستقلين الضمني × (1 − اختراق العينة ${formatPct((f.sampleFpr ?? 0) * 100)}). هذه وحدات تغادر الساحة دون عقد بنك عبر هذا المعرض.`,
      ),
      why: tx(
        L,
        "The product does not steal existing bank volume. It captures the walk-out that currently goes to a branch — or cash.",
        "المنتج لا يسرق حجم البنوك القائم. يلتقط الخروج الذي يذهب اليوم لفرع البنك — أو للكاش.",
      ),
      evidence: evidence(f.sampleN, of, f.observedOnly),
    });
  }

  if (f.impliedWalkinGapGmv != null) {
    add({
      id: "desk-tam",
      category: "financing",
      title: tx(L, "Walk-in desk TAM", "السوق المتاح على المكتب"),
      headline: tx(
        L,
        `${formatSarCompact(f.impliedWalkinGapGmv)} / mo`,
        `${formatSarCompact(f.impliedWalkinGapGmv)} / شهر`,
      ),
      body: tx(
        L,
        `Finance-gap GMV × median walk-in share ${formatPct((f.walkinPct ?? 1) * 100)} (n=${f.walkinN || "—"}). Online-originated buyers are not standing at the desk.`,
        `فجوة التمويل × وسيط حصة الحضور ${formatPct((f.walkinPct ?? 1) * 100)} (n=${f.walkinN || "—"}). مشتري الإنترنت ليسوا واقفين عند المكتب.`,
      ),
      why: tx(
        L,
        "Embedded auto-finance wins or loses in the 20 minutes after a walk-in sits down. Desk TAM is the number the SOP is built on.",
        "التمويل المضمّن ينجح أو يفشل في العشرين دقيقة بعد جلوس الزائر. سوق المكتب هو رقم إجراءات التشغيل.",
      ),
      evidence: evidence(Math.max(f.sampleN, f.walkinN), of, f.observedOnly),
    });
  }

  if (f.annualOrigination != null && f.monthlyDeals != null) {
    add({
      id: "scenario-runway",
      category: "scenario",
      title: tx(L, "Planning scenario", "سيناريو التخطيط"),
      headline: tx(L, `${formatSarCompact(f.annualOrigination)} / yr`, `${formatSarCompact(f.annualOrigination)} / سنة`),
      body: tx(
        L,
        `Assumptions you control: capture ${formatPct(f.capturePct)} of desk TAM · ${formatPct(f.approvalPct)} bank approval · ${formatPct(f.takePct, 1)} take of financed GMV. ≈ ${formatNumber(f.monthlyDeals)} funded deals / month.`,
        `افتراضات تتحكم بها: التقاط ${formatPct(f.capturePct)} من سوق المكتب · موافقة بنك ${formatPct(f.approvalPct)} · ${formatPct(f.takePct, 1)} من حجم التمويل. ≈ ${formatNumber(f.monthlyDeals)} صفقة ممولة / شهر.`,
      ),
      why: tx(
        L,
        "Move the sliders. This is a planning model, not a forecast. It re-computes as surveys add volume and FPR.",
        "حرّك الأشرطة. هذا نموذج تخطيط لا توقع. يُعاد حسابه كلما أضاف المسح حجماً ومعدل تمويل.",
      ),
      evidence: evidence(f.sampleN, of, f.observedOnly),
    });
  }

  if (f.avgSalesmen != null && f.salesmenN >= 8) {
    add({
      id: "desk-staffing",
      category: "unit",
      title: tx(L, "Salesmen on the floor", "البائعون في الساحة"),
      headline: formatNumber(f.avgSalesmen, 1),
      body: tx(
        L,
        `Mean ${formatNumber(f.avgSalesmen, 1)} across ${f.salesmenN} independents. The SOP has to work one-handed for a salesman who already has three walk-ins.`,
        `المتوسط ${formatNumber(f.avgSalesmen, 1)} عبر ${f.salesmenN} معرض. إجراء التشغيل يجب أن يعمل بيد واحدة لبائع لديه ثلاثة زوار.`,
      ),
      why: tx(
        L,
        "If origination adds more than ~90 seconds at the desk, it will not be used. Design for the median floor, not a quiet Tuesday.",
        "إذا أضاف التمويل أكثر من نحو 90 ثانية على المكتب فلن يُستخدم. صمّم لأرضية وسيطة لا لثلاثاء هادئ.",
      ),
      evidence: evidence(f.salesmenN, of, f.observedOnly),
    });
  }

  if (f.medianSize != null && f.sizeN >= 8) {
    const sized = f.live.filter((r) => r.size != null && r.inv != null && r.size > 0);
    const dens = sized.length ? sum(sized.map((r) => r.inv!)) / sum(sized.map((r) => r.size!)) : null;
    add({
      id: "showroom-size",
      category: "unit",
      title: tx(L, "Typical independent floor", "مساحة المعرض النموذجي"),
      headline: `${formatNumber(f.medianSize)} m²`,
      body: tx(
        L,
        `Median of ${f.sizeN} measured/estimated floors. ${dens != null ? `≈ ${formatNumber(dens, 2)} units per m² on lots that have both figures.` : ""}`,
        `وسيط ${f.sizeN} مساحة مقاسة/مقدّرة. ${dens != null ? `≈ ${formatNumber(dens, 2)} وحدة لكل م² في الساحات ذات الرقمين.` : ""}`,
      ),
      why: tx(
        L,
        "Pilot hardware (tablet, standee, bank-rep chair) has to fit a 1,000 m² independent, not a franchise cathedral.",
        "أجهزة التجربة (تابلت، ستاند، كرسي مندوب البنك) يجب أن تناسب معرضاً مستقلاً 1,000 م² لا وكالة فخمة.",
      ),
      evidence: evidence(f.sizeN, of, f.observedOnly),
    });
  }

  if (f.topByStock.length) {
    const top10 = f.topByStock.slice(0, 10);
    const topVal = sum(top10.map((t) => t.value));
    const share = f.stockValue ? topVal / f.stockValue : null;
    add({
      id: "concentration",
      category: "risk",
      title: tx(L, "Stock concentration", "تركّز المخزون"),
      headline: share != null ? formatPct(share * 100) : top10[0]!.label,
      body: tx(
        L,
        `Top ${top10.length} independents hold ${formatSarCompact(topVal)} of disclosed stock value${share != null ? ` (${formatPct(share * 100)} of measured stock).` : "."} A 10-showroom pilot is not a rounding error.`,
        `أكبر ${top10.length} معارض مستقلة تحمل ${formatSarCompact(topVal)} من قيمة المخزون المصرّح${share != null ? ` (${formatPct(share * 100)} من المخزون المقاس).` : "."} تجربة 10 معارض ليست هامش خطأ.`,
      ),
      why: tx(
        L,
        "Sequence the pipeline by stock and finance-gap, not by walking order. The first ten logos set the KPI trajectory.",
        "رتّب خط الأنابيب حسب المخزون وفجوة التمويل لا حسب مسار المشي. أول عشرة شعارات ترسم مسار المؤشرات.",
      ),
      evidence: evidence(f.stockValueN, of, f.observedOnly),
    });
  }

  if (f.whiteSpace.length) {
    add({
      id: "white-space",
      category: "targeting",
      title: tx(L, "No bank on the floor", "بدون بنك في الساحة"),
      headline: tx(L, `${f.whiteSpace.length} ripe lots`, `${f.whiteSpace.length} ساحة جاهزة`),
      body: tx(
        L,
        `${f.whiteSpace.length} independents with ≥40 units and no named bank or on-site rep. First ${f.whiteSpace
          .slice(0, 3)
          .map((w) => w.name)
          .join(", ")}.`,
        `${f.whiteSpace.length} معرض مستقل بـ ≥40 وحدة دون بنك مسمّى أو مندوب. أولاً ${f.whiteSpace
          .slice(0, 3)
          .map((w) => w.name)
          .join("، ")}.`,
      ),
      why: tx(
        L,
        "White space is where a desk decision replaces a branch visit. Do not spend the first month fighting an incumbent bank rep.",
        "الفراغ هو حيث يستبدل قرار المكتب زيارة الفرع. لا تصرف الشهر الأول في قتال مندوب بنك قائم.",
      ),
      evidence: evidence(f.whiteSpace.length, of, true),
    });
  }

  const cash = f.live.filter((r) => /cash only/i.test(r.p.financingWorkaround || "") || /cash only/i.test(r.p.notes || "")).length;
  if (cash) {
    add({
      id: "cash-only",
      category: "risk",
      title: tx(L, "Cash-only lots", "معارض كاش فقط"),
      headline: String(cash),
      body: tx(
        L,
        `${cash} independents noted as cash-only. They are contrast / later-wave, not launch partners — the owner has already chosen a model.`,
        `${cash} معرض مستقل مُسجّل كاش فقط. حالات مقارنة / موجة لاحقة لا شركاء إطلاق — المالك اختار نموذجه.`,
      ),
      why: tx(
        L,
        "Do not score cash-only as refusals of the product. Score them as a different business.",
        "لا تُحسب معارض الكاش كرفض للمنتج. احسبها نشاطاً مختلفاً.",
      ),
      evidence: evidence(cash, of, true),
    });
  }

  if (f.competitors) {
    add({
      id: "competitors",
      category: "risk",
      title: tx(L, "Embedded-finance competitors", "منافسو التمويل المضمّن"),
      headline: String(f.competitors),
      body: tx(
        L,
        `${f.competitors} competitor pins (Carly, Soum and listed finance businesses) stay on the map as contrast — never as prospects.`,
        `${f.competitors} دبابيس منافسة (كارلي، سوم وأنشطة التمويل) تبقى على الخريطة للمقارنة — لا كفرص.`,
      ),
      why: tx(
        L,
        "The pitch is desk origination with SAMA-regulated banks, not a marketplace. Know where the other model already sits.",
        "العرض هو إصدار من المكتب عبر بنوك خاضعة لساما لا سوق إلكتروني. اعرف أين يجلس النموذج الآخر.",
      ),
      evidence: evidence(f.competitors, f.universe, true),
    });
  }

  const missingCr = f.live.filter((r) => !r.p.crNumber?.trim()).length;
  const missingPoc = f.live.filter((r) => !r.p.pocMobile?.trim()).length;
  const missingFin = f.live.filter((r) => r.p.financingLostNumber == null && !r.p.financingLostPerMonth).length;
  add({
    id: "field-gaps",
    category: "coverage",
    title: tx(L, "Sit-down gaps", "فجوات الزيارة المكتبية"),
    headline: tx(L, `${missingFin} missing FPR`, `${missingFin} بلا اختراق تمويل`),
    body: tx(
      L,
      `${missingCr} without CR · ${missingPoc} without POC mobile · ${missingFin} without a sold/financed pair. Surface census is rich; the financing conversation is still the scarce asset.`,
      `${missingCr} بلا سجل تجاري · ${missingPoc} بلا جوال المسؤول · ${missingFin} بلا زوج مبيع/تمويل. المسح السطحي غني؛ حديث التمويل ما زال الأصل النادر.`,
    ),
    why: tx(
      L,
      "Every new derivation in this engine lights up when those three fields are filled. The survey SOP should protect the financing step above cosmetics.",
      "كل اشتقاق جديد في هذه المحرّكة يضيء عند ملء هذه الحقول الثلاثة. إجراء المسح يجب أن يحمي خطوة التمويل فوق الشكل.",
    ),
    evidence: evidence(of - missingFin, of, false),
  });

  if (f.withPhone / Math.max(1, f.universe) < 0.4) {
    add({
      id: "phone-coverage",
      category: "coverage",
      title: tx(L, "Phone coverage", "تغطية الهواتف"),
      headline: formatPct((f.withPhone / f.universe) * 100),
      body: tx(
        L,
        `${f.withPhone} of ${f.universe} have a listed number. Ops follow-up and research tasks stall without it — harvest from the façade on the next pass.`,
        `${f.withPhone} من ${f.universe} لديهم رقم. المتابعة والبحث يتوقفان بدونه — التقطه من الواجهة في الجولة التالية.`,
      ),
      why: tx(
        L,
        "A showroom without a number cannot enter the contacted stage. This is an ops bottleneck, not a vanity metric.",
        "معرض بلا رقم لا يدخل مرحلة التواصل. هذا اختناق تشغيلي لا مؤشر تجميلي.",
      ),
      evidence: evidence(f.withPhone, f.universe, true),
    });
  }

  const rimah = f.streetMix.find((s) => /rimah|imah/i.test(s.key));
  const lajam = f.streetMix.find((s) => /lajam|لجام/i.test(s.key));
  if (rimah || lajam) {
    add({
      id: "corridors",
      category: "targeting",
      title: tx(L, "Two corridors", "ممرّان"),
      headline: tx(
        L,
        `${formatNumber((rimah?.n ?? 0) + (lajam?.n ?? 0))} on named streets`,
        `${formatNumber((rimah?.n ?? 0) + (lajam?.n ?? 0))} على شوارع مسمّاة`,
      ),
      body: tx(
        L,
        `${lajam ? `Wadi Al Lajam ${formatNumber(lajam.n)} · ` : ""}${rimah ? `Wadi Ar Rimah ${formatNumber(rimah.n)}` : ""}. Density means a walking day can cover a commercially meaningful cluster without a car.`,
        `${lajam ? `وادي اللجام ${formatNumber(lajam.n)} · ` : ""}${rimah ? `وادي الرمة ${formatNumber(rimah.n)}` : ""}. الكثافة تعني أن يوم مشي يغطي تجمّعاً تجارياً دون سيارة.`,
      ),
      why: tx(
        L,
        "Pilot logistics (bank-rep days, tablet drops, follow-ups) should be corridor-based, not scattershot across Exit 8.",
        "لوجستيات التجربة (أيام المندوب، الأجهزة، المتابعات) تُبنى على الممر لا عشوائياً حول مخرج 8.",
      ),
      evidence: evidence((rimah?.n ?? 0) + (lajam?.n ?? 0), of, true),
    });
  }

  if (f.bankMix.length) {
    add({
      id: "incumbent-banks",
      category: "risk",
      title: tx(L, "Banks already named", "بنوك مسمّاة"),
      headline: f.bankMix[0]!.label,
      body: tx(
        L,
        f.bankMix.map((b) => `${b.label} ${formatNumber(b.n)}`).join(" · ") +
          ". Named is not contracted — but it is the incumbent the salesman already knows how to call.",
        f.bankMix.map((b) => `${b.label} ${formatNumber(b.n)}`).join(" · ") +
          ". الاسم ليس عقداً — لكنه الطرف الذي يعرف البائع كيف يتصل به.",
      ),
      why: tx(
        L,
        "Partner selection should overlap the banks already trusted on the floor, then add speed. Do not lead with an unknown logo.",
        "اختيار الشريك يجب أن يتقاطع مع البنوك الموثوقة في الساحة ثم يضيف السرعة. لا تبدأ بشعار مجهول.",
      ),
      evidence: evidence(sum(f.bankMix.map((b) => b.n)), of, false),
    });
  }

  const deepShare = f.complete / Math.max(1, f.independents);
  add({
    id: "deep-vs-surface",
    category: "coverage",
    title: tx(L, "Surface vs sit-down", "سطح مقابل جلسة"),
    headline: formatPct(deepShare * 100),
    body: tx(
      L,
      `${f.complete} deep-complete of ${f.independents} independents. Most records are a walking visual census. Financing pain, FPR and pilot-openness still need a chair.`,
      `${f.complete} مسح مكتبي مكتمل من ${f.independents} مستقل. أغلب السجلات مسح بصري ماشٍ. ألم التمويل والاختراق والانفتاح على التجربة ما زالت تحتاج كرسياً.`,
    ),
    why: tx(
      L,
      "The engine gets smarter with every sit-down. Protect time on the lot for the financing page of the survey, not another brand photo.",
      "المحرّكة تزداد ذكاءً مع كل جلسة. احمِ الوقت في الساحة لصفحة التمويل في المسح لا لصورة علامة أخرى.",
    ),
    evidence: evidence(f.complete, f.independents, false),
  });

  return out;
}

export function nextInsight(insights: Insight[], currentId: string | null, category: InsightCategory | "all"): Insight {
  const pool = category === "all" ? insights : insights.filter((i) => i.category === category);
  const list = pool.length ? pool : insights;
  if (!list.length) {
    return {
      id: "empty",
      category: "coverage",
      title: "—",
      headline: "—",
      body: "",
      why: "",
      evidence: { n: 0, of: 0, quality: "thin", observedOnly: false },
    };
  }
  const idx = list.findIndex((i) => i.id === currentId);
  return list[(idx + 1) % list.length]!;
}
