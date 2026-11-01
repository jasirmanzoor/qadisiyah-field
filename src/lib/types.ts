// Core domain types for the Riyadh dealership intelligence platform
// (Al Qadisiyah and Al Shifa markets).
import type { MarketId } from './markets';

export type VisitStatus =
  | 'not_visited'
  | 'completed'
  | 'partial'
  | 'refused'
  | 'closed_moved'
  | 'competitor';

export type SizeBasis = 'measured' | 'estimated' | 'dealer_stated';
export type VehicleType = 'new_only' | 'used_only' | 'mix';
export type InventoryAgeMix =
  | 'mostly_2020_plus'
  | 'mostly_2015_2020'
  | 'mostly_pre_2015'
  | 'wide_spread';
export type AuthorisedStatus = 'yes' | 'no' | 'unclear';
export type InventoryCountBasis = 'counted' | 'estimated' | 'dealer_stated';
export type MonthlySoldBand = '0_20' | '21_50' | '51_100' | '100_plus' | 'refused';
export type MonthlyFinancedBand = '0_5' | '6_15' | '16_40' | '40_plus' | 'refused';
export type BuyerMix = 'mostly_saudi' | 'mostly_expat' | 'roughly_even' | 'mostly_self_employed';
export type VolumeFiguresBasis = 'observed' | 'self_reported' | 'mixed';
export type PilotInterest = 'yes' | 'maybe' | 'no' | 'too_early';
export type BankOnSite = 'yes_permanent' | 'yes_weekly' | 'no';

// Wholesale layer: some showrooms in this market don't only sell to end
// customers — they supply inventory to smaller sub-dealers, who then sell
// on to the actual buyer. This is distinct from "sell-out" (dealer→
// end customer, already covered by avgMonthlySold) and matters because a
// hub supplier's financing needs and risk profile differ from a retail-only
// storefront.
export type NetworkRole = 'retail_only' | 'supplies_sub_dealers' | 'sub_dealer_of_another' | 'both';

// Every business-figure value is wrapped with its provenance flag so
// analysis can never silently blend observed and self-reported numbers.
export interface FlaggedValue<T> {
  value: T | null;
  basis: 'observed' | 'self_reported' | null;
}

export interface Photo {
  id: string;
  dealershipId: string;
  blob: Blob;
  takenAt: string; // ISO timestamp
  lat: number | null;
  lng: number | null;
}

export interface Dealership {
  id: string;
  createdAt: string;
  updatedAt: string;

  // Identity / pre-filled
  nameEn: string;
  nameAr: string;
  lat: number;
  lng: number;
  listedPhone: string;
  note?: string;
  isSeed: boolean; // came from the starting roster vs added in the field
  market?: MarketId; // missing on older records = 'qadisiyah'
  sdId?: string; // the sheet's SD ID (e.g. S0072), when imported from a sheet
  street?: string; // street / corridor from the mapping sheet
  needsGps?: boolean; // pin is approximate — confirm on site

  // Visit metadata
  visitStatus: VisitStatus;
  visitDate: string | null;
  surveyor: string | null;

  // Business identity
  crNumber: string;
  showroomSizeSqm: number | null;
  sizeBasis: SizeBasis | null;
  vehicleType: VehicleType | null;
  inventoryAgeMix: InventoryAgeMix | null;

  // People
  pocName: string;
  pocRole: string;
  pocMobile: string;
  decisionMaker: string;
  numSalesmen: number | null;

  // Commercial
  mainBrands: string[];
  authorised: AuthorisedStatus | null;
  authorisedBrand: string;
  inventorySellableUnits: FlaggedValue<number>;
  inventoryCountBasis: InventoryCountBasis | null;
  avgSellingPriceSar: FlaggedValue<number>;
  avgMonthlySold: FlaggedValue<MonthlySoldBand>;
  avgMonthlyFinanced: FlaggedValue<MonthlyFinancedBand>;

  // Financing pain
  financingLostPerMonth: FlaggedValue<number>;
  mainFailReason: string;
  financingWorkaround: string;
  banksPartnered: string[];
  bankOnSite: BankOnSite | null;

  // Customers
  buyerMix: BuyerMix | null;
  leadMixOnlinePct: number | null;

  // Dealer network (wholesale layer — dealership to sub-dealer, not to the
  // end customer)
  networkRole: NetworkRole | null;
  subDealerOfName: string; // if sub_dealer_of_another / both: who they buy from
  suppliesSubDealerNames: string[]; // if supplies_sub_dealers / both: who they supply
  sellThroughUnitsPerMonth: FlaggedValue<number>; // units moved to sub-dealers/month

  // Data quality (mandatory)
  volumeFiguresBasis: VolumeFiguresBasis | null;
  openToPilot: PilotInterest | null;
  notes: string;

  photoIds: string[];

  // Sync
  dirty: boolean;
}

export interface SyncQueueItem {
  id: string;
  entity: 'dealership' | 'photo';
  entityId: string;
  createdAt: string;
}

export interface AppSettings {
  id: 'singleton';
  surveyorName: string | null;
  darkMode: boolean;
  remoteEndpoint: string | null; // optional future backend sync target
  dailyResearchCap: number; // Phase 2: max research-agent runs per day
  researchAccessToken: string | null; // Phase 2: must match RESEARCH_ACCESS_TOKEN on the server
  scheduledResearchPaused: boolean; // Phase 2: stop daily/weekly tasks from auto-running
  activeMarket: MarketId; // which market the map, dashboard and export show
  shifaSeeded: boolean; // Al Shifa sheet has been added to this device's roster
}

export const VISIT_STATUS_LABEL: Record<VisitStatus, string> = {
  not_visited: 'Not visited',
  completed: 'Completed',
  partial: 'Partial',
  refused: 'Refused',
  closed_moved: 'Closed / moved',
  competitor: 'Competitor',
};

export const VISIT_STATUS_COLOR: Record<VisitStatus, string> = {
  not_visited: '#9ca3af', // grey
  partial: '#f59e0b', // amber
  completed: '#22c55e', // green
  refused: '#ef4444', // red
  closed_moved: '#ef4444', // red
  competitor: '#a855f7', // purple
};

export const BANKS_KSA = [
  'SNB (Al Ahli)',
  'Al Rajhi Bank',
  'Riyad Bank',
  'SAB',
  'Banque Saudi Fransi',
  'Alinma Bank',
  'Bank Albilad',
  'Arab National Bank',
  'Bank AlJazira',
  'Saudi Investment Bank',
  'Other tamweel / finance co.',
];

export const COMMON_BRANDS = [
  'Toyota',
  'Hyundai',
  'Kia',
  'Nissan',
  'Chevrolet',
  'GMC',
  'Ford',
  'MG',
  'Changan',
  'JMC',
  'Haval',
  'Geely',
  'Lexus',
  'Mercedes-Benz',
  'BMW',
  'Land Cruiser / Toyota SUVs',
  'Other',
];

export const FAIL_REASON_OPTIONS = [
  'Customer fails DBR',
  'Salary too low',
  'No salary transfer',
  'Expat tenure issue',
  'Documents incomplete',
  'Vehicle too old',
  'Bank too slow',
  'No reason given',
];
