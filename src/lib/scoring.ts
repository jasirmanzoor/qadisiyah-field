import type { Dealership, SurveyPayload } from "./types";
import { monthlyFinancedMid, monthlySoldMid } from "./survey-schema";

export function pilotScore(d: Dealership, p: SurveyPayload | undefined): number {
  if (!p || d.status === "competitor" || d.status === "refused" || d.status === "closed") return 0;
  let score = 0;
  const lost = p.financingLostNumber ?? (Number(p.financingLostPerMonth) || 0);
  if (lost >= 40) score += 40;
  else if (lost >= 16) score += 30;
  else if (lost >= 6) score += 20;
  else if (lost > 0) score += 10;

  const sold = p.monthlySoldExact ?? monthlySoldMid(p.avgMonthlySold);
  if (sold != null) {
    if (sold >= 75) score += 20;
    else if (sold >= 35) score += 14;
    else if (sold >= 10) score += 8;
  }

  const financed = p.monthlyFinancedExact ?? monthlyFinancedMid(p.avgMonthlyFinanced);
  if (sold != null && financed != null && sold > 0) {
    const gap = Math.max(0, sold - financed);
    score += Math.min(20, Math.round(gap / 5));
  }

  switch (p.openToPilot) {
    case "yes":
      score += 25;
      break;
    case "maybe":
      score += 12;
      break;
    case "too_early":
      score += 5;
      break;
    case "no":
      score -= 10;
      break;
    default:
      break;
  }

  if (d.flags.authorised) score -= 15;
  if (p.inventoryUnits && p.inventoryUnits >= 40) score += 8;
  if (d.flags.trainingStage === "trained") score += 18;
  if (d.flags.trainingPriority === "active") score += 10;
  if (d.flags.trainingStage === "hold") score += 8;
  if (d.flags.trainingStage === "declined") score -= 20;
  return Math.max(0, Math.min(100, score));
}

export function isObservedFigure(source: string | undefined | null, observedOnly: boolean): boolean {
  if (!observedOnly) return true;
  return source === "observed";
}
