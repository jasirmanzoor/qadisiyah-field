import type { SurveyPayload } from "./types";

/** Sheet facts for unvisited Al Shifa lots only.
 *  Feeds Rough notes. Does not mark a visit and does not move a pin.
 */
export type RoughNote = {
  vehicleType?: SurveyPayload["vehicleType"];
  inventoryUnits?: number;
  inventoryInside?: number;
  inventoryOutside?: number;
  inventoryAgePctOver5?: number;
  showroomSizeSqm?: number;
  avgSellingPriceSar?: number;
  mainBrands?: string[];
};

export const SHIFA_ROUGH_NOTES: Record<string, RoughNote> = {
  S0004: { vehicleType: "mix", inventoryUnits: 50, inventoryAgePctOver5: 10, showroomSizeSqm: 800, avgSellingPriceSar: 89000 },
  S0005: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0006: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0007: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0008: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0009: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0011: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000, mainBrands: ["Toyota", "Lexus", "Ford", "Isuzu", "Nissan", "Jeep", "Chevrolet", "Hyundai"] },
  S0012: { vehicleType: "mix", inventoryUnits: 50, inventoryAgePctOver5: 10, showroomSizeSqm: 800, avgSellingPriceSar: 89000, mainBrands: ["Toyota", "Kia", "Chevrolet", "Nissan", "Isuzu", "BYD"] },
  S0013: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0014: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0016: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0018: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000, mainBrands: ["Toyota", "Hyundai", "Kia", "Nissan", "Chevrolet", "Peugeot", "Changan", "Haval", "MG", "Bestune", "Foton"] },
  S0019: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0020: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0023: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000, mainBrands: ["Isuzu (AUTORIZED DEALER) AL RAJHI  AND ISUZU including commercial trucks of isuzu"] },
  S0024: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0025: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0026: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000, mainBrands: ["Hyundai", "Geely", "Ford", "Nissan", "Kia", "Renault"] },
  S0027: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0028: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0029: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0030: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0031: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0032: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0033: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000, mainBrands: ["Hyundai", "Kia", "Nissan", "Toyota", "MG", "Geely", "JAC", "Maxus"] },
  S0034: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000, mainBrands: ["Hyundai", "Kia", "Toyota", "Ford", "Nissan", "Geely", "Audi", "KGM"] },
  S0035: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0036: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0037: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0038: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0039: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0040: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000, mainBrands: ["Toyota", "Hyundai", "Ford", "MG"] },
  S0041: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0042: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0044: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0045: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0046: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000, mainBrands: ["Toyota", "Kia", "Geely", "GMC", "Ford", "Nissan", "Jetour"] },
  S0047: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0048: { vehicleType: "used_only", inventoryUnits: 45, inventoryAgePctOver5: 0, showroomSizeSqm: 700, avgSellingPriceSar: 114000, mainBrands: ["Lexus", "Toyota", "Mazda", "Jeep", "Mitsubishi"] },
  S0049: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0050: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0051: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0052: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0053: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0054: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0055: { vehicleType: "new_only", inventoryUnits: 65, inventoryAgePctOver5: 0, showroomSizeSqm: 1000, avgSellingPriceSar: 96000 },
  S0056: { vehicleType: "mix", inventoryUnits: 50, inventoryAgePctOver5: 10, showroomSizeSqm: 800, avgSellingPriceSar: 89000, mainBrands: ["Toyota", "Hyundai", "Mitsubishi", "Kia", "Nissan", "Haval", "MG"] },
  S0057: { vehicleType: "mix", inventoryUnits: 50, inventoryAgePctOver5: 10, showroomSizeSqm: 800, avgSellingPriceSar: 89000, mainBrands: ["Chevrolet", "Ford", "GMC", "Peugeot"] },
  S0058: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000, mainBrands: ["Hyundai", "Kia", "Ford", "Mazda", "Toyota"] },
  S0059: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000, mainBrands: ["Toyota", "Lexus", "Hyundai", "Mazda", "Honda", "Mitsubishi", "Mercedes", "Geely", "Land Rover", "GMC", "Chevrolet"] },
  S0060: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000, mainBrands: ["Toyota", "Hyundai", "Kia", "Chevrolet", "GMC", "Ford", "Nissan", "BMW", "Cadillac", "Lexus", "Mazda"] },
  S0061: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000, mainBrands: ["Ford", "Nissan", "Chevrolet", "Toyota", "Chrysler", "Renault"] },
  S0062: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0063: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0064: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0065: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0066: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
  S0067: { vehicleType: "used_only", inventoryUnits: 43, inventoryAgePctOver5: 30, showroomSizeSqm: 800, avgSellingPriceSar: 74000 },
};

