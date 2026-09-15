import type { SurveyPayload } from "./types";

/** 15 Sep 2026 Al Shifa floor notes. Corridor-placed east of S0073 Al Jaidi. */
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
};

export type ShifaSeedIn = {
  sdId: string;
  nameEn: string;
  nameAr: string;
  pos: { eastM: number; northM: number };
  street: string;
  note: string;
  walked?: ShifaWalked;
};

export const SHIFA_WALK_SEP15: ShifaSeedIn[] = [
  {
    sdId: "S0074",
    nameEn: "Al Shabih Al Faddi Cars",
    nameAr: "معرض الشبح الفضي للسيارات",
    pos: { eastM: 220, northM: 15 },
    street: "Ahmad Al Basri",
    note: "Floor notes 15 Sep 2026. Large-volume used lot. Wide brand mix including BMW / Mercedes / Lexus. Finance unknown. GPS still needs a tap — pin placed east of S0073 Al Jaidi.",
    walked: {
      visitDate: "2026-09-15",
      inventoryUnits: 100,
      inventoryInside: 85,
      inventoryOutside: 15,
      inventoryAgePctOver5: 20,
      showroomSizeSqm: 2000,
      mainBrands: ["Toyota", "Hyundai", "Honda", "Kia", "BMW", "Mercedes", "Lexus", "Ford", "Nissan", "GMC", "Dodge", "Jeep", "Chevrolet"],
      avgSellingPriceSar: 100000,
      salesmenCount: 3,
    },
  },
  {
    sdId: "S0075",
    nameEn: "Heibat Al Qiyada Cars",
    nameAr: "معرض هيبة القيادة للسيارات",
    pos: { eastM: 250, northM: 15 },
    street: "Ahmad Al Basri",
    note: "Floor notes 15 Sep 2026. Strong focus on commercial vehicles and light/medium trucks. Large qty of Isuzu trucks. Finance unknown. GPS still needs a tap — pin placed east of S0073.",
    walked: {
      visitDate: "2026-09-15",
      inventoryUnits: 20,
      inventoryInside: 16,
      inventoryOutside: 4,
      inventoryAgePctOver5: 30,
      showroomSizeSqm: 600,
      mainBrands: ["Isuzu", "Ford", "Toyota", "Hyundai"],
      avgSellingPriceSar: 100000,
      salesmenCount: 2,
    },
  },
  {
    sdId: "S0076",
    nameEn: "Marqab Al Sharq Cars",
    nameAr: "معرض مرقاب الشرق لبيع و شراء السيارات",
    pos: { eastM: 280, northM: 15 },
    street: "Ahmad Al Basri",
    note: "Floor notes 15 Sep 2026. Large-volume used-car showroom. Wide mix of sedans, SUVs, pickups and commercial vehicles. Finance unknown. GPS still needs a tap — pin placed east of S0073.",
    walked: {
      visitDate: "2026-09-15",
      inventoryUnits: 80,
      inventoryInside: 75,
      inventoryOutside: 5,
      inventoryAgePctOver5: 55,
      showroomSizeSqm: 1200,
      mainBrands: ["Toyota", "Hyundai", "GMC", "Chevrolet", "Ford", "Nissan", "Mitsubishi", "Isuzu", "Kia", "Honda"],
      avgSellingPriceSar: 75000,
      salesmenCount: 2,
    },
  },
  {
    sdId: "S0077",
    nameEn: "Abdullah Al Otaibi Cars",
    nameAr: "معرض عبدالله العتيبي للسيارات",
    pos: { eastM: 310, northM: 15 },
    street: "Ahmad Al Basri",
    note: "Floor notes 15 Sep 2026. Large-volume used lot. SUVs and sedans. High qty of Toyota and Hyundai. Mostly economy to upper-mid segment. Distinct from S0049 Abdullah Nashban. Finance unknown. Salesmen not counted. GPS still needs a tap — pin placed east of S0073.",
    walked: {
      visitDate: "2026-09-15",
      inventoryUnits: 60,
      inventoryInside: 54,
      inventoryOutside: 6,
      inventoryAgePctOver5: 25,
      showroomSizeSqm: 1100,
      mainBrands: ["Toyota", "Hyundai", "Chevrolet", "Nissan", "GMC", "Ford", "Kia", "Honda", "Lexus"],
      avgSellingPriceSar: 85000,
    },
  },
  {
    sdId: "S0078",
    nameEn: "Faisal Uqab Al Mutairi Cars",
    nameAr: "معرض فيصل عقاب المطيري للسيارات",
    pos: { eastM: 340, northM: 15 },
    street: "Ahmad Al Basri",
    note: "Floor notes 15 Sep 2026. High qty of Nissan Patrol. Strong focus on pickups and commercial vehicles. Large qty of older vehicles. Finance unknown. Salesmen not counted. GPS still needs a tap — pin placed east of S0073.",
    walked: {
      visitDate: "2026-09-15",
      inventoryUnits: 55,
      inventoryInside: 50,
      inventoryOutside: 5,
      inventoryAgePctOver5: 70,
      showroomSizeSqm: 1100,
      mainBrands: ["Nissan", "Toyota", "Chevrolet", "Isuzu"],
      avgSellingPriceSar: 55000,
    },
  },
  {
    sdId: "S0079",
    nameEn: "Talal Cars",
    nameAr: "معرض طلال للسيارات",
    pos: { eastM: 370, northM: 15 },
    street: "Ahmad Al Basri",
    note: "Floor notes 15 Sep 2026. Large used-car showroom. Strong mix of mainstream sedans. Significant quantity of Peugeot. Mix of newer and older cars. Finance unknown. GPS still needs a tap — pin placed east of S0073.",
    walked: {
      visitDate: "2026-09-15",
      inventoryUnits: 100,
      inventoryInside: 85,
      inventoryOutside: 15,
      inventoryAgePctOver5: 45,
      showroomSizeSqm: 2400,
      mainBrands: ["Toyota", "Hyundai", "Nissan", "Kia", "Chevrolet", "Ford", "Peugeot", "Renault", "Changan", "Honda"],
      avgSellingPriceSar: 60000,
      salesmenCount: 3,
    },
  },
  {
    sdId: "S0080",
    nameEn: "Khulaif Cars",
    nameAr: "معرض خليف للسيارات",
    pos: { eastM: 400, northM: 15 },
    street: "Ahmad Al Basri",
    note: "Floor notes 15 Sep 2026. Majority Toyota Land Cruiser. Also commercial light trucks and SUVs. Young stock (~90% under 5 years). Finance unknown. Salesmen not counted. GPS still needs a tap — pin placed east of S0073.",
    walked: {
      visitDate: "2026-09-15",
      inventoryUnits: 70,
      inventoryInside: 65,
      inventoryOutside: 5,
      inventoryAgePctOver5: 10,
      showroomSizeSqm: 1000,
      mainBrands: ["Toyota", "Chevrolet", "Ford", "GMC", "Hyundai", "Kia", "Geely", "Chery", "Genesis"],
      avgSellingPriceSar: 120000,
    },
  },
  {
    sdId: "S0081",
    nameEn: "Shawafir Cars",
    nameAr: "معرض شوافر للسيارات",
    pos: { eastM: 430, northM: 15 },
    street: "Ahmad Al Basri",
    note: "Floor notes 15 Sep 2026. Also listed as شركة شوافر المحدودة للإدارة العامه. Surveyor flagged the lot as maybe closed / maybe closing — confirm on site before treating as live stock. Cash only (finance = no). GPS still needs a tap — pin placed east of S0073.",
    walked: {
      visitDate: "2026-09-15",
      inventoryUnits: 22,
      inventoryInside: 12,
      inventoryOutside: 10,
      inventoryAgePctOver5: 45,
      showroomSizeSqm: 1000,
      mainBrands: ["Toyota", "Hyundai", "Kia", "Chevrolet", "Ford", "JMC", "Nissan"],
      avgSellingPriceSar: 55000,
      financeAvailable: "no",
    },
  },
  {
    sdId: "S0082",
    nameEn: "Rukn Al Qimma Car",
    nameAr: "معرض ركن القمه كار",
    pos: { eastM: 460, northM: 15 },
    street: "Ahmad Al Basri",
    note: "Floor notes 15 Sep 2026. Compact premium-leaning used lot. Hyundai / Kia plus Toyota Land Cruiser premium variants. All cash — no finance. Distinct from S0052 ركن الصفا, S0060 قمة كيان 2 and S0066 ركن الشفاء. GPS still needs a tap — pin placed east of S0073.",
    walked: {
      visitDate: "2026-09-15",
      inventoryUnits: 20,
      inventoryInside: 20,
      inventoryOutside: 0,
      inventoryAgePctOver5: 0,
      showroomSizeSqm: 500,
      mainBrands: ["Hyundai", "Kia", "Toyota"],
      avgSellingPriceSar: 100000,
      financeAvailable: "no",
    },
  },
  {
    sdId: "S0083",
    nameEn: "Majd Al Motor Cars",
    nameAr: "معرض مجد الموتر للسيارات",
    pos: { eastM: 490, northM: 15 },
    street: "Ahmad Al Basri",
    note: "Floor notes 15 Sep 2026. Mid-segment economy cars plus Toyota Land Cruiser. Units noted: Nissan Sunny, Kia Pegas, LC, Charger, Mitsubishi, Mazda. All cash only. Public Maps pin: https://maps.app.goo.gl/G8Nop3B4a7BL6xmBA?g_st=ic — confirm on site; seed pin is still corridor-placed east of S0073.",
    walked: {
      visitDate: "2026-09-15",
      inventoryUnits: 35,
      inventoryInside: 35,
      inventoryOutside: 0,
      inventoryAgePctOver5: 30,
      showroomSizeSqm: 500,
      mainBrands: ["Nissan", "Kia", "Toyota", "Dodge", "Mitsubishi", "Mazda"],
      avgSellingPriceSar: 85000,
      financeAvailable: "no",
    },
  },
  {
    sdId: "S0084",
    nameEn: "Ramz Al Qiyada Cars",
    nameAr: "معرض رمز القياده للسيارات",
    pos: { eastM: 520, northM: 15 },
    street: "Ahmad Al Basri",
    note: "Floor notes 15 Sep 2026. Top-tier premium used cars only (Mercedes, BMW, Jetour top variants, Genesis, Mini, Lexus). Owner does not want finance — cash only. Inventory headcount not taken. Distinct from S0053 رمز الاختيار and S0054 رمز الأفضل. GPS still needs a tap — pin placed east of S0073.",
    walked: {
      visitDate: "2026-09-15",
      inventoryAgePctOver5: 5,
      showroomSizeSqm: 700,
      mainBrands: ["Mercedes", "BMW", "Jetour", "Genesis", "Mini", "Lexus"],
      avgSellingPriceSar: 180000,
      financeAvailable: "no",
    },
  },
];
