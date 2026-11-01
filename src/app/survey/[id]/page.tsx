'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getDealership, saveDealership } from '@/lib/db';
import { useSettings } from '@/lib/settings-context';
import type {
  AuthorisedStatus,
  BankOnSite,
  BuyerMix,
  Dealership,
  FlaggedValue,
  InventoryAgeMix,
  InventoryCountBasis,
  MonthlyFinancedBand,
  MonthlySoldBand,
  NetworkRole,
  PilotInterest,
  SizeBasis,
  VehicleType,
  VisitStatus,
  VolumeFiguresBasis,
} from '@/lib/types';
import {
  BANKS_KSA,
  COMMON_BRANDS,
  FAIL_REASON_OPTIONS,
  VISIT_STATUS_LABEL,
} from '@/lib/types';
import { Field, NumberInput, SegmentedControl, TextArea, TextInput } from '@/components/survey/Field';
import BasisToggle from '@/components/survey/BasisToggle';
import ChipMultiSelect from '@/components/survey/ChipMultiSelect';
import PhotoCapture from '@/components/survey/PhotoCapture';
import VoiceNotes from '@/components/survey/VoiceNotes';
import DealershipResearchPanel from '@/components/research/DealershipResearchPanel';

const STEPS = [
  'Identity',
  'Visit',
  'Business',
  'People',
  'Commercial',
  'Financing pain',
  'Network',
  'Customers',
  'Data quality',
  'Review',
] as const;

