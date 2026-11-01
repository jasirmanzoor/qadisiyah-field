import type { Dealership, FlaggedValue, VisitStatus } from './types';

// Statuses a surveyor sets deliberately. A merge must never downgrade them to
// something generic (same rule as the enrichment-merge fix).
const EXPLICIT_STATUSES: VisitStatus[] = ['competitor', 'closed_moved', 'refused'];
const STATUS_RANK: Record<VisitStatus, number> = {
  not_visited: 0,
  partial: 1,
  completed: 2,
  refused: 3,
  closed_moved: 3,
  competitor: 4,
};

function pickString(keep: string, other: string): string {
  return keep?.trim() ? keep : other ?? '';
}

function pickNullable<T>(keep: T | null, other: T | null): T | null {
  return keep !== null && keep !== undefined ? keep : other ?? null;
}

function pickFlagged<T>(keep: FlaggedValue<T>, other: FlaggedValue<T>): FlaggedValue<T> {
  return keep?.value !== null && keep?.value !== undefined ? keep : other;
}

function union(a: string[], b: string[]): string[] {
  return Array.from(new Set([...(a ?? []), ...(b ?? [])]));
}

function pickStatus(keep: VisitStatus, other: VisitStatus): VisitStatus {
  if (EXPLICIT_STATUSES.includes(keep)) return keep;
  if (EXPLICIT_STATUSES.includes(other)) return other;
  return STATUS_RANK[other] > STATUS_RANK[keep] ? other : keep;
}

/**
 * Merge a suspected duplicate into the record being kept. The kept record's
 * values always win; the other record only fills gaps. Its notes are appended
 * with a marker so nothing collected in the field is lost.
 */
export function mergeDealershipRecords(keep: Dealership, other: Dealership, now = new Date().toISOString()): Dealership {
  const mergedNotes = [
    keep.notes,
    other.notes?.trim() ? `[Merged from "${other.nameEn}"] ${other.notes.trim()}` : '',
  ]
    .filter((x) => x && x.trim())
    .join('\n');

  return {
    ...keep,
    createdAt: keep.createdAt < other.createdAt ? keep.createdAt : other.createdAt,
    updatedAt: now,
    nameAr: pickString(keep.nameAr, other.nameAr),
    listedPhone: pickString(keep.listedPhone, other.listedPhone),
    note: keep.note ?? other.note,
    isSeed: keep.isSeed || other.isSeed,

    visitStatus: pickStatus(keep.visitStatus, other.visitStatus),
    visitDate: pickNullable(keep.visitDate, other.visitDate),
    surveyor: pickNullable(keep.surveyor, other.surveyor),

    crNumber: pickString(keep.crNumber, other.crNumber),
    showroomSizeSqm: pickNullable(keep.showroomSizeSqm, other.showroomSizeSqm),
    sizeBasis: keep.showroomSizeSqm !== null ? keep.sizeBasis : other.sizeBasis,
    vehicleType: pickNullable(keep.vehicleType, other.vehicleType),
    inventoryAgeMix: pickNullable(keep.inventoryAgeMix, other.inventoryAgeMix),

    pocName: pickString(keep.pocName, other.pocName),
    pocRole: pickString(keep.pocRole, other.pocRole),
    pocMobile: pickString(keep.pocMobile, other.pocMobile),
    decisionMaker: pickString(keep.decisionMaker, other.decisionMaker),
    numSalesmen: pickNullable(keep.numSalesmen, other.numSalesmen),

    mainBrands: union(keep.mainBrands, other.mainBrands),
    authorised: pickNullable(keep.authorised, other.authorised),
    authorisedBrand: pickString(keep.authorisedBrand, other.authorisedBrand),
    inventorySellableUnits: pickFlagged(keep.inventorySellableUnits, other.inventorySellableUnits),
    inventoryCountBasis:
      keep.inventorySellableUnits?.value !== null ? keep.inventoryCountBasis : other.inventoryCountBasis,
    avgSellingPriceSar: pickFlagged(keep.avgSellingPriceSar, other.avgSellingPriceSar),
    avgMonthlySold: pickFlagged(keep.avgMonthlySold, other.avgMonthlySold),
    avgMonthlyFinanced: pickFlagged(keep.avgMonthlyFinanced, other.avgMonthlyFinanced),

    financingLostPerMonth: pickFlagged(keep.financingLostPerMonth, other.financingLostPerMonth),
    mainFailReason: pickString(keep.mainFailReason, other.mainFailReason),
    financingWorkaround: pickString(keep.financingWorkaround, other.financingWorkaround),
    banksPartnered: union(keep.banksPartnered, other.banksPartnered),
    bankOnSite: pickNullable(keep.bankOnSite, other.bankOnSite),

    buyerMix: pickNullable(keep.buyerMix, other.buyerMix),
    leadMixOnlinePct: pickNullable(keep.leadMixOnlinePct, other.leadMixOnlinePct),

    networkRole: pickNullable(keep.networkRole, other.networkRole),
    subDealerOfName: pickString(keep.subDealerOfName, other.subDealerOfName),
    suppliesSubDealerNames: union(keep.suppliesSubDealerNames, other.suppliesSubDealerNames),
    sellThroughUnitsPerMonth: pickFlagged(keep.sellThroughUnitsPerMonth, other.sellThroughUnitsPerMonth),

    volumeFiguresBasis: pickNullable(keep.volumeFiguresBasis, other.volumeFiguresBasis),
    openToPilot: pickNullable(keep.openToPilot, other.openToPilot),
    notes: mergedNotes,

    photoIds: union(keep.photoIds, other.photoIds),
    dirty: true,
  };
}
