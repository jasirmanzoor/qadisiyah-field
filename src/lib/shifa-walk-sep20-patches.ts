import type { SurveyPayload, VisitStatus } from "./types";

export type ShifaWalked = {
  visitDate: string;
  inventoryUnits?: number | null;
  inventoryInside?: number | null;
  inventoryOutside?: number | null;
  inventoryAgePctOver5?: number | null;
  showroomSizeSqm?: number | null;
  mainBrands: string[];
  avgSellingPriceSar?: number | null;
  salesmenCount?: number | null;
  financeAvailable?: SurveyPayload["financeAvailable"];
  financeEvidence?: string;
  vehicleType?: SurveyPayload["vehicleType"];
};

export type ShifaSeedIn = {
  sdId: string;
  nameEn: string;
  nameAr: string;
  pos: { eastM: number; northM: number };
  street: string;
  note: string;
  mapsUrl?: string;
  status?: VisitStatus;
  walked?: ShifaWalked;
};

export const SHIFA_WALK_PATCHES: ShifaSeedIn[] = [
  {
    sdId: "S0084",
    nameEn: "Ramz Al Qiyada Cars",
    nameAr: "معرض رمز القياده للسيارات",
    pos: { eastM: 520, northM: 15 },
    street: "Ahmad Al Basri",
    note: "Reconfirmed 20 Sep 2026. Premium used only. Cash only. Inventory not counted.",
    walked: {
      visitDate: "2026-09-20",
      inventoryAgePctOver5: 5,
      showroomSizeSqm: 700,
      mainBrands: ["Mercedes", "BMW", "Jetour", "Genesis", "Mini", "Lexus"],
      avgSellingPriceSar: 180000,
      financeAvailable: "no",
      financeEvidence: "Owner does not want finance — cash only",
      vehicleType: "used_only",
    },
  },
  {
    sdId: "S0015",
    nameEn: "Al Tajweed Showroom",
    nameAr: "معرض التجويد للسيارات",
    pos: { eastM: 0, northM: 0 },
    street: "Ibn Sayyidah",
    mapsUrl: "https://maps.app.goo.gl/GANCeEcPUxi8iREp9?g_st=ic",
    note: "Floor notes 20 Sep 2026. Used only. Inv 50. ASP 80k. 30% over 5 years. 800 m2.",
    walked: {
      visitDate: "2026-09-20",
      inventoryUnits: 50,
      inventoryAgePctOver5: 30,
      showroomSizeSqm: 800,
      mainBrands: [],
      avgSellingPriceSar: 80000,
      financeAvailable: "unknown",
      vehicleType: "used_only",
    },
  },
  {
    sdId: "S0022",
    nameEn: "Al Shenaifi Cars",
    nameAr: "معرض الشنيفي للسيارات",
    pos: { eastM: 0, northM: 0 },
    street: "Ibn Sayyidah",
    note: "Floor notes 20 Sep 2026. Mix. Nissan pickup commercial. Inv 65. ASP 60k. Distinct from S0105.",
    walked: {
      visitDate: "2026-09-20",
      inventoryUnits: 65,
      inventoryAgePctOver5: 10,
      showroomSizeSqm: 800,
      mainBrands: ["Nissan"],
      avgSellingPriceSar: 60000,
      financeAvailable: "unknown",
      vehicleType: "mix",
    },
  },
  {
    sdId: "S0017",
    nameEn: "Karaa Cars",
    nameAr: "معرض كراء للسيارات",
    pos: { eastM: 0, northM: 0 },
    street: "Ibn Sayyidah",
    status: "closed",
    note: "CLOSED FOR SALE — 20 Sep 2026. Do not survey as a live prospect.",
    walked: { visitDate: "2026-09-20", mainBrands: [], vehicleType: "used_only" },
  },
  {
    sdId: "S0010",
    nameEn: "Country of Arabism Motor Show",
    nameAr: "معرض بلاد العروبة للسيارات",
    pos: { eastM: 0, northM: 0 },
    street: "Ahmad Al Basri",
    mapsUrl: "https://maps.app.goo.gl/AYWx5AWnjpMQrEdZA?g_st=ic",
    note: "Floor notes 20 Sep 2026. Used only. Inv 40. ASP 90k. All banks on wall.",
    walked: {
      visitDate: "2026-09-20",
      inventoryUnits: 40,
      inventoryAgePctOver5: 5,
      showroomSizeSqm: 800,
      mainBrands: ["GMC", "Hyundai", "Toyota", "Jetour"],
      avgSellingPriceSar: 90000,
      financeAvailable: "yes",
      financeEvidence: "All banks — board on wall",
      vehicleType: "used_only",
    },
  },
  {
    sdId: "S0043",
    nameEn: "Fahd Al Fulaij Cars",
    nameAr: "معرض فهد الفليج للسيارات",
    pos: { eastM: 0, northM: 0 },
    street: "Al Shifa strip",
    mapsUrl: "https://maps.app.goo.gl/trjEzUyLAdXMkhUY6?g_st=ic",
    note: "Floor notes 20 Sep 2026. Mix mostly new plus used premium. Inv 60. ASP 120k. No bank visible.",
    walked: {
      visitDate: "2026-09-20",
      inventoryUnits: 60,
      inventoryInside: 60,
      inventoryOutside: 0,
      inventoryAgePctOver5: 10,
      showroomSizeSqm: 1000,
      mainBrands: ["Ford", "Toyota", "Nissan", "Lexus", "BMW"],
      avgSellingPriceSar: 120000,
      financeAvailable: "no",
      financeEvidence: "No bank visible",
      vehicleType: "mix",
    },
  },
];