export default function SurveyPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { surveyorName } = useSettings();

  const [draft, setDraft] = useState<Dealership | null>(null);
  const [step, setStep] = useState(0);
  const [photoCount, setPhotoCount] = useState(0);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [missingBasisWarning, setMissingBasisWarning] = useState<string[]>([]);
  const [researchOpen, setResearchOpen] = useState(false);
  const loadedOnce = useRef(false);

  useEffect(() => {
    (async () => {
      const d = await getDealership(params.id);
      if (!d) {
        router.replace('/');
        return;
      }
      setDraft(d);
      loadedOnce.current = true;
      // Deep link from Dashboard → Research alerts → Review.
      if (new URLSearchParams(window.location.search).get('research') === '1') setResearchOpen(true);
    })();
  }, [params.id, router]);

  // Autosave on every change, lightly debounced so rapid typing doesn't
  // hammer IndexedDB but a partial survey is never more than ~600ms from safe.
  useEffect(() => {
    if (!draft || !loadedOnce.current) return;
    setSaveState('saving');
    const t = setTimeout(async () => {
      await saveDealership(draft);
      setSaveState('saved');
    }, 600);
    return () => clearTimeout(t);
  }, [draft]);

  if (!draft) {
    return (
      <div className="flex h-full items-center justify-center text-muted">Loading survey…</div>
    );
  }

  const update = <K extends keyof Dealership>(key: K, value: Dealership[K]) => {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const updateFlagged = <T,>(key: keyof Dealership, patch: Partial<FlaggedValue<T>>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const current = prev[key] as unknown as FlaggedValue<T>;
      return { ...prev, [key]: { ...current, ...patch } };
    });
  };

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const checkMissingBasisFlags = (): string[] => {
    const problems: string[] = [];
    const checks: [FlaggedValue<unknown>, string][] = [
      [draft.inventorySellableUnits, 'Inventory — sellable units'],
      [draft.avgSellingPriceSar, 'Average selling price'],
      [draft.avgMonthlySold, 'Average monthly sold'],
      [draft.avgMonthlyFinanced, 'Average monthly financed deals'],
      [draft.financingLostPerMonth, 'Financing enquiries lost per month'],
    ];
    for (const [flagged, label] of checks) {
      if (flagged.value !== null && flagged.value !== '' && !flagged.basis) {
        problems.push(label);
      }
    }
    return problems;
  };

  const canCompleteVisit =
    draft.volumeFiguresBasis !== null && draft.openToPilot !== null;

  const finishVisit = async (status: Extract<VisitStatus, 'completed' | 'partial'>) => {
    const problems = checkMissingBasisFlags();
    if (status === 'completed' && (problems.length > 0 || !canCompleteVisit)) {
      setMissingBasisWarning(
        problems.length > 0
          ? problems
          : ['Data quality section: mark volume figures basis and pilot interest']
      );
      setStep(STEPS.length - 1);
      return;
    }
    const now = new Date().toISOString();
    const next: Dealership = {
      ...draft,
      visitStatus: status,
      visitDate: draft.visitDate ?? now,
      surveyor: draft.surveyor ?? surveyorName,
    };
    setDraft(next);
    await saveDealership(next);
    router.push('/');
  };

  return (
    <div className="safe-top relative flex h-full flex-col bg-background">
      <header className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <button onClick={() => router.push('/')} className="text-sm font-medium text-muted">
            ← Map
          </button>
          <div className="flex items-center gap-3">
            <button onClick={() => setResearchOpen(true)} className="text-sm font-medium text-accent">
              🔍 Research
            </button>
            <SaveIndicator state={saveState} />
          </div>
        </div>
        <h1 className="mt-1 truncate text-base font-semibold text-foreground">{draft.nameEn || 'Unnamed dealership'}</h1>
        <div className="mt-2 flex gap-1">
          {STEPS.map((label, i) => (
            <button
              key={label}
              onClick={() => setStep(i)}
              className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-accent' : 'bg-surface-2'}`}
              aria-label={label}
            />
          ))}
        </div>
        <p className="mt-1 text-xs text-muted">
          Step {step + 1} of {STEPS.length} · {STEPS[step]}
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        {step === 0 && <IdentityStep draft={draft} update={update} />}
        {step === 1 && <VisitStep draft={draft} update={update} surveyorName={surveyorName} />}
        {step === 2 && <BusinessStep draft={draft} update={update} />}
        {step === 3 && <PeopleStep draft={draft} update={update} />}
        {step === 4 && <CommercialStep draft={draft} update={update} updateFlagged={updateFlagged} />}
        {step === 5 && <FinancingStep draft={draft} update={update} updateFlagged={updateFlagged} />}
        {step === 6 && <NetworkStep draft={draft} update={update} updateFlagged={updateFlagged} />}
        {step === 7 && <CustomersStep draft={draft} update={update} />}
        {step === 8 && (
          <DataQualityStep
            draft={draft}
            update={update}
            photoCount={photoCount}
            setPhotoCount={setPhotoCount}
            missingBasisWarning={missingBasisWarning}
          />
        )}
        {step === 9 && (
          <ReviewStep draft={draft} onEditStep={setStep} missingBasisWarning={checkMissingBasisFlags()} />
        )}
      </div>

      <div className="safe-bottom flex gap-2 border-t border-border px-4 py-3">
        <button
          onClick={goBack}
          disabled={step === 0}
          className="flex-1 rounded-xl bg-surface-2 py-3.5 text-sm font-semibold text-foreground disabled:opacity-30"
        >
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <button onClick={goNext} className="flex-[2] rounded-xl bg-accent py-3.5 text-sm font-semibold text-accent-contrast">
            Next
          </button>
        ) : (
          <>
            <button
              onClick={() => finishVisit('partial')}
              className="flex-1 rounded-xl bg-amber-500/15 py-3.5 text-sm font-semibold text-amber-500"
            >
              Save as partial
            </button>
            <button
              onClick={() => finishVisit('completed')}
              className="flex-[2] rounded-xl bg-emerald-500 py-3.5 text-sm font-semibold text-white"
            >
              Mark complete
            </button>
          </>
        )}
      </div>

      {researchOpen && (
        <DealershipResearchPanel
          dealershipId={draft.id}
          onClose={async () => {
            setResearchOpen(false);
            const fresh = await getDealership(draft.id);
            if (fresh) setDraft(fresh);
          }}
        />
      )}
    </div>
  );
}

