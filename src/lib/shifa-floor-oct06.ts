import type { SurveyPayload, VisitStatus } from "./types";

export type Oct06Patch = {
  sdId: string;
  lat?: number;
  lng?: number;
  note: string;
  survey: Partial<SurveyPayload>;
};

export type Oct06New = {
  sdId: string;
  nameEn: string;
  nameAr: string;
  lat: number;
  lng: number;
  mapsUrl?: string;
  needsGps?: boolean;
  gpsSource?: "survey" | "public_map";
  unplaced?: boolean;
  status?: VisitStatus;
  street: string;
  note: string;
  survey: Partial<SurveyPayload>;
};

/** Walked, but the Maps link did not carry a coordinate. Not placed on the map. */
export type Oct06Unpinned = {
  sdId: string;
  nameEn: string;
  nameAr: string;
  mapsUrl?: string;
  street: string;
  note: string;
  survey: Partial<SurveyPayload>;
};

const used = "used_only" as const;

export function mapsPinUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/** 6 Oct 2026. Updates doors already on the sheet. Does not invent a pin. */
export const SHIFA_OCT06_PATCHES: Oct06Patch[] = [
  {
    sdId: "S0069",
    note: "6 Oct 2026 walk. 15 on the floor, 800 m2, used only, ASP 45,000, 60% over 5 years. A few light buses, Isuzu pickup, Changan. Replaces the 10 Sep gate count.",
    survey: {
      vehicleType: used,
      inventoryUnits: 15,
      showroomSizeSqm: 800,
      inventoryAgePctOver5: 60,
      avgSellingPriceSar: 45000,
      mainBrands: ["Light buses", "Isuzu pickup", "Changan"],
    },
  },
  {
    sdId: "S0061",
    lat: 24.5442056,
    lng: 46.6842556,
    note: "6 Oct 2026 walk. Surveyor pin 24°32'39.14\"N 46°41'03.32\"E. 50 used cars. Genesis, Mini, Sonata, Kia, Sunny, Mercedes, Ford, Changan, Chevrolet, Mazda. 65% over 5 years. ASP 65,000. Replaces the corridor placeholder.",
    survey: {
      vehicleType: used,
      inventoryUnits: 50,
      inventoryAgePctOver5: 65,
      avgSellingPriceSar: 65000,
      mainBrands: ["Genesis", "Mini", "Hyundai Sonata", "Kia", "Nissan Sunny", "Mercedes", "Ford", "Changan", "Chevrolet", "Mazda"],
    },
  },
];

