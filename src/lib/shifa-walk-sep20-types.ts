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