function SaveIndicator({ state }: { state: 'idle' | 'saving' | 'saved' }) {
  if (state === 'idle') return <span className="text-xs text-muted">—</span>;
  return (
    <span className={`text-xs font-medium ${state === 'saving' ? 'text-amber-500' : 'text-emerald-500'}`}>
      {state === 'saving' ? '● Saving…' : '✓ Saved offline'}
    </span>
  );
}

// ---------- Step 1: Identity ----------
function IdentityStep({
  draft,
  update,
}: {
  draft: Dealership;
  update: <K extends keyof Dealership>(key: K, value: Dealership[K]) => void;
}) {
  const updateGps = () => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      update('lat', pos.coords.latitude);
      update('lng', pos.coords.longitude);
      if (draft.needsGps) {
        update('needsGps', false);
        if (draft.note === 'Approximate pin — confirm GPS on site') update('note', '');
      }
    });
  };

  return (
    <div className="space-y-5">
      <Field label="Dealership name (English)">
        <TextInput value={draft.nameEn} onChange={(e) => update('nameEn', e.target.value)} />
      </Field>
      <Field label="Dealership name (Arabic)">
        <TextInput dir="rtl" value={draft.nameAr} onChange={(e) => update('nameAr', e.target.value)} />
      </Field>
      <Field label="Coordinates">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-3.5 text-sm text-muted">
          {draft.lat.toFixed(6)}, {draft.lng.toFixed(6)}
        </div>
        {draft.needsGps && (
          <p className="mt-1 text-xs font-medium text-amber-500">
            Approximate pin from the mapping sheet — stand at the showroom entrance and update it.
          </p>
        )}
        <button
          type="button"
          onClick={updateGps}
          className="mt-2 rounded-lg bg-surface-2 px-3 py-2 text-xs font-semibold text-foreground"
        >
          📍 Update to my current position
        </button>
      </Field>
      <Field label="Listed phone">
        <TextInput type="tel" value={draft.listedPhone} onChange={(e) => update('listedPhone', e.target.value)} />
      </Field>
    </div>
  );
}

// ---------- Step 2: Visit metadata ----------
function VisitStep({
  draft,
  update,
  surveyorName,
}: {
  draft: Dealership;
  update: <K extends keyof Dealership>(key: K, value: Dealership[K]) => void;
  surveyorName: string | null;
}) {
  const statuses: VisitStatus[] = ['not_visited', 'completed', 'partial', 'refused', 'closed_moved'];
  return (
    <div className="space-y-5">
      <Field label="Visit status">
        <SegmentedControl
          options={statuses.map((s) => ({ value: s, label: VISIT_STATUS_LABEL[s] }))}
          value={draft.visitStatus}
          onChange={(v) => update('visitStatus', v)}
        />
      </Field>
      <Field label="Visit date">
        <div className="rounded-xl border border-border bg-surface-2 px-4 py-3.5 text-sm text-muted">
          {draft.visitDate ? new Date(draft.visitDate).toLocaleString() : 'Set automatically on completion'}
        </div>
      </Field>
      <Field label="Surveyor">
        <div className="rounded-xl border border-border bg-surface-2 px-4 py-3.5 text-sm text-muted">
          {draft.surveyor ?? surveyorName ?? '—'}
        </div>
      </Field>
    </div>
  );
}

