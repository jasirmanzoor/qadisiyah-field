import type { Dealership, PhotoRecord, SurveyPayload, SurveyRecord } from "./types";
import { STATUS_LABEL } from "./i18n";

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function xmlEscape(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;");
}

const COLUMNS: { key: string; header: string }[] = [
  { key: "sdId", header: "SD ID" },
  { key: "nameEn", header: "Name EN" },
  { key: "nameAr", header: "Name AR" },
  { key: "status", header: "Visit status" },
  { key: "lat", header: "Lat" },
  { key: "lng", header: "Lng" },
  { key: "listedPhone", header: "Listed phone" },
  { key: "crNumber", header: "CR number" },
  { key: "showroomSizeSqm", header: "Showroom sqm" },
  { key: "showroomSizeSource", header: "Size source (observed/self-reported)" },
  { key: "sizeBasis", header: "Size basis" },
  { key: "vehicleType", header: "Vehicle type" },
  { key: "inventoryAgeMix", header: "Inventory age mix" },
  { key: "pocName", header: "POC name" },
  { key: "pocRole", header: "POC role" },
  { key: "pocMobile", header: "POC mobile" },
  { key: "decisionMaker", header: "Decision maker" },
  { key: "salesmenCount", header: "Salesmen" },
  { key: "salesmenSource", header: "Salesmen source" },
  { key: "mainBrands", header: "Main brands" },
  { key: "authorisedDealer", header: "Authorised dealer" },
  { key: "authorisedBrand", header: "Authorised brand" },
  { key: "inventoryUnits", header: "Sellable units" },
  { key: "inventoryBasis", header: "Inventory basis" },
  { key: "inventorySource", header: "Inventory source" },
  { key: "avgSellingPriceSar", header: "Avg selling price SAR" },
  { key: "avgPriceSource", header: "Price source" },
  { key: "avgMonthlySold", header: "Avg monthly sold" },
  { key: "monthlySoldExact", header: "Monthly sold (exact)" },
  { key: "avgMonthlyFinanced", header: "Avg monthly financed" },
  { key: "monthlyFinancedExact", header: "Monthly financed (exact)" },
  { key: "fpr", header: "FPR" },
  { key: "financingLostPerMonth", header: "Financing lost / month" },
  { key: "financingLostNumber", header: "Financing lost number" },
  { key: "financingLostSource", header: "Financing lost source" },
  { key: "mainFailReason", header: "Main fail reason" },
  { key: "financingWorkaround", header: "Financing workaround" },
  { key: "banksPartnered", header: "Banks partnered" },
  { key: "bankRepOnSite", header: "Bank rep on site" },
  { key: "buyerMix", header: "Buyer mix" },
  { key: "leadOnlinePct", header: "Lead mix online %" },
  { key: "volumeFiguresAre", header: "Volume figures are" },
  { key: "informationCredibility", header: "Information credibility" },
  { key: "street", header: "Street / corridor" },
  { key: "gpsSource", header: "GPS source" },
  { key: "openToPilot", header: "Open to pilot" },
  { key: "trainingPriority", header: "Training priority" },
  { key: "trainingStage", header: "Training stage" },
  { key: "trainingNote", header: "Training note" },
  { key: "failedSession", header: "Failed session" },
  { key: "notes", header: "Notes" },
  { key: "photoCount", header: "Photo count" },
  { key: "seedNote", header: "Seed note" },
  { key: "flags", header: "Flags" },
];

