'use client';

import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { addDealership, getAllDealerships } from '@/lib/db';
import { guessMapping, parseCsvText, parseXlsxBuffer, TARGET_FIELDS, type ParsedSheet } from '@/lib/import';
import type { AuthorisedStatus, Dealership, VisitStatus } from '@/lib/types';
import { MARKETS, type MarketId } from '@/lib/markets';

function emptyDealership(market: MarketId): Dealership {
  const now = new Date().toISOString();
  return {
    id: uuid(),
    createdAt: now,
    updatedAt: now,
    nameEn: '',
    nameAr: '',
    lat: MARKETS[market].center.lat,
    lng: MARKETS[market].center.lng,
    market,
    listedPhone: '',
    note: '',
    isSeed: false,
    visitStatus: 'not_visited',
    visitDate: null,
    surveyor: null,
    crNumber: '',
    showroomSizeSqm: null,
    sizeBasis: null,
    vehicleType: null,
    inventoryAgeMix: null,
    pocName: '',
    pocRole: '',
    pocMobile: '',
    decisionMaker: '',
    numSalesmen: null,
    mainBrands: [],
    authorised: null,
    authorisedBrand: '',
    inventorySellableUnits: { value: null, basis: null },
    inventoryCountBasis: null,
    avgSellingPriceSar: { value: null, basis: null },
    avgMonthlySold: { value: null, basis: null },
    avgMonthlyFinanced: { value: null, basis: null },
    financingLostPerMonth: { value: null, basis: null },
    mainFailReason: '',
    financingWorkaround: '',
    banksPartnered: [],
    bankOnSite: null,
    buyerMix: null,
    leadMixOnlinePct: null,
    networkRole: null,
    subDealerOfName: '',
    suppliesSubDealerNames: [],
    sellThroughUnitsPerMonth: { value: null, basis: null },
    volumeFiguresBasis: null,
    openToPilot: null,
    notes: '',
    photoIds: [],
    dirty: true,
  };
}

function parseVisitStatus(raw: string): VisitStatus {
  const v = raw.trim().toLowerCase();
  if (v.includes('competitor')) return 'competitor';
  if (v.includes('complete')) return 'completed';
  if (v.includes('partial')) return 'partial';
  if (v.includes('refus')) return 'refused';
  if (v.includes('clos') || v.includes('moved') || v.includes('relocat')) return 'closed_moved';
  return 'not_visited';
}

function parseAuthorised(raw: string): AuthorisedStatus | null {
  const v = raw.trim().toLowerCase();
  if (v === 'yes' || v === 'y' || v === 'true') return 'yes';
  if (v === 'no' || v === 'n' || v === 'false') return 'no';
  if (v) return 'unclear';
  return null;
}

export default function ImportDealerships({ onImported, market }: { onImported: () => void; market: MarketId }) {
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<Record<string, number | null>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  const handleFile = async (file: File) => {
    setResult(null);
    let parsed: ParsedSheet;
    if (file.name.toLowerCase().endsWith('.csv')) {
      parsed = parseCsvText(await file.text());
    } else {
      parsed = await parseXlsxBuffer(await file.arrayBuffer());
    }
    setSheet(parsed);
    setMapping(guessMapping(parsed.headers));
  };

  const runImport = async () => {
    if (!sheet) return;
    setImporting(true);
    const nameIdx = mapping.nameEn;
    const latIdx = mapping.lat;
    const lngIdx = mapping.lng;

    const existing = skipDuplicates ? await getAllDealerships() : [];
    const existingNames = new Set(existing.map((d) => d.nameEn.trim().toLowerCase()));

    let imported = 0;
    let skipped = 0;

    for (const row of sheet.rows) {
      const name = nameIdx !== null ? row[nameIdx]?.trim() : '';
      if (!name) {
        skipped++;
        continue;
      }
      if (skipDuplicates && existingNames.has(name.toLowerCase())) {
        skipped++;
        continue;
      }

      const d = emptyDealership(market);
      d.nameEn = name;
      if (mapping.nameAr !== null) d.nameAr = row[mapping.nameAr]?.trim() ?? '';
      if (latIdx !== null && row[latIdx]) d.lat = Number(row[latIdx]) || d.lat;
      if (lngIdx !== null && row[lngIdx]) d.lng = Number(row[lngIdx]) || d.lng;
      if (mapping.listedPhone !== null) d.listedPhone = row[mapping.listedPhone]?.trim() ?? '';
      if (mapping.crNumber !== null) d.crNumber = row[mapping.crNumber]?.trim() ?? '';
      if (mapping.pocName !== null) d.pocName = row[mapping.pocName]?.trim() ?? '';
      if (mapping.pocMobile !== null) d.pocMobile = row[mapping.pocMobile]?.trim() ?? '';
      if (mapping.mainBrands !== null) {
        const raw = row[mapping.mainBrands] ?? '';
        d.mainBrands = raw.split(/[,;]/).map((b) => b.trim()).filter(Boolean);
      }
      if (mapping.authorised !== null) d.authorised = parseAuthorised(row[mapping.authorised] ?? '');
      if (mapping.visitStatus !== null) d.visitStatus = parseVisitStatus(row[mapping.visitStatus] ?? '');
      if (mapping.notes !== null) d.notes = row[mapping.notes]?.trim() ?? '';

      await addDealership(d);
      existingNames.add(name.toLowerCase());
      imported++;
    }

    setImporting(false);
    setResult(`Imported ${imported} record(s). Skipped ${skipped} (missing name or duplicate).`);
    onImported();
  };

  return (
    <div>
      {!sheet ? (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-8 text-center">
          <span className="text-2xl">📄</span>
          <span className="text-sm font-medium text-foreground">Choose a CSV or Excel file</span>
          <span className="text-xs text-muted">Your manually-surveyed sheet, or a re-export</span>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted">
            {sheet.rows.length} row(s) detected. Map your columns to fields below — we guessed where we could.
          </p>
          <div className="space-y-2">
            {TARGET_FIELDS.map((field) => (
              <div key={field.key} className="flex items-center justify-between gap-2">
                <span className="text-xs text-foreground">{field.label}</span>
                <select
                  value={mapping[field.key] ?? ''}
                  onChange={(e) =>
                    setMapping((m) => ({ ...m, [field.key]: e.target.value === '' ? null : Number(e.target.value) }))
                  }
                  className="max-w-[55%] rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-foreground"
                >
                  <option value="">— none —</option>
                  {sheet.headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `Column ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} />
            Skip rows whose English name already exists
          </label>

          {result && <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-500">{result}</p>}

          <div className="flex gap-2">
            <button
              onClick={runImport}
              disabled={importing || mapping.nameEn === null}
              className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-semibold text-accent-contrast disabled:opacity-40"
            >
              {importing ? 'Importing…' : `Import ${sheet.rows.length} row(s)`}
            </button>
            <button
              onClick={() => {
                setSheet(null);
                setResult(null);
              }}
              className="rounded-xl bg-surface-2 px-4 py-2.5 text-sm font-medium text-foreground"
            >
              Cancel
            </button>
          </div>
          {mapping.nameEn === null && (
            <p className="text-xs text-red-500">Map at least the Name (English) column to import.</p>
          )}
        </div>
      )}
    </div>
  );
}