// ---------- Step 3: Business identity ----------
function BusinessStep({
  draft,
  update,
}: {
  draft: Dealership;
  update: <K extends keyof Dealership>(key: K, value: Dealership[K]) => void;
}) {
  const sizeBasisOpts: SizeBasis[] = ['measured', 'estimated', 'dealer_stated'];
  const vehicleTypeOpts: VehicleType[] = ['new_only', 'used_only', 'mix'];
  const ageMixOpts: InventoryAgeMix[] = ['mostly_2020_plus', 'mostly_2015_2020', 'mostly_pre_2015', 'wide_spread'];

  return (
    <div className="space-y-5">
      <Field label="CR number (commercial registration)" highlight>
        <TextInput value={draft.crNumber} onChange={(e) => update('crNumber', e.target.value)} placeholder="10-digit CR number" />
      </Field>
      <Field label="Showroom size (sqm)">
        <NumberInput value={draft.showroomSizeSqm} onValueChange={(v) => update('showroomSizeSqm', v)} />
      </Field>
      <Field label="Size basis">
        <SegmentedControl
          options={sizeBasisOpts.map((v) => ({ value: v, label: labelize(v) }))}
          value={draft.sizeBasis}
          onChange={(v) => update('sizeBasis', v)}
        />
      </Field>
      <Field label="Vehicle type">
        <SegmentedControl
          options={vehicleTypeOpts.map((v) => ({ value: v, label: labelize(v) }))}
          value={draft.vehicleType}
          onChange={(v) => update('vehicleType', v)}
        />
      </Field>
      <Field label="Inventory age mix">
        <SegmentedControl
          options={ageMixOpts.map((v) => ({ value: v, label: labelize(v) }))}
          value={draft.inventoryAgeMix}
          onChange={(v) => update('inventoryAgeMix', v)}
        />
      </Field>
    </div>
  );
}

