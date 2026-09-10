import { ALL_CENSUS, type CensusRow } from "./census";
import type { DealershipFlags, PipelineStage, VisitStatus } from "./types";
import { slugify } from "./utils";

export type SeedRow = CensusRow;
export { ALL_CENSUS, CENSUS_ROWS, EXTRA_PINS, CENSUS_VERSION, CENSUS_STATS } from "./census";

export const SEED_DEALERS: CensusRow[] = ALL_CENSUS;

export function seedId(row: { sdId?: string; nameEn: string }): string {
  if (row.sdId) return row.sdId;
  return `map-${slugify(row.nameEn) || "dealer"}`;
}

export function flagsFromNote(note: string): { flags: DealershipFlags; status: VisitStatus } {
  const n = note.toUpperCase();
  const flags: DealershipFlags = {};
  let status: VisitStatus = "not_visited";
  if (n.includes("COMPETITOR")) {
    flags.competitor = true;
    status = "competitor";
  }
  if (n.includes("COMPLEX")) flags.complex = true;
  if (n.includes("AUTHORISED") || n.includes("AUTHORIZED")) {
    flags.authorised = true;
    const brand = note.split("—")[1]?.replace(/contrast case/i, "").trim();
    if (brand) flags.authorisedBrand = brand;
  }
  if (n.includes("RELOCATED")) flags.relocated = true;
  if (n.includes("FINANCE BUSINESS")) flags.financeBiz = true;
  return { flags, status };
}

/** Map induction training onto the ops pipeline. Never invent a stage. */
export function pipelineFromTraining(flags: DealershipFlags): PipelineStage | null {
  const stage = flags.trainingStage;
  const pri = flags.trainingPriority;
  if (stage === "trained" && pri === "active") return "onboarded";
  if (stage === "trained") return "pitched";
  if (stage === "hold" || stage === "scheduled" || pri === "scheduled") return "contacted";
  if (stage === "declined" || stage === "unavailable") return "surveyed";
  if (pri === "intro") return "contacted";
  return null;
}

export function followupFromTraining(flags: DealershipFlags, nameEn: string): string | null {
  if (flags.trainingStage === "scheduled" || flags.trainingPriority === "scheduled") {
    return `Scheduled AutoLink visit — ${nameEn}`;
  }
  if (flags.trainingStage === "hold") {
    return flags.trainingNote?.trim()
      ? `${flags.trainingNote.trim()} — ${nameEn}`
      : `Revisit — full interest (${nameEn})`;
  }
  if (flags.trainingStage === "unavailable") {
    return flags.failedSession?.trim()
      ? `${flags.failedSession.trim()} — ${nameEn}`
      : `Unavailable — retry (${nameEn})`;
  }
  return null;
}

export const DEFAULT_RESEARCH_TASKS = [
  {
    name: "Commercial registration",
    instruction:
      "Find this dealership's Saudi commercial registration (CR) number. Search Arabic and English names, Google Maps, and the Ministry of Commerce registry. Return the CR number if found, otherwise say not found.",
    targetField: "crNumber",
    sources: ["google", "moci"],
    schedule: "on_demand" as const,
  },
  {
    name: "Online inventory",
    instruction:
      "Find how many vehicles this dealership currently lists for sale online (Haraj, Motory, OpenSooq, Syarah, YallaMotor, Soum) and the average asking price in SAR. Search Arabic and English. Summarize counts by source.",
    targetField: "onlineInventory",
    sources: ["haraj", "motory", "opensooq", "syarah", "yallamotor", "soum"],
    schedule: "weekly" as const,
  },
  {
    name: "Financing advertised",
    instruction:
      "Check whether this dealership advertises financing, instalments, تقسيط, or تمويل. Note which banks or brokers are mentioned.",
    targetField: "financingAdvertised",
    sources: ["google", "instagram", "x", "whatsapp"],
    schedule: "on_demand" as const,
  },
  {
    name: "Financing reviews",
    instruction:
      "Find recent customer reviews mentioning financing, instalments, tamweel, تمويل, تقسيط, or bank problems. Quote short snippets with source URLs.",
    targetField: "financingReviews",
    sources: ["google", "x"],
    schedule: "weekly" as const,
  },
];

export const BRAND_OPTIONS = [
  "Toyota",
  "Hyundai",
  "Nissan",
  "Kia",
  "Chevrolet",
  "GMC",
  "Ford",
  "Honda",
  "Mazda",
  "MG",
  "Changan",
  "Haval",
  "Geely",
  "BMW",
  "Mercedes",
  "Lexus",
  "Genesis",
  "Mitsubishi",
  "Isuzu",
  "GAC",
  "JMC",
  "Jetour",
  "BAIC",
  "JAC",
  "Peugeot",
  "Land Rover",
  "Infiniti",
  "Jeep",
  "Suzuki",
  "Renault",
  "Volkswagen",
  "Cadillac",
  "Porsche",
  "Foton",
  "Jaecoo",
  "Exeed",
  "Dongfeng",
  "Tank",
  "GWM",
];

export const BANK_OPTIONS = [
  "Al Rajhi",
  "SNB",
  "Riyad Bank",
  "SAB",
  "ANB",
  "BSF",
  "Alinma",
  "Bank AlJazira",
  "SAIB",
  "ALJ",
  "Sanabul",
  "Raya",
];

export const FAIL_REASON_OPTIONS = [
  "customer fails DBR",
  "salary too low",
  "no salary transfer",
  "expat tenure issue",
  "documents incomplete",
  "vehicle too old",
  "bank too slow",
  "no reason given",
];

export const RESEARCH_SOURCE_OPTIONS = [
  "google",
  "google_maps",
  "moci",
  "haraj",
  "motory",
  "opensooq",
  "syarah",
  "yallamotor",
  "soum",
  "instagram",
  "x",
  "whatsapp",
];
