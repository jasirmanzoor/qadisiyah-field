import type { SurveyPayload } from "./types";
import { mapsPinUrl } from "./shifa-floor-oct06";

/** Move a corridor placeholder onto a named Google place. Does not invent a pin. */
export type Oct07Move = {
  sdId: string;
  lat: number;
  lng: number;
  note: string;
};

export type Oct07New = {
  sdId: string;
  nameEn: string;
  nameAr: string;
  lat: number;
  lng: number;
  phone?: string;
  street: string;
  note: string;
  survey: Partial<SurveyPayload>;
};

/** 7 Oct 2026. Satellite frame of Ahmad Al Basri and Al Fastaq, Al Marwah. */
export const SHIFA_OCT07_MOVES: Oct07Move[] = [
  {
    sdId: "S0011",
    lat: 24.5472395,
    lng: 46.6809933,
    note: "7 Oct 2026. Google place for معرض نسيم الشفاء للسيارات replaces the corridor placeholder, about 180 m off. Phone on file stays 0505747734. Their Haraj ads say cash only: no installments and no lease-to-own. A management line on those ads is 0551945940. An older directory also says 3110 Ahmad Al Basri. Rough figures already on the sheet were not taken on this check and were not changed.",
  },
  {
    sdId: "S0050",
    lat: 24.5452571,
    lng: 46.6814987,
    note: "7 Oct 2026. Google place معرض الملتقى للسيارات, south-east corner of the Ahmad Al Basri / Al Fastaq block, toward Al Fastaq. Replaces the corridor placeholder. Street was not read off the fascia. Rough figures already on the sheet were not taken on this check and were not changed.",
  },
];

