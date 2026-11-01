'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuid } from 'uuid';
import { addDealership } from '@/lib/db';
import type { Dealership } from '@/lib/types';
import { useSettings } from '@/lib/settings-context';
import { MARKETS } from '@/lib/markets';

export default function AddDealershipPage() {
  const router = useRouter();
  const { surveyorName, activeMarket } = useSettings();
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [phone, setPhone] = useState('');
  const [geoSupported] = useState(() => typeof navigator !== 'undefined' && 'geolocation' in navigator);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(geoSupported);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!geoSupported) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [geoSupported]);

  const canSave = nameEn.trim().length > 0 && coords !== null;

  const save = async () => {
    if (!canSave || !coords) return;
    setSaving(true);
    const now = new Date().toISOString();
    const d: Dealership = {
      id: uuid(),
      createdAt: now,
      updatedAt: now,
      nameEn: nameEn.trim(),
      nameAr: nameAr.trim(),
      lat: coords.lat,
      lng: coords.lng,
      listedPhone: phone.trim(),
      note: '',
      isSeed: false,
      market: activeMarket,
      visitStatus: 'not_visited',
      visitDate: null,
      surveyor: surveyorName,
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
    setSaving(false);
    router.push(`/survey/${d.id}`);
  };

  return (
    <div className="safe-top flex h-full flex-col bg-background">
      <header className="border-b border-border px-4 py-4">
        <h1 className="text-lg font-semibold text-foreground">Add dealership</h1>
        <p className="mt-0.5 text-xs text-muted">
          Found one that isn&apos;t on the roster — capture it now. It&apos;s added to{' '}
          <b className="text-foreground">{MARKETS[activeMarket].label}</b> (switch market on the Map).
        </p>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
        <div
          className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
            coords ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500' : 'border-border bg-surface-2 text-muted'
          }`}
        >
          <span className="text-lg">{locating ? '⏳' : coords ? '📍' : '⚠️'}</span>
          {locating && 'Getting your GPS position…'}
          {!locating && coords && `Captured: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`}
          {!locating && !coords && 'Could not get GPS position — check location permission.'}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Name (English) *</label>
          <input
            autoFocus
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            placeholder="Showroom name"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3.5 text-foreground outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Name (Arabic)</label>
          <input
            dir="rtl"
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            placeholder="اسم المعرض"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3.5 text-foreground outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+9665XXXXXXXX"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3.5 text-foreground outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="safe-bottom border-t border-border px-4 py-4">
        <button
          onClick={save}
          disabled={!canSave || saving}
          className="w-full rounded-xl bg-accent py-3.5 font-semibold text-accent-contrast disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save & start survey'}
        </button>
      </div>
    </div>
  );
}
