import type { SurveyPayload } from "./types";

export const SURVEY_STEPS = [
  { id: "identity", titleEn: "Identity", titleAr: "الهوية" },
  { id: "visit", titleEn: "Visit", titleAr: "الزيارة" },
  { id: "business", titleEn: "Business", titleAr: "المنشأة" },
  { id: "people", titleEn: "People", titleAr: "الأشخاص" },
  { id: "commercial", titleEn: "Commercial", titleAr: "تجاري" },
  { id: "financing", titleEn: "Financing pain", titleAr: "ألم التمويل" },
  { id: "customers", titleEn: "Customers", titleAr: "العملاء" },
  { id: "quality", titleEn: "Data quality", titleAr: "جودة البيانات" },
] as const;

export type SurveyStepId = (typeof SURVEY_STEPS)[number]["id"];

export function canSubmitSurvey(p: SurveyPayload): { ok: boolean; reason?: string } {
  if (!p.volumeFiguresAre) return { ok: false, reason: "Tag how volume figures were obtained." };
  if (!p.openToPilot) return { ok: false, reason: "Record whether they are open to a pilot." };
  return { ok: true };
}

export function surveyCompleteness(p: SurveyPayload): {
  missingCr: boolean;
  missingPoc: boolean;
  missingFinancing: boolean;
  filled: number;
  total: number;
} {
  const checks: [boolean, number][] = [
    [Boolean(p.crNumber?.trim()), 1],
    [Boolean(p.pocMobile?.trim()), 1],
    [Boolean(p.financingLostPerMonth || p.financingLostNumber != null), 1],
    [Boolean(p.pocName?.trim()), 1],
    [Boolean(p.vehicleType), 1],
    [Boolean((p.mainBrands ?? []).length), 1],
    [p.inventoryUnits != null, 1],
    [Boolean(p.avgMonthlySold), 1],
    [Boolean(p.avgMonthlyFinanced), 1],
    [Boolean(p.volumeFiguresAre), 1],
    [Boolean(p.openToPilot), 1],
    [Boolean(p.mainFailReason?.trim()), 1],
  ];
  const filled = checks.filter(([ok]) => ok).length;
  return {
    missingCr: !p.crNumber?.trim(),
    missingPoc: !p.pocMobile?.trim(),
    missingFinancing: !(p.financingLostPerMonth || p.financingLostNumber != null),
    filled,
    total: checks.length,
  };
}

export function inferStatus(p: SurveyPayload, current: SurveyPayload["visitStatus"]) {
  if (current && current !== "not_visited" && current !== "partial") return current;
  const { filled, total } = surveyCompleteness(p);
  if (filled === 0) return current || "not_visited";
  if (filled >= Math.ceil(total * 0.7) && p.volumeFiguresAre && p.openToPilot) return "completed";
  return "partial";
}

export function monthlySoldMid(band: SurveyPayload["avgMonthlySold"]): number | null {
  switch (band) {
    case "0_20":
      return 10;
    case "21_50":
      return 35;
    case "51_100":
      return 75;
    case "100plus":
      return 120;
    default:
      return null;
  }
}

export function monthlyFinancedMid(band: SurveyPayload["avgMonthlyFinanced"]): number | null {
  switch (band) {
    case "0_5":
      return 2;
    case "6_15":
      return 10;
    case "16_40":
      return 28;
    case "40plus":
      return 50;
    default:
      return null;
  }
}

export function sourceBadge(source?: string | null): "observed" | "self_reported" | "mixed" | "untagged" {
  if (source === "observed" || source === "self_reported" || source === "mixed") return source;
  return "untagged";
}
