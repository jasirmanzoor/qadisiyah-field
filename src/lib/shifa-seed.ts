import type { Dealership, InventoryAgeMix, InventoryCountBasis, BuyerMix, PilotInterest, SizeBasis, VehicleType, VisitStatus, VolumeFiguresBasis } from './types';
import rows from './shifa-seed.json';

// Al Shifa (الشفا) used-car market, South Riyadh. Generated from the
// "al shifa - MAPPING" sheet by scripts/import-shifa.py — only values present
// in the sheet; blanks stay empty. Do not hand-edit the JSON; re-run the script.

interface ShifaRow {
  sdId: string;
  nameEn: string;
  nameAr: string;
  visitStatus: string;
  lat: number;
  lng: number;
  listedPhone: string;
  crNumber: string;
  showroomSizeSqm: number | null;
  sizeBasis: string | null;
  vehicleType: string | null;
  inventoryAgeMix: string | null;
  pocName: string;
  pocRole: string;
  pocMobile: string;
  decisionMaker: string;
  numSalesmen: number | null;
  mainBrands: string[];
  authorisedBrand: string;
  inventoryUnits: number | null;
  inventorySource: string | null;
  inventoryCountBasis: string | null;
  avgPrice: number | null;
  priceSource: string | null;
  banksPartnered: string[];
  buyerMix: string | null;
  volumeFiguresBasis: string | null;
  openToPilot: string | null;
  street: string;
  needsGps: boolean;
  notes: string;
}

type Basis = 'observed' | 'self_reported' | null;

export const SHIFA_ID_PREFIX = 'shifa-';

export function buildShifaDealerships(now = new Date().toISOString()): Dealership[] {
  return (rows as ShifaRow[]).map((r) => ({
    id: `${SHIFA_ID_PREFIX}${r.sdId}`,
    createdAt: now,
    updatedAt: now,
    nameEn: r.nameEn,
    nameAr: r.nameAr,
    lat: r.lat,
    lng: r.lng,
    listedPhone: r.listedPhone,
    note: r.needsGps ? 'Approximate pin — confirm GPS on site' : '',
    isSeed: true,
    market: 'shifa',
    sdId: r.sdId,
    street: r.street,
    needsGps: r.needsGps,

    visitStatus: r.visitStatus as VisitStatus,
    visitDate: null,
    surveyor: null,

    crNumber: r.crNumber,
    showroomSizeSqm: r.showroomSizeSqm,
    sizeBasis: r.sizeBasis as SizeBasis | null,
    vehicleType: r.vehicleType as VehicleType | null,
    inventoryAgeMix: r.inventoryAgeMix as InventoryAgeMix | null,

    pocName: r.pocName,
    pocRole: r.pocRole,
    pocMobile: r.pocMobile,
    decisionMaker: r.decisionMaker,
    numSalesmen: r.numSalesmen,

    mainBrands: r.mainBrands,
    authorised: null,
    authorisedBrand: r.authorisedBrand,
    inventorySellableUnits: { value: r.inventoryUnits, basis: r.inventoryUnits === null ? null : (r.inventorySource as Basis) },
    inventoryCountBasis: r.inventoryCountBasis as InventoryCountBasis | null,
    avgSellingPriceSar: { value: r.avgPrice, basis: r.avgPrice === null ? null : (r.priceSource as Basis) },
    avgMonthlySold: { value: null, basis: null },
    avgMonthlyFinanced: { value: null, basis: null },

    financingLostPerMonth: { value: null, basis: null },
    mainFailReason: '',
    financingWorkaround: '',
    banksPartnered: r.banksPartnered,
    bankOnSite: null,

    buyerMix: r.buyerMix as BuyerMix | null,
    // The sheet's 0% online lead mix is an export default on unvisited rows, not a measurement.
    leadMixOnlinePct: null,

    networkRole: null,
    subDealerOfName: '',
    suppliesSubDealerNames: [],
    sellThroughUnitsPerMonth: { value: null, basis: null },

    volumeFiguresBasis: r.volumeFiguresBasis as VolumeFiguresBasis | null,
    openToPilot: r.openToPilot as PilotInterest | null,
    notes: r.notes,

    photoIds: [],
    dirty: false,
  }));
}
