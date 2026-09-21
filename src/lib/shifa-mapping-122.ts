import raw from "./shifa-mapping-122.json";

export type ShifaGpsFix = {
  sdId: string; nameEn: string; nameAr: string; lat: number; lng: number;
  street: string; needsGps: boolean; mapsUrl: string;
};

type Row = [string, string, string, number, number, string, boolean];

export const SHIFA_MAPPING_122: ShifaGpsFix[] = (raw as Row[]).map(([sdId, nameEn, nameAr, lat, lng, street, needsGps]) => ({
  sdId, nameEn, nameAr, lat, lng, street, needsGps,
  mapsUrl: `https://www.google.com/maps?q=${lat},${lng}`,
}));

export const SHIFA_MAPPING_BY_ID = new Map(SHIFA_MAPPING_122.map((r) => [r.sdId, r]));
export const SHIFA_MAPPING_COUNT = SHIFA_MAPPING_122.length;