export const SHIFA_OCT07_NEW: Oct07New[] = [
  {
    sdId: "S16AWL",
    nameEn: "Awali Al Khail Cars",
    nameAr: "معرض عوالي الخيل للسيارات",
    lat: 24.5469519,
    lng: 46.680998,
    street: "Ahmad Al Basri",
    note: "7 Oct 2026 satellite frame. Google place. West side of Ahmad Al Basri, about 32 m from Naseem Al Shifa. Not عوالي نجد. No phone or floor count published.",
    survey: {},
  },
  {
    sdId: "S16NFY",
    nameEn: "Faris Ayedh Al Nufai Cars",
    nameAr: "معرض فارس عايض النفيعي للسيارات",
    lat: 24.5466825,
    lng: 46.6809143,
    street: "Ahmad Al Basri",
    note: "7 Oct 2026 satellite frame. Google place on Ahmad Al Basri. A directory lists the same name on this street. Haraj ads are mostly Isuzu commercial trucks. That is not a floor count. No complete phone.",
    survey: {},
  },
  {
    sdId: "S16RAD",
    nameEn: "Raad Al Shifa Cars — main branch",
    nameAr: "شركة رعد الشفاء للسيارات الفرع الرئيسي",
    lat: 24.546533,
    lng: 46.6806307,
    phone: "+966575970265",
    street: "Ahmad Al Basri",
    note: "7 Oct 2026 satellite frame. Google label says used car dealer, main branch. Phone from YallaMotor. That listing showed 36 cars and Toyota, Chevrolet, Genesis, GMC, Lexus, Mazda, Mercedes, Mitsubishi, Jetour, Hyundai. Listing count, not a floor walk, so stock was not filed. Not the Qadisiyah رعد الشفاء desk.",
    survey: { vehicleType: "used_only" },
  },
  {
    sdId: "S16ASM",
    nameEn: "Asimat Al Ilm Cars",
    nameAr: "معرض عاصمة العلم للسيارات",
    lat: 24.5463336,
    lng: 46.6803644,
    street: "Ahmad Al Basri",
    note: "7 Oct 2026 satellite frame. Google place on Ahmad Al Basri, between Raad Al Shifa and Eidah Al Nahdi. Not موطن العاصمة and not شريان العاصمة. No phone or floor count published.",
    survey: {},
  },
  {
    sdId: "S16NHD",
    nameEn: "Eidah Al Nahdi Cars",
    nameAr: "معرض عيضه النهدي",
    lat: 24.5458103,
    lng: 46.680764,
    phone: "+966536718504",
    street: "Ahmad Al Basri",
    note: "7 Oct 2026 satellite frame. Google place, Al Marwah 14721. Second phone 0590907971. No floor count published.",
    survey: {},
  },
  {
    sdId: "S16QYM",
    nameEn: "Qimmat Kayan Cars",
    nameAr: "معرض قمة كيان للسيارات",
    lat: 24.5460898,
    lng: 46.6797109,
    phone: "+966533480480",
    street: "Ahmad Al Basri",
    note: "7 Oct 2026 satellite frame. Google place on the west side of Ahmad Al Basri. Phone from the same place listing. Not S0060 قمة كيان 2, which is still only a corridor placeholder. Confirm on site whether 2 is this door or a second stall. No floor count filed.",
    survey: {},
  },
  {
    sdId: "S16UTR",
    nameEn: "Utarid Cars — your first finance",
    nameAr: "عطارد للسيارات تمويلك الأول",
    lat: 24.5456111,
    lng: 46.6802335,
    phone: "+966557827288",
    street: "Ahmad Al Basri",
    note: "7 Oct 2026 satellite frame. Google place at the south end of the block. The fascia is a finance desk. WhatsApp 0557827288. No floor count published.",
    survey: { financeAvailable: "yes" },
  },
  {
    sdId: "S16DMN",
    nameEn: "Aamal Al Damaan Cars — Al Shifa",
    nameAr: "شركة أعمال الدمعان للسيارات - فرع الشفا",
    lat: 24.5461937,
    lng: 46.6788813,
    phone: "+966920031834",
    street: "Al Imam Muslim",
    note: "7 Oct 2026 satellite frame, west edge by Al Imam Muslim. Google place titled فرع الشفا. Public address is Al Imam Muslim, Al Marwah. Mobile on the same page 0559768935. They advertise cash and finance, including new 2026 cars. Not S0008 راشد ال دمعان. No floor count filed.",
    survey: { vehicleType: "mix", financeAvailable: "yes" },
  },
  {
    sdId: "S16KTH",
    nameEn: "Al Katheri Motors",
    nameAr: "الكثيري موتورز",
    lat: 24.5455286,
    lng: 46.6798017,
    street: "Ahmad Al Basri",
    note: "7 Oct 2026 satellite frame. Google place Al katheri motors, south-west corner of Ahmad Al Basri and Al Imam Muslim. Not the Qadisiyah الكثيري للسيارات desk. No phone or floor count published.",
    survey: {},
  },
  {
    sdId: "S16MSN",
    nameEn: "Mishnan Cars 2",
    nameAr: "معرض مشنان للسيارات 2",
    lat: 24.548033,
    lng: 46.6810785,
    street: "Ahmad Al Basri",
    note: "7 Oct 2026. The north edge of the frame shows معرض مشنان للسيارات, cut off. The Google place that resolves is titled 2, about 90 m north of Naseem Al Shifa. S0007 الشيباني is a corridor placeholder about 31 m away, not this door. Confirm on site. No phone or floor count published.",
    survey: {},
  },
  {
    sdId: "S16ISH",
    nameEn: "Ishq Al Janub Cars",
    nameAr: "شركة عشق الجنوب للسيارات",
    lat: 24.5459766,
    lng: 46.6791991,
    street: "",
    note: "7 Oct 2026 deep check of this block. Google place on the west side, between Qimmat Kayan and Aamal Al Damaan. Not labeled on the screenshot. Street was not read off the fascia. No phone or floor count published.",
    survey: {},
  },
  {
    sdId: "S16AJM",
    nameEn: "Mohammed bin Dhaar Al Ajmi — Al Shifa",
    nameAr: "معرض محمد بن ذعار العجمي للسيارات - فرع الشفا",
    lat: 24.5451515,
    lng: 46.6813797,
    street: "",
    note: "7 Oct 2026 deep check. Google place at the south-east corner of the block, about 17 m from Almultaqa (S0050). Shifa branch, not the Qadisiyah desk. Not labeled on the screenshot. Street was not read off the fascia. No phone or floor count published.",
    survey: {},
  },
];

export function oct07MapsUrl(lat: number, lng: number) {
  return mapsPinUrl(lat, lng);
}
