import ExcelJS from 'exceljs';
import type { Dealership } from './types';
import type { AgentFinding } from './research-types';
import { VISIT_STATUS_LABEL } from './types';
import { marketOf } from './markets';

function flatten(d: Dealership): Record<string, string | number> {
  return {
    id: d.id,
    market: marketOf(d),
    sd_id: d.sdId ?? '',
    name_en: d.nameEn,
    name_ar: d.nameAr,
    lat: d.lat,
    lng: d.lng,
    listed_phone: d.listedPhone,
    street: d.street ?? '',
    needs_gps: d.needsGps ? 'yes' : '',
    visit_status: VISIT_STATUS_LABEL[d.visitStatus],
    visit_date: d.visitDate ?? '',
    surveyor: d.surveyor ?? '',
    cr_number: d.crNumber,
    showroom_size_sqm: d.showroomSizeSqm ?? '',
    size_basis: d.sizeBasis ?? '',
    vehicle_type: d.vehicleType ?? '',
    inventory_age_mix: d.inventoryAgeMix ?? '',
    poc_name: d.pocName,
    poc_role: d.pocRole,
    poc_mobile: d.pocMobile,
    decision_maker: d.decisionMaker,
    num_salesmen: d.numSalesmen ?? '',
    main_brands: d.mainBrands.join('; '),
    authorised: d.authorised ?? '',
    authorised_brand: d.authorisedBrand,
    inventory_sellable_units: d.inventorySellableUnits.value ?? '',
    inventory_sellable_units_basis: d.inventorySellableUnits.basis ?? '',
    inventory_count_basis: d.inventoryCountBasis ?? '',
    avg_selling_price_sar: d.avgSellingPriceSar.value ?? '',
    avg_selling_price_basis: d.avgSellingPriceSar.basis ?? '',
    avg_monthly_sold: d.avgMonthlySold.value ?? '',
    avg_monthly_sold_basis: d.avgMonthlySold.basis ?? '',
    avg_monthly_financed: d.avgMonthlyFinanced.value ?? '',
    avg_monthly_financed_basis: d.avgMonthlyFinanced.basis ?? '',
    financing_lost_per_month: d.financingLostPerMonth.value ?? '',
    financing_lost_per_month_basis: d.financingLostPerMonth.basis ?? '',
    main_fail_reason: d.mainFailReason,
    financing_workaround: d.financingWorkaround,
    banks_partnered: d.banksPartnered.join('; '),
    bank_on_site: d.bankOnSite ?? '',
    buyer_mix: d.buyerMix ?? '',
    lead_mix_online_pct: d.leadMixOnlinePct ?? '',
    network_role: d.networkRole ?? '',
    sub_dealer_of: d.subDealerOfName,
    supplies_sub_dealers: d.suppliesSubDealerNames.join('; '),
    sell_through_units_per_month: d.sellThroughUnitsPerMonth.value ?? '',
    sell_through_units_per_month_basis: d.sellThroughUnitsPerMonth.basis ?? '',
    volume_figures_basis: d.volumeFiguresBasis ?? '',
    open_to_pilot: d.openToPilot ?? '',
    notes: d.notes,
    photo_count: d.photoIds.length,
    updated_at: d.updatedAt,
  };
}

const HEADERS = [
  'id', 'market', 'sd_id', 'name_en', 'name_ar', 'lat', 'lng', 'listed_phone', 'street', 'needs_gps', 'visit_status', 'visit_date',
  'surveyor', 'cr_number', 'showroom_size_sqm', 'size_basis', 'vehicle_type', 'inventory_age_mix',
  'poc_name', 'poc_role', 'poc_mobile', 'decision_maker', 'num_salesmen', 'main_brands',
  'authorised', 'authorised_brand', 'inventory_sellable_units', 'inventory_sellable_units_basis',
  'inventory_count_basis', 'avg_selling_price_sar', 'avg_selling_price_basis', 'avg_monthly_sold',
  'avg_monthly_sold_basis', 'avg_monthly_financed', 'avg_monthly_financed_basis',
  'financing_lost_per_month', 'financing_lost_per_month_basis', 'main_fail_reason',
  'financing_workaround', 'banks_partnered', 'bank_on_site', 'buyer_mix', 'lead_mix_online_pct',
  'network_role', 'sub_dealer_of', 'supplies_sub_dealers', 'sell_through_units_per_month',
  'sell_through_units_per_month_basis',
  'volume_figures_basis', 'open_to_pilot', 'notes', 'photo_count', 'updated_at',
];

function csvEscape(v: string | number): string {
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(dealerships: Dealership[]): string {
  const rows = dealerships.map(flatten);
  const lines = [HEADERS.join(',')];
  for (const row of rows) {
    lines.push(HEADERS.map((h) => csvEscape(row[h] ?? '')).join(','));
  }
  return lines.join('\n');
}

const FINDING_HEADERS = [
  'dealership_id', 'name_en', 'task', 'target_field', 'found', 'value', 'confidence', 'status',
  'changed_from_previous', 'previous_value', 'source_url', 'summary', 'model', 'cost_usd', 'retrieved_at',
];

export async function toXlsxBuffer(dealerships: Dealership[], findings: AgentFinding[] = []): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Dealerships');
  sheet.columns = HEADERS.map((h) => ({ header: h, key: h, width: 18 }));
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  for (const d of dealerships) {
    sheet.addRow(flatten(d));
  }

  // Highlight self-reported numeric columns so nobody mixes them into
  // "observed" averages by accident.
  const basisCols = ['inventory_sellable_units_basis', 'avg_selling_price_basis',
    'avg_monthly_sold_basis', 'avg_monthly_financed_basis', 'financing_lost_per_month_basis'];
  for (const key of basisCols) {
    const colIdx = HEADERS.indexOf(key) + 1;
    sheet.getColumn(colIdx).eachCell((cell, rowNumber) => {
      if (rowNumber === 1) return;
      if (cell.value === 'self_reported') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE68A' } };
      } else if (cell.value === 'observed') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBBF7D0' } };
      }
    });
  }

  // Agent-sourced research lives on its own sheet — never blended into the
  // field-collected columns above.
  if (findings.length > 0) {
    const names = new Map(dealerships.map((d) => [d.id, d.nameEn]));
    const fs = workbook.addWorksheet('Agent findings');
    fs.columns = FINDING_HEADERS.map((h) => ({ header: h, key: h, width: h === 'summary' ? 60 : 18 }));
    fs.getRow(1).font = { bold: true };
    fs.views = [{ state: 'frozen', ySplit: 1 }];
    const sorted = [...findings].sort((a, b) => (a.retrievedAt < b.retrievedAt ? 1 : -1));
    for (const f of sorted) {
      fs.addRow({
        dealership_id: f.dealershipId,
        name_en: names.get(f.dealershipId) ?? '(deleted record)',
        task: f.taskName,
        target_field: f.targetField,
        found: f.found ? 'yes' : 'no',
        value: f.value ?? '',
        confidence: f.confidence,
        status: f.status,
        changed_from_previous: f.changedFromPrevious ? 'yes' : '',
        previous_value: f.previousValue ?? '',
        source_url: f.sourceUrl ?? '',
        summary: f.summary,
        model: f.model,
        cost_usd: f.costUsd ?? '',
        retrieved_at: f.retrievedAt,
      });
    }
  }

  const buf = await workbook.xlsx.writeBuffer();
  return buf as ArrayBuffer;
}

export function downloadFile(filename: string, data: string | ArrayBuffer, mime: string) {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