function rowValues(d: Dealership, s: SurveyPayload | undefined, photos: number): Record<string, unknown> {
  return {
    nameEn: d.nameEn,
    nameAr: d.nameAr,
    sdId: d.flags.sdId ?? "",
    status: STATUS_LABEL.en[d.status] ?? d.status,
    lat: d.lat,
    lng: d.lng,
    listedPhone: d.listedPhone,
    crNumber: s?.crNumber ?? "",
    showroomSizeSqm: s?.showroomSizeSqm ?? "",
    showroomSizeSource: s?.showroomSizeSource ?? "",
    sizeBasis: s?.sizeBasis ?? "",
    vehicleType: s?.vehicleType ?? "",
    inventoryAgeMix: s?.inventoryAgeMix ?? "",
    pocName: s?.pocName ?? "",
    pocRole: s?.pocRole ?? "",
    pocMobile: s?.pocMobile ?? "",
    decisionMaker: s?.decisionMaker ?? "",
    salesmenCount: s?.salesmenCount ?? "",
    salesmenSource: s?.salesmenSource ?? "",
    mainBrands: (s?.mainBrands ?? []).join("; "),
    authorisedDealer: s?.authorisedDealer ?? "",
    authorisedBrand: s?.authorisedBrand ?? "",
    inventoryUnits: s?.inventoryUnits ?? "",
    inventoryBasis: s?.inventoryBasis ?? "",
    inventorySource: s?.inventorySource ?? "",
    avgSellingPriceSar: s?.avgSellingPriceSar ?? "",
    avgPriceSource: s?.avgPriceSource ?? "",
    avgMonthlySold: s?.avgMonthlySold ?? "",
    monthlySoldExact: s?.monthlySoldExact ?? "",
    avgMonthlyFinanced: s?.avgMonthlyFinanced ?? "",
    monthlyFinancedExact: s?.monthlyFinancedExact ?? "",
    fpr: s?.fpr ?? "",
    financingLostPerMonth: s?.financingLostPerMonth ?? "",
    financingLostNumber: s?.financingLostNumber ?? "",
    financingLostSource: s?.financingLostSource ?? "",
    mainFailReason: s?.mainFailReason ?? "",
    financingWorkaround: s?.financingWorkaround ?? "",
    banksPartnered: (s?.banksPartnered ?? []).join("; "),
    bankRepOnSite: s?.bankRepOnSite ?? "",
    buyerMix: s?.buyerMix ?? "",
    leadOnlinePct: s?.leadOnlinePct ?? "",
    volumeFiguresAre: s?.volumeFiguresAre ?? "",
    informationCredibility: s?.informationCredibility ?? d.flags.credibility ?? "",
    street: s?.street ?? d.flags.street ?? "",
    gpsSource: d.flags.gpsSource ?? "",
    openToPilot: s?.openToPilot ?? "",
    trainingPriority: d.flags.trainingPriority ?? "",
    trainingStage: d.flags.trainingStage ?? "",
    trainingNote: d.flags.trainingNote ?? "",
    failedSession: d.flags.failedSession ?? "",
    notes: s?.notes ?? "",
    photoCount: photos,
    seedNote: d.seedNote,
    flags: JSON.stringify(d.flags),
  };
}

export function buildCsv(
  dealerships: Dealership[],
  surveys: SurveyRecord[],
  photos: PhotoRecord[],
): string {
  const surveyBy = new Map(surveys.map((s) => [s.dealershipId, s.payload]));
  const photoCount = new Map<string, number>();
  for (const p of photos) photoCount.set(p.dealershipId, (photoCount.get(p.dealershipId) ?? 0) + 1);
  const header = COLUMNS.map((c) => csvEscape(c.header)).join(",");
  const lines = dealerships.map((d) => {
    const vals = rowValues(d, surveyBy.get(d.id), photoCount.get(d.id) ?? 0);
    return COLUMNS.map((c) => csvEscape(vals[c.key])).join(",");
  });
  return `\uFEFF${header}\n${lines.join("\n")}`;
}

export function buildExcelXml(
  dealerships: Dealership[],
  surveys: SurveyRecord[],
  photos: PhotoRecord[],
): string {
  const surveyBy = new Map(surveys.map((s) => [s.dealershipId, s.payload]));
  const photoCount = new Map<string, number>();
  for (const p of photos) photoCount.set(p.dealershipId, (photoCount.get(p.dealershipId) ?? 0) + 1);
  const headerCells = COLUMNS.map((c) => `<Cell><Data ss:Type="String">${xmlEscape(c.header)}</Data></Cell>`).join(
    "",
  );
  const rows = dealerships
    .map((d) => {
      const vals = rowValues(d, surveyBy.get(d.id), photoCount.get(d.id) ?? 0);
      const cells = COLUMNS.map((c) => {
        const v = vals[c.key];
        const isNum = typeof v === "number";
        return `<Cell><Data ss:Type="${isNum ? "Number" : "String"}">${xmlEscape(v)}</Data></Cell>`;
      }).join("");
      return `<Row>${cells}</Row>`;
    })
    .join("");
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Qadisiyah Field"><Table>
<Row>${headerCells}</Row>
${rows}
</Table></Worksheet></Workbook>`;
}

export function downloadBlob(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
