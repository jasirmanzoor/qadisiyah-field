import type { SurveyPayload, VisitStatus } from "./types";

/** 27 Sep 2026 floor figures. Never carries a coordinate. Pins stay as they are. */
export type FloorPatch = {
  sdId: string;
  status?: VisitStatus;
  note?: string;
  survey: Partial<SurveyPayload>;
};

const floor = (
  sdId: string,
  survey: Partial<SurveyPayload>,
  note?: string,
  status: VisitStatus = "partial",
): FloorPatch => ({ sdId, survey, note, status });

export const SHIFA_FLOOR_SEP27: FloorPatch[] = [
  floor("S0005", {
    vehicleType: "mix",
    inventoryUnits: 35,
    avgSellingPriceSar: 100000,
    mainBrands: ["Toyota", "Hyundai Elantra", "Ford", "Hyundai Creta", "Nissan"],
  }, "New and old, less driven."),
  floor("S0034", {
    vehicleType: "new_only",
    inventoryUnits: 45,
    showroomSizeSqm: 1200,
    inventoryAgePctOver5: 0,
    avgSellingPriceSar: 110000,
    mainBrands: ["Ford", "Hyundai Elantra", "Hyundai Creta"],
  }, "Elantra and Creta 2026 are the dense rows."),
  floor("S0033", {
    vehicleType: "mix",
    inventoryUnits: 60,
    showroomSizeSqm: 1500,
    financeAvailable: "yes",
    mainBrands: ["Renault", "Hyundai", "Hyundai Santa Fe", "Nissan Urvan", "Geely", "Jetour"],
  }, "MARK: also written as معرض الجنوب."),
  floor("S0032", {}, "MARK: same name family as S0033 الجنوب الحديث. One door or two."),
  floor("S0026", {
    vehicleType: "used_only",
    mainBrands: ["Nissan", "Renault", "Hyundai"],
  }, "Nissan, Renault and Hyundai on the floor. Deep covered hall, two rows."),
  floor("S0053", {
    vehicleType: "new_only",
    inventoryUnits: 45,
    showroomSizeSqm: 800,
    inventoryAgePctOver5: 0,
    avgSellingPriceSar: 110000,
    mainBrands: ["Nissan", "Hyundai", "Toyota", "Kia", "Ford", "Jetour"],
  }),
  floor("S0036", {
    vehicleType: "used_only",
    inventoryUnits: 40,
    showroomSizeSqm: 1000,
    avgSellingPriceSar: 60000,
    mainBrands: ["Toyota Hiace", "Toyota Yaris", "MG", "Hyundai Elantra"],
  }, "Hiace vans and light trucks on the floor. Total includes the cars outside."),
  floor("S0007", {
    vehicleType: "mix",
    inventoryUnits: 125,
    inventoryInside: 100,
    inventoryOutside: 25,
    showroomSizeSqm: 2500,
    avgSellingPriceSar: 85000,
    mainBrands: ["Lexus", "Ford", "Chevrolet", "Hyundai", "Toyota", "Isuzu", "Hyundai Elantra", "Maxus"],
  }, "Inside was written as 100+. Light trucks and a few light buses."),
  floor("S0037", {
    vehicleType: "used_only",
    inventoryUnits: 50,
    inventoryOutside: 11,
    inventoryInside: 39,
    showroomSizeSqm: 1200,
    inventoryAgePctOver5: 65,
    avgSellingPriceSar: 70000,
    financeAvailable: "no",
    mainBrands: ["Hyundai", "Toyota", "Kia", "Toyota Land Cruiser"],
  }, "Cash only."),
  floor("S0056", {
    vehicleType: "mix",
    inventoryUnits: 150,
    showroomSizeSqm: 1500,
    inventoryAgePctOver5: 25,
    avgSellingPriceSar: 130000,
    financeAvailable: "yes",
    salesmenCount: 10,
    mainBrands: ["Toyota", "Lexus", "Hyundai", "Kia", "Jeep", "Nissan", "Chevrolet", "Ford", "Mitsubishi", "GMC", "Mercedes", "Infiniti", "Isuzu", "MG"],
  }),
  floor("S0022", {}, "MARK: same Arabic name and same pin as S0104."),
  floor("S0104", {}, "MARK: same Arabic name and same pin as S0022."),
  floor("S0035", {}, "MARK: the branch is a separate door."),
  floor("S0107", {}, "MARK: a second المالكي door is on the sheet. Same door or not."),
];

export type FloorNew = {
  sdId: string;
  nameEn: string;
  nameAr: string;
  lat: number;
  lng: number;
  needsGps?: boolean;
  status?: VisitStatus;
  note?: string;
  survey: Partial<SurveyPayload>;
};

/** New doors that have a real pin. No guessed coordinates. */
export const SHIFA_FLOOR_NEW: FloorNew[] = [
  {
    sdId: "S13NB2",
    nameEn: "Nibras Used Cars 2",
    nameAr: "معرض نبراس الهدف 2",
    lat: 24.5496468,
    lng: 46.6830597,
    survey: {
      vehicleType: "used_only",
      inventoryUnits: 35,
      inventoryAgePctOver5: 70,
      avgSellingPriceSar: 90000,
      mainBrands: ["Kia", "Nissan", "Mazda", "Toyota", "Honda", "Lexus", "BMW"],
    },
    note: "MARK: side by side with the other Nibras.",
  },
  {
    sdId: "S13WSF",
    nameEn: "Wisam Al Shifa Cars",
    nameAr: "معرض وسام الشفا للسيارات",
    lat: 24.5489625,
    lng: 46.6824844,
    needsGps: true,
    survey: {
      vehicleType: "used_only",
      inventoryUnits: 140,
      inventoryInside: 120,
      inventoryOutside: 20,
      showroomSizeSqm: 2000,
      inventoryAgePctOver5: 40,
      avgSellingPriceSar: 150000,
      financeAvailable: "yes",
      salesmenCount: 12,
      monthlySoldExact: 100,
      monthlyFinancedExact: 60,
      fpr: 0.6,
      mainBrands: ["Toyota", "Lexus", "Hyundai", "Honda", "Mazda", "Mitsubishi", "Nissan", "GMC"],
    },
    note: "Pin is the map plus-code centre. Tap the door if it sits off the sign.",
  },
  {
    sdId: "S13ADS",
    nameEn: "Adwaa Shubra Cars",
    nameAr: "معرض أضواء شبرا للسيارات",
    lat: 24.5477875,
    lng: 46.6841406,
    needsGps: true,
    status: "not_visited",
    survey: {},
    note: "MARK: not أضواء سويدان and not أضواء الحرمين. Pin is the map plus-code centre.",
  },
];