// ---------- Step 4: People ----------
function PeopleStep({
  draft,
  update,
}: {
  draft: Dealership;
  update: <K extends keyof Dealership>(key: K, value: Dealership[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <Field label="POC name">
        <TextInput value={draft.pocName} onChange={(e) => update('pocName', e.target.value)} />
      </Field>
      <Field label="POC role">
        <TextInput value={draft.pocRole} onChange={(e) => update('pocRole', e.target.value)} placeholder="e.g. Sales manager" />
      </Field>
      <Field label="POC mobile">
        <TextInput type="tel" value={draft.pocMobile} onChange={(e) => update('pocMobile', e.target.value)} />
      </Field>
      <Field label="Decision maker (if different)">
        <TextInput value={draft.decisionMaker} onChange={(e) => update('decisionMaker', e.target.value)} />
      </Field>
      <Field label="Number of salesmen">
        <NumberInput value={draft.numSalesmen} onValueChange={(v) => update('numSalesmen', v)} />
      </Field>
    </div>
  );
}

// ---------- Step 5: Commercial ----------
function CommercialStep({
  draft,
  update,
  updateFlagged,
}: {
  draft: Dealership;
  update: <K extends keyof Dealership>(key: K, value: Dealership[K]) => void;
  updateFlagged: <T>(key: keyof Dealership, patch: Partial<FlaggedValue<T>>) => void;
}) {
  const authOpts: AuthorisedStatus[] = ['yes', 'no', 'unclear'];
  const countBasisOpts: InventoryCountBasis[] = ['counted', 'estimated', 'dealer_stated'];
  const soldBands: MonthlySoldBand[] = ['0_20', '21_50', '51_100', '100_plus', 'refused'];
  const financedBands: MonthlyFinancedBand[] = ['0_5', '6_15', '16_40', '40_plus', 'refused'];

  return (
    <div className="space-y-5">
      <Field label="Main brands dealt">
        <ChipMultiSelect
          options={COMMON_BRANDS}
          value={draft.mainBrands}
          onChange={(v) => update('mainBrands', v)}
          freeTextPlaceholder="Add another brand…"
        />
      </Field>
      <Field label="Authorised dealer?">
        <SegmentedControl options={authOpts.map((v) => ({ value: v, label: labelize(v) }))} value={draft.authorised} onChange={(v) => update('authorised', v)} />
      </Field>
      {draft.authorised === 'yes' && (
        <Field label="Authorised for which brand">
          <TextInput value={draft.authorisedBrand} onChange={(e) => update('authorisedBrand', e.target.value)} />
        </Field>
      )}

      <Field label="Inventory — sellable units">
        <NumberInput
          value={draft.inventorySellableUnits.value}
          onValueChange={(v) => updateFlagged<number>('inventorySellableUnits', { value: v })}
        />
        <BasisToggle
          basis={draft.inventorySellableUnits.basis}
          onChange={(b) => updateFlagged<number>('inventorySellableUnits', { basis: b })}
        />
      </Field>
      <Field label="Inventory count basis">
        <SegmentedControl options={countBasisOpts.map((v) => ({ value: v, label: labelize(v) }))} value={draft.inventoryCountBasis} onChange={(v) => update('inventoryCountBasis', v)} />
      </Field>

      <Field label="Average selling price (SAR)">
        <NumberInput
          value={draft.avgSellingPriceSar.value}
          onValueChange={(v) => updateFlagged<number>('avgSellingPriceSar', { value: v })}
        />
        <BasisToggle basis={draft.avgSellingPriceSar.basis} onChange={(b) => updateFlagged<number>('avgSellingPriceSar', { basis: b })} />
      </Field>

      <Field label="Average monthly sold">
        <SegmentedControl
          options={soldBands.map((v) => ({ value: v, label: bandLabel(v) }))}
          value={draft.avgMonthlySold.value}
          onChange={(v) => updateFlagged<MonthlySoldBand>('avgMonthlySold', { value: v })}
        />
        <BasisToggle basis={draft.avgMonthlySold.basis} onChange={(b) => updateFlagged<MonthlySoldBand>('avgMonthlySold', { basis: b })} />
      </Field>

      <Field label="Average monthly financed deals">
        <SegmentedControl
          options={financedBands.map((v) => ({ value: v, label: bandLabel(v) }))}
          value={draft.avgMonthlyFinanced.value}
          onChange={(v) => updateFlagged<MonthlyFinancedBand>('avgMonthlyFinanced', { value: v })}
        />
        <BasisToggle basis={draft.avgMonthlyFinanced.basis} onChange={(b) => updateFlagged<MonthlyFinancedBand>('avgMonthlyFinanced', { basis: b })} />
      </Field>
    </div>
  );
}

// ---------- Step 6: Financing pain ----------
function FinancingStep({
  draft,
  update,
  updateFlagged,
}: {
  draft: Dealership;
  update: <K extends keyof Dealership>(key: K, value: Dealership[K]) => void;
  updateFlagged: <T>(key: keyof Dealership, patch: Partial<FlaggedValue<T>>) => void;
}) {
  const bankOnSiteOpts: BankOnSite[] = ['yes_permanent', 'yes_weekly', 'no'];

  return (
    <div className="space-y-5 rounded-2xl border border-accent/30 bg-accent/5 p-4 -mx-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">Most important section</p>

      <Field label="Financing enquiries lost per month">
        <NumberInput
          value={draft.financingLostPerMonth.value}
          onValueChange={(v) => updateFlagged<number>('financingLostPerMonth', { value: v })}
        />
        <BasisToggle basis={draft.financingLostPerMonth.basis} onChange={(b) => updateFlagged<number>('financingLostPerMonth', { basis: b })} />
      </Field>

      <Field label="Main reason deals fail" hint="Tap a suggestion or type your own">
        <div className="flex flex-wrap gap-2">
          {FAIL_REASON_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => update('mainFailReason', opt)}
              className={`rounded-full border px-3 py-2 text-xs font-medium ${
                draft.mainFailReason === opt ? 'border-accent bg-accent/10 text-accent' : 'border-border text-foreground'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
        <TextInput
          className="mt-2"
          value={draft.mainFailReason}
          onChange={(e) => update('mainFailReason', e.target.value)}
          placeholder="Or describe in your own words"
        />
      </Field>

      <Field label="Current financing workaround" hint="Which agent/broker they use now, and what it costs them">
        <TextArea rows={3} value={draft.financingWorkaround} onChange={(e) => update('financingWorkaround', e.target.value)} />
      </Field>

      <Field label="Banks partnered">
        <ChipMultiSelect options={BANKS_KSA} value={draft.banksPartnered} onChange={(v) => update('banksPartnered', v)} />
      </Field>

      <Field label="Bank representative on site?">
        <SegmentedControl options={bankOnSiteOpts.map((v) => ({ value: v, label: labelize(v) }))} value={draft.bankOnSite} onChange={(v) => update('bankOnSite', v)} />
      </Field>
    </div>
  );
}

// ---------- Step 7: Customers ----------
// ---------- Step 7: Network (dealer → sub-dealer, not end customer) ----------
function NetworkStep({
  draft,
  update,
  updateFlagged,
}: {
  draft: Dealership;
  update: <K extends keyof Dealership>(key: K, value: Dealership[K]) => void;
  updateFlagged: <T>(key: keyof Dealership, patch: Partial<FlaggedValue<T>>) => void;
}) {
  const roleOpts: NetworkRole[] = ['retail_only', 'supplies_sub_dealers', 'sub_dealer_of_another', 'both'];
  const suppliesTo = draft.networkRole === 'supplies_sub_dealers' || draft.networkRole === 'both';
  const subDealerOf = draft.networkRole === 'sub_dealer_of_another' || draft.networkRole === 'both';

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-surface-2 p-3 text-xs text-muted">
        This is about the wholesale layer — does this dealership move cars to <b>other, smaller dealers</b>{' '}
        who then resell them, separately from selling to the end customer (already covered under
        Commercial / Financing pain)?
      </div>

      <Field label="Role in the dealer network">
        <SegmentedControl
          options={roleOpts.map((v) => ({ value: v, label: labelize(v) }))}
          value={draft.networkRole}
          onChange={(v) => update('networkRole', v)}
        />
      </Field>

      {subDealerOf && (
        <Field label="Buys stock from (hub / supplier)">
          <TextInput
            value={draft.subDealerOfName}
            onChange={(e) => update('subDealerOfName', e.target.value)}
            placeholder="Name of the dealership or importer they source from"
          />
        </Field>
      )}

      {suppliesTo && (
        <>
          <Field label="Supplies which sub-dealers" hint="Add each sub-dealer name">
            <ChipMultiSelect
              options={[]}
              value={draft.suppliesSubDealerNames}
              onChange={(v) => update('suppliesSubDealerNames', v)}
              freeTextPlaceholder="Sub-dealer name…"
            />
          </Field>

          <Field label="Sell-through to sub-dealers per month" hint="Units moved to sub-dealers, not to end customers">
            <NumberInput
              value={draft.sellThroughUnitsPerMonth.value}
              onValueChange={(v) => updateFlagged<number>('sellThroughUnitsPerMonth', { value: v })}
            />
            <BasisToggle
              basis={draft.sellThroughUnitsPerMonth.basis}
              onChange={(b) => updateFlagged<number>('sellThroughUnitsPerMonth', { basis: b })}
            />
          </Field>
        </>
      )}
    </div>
  );
}

function CustomersStep({
  draft,
  update,
}: {
  draft: Dealership;
  update: <K extends keyof Dealership>(key: K, value: Dealership[K]) => void;
}) {
  const buyerMixOpts: BuyerMix[] = ['mostly_saudi', 'mostly_expat', 'roughly_even', 'mostly_self_employed'];
  const online = draft.leadMixOnlinePct ?? 50;

  return (
    <div className="space-y-6">
      <Field label="Buyer mix">
        <SegmentedControl options={buyerMixOpts.map((v) => ({ value: v, label: labelize(v) }))} value={draft.buyerMix} onChange={(v) => update('buyerMix', v)} />
      </Field>
      <Field label="Lead mix">
        <input
          type="range"
          min={0}
          max={100}
          value={online}
          onChange={(e) => update('leadMixOnlinePct', Number(e.target.value))}
          className="w-full accent-[var(--accent)]"
        />
        <div className="mt-1 flex justify-between text-sm text-foreground">
          <span>{online}% online</span>
          <span>{100 - online}% walk-in</span>
        </div>
      </Field>
    </div>
  );
}

// ---------- Step 8: Data quality ----------
function DataQualityStep({
  draft,
  update,
  photoCount,
  setPhotoCount,
  missingBasisWarning,
}: {
  draft: Dealership;
  update: <K extends keyof Dealership>(key: K, value: Dealership[K]) => void;
  photoCount: number;
  setPhotoCount: (n: number) => void;
  missingBasisWarning: string[];
}) {
  const volumeBasisOpts: VolumeFiguresBasis[] = ['observed', 'self_reported', 'mixed'];
  const pilotOpts: PilotInterest[] = ['yes', 'maybe', 'no', 'too_early'];

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-3">
        <p className="text-xs font-semibold text-red-500">Mandatory before submit</p>
        <p className="mt-0.5 text-xs text-muted">
          These fields protect the analysis from mixing observed and self-reported numbers.
        </p>
      </div>

      {missingBasisWarning.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-500">
          Missing observed/self-reported flag on: {missingBasisWarning.join(', ')}
        </div>
      )}

      <Field label="Volume figures are" required>
        <SegmentedControl options={volumeBasisOpts.map((v) => ({ value: v, label: labelize(v) }))} value={draft.volumeFiguresBasis} onChange={(v) => update('volumeFiguresBasis', v)} />
      </Field>
      <Field label="Open to pilot?" required>
        <SegmentedControl options={pilotOpts.map((v) => ({ value: v, label: labelize(v) }))} value={draft.openToPilot} onChange={(v) => update('openToPilot', v)} />
      </Field>
      <Field label="Photos">
        <PhotoCapture dealershipId={draft.id} onCountChange={setPhotoCount} />
        <p className="mt-1 text-xs text-muted">{photoCount} photo(s) captured, auto-geotagged</p>
      </Field>
      <Field label="Notes">
        <TextArea
          rows={5}
          value={draft.notes}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="Anything else worth remembering about this visit…"
        />
        <VoiceNotes onTranscript={(text) => update('notes', (draft.notes ? draft.notes + ' ' : '') + text)} />
      </Field>
    </div>
  );
}

// ---------- Step 9: Review ----------
function ReviewStep({
  draft,
  onEditStep,
  missingBasisWarning,
}: {
  draft: Dealership;
  onEditStep: (i: number) => void;
  missingBasisWarning: string[];
}) {
  const rows: [string, string, number][] = [
    ['CR number', draft.crNumber || '—', 2],
    ['Showroom size', draft.showroomSizeSqm ? `${draft.showroomSizeSqm} sqm` : '—', 2],
    ['POC', draft.pocName || '—', 3],
    ['Brands', draft.mainBrands.join(', ') || '—', 4],
    ['Financing lost/month', String(draft.financingLostPerMonth.value ?? '—'), 5],
    ['Banks partnered', draft.banksPartnered.join(', ') || '—', 5],
    ['Network role', draft.networkRole ? labelize(draft.networkRole) : '—', 6],
    ['Volume figures basis', draft.volumeFiguresBasis ? labelize(draft.volumeFiguresBasis) : '—', 8],
    ['Open to pilot', draft.openToPilot ? labelize(draft.openToPilot) : '—', 8],
  ];

  return (
    <div className="space-y-4">
      {missingBasisWarning.length > 0 && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-500">
          Can&apos;t mark complete yet — missing basis flag on: {missingBasisWarning.join(', ')}
        </div>
      )}
      <p className="text-sm text-muted">Quick review before you submit. Tap any row to jump back and edit.</p>
      <div className="divide-y divide-border rounded-xl border border-border bg-surface">
        {rows.map(([label, value, stepIdx]) => (
          <button
            key={label}
            onClick={() => onEditStep(stepIdx)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <span className="text-sm text-muted">{label}</span>
            <span className="max-w-[60%] truncate text-sm font-medium text-foreground">{value}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function labelize(v: string): string {
  return v
    .split('_')
    .map((w) => (w === 'sar' ? 'SAR' : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

function bandLabel(v: string): string {
  if (v === 'refused') return 'Refused';
  return v.replace('_plus', '+').replace('_', '–');
}
