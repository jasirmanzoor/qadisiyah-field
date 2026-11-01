'use client';

import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { addDealership, getAllDealerships } from '@/lib/db';
import { haversineMeters } from '@/lib/geo';
import { queryOsmCarDealers, type OsmCandidate } from '@/lib/osmDiscovery';
import type { Dealership } from '@/lib/types';
import { MARKETS, type MarketId } from '@/lib/markets';

const DEDUPE_RADIUS_M = 25;

function normaliseName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9؀-ۿ]/g, '');
}

export default function DiscoverDealerships({ onImported, market }: { onImported: () => void; market: MarketId }) {
  const [radius, setRadius] = useState(1500);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<OsmCandidate[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const search = async () => {
    setLoading(true);
    setError(null);
    setCandidates(null);
    setResult(null);
    try {
      const found = await queryOsmCarDealers(MARKETS[market].center, radius);
      const existing = await getAllDealerships();
      const existingNames = new Set(existing.map((d) => normaliseName(d.nameEn)));

      const fresh = found.filter((c) => {
        if (existingNames.has(normaliseName(c.name))) return false;
        return !existing.some((d) => haversineMeters(d, c) < DEDUPE_RADIUS_M);
      });
      setCandidates(fresh);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const addAll = async () => {
    if (!candidates) return;
    setAdding(true);
    const now = new Date().toISOString();
    for (const c of candidates) {
      const d: Dealership = {
        id: uuid(),
        createdAt: now,
        updatedAt: now,
        nameEn: c.name,
        nameAr: '',
        lat: c.lat,
        lng: c.lng,
        listedPhone: c.osmPhone,
        note: 'Discovered via OpenStreetMap — unverified, needs field visit',
        isSeed: false,
        market,
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
      await addDealership(d);
    }
    setResult(`Added ${candidates.length} new pin(s) — all marked "not visited" and tagged as OSM-sourced until you verify them.`);
    setCandidates(null);
    setAdding(false);
    onImported();
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={500}
          max={4000}
          step={100}
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          className="flex-1 accent-[var(--accent)]"
        />
        <span className="w-16 shrink-0 text-right text-xs text-muted">{(radius / 1000).toFixed(1)} km</span>
      </div>
      <button
        onClick={search}
        disabled={loading}
        className="mt-3 w-full rounded-xl bg-surface-2 py-2.5 text-sm font-semibold text-foreground disabled:opacity-40"
      >
        {loading ? 'Searching OpenStreetMap…' : 'Search for nearby dealerships'}
      </button>

      {error && <p className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500">{error}</p>}
      {result && <p className="mt-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-500">{result}</p>}

      {candidates && (
        <div className="mt-3">
          <p className="text-xs text-muted">
            {candidates.length} new candidate(s) not already on your roster. Names and coordinates
            only — no business details are invented. Added as &quot;not visited&quot; pins for you
            to verify in person.
          </p>
          {candidates.length > 0 && (
            <>
              <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-border">
                {candidates.map((c) => (
                  <div key={`${c.osmType}-${c.osmId}`} className="border-b border-border px-3 py-2 text-xs text-foreground last:border-0">
                    {c.name}
                  </div>
                ))}
              </div>
              <button
                onClick={addAll}
                disabled={adding}
                className="mt-2 w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-accent-contrast disabled:opacity-40"
              >
                {adding ? 'Adding…' : `Add ${candidates.length} pin(s) to map`}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