/** New doors with a coordinate: a surveyor tap, or a building-number address. */
export const SHIFA_OCT06_NEW: Oct06New[] = [
  {
    sdId: "S15MTB",
    nameEn: "Mutab Cars",
    nameAr: "معرض متعب للسيارات",
    lat: 24.544817,
    lng: 46.683764,
    mapsUrl: "https://maps.app.goo.gl/mAB5UystsgYXEcHq8",
    gpsSource: "public_map",
    street: "",
    note: "6 Oct 2026. 25 used cars, 600 m2. GMC, Chevrolet, BMW. ASP and age not taken. Pin is the Google place for this name.",
    survey: { vehicleType: used, inventoryUnits: 25, showroomSizeSqm: 600, mainBrands: ["GMC", "Chevrolet", "BMW"] },
  },
  {
    sdId: "S15RKB",
    nameEn: "Al Rakbah Al Fawriya / Insta Car",
    nameAr: "شركة الركبة الفورية للسيارات / انستا كار",
    lat: 24.5442619,
    lng: 46.6834784,
    mapsUrl: "https://maps.app.goo.gl/8QnG33mQBvVhaVS36",
    gpsSource: "survey",
    street: "",
    note: "6 Oct 2026. Surveyor pin. Used only, 750 m2, 40 cars. Hyundai, Toyota, Kia, Accent in high density, Nissan, GMC, Chevrolet. 60% over 5 years. ASP 55,000. The separate Insta Car Maps link is this door.",
    survey: {
      vehicleType: used,
      inventoryUnits: 40,
      showroomSizeSqm: 750,
      inventoryAgePctOver5: 60,
      avgSellingPriceSar: 55000,
      mainBrands: ["Hyundai", "Toyota", "Kia", "Hyundai Accent", "Nissan", "GMC", "Chevrolet"],
    },
  },
  {
    sdId: "S15AQD",
    nameEn: "Aqd Al Bidaa Cars",
    nameAr: "معرض عقد البداع للسيارات",
    lat: 24.5438636,
    lng: 46.6844259,
    gpsSource: "survey",
    street: "Jibril Ibn Jamil",
    note: "6 Oct 2026. Surveyor pin. 35 used cars, 1000 m2. Jetour, Ford, Chevrolet, GMC, Range Rover, Kia, BMW. High-maintenance stock. 70% over 5 years. ASP 80,000.",
    survey: {
      vehicleType: used,
      inventoryUnits: 35,
      showroomSizeSqm: 1000,
      inventoryAgePctOver5: 70,
      avgSellingPriceSar: 80000,
      mainBrands: ["Jetour", "Ford", "Chevrolet", "GMC", "Range Rover", "Kia", "BMW"],
    },
  },
  {
    sdId: "S15SHR",
    nameEn: "Sharyan Al Asimah Cars",
    nameAr: "معرض شريان العاصمة للسيارات",
    lat: 24.5438053,
    lng: 46.6845071,
    gpsSource: "survey",
    street: "Jibril Ibn Jamil",
    note: "6 Oct 2026. Surveyor pin. Upper-mid and premium used only. 25 cars, 1000 m2. Chevrolet, Range Rover, Jeep, Nissan Patrol, Land Cruiser, Porsche, BMW, Mercedes, Sonata. 45% over 5 years. ASP 100,000.",
    survey: {
      vehicleType: used,
      inventoryUnits: 25,
      showroomSizeSqm: 1000,
      inventoryAgePctOver5: 45,
      avgSellingPriceSar: 100000,
      mainBrands: ["Chevrolet", "Range Rover", "Jeep", "Nissan Patrol", "Toyota Land Cruiser", "Porsche", "BMW", "Mercedes", "Hyundai Sonata"],
    },
  },
  {
    sdId: "S15UST",
    nameEn: "Ustul Al Arabiya Cars",
    nameAr: "معرض أسطول العربية للسيارات",
    lat: 24.5437361,
    lng: 46.6845215,
    gpsSource: "survey",
    street: "Jibril Ibn Jamil",
    note: "6 Oct 2026. Surveyor pin. Used only, 45 cars, 800 m2. Light trucks. Hilux in high density, Corolla, Pegas, Accent, GMC. 65% over 5 years. ASP 80,000.",
    survey: {
      vehicleType: used,
      inventoryUnits: 45,
      showroomSizeSqm: 800,
      inventoryAgePctOver5: 65,
      avgSellingPriceSar: 80000,
      mainBrands: ["Toyota Hilux", "Toyota Corolla", "Kia Pegas", "Hyundai Accent", "GMC"],
    },
  },
  {
    sdId: "S15NSM",
    nameEn: "Nasaem Al Shurooq Cars",
    nameAr: "معرض نسائم الشروق",
    lat: 24.5436135,
    lng: 46.6847357,
    mapsUrl: "https://maps.app.goo.gl/mihALmtoKoKfBSBQ6",
    gpsSource: "public_map",
    street: "Jibril Ibn Jamil",
    note: "6 Oct 2026. 60 used cars, about 80% Hiace (40+ Toyota Hiace 2021). 70% over 5 years. ASP 100,000. Pin is the Google place for this name.",
    survey: {
      vehicleType: used,
      inventoryUnits: 60,
      inventoryAgePctOver5: 70,
      avgSellingPriceSar: 100000,
      mainBrands: ["Toyota Hiace"],
    },
  },
  {
    sdId: "S15MWH",
    nameEn: "Al Mowah Cars",
    nameAr: "معرض الموح للسيارات",
    lat: 24.5437757,
    lng: 46.6849456,
    gpsSource: "survey",
    street: "Jibril Ibn Jamil",
    note: "6 Oct 2026. Surveyor pin. 35 used cars. Fortuner, Kia, Chevrolet, Nissan Sunny, Mitsubishi pickup. 80% over 5 years. ASP 60,000. Size not taken.",
    survey: {
      vehicleType: used,
      inventoryUnits: 35,
      inventoryAgePctOver5: 80,
      avgSellingPriceSar: 60000,
      mainBrands: ["Toyota Fortuner", "Kia", "Chevrolet", "Nissan Sunny", "Mitsubishi pickup"],
    },
  },
  {
    sdId: "S15BYR",
    nameEn: "Bayraq Al Ibdaa Cars",
    nameAr: "معرض بيرق الابداع للسيارات",
    lat: 24.5437093,
    lng: 46.6850184,
    gpsSource: "survey",
    street: "Jibril Ibn Jamil",
    note: "6 Oct 2026. Surveyor pin. Used only. Kia, Nissan, Chevrolet, Genesis SUV, Sunny, Elantra. 50% over 5 years. ASP 95,000. Unit count and size not taken.",
    survey: {
      vehicleType: used,
      inventoryAgePctOver5: 50,
      avgSellingPriceSar: 95000,
      mainBrands: ["Kia", "Nissan", "Chevrolet", "Genesis", "Nissan Sunny", "Hyundai Elantra"],
    },
  },
  {
    sdId: "S15MLK",
    nameEn: "Head of the showrooms — Al Maliki",
    nameAr: "شيخ المعارض رئيس معارض السيارات المالكي",
    lat: 24.54359,
    lng: 46.6855796,
    gpsSource: "survey",
    street: "Jibril Ibn Jamil",
    note: "6 Oct 2026. Surveyor pin. Called the head of the car showrooms. 1400 m2. Floor count, ASP and age not taken. Not Saed Al Malki (S0089) and not the Otaibi door (S0107).",
    survey: { showroomSizeSqm: 1400 },
  },
  {
    sdId: "S15QNS",
    nameEn: "Al Qannas Cars",
    nameAr: "معرض القناص للسيارات",
    lat: 24.5446157,
    lng: 46.6839596,
    mapsUrl: "https://maps.app.goo.gl/Yi8fAQXSHTLxab1B7",
    gpsSource: "public_map",
    street: "",
    note: "6 Oct 2026. Used cars only. Count, ASP and age not taken. Pin is the Google place for this name.",
    survey: { vehicleType: used },
  },
  {
    sdId: "S15ASD",
    nameEn: "Al Asdiqa Cars",
    nameAr: "معرض الأصدقاء",
    lat: 24.5440899,
    lng: 46.6837743,
    mapsUrl: "https://maps.app.goo.gl/6qLhpa5emRAHMmuw5",
    gpsSource: "public_map",
    street: "",
    note: "6 Oct 2026. Floor empty. Pin is the Google place for this name.",
    survey: { vehicleType: used, inventoryUnits: 0 },
  },
  {
    sdId: "S15SLT",
    nameEn: "Sultan For Cars",
    nameAr: "سلطان للسيارات",
    lat: 24.5443702,
    lng: 46.6835921,
    mapsUrl: "https://maps.app.goo.gl/EEFgVKZkC28o5S16A",
    gpsSource: "public_map",
    street: "",
    note: "6 Oct 2026. 20 used cars. Nissan, Hyundai, Mercedes, GMC, Chevrolet. 30% over 5 years. ASP 90,000. Pin is the Google place. Not Sultan Al Radayan.",
    survey: { vehicleType: used, inventoryUnits: 20, inventoryAgePctOver5: 30, avgSellingPriceSar: 90000, mainBrands: ["Nissan", "Hyundai", "Mercedes", "GMC", "Chevrolet"] },
  },
  {
    sdId: "S15ADN",
    nameEn: "Al Hassan Ayesh Al Adini — new site",
    nameAr: "معرض الحسن عائش العديني للسيارات (الموقع الجديد)",
    lat: 24.5444107,
    lng: 46.6832149,
    mapsUrl: "https://maps.app.goo.gl/nVCHGioRyqyuwBZH6",
    gpsSource: "public_map",
    street: "",
    note: "6 Oct 2026. New site. Used only, 800 m2, 70 cars, upper-mid to premium. Camry, Charger, Hyundai, Kia, Sonata, Mazda, Jetour and Lexus dense. 35% over 5 years. ASP 95,000. Not S0098 Al Adeeni on Ibn Sayyidah. Street name was not confirmed.",
    survey: { vehicleType: used, inventoryUnits: 70, showroomSizeSqm: 800, inventoryAgePctOver5: 35, avgSellingPriceSar: 95000, mainBrands: ["Toyota Camry", "Dodge Charger", "Hyundai", "Kia", "Hyundai Sonata", "Mazda", "Jetour", "Lexus"] },
  },
  {
    sdId: "S15KHM",
    nameEn: "Al Markaba Al Khamisa / Sumou 2",
    nameAr: "معرض المركبة الخامسة للسيارات / سمو المركبات ٢",
    lat: 24.5441396,
    lng: 46.683003,
    mapsUrl: "https://maps.app.goo.gl/ajAWL2ZcxFRDvSca9",
    gpsSource: "public_map",
    street: "",
    note: "6 Oct 2026. Empty floor. Changing name. Pin is the Google place for this name.",
    survey: { inventoryUnits: 0 },
  },
  {
    sdId: "S15SHL",
    nameEn: "Saheel Al Fikr Al Jadeed",
    nameAr: "شركة معرض صهيل الفكر الجديد",
    lat: 24.5439731,
    lng: 46.6827857,
    mapsUrl: "https://maps.app.goo.gl/Z32FhYrng4ubz9TM6",
    gpsSource: "public_map",
    street: "",
    note: "6 Oct 2026. Delivery light vehicles, used only. Suzuki APV, Toyota Hiace, Peugeot van dense. 85% over 5 years. ASP 50,000. Unit count not taken. Pin is the Google place.",
    survey: { vehicleType: "commercial", inventoryAgePctOver5: 85, avgSellingPriceSar: 50000, mainBrands: ["Suzuki APV", "Toyota Hiace", "Peugeot van"] },
  },
  {
    sdId: "S15JOD",
    nameEn: "Jood Cars",
    nameAr: "معرض جود كارز للسيارات",
    lat: 24.5439633,
    lng: 46.6847263,
    mapsUrl: "https://maps.app.goo.gl/uVhfd4JSstFTSpww6",
    gpsSource: "public_map",
    street: "Jibril Ibn Jamil",
    note: "6 Oct 2026. Used only, 25 cars. Mercedes and Lexus, Benz dense, Toyota Hiace. 50% over 5 years. ASP 100,000. Size not taken. Two Maps links, one door: https://maps.app.goo.gl/39CL7s5VVM2o2eDV6 and https://maps.app.goo.gl/uVhfd4JSstFTSpww6.",
    survey: { vehicleType: used, inventoryUnits: 25, inventoryAgePctOver5: 50, avgSellingPriceSar: 100000, mainBrands: ["Mercedes", "Lexus", "Toyota Hiace"] },
  },
  {
    sdId: "S15JRW",
    nameEn: "Mohammed Al Jariwi Cars",
    nameAr: "معرض محمد الجريوي للسيارات",
    lat: 24.5438039,
    lng: 46.6842179,
    mapsUrl: mapsPinUrl(24.5438039, 46.6842179),
    gpsSource: "public_map",
    street: "Jibril Ibn Jamil",
    note: "6 Oct 2026. Address 3394 Jibril Ibn Jamil, Al Marwah. Commercial used stock: ambulances, delivery vans, Isuzu pickup. 50 cars, 1200 m2. 75% over 5 years. ASP not taken. Pin is the Google place for this name.",
    survey: { vehicleType: "commercial", inventoryUnits: 50, showroomSizeSqm: 1200, inventoryAgePctOver5: 75, mainBrands: ["Isuzu pickup", "Delivery vans", "Ambulances"] },
  },
  {
    sdId: "S15IMT",
    nameEn: "Imtiyaz Al Shifa Cars",
    nameAr: "معرض امتياز الشفا للسيارات",
    lat: 24.5440954,
    lng: 46.6844923,
    mapsUrl: mapsPinUrl(24.5440954, 46.6844923),
    gpsSource: "public_map",
    street: "Jibril Ibn Jamil",
    note: "6 Oct 2026. Used only, 50 cars, 1000 m2. Hilux dense. Fortuner, Corolla, Camry — about 90% Toyota, Hiace also dense. 50% over 5 years. ASP 100,000. Pin is the Google place. Not S0036 Al Imtiyaz.",
    survey: { vehicleType: used, inventoryUnits: 50, showroomSizeSqm: 1000, inventoryAgePctOver5: 50, avgSellingPriceSar: 100000, mainBrands: ["Toyota Hilux", "Toyota Fortuner", "Toyota Corolla", "Toyota Camry", "Toyota Hiace"] },
  },
  {
    sdId: "S15SMA",
    nameEn: "Samaa Al Riyadh Cars",
    nameAr: "معرض سماء الرياض للسيارات",
    lat: 24.5436724,
    lng: 46.6846421,
    mapsUrl: "https://maps.app.goo.gl/DnQ5DLyqk7Hoq3sj7",
    gpsSource: "public_map",
    street: "Jibril Ibn Jamil",
    note: "6 Oct 2026. New cars, mostly 2026. Land Cruiser, Lexus, Camry. 45 in inventory. ASP 200,000. 0% over 5 years. Not S0044 Sama Riyadh.",
    survey: { vehicleType: "new_only", inventoryUnits: 45, inventoryAgePctOver5: 0, avgSellingPriceSar: 200000, mainBrands: ["Toyota Land Cruiser", "Lexus", "Toyota Camry"] },
  },
  {
    sdId: "S15ATF",
    nameEn: "Atef bin Sumaida Cars",
    nameAr: "معرض عاطف بن سميدع للسيارات",
    lat: 24.5438247,
    lng: 46.6854896,
    mapsUrl: mapsPinUrl(24.5438247, 46.6854896),
    gpsSource: "public_map",
    street: "Jibril Ibn Jamil",
    note: "6 Oct 2026. Land Cruiser, GMC, Ford, Hyundai, RAV4, Hilux, Lexus, Mustang on the floor. Count, size, ASP and age not taken. Pin is the Google place for this name.",
    survey: { vehicleType: used, mainBrands: ["Toyota Land Cruiser", "GMC", "Ford", "Hyundai", "Toyota RAV4", "Toyota Hilux", "Lexus", "Ford Mustang"] },
  },
  {
    sdId: "S15MSD",
    nameEn: "Al Masoudi Cars — ownership transfer",
    nameAr: "نقل ملكية السيارات فوري بأقل الأسعار معرض المسعودي للسيارات",
    lat: 24.542762,
    lng: 46.6858099,
    mapsUrl: "https://maps.app.goo.gl/sJHxQzQ1VTmHSyHx9",
    gpsSource: "public_map",
    street: "Ahmad Al Basri",
    note: "6 Oct 2026. Ownership-transfer fascia. Floor count not taken. Google place pin sits 13 m from Mustaqbal Al Sura'a, whose field GPS is already locked on Ahmad Al Basri. Not S0046 Masoud Cars.",
    survey: {},
  },
  {
    sdId: "S15SYF",
    nameEn: "Sayf Al Khaleej Cars",
    nameAr: "معرض سيف الخليج للسيارات",
    lat: 0,
    lng: 0,
    unplaced: true,
    street: "",
    note: "6 Oct 2026. Used only, 50 sedans and SUVs. BMW, Charger, Renault, Kia, Accent, GMC, Range Rover, Creta, Sunny dense. 70% over 5 years. ASP 50,000. No Google place in Al Marwah, so this door is on the list without a pin.",
    survey: { vehicleType: used, inventoryUnits: 50, inventoryAgePctOver5: 70, avgSellingPriceSar: 50000, mainBrands: ["BMW", "Dodge Charger", "Renault", "Kia", "Hyundai Accent", "GMC", "Range Rover", "Hyundai Creta", "Nissan Sunny"] },
  },
];

export const SHIFA_OCT06_UNPINNED: Oct06Unpinned[] = [];
