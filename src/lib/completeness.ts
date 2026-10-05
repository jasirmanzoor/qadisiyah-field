import type { Dealership, SurveyPayload } from "@/lib/types";

export function missingChips(d: Dealership, s?: SurveyPayload): string[] {
  const chips: string[] = [];
  if (s?.avgSellingPriceSar == null) chips.push("ASP");
  if (!s?.financeAvailable) chips.push("Finance");
  if (!d.listedPhone.trim()) chips.push("Phone");
  if (d.flags.needsGps) chips.push("GPS");
  if (s?.inventoryUnits == null) chips.push("Stock");
  if (s?.inventoryAgePctOver5 == null) chips.push("Age");
  return chips;
}

export function completenessPct(d: Dealership, s?: SurveyPayload): number {
  const fields = [
    s?.avgSellingPriceSar != null,
    Boolean(s?.financeAvailable),
    Boolean(d.listedPhone.trim()),
    !d.flags.needsGps,
    s?.inventoryUnits != null,
    s?.inventoryAgePctOver5 != null,
    Boolean(s?.vehicleType),
    Boolean(s?.showroomSizeSqm),
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}
