import { Link, useNavigate } from "@tanstack/react-router";
import { AiSurveySheet } from "@/components/ai/ai-survey-sheet";
import { Button } from "@/components/ui/button";
import { ChipMulti, Choice, FigureBadge, Input, Label, SourceToggle, Textarea } from "@/components/ui/field";
import { BANK_OPTIONS, BRAND_OPTIONS, FAIL_REASON_OPTIONS } from "@/lib/seed";
import { COPY } from "@/lib/i18n";
import { compressImage } from "@/lib/image";
import { dealerMarket } from "@/lib/markets";
import { canSubmitSurvey, SURVEY_STEPS } from "@/lib/survey-schema";
import type { SurveyPayload, VisitStatus } from "@/lib/types";
import { todayISO, uid } from "@/lib/utils";
import { useField, surveyFor } from "@/stores/field";
import { usePrefs } from "@/stores/prefs";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { ChevronLeft, Mic, MicOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function SurveyWizard({ dealershipId }: { dealershipId: string }) {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const { lang } = usePrefs();
  const t = COPY[lang];
  const snapshot = useField((s) => s.snapshot);
  const gps = useField((s) => s.gps);
  const patchSurvey = useField((s) => s.patchSurvey);
  const upsertDealer = useField((s) => s.upsertDealer);
  const addPhoto = useField((s) => s.addPhoto);
  const removePhoto = useField((s) => s.removePhoto);

  const dealer = snapshot.dealerships.find((d) => d.id === dealershipId);
  const record = surveyFor(snapshot, dealershipId);
  const payload: SurveyPayload = record?.payload ?? {};
  const step = record?.step ?? 0;
  const photos = snapshot.photos.filter((p) => p.dealershipId === dealershipId);

  const [aiOpen, setAiOpen] = useState(false);

  const timer = useRef<number | null>(null);
  function save(patch: Partial<SurveyPayload>, nextStep = step, status?: VisitStatus) {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      void patchSurvey(dealershipId, patch, nextStep, status);
    }, 250);
  }

  useEffect(() => {
    if (!dealer) return;
    const patch: Partial<SurveyPayload> = {};
    if (!payload.visitDate) patch.visitDate = todayISO();
    if (!payload.surveyorName) patch.surveyorName = user?.displayName || user?.primaryEmail || "";
    if (!payload.visitStatus) patch.visitStatus = dealer.status;
    if (dealerMarket(dealer) === "shifa" && !payload.vehicleType) patch.vehicleType = "used_only";
    if (Object.keys(patch).length === 0) return;
    void patchSurvey(dealershipId, patch);
  }, [dealer, dealershipId, payload.visitDate, payload.surveyorName, payload.visitStatus, payload.vehicleType, patchSurvey, user]);

  if (!dealer) {
    return (
      <div className="p-6 text-sm text-muted">
        Dealership not found. <Link to="/">Back to map</Link>
      </div>
    );
  }

  const stepMeta = SURVEY_STEPS[step];
  const submitGate = canSubmitSurvey(payload);

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col bg-bg pt-[env(safe-area-inset-top)]">
      <div className="flex items-center gap-2 border-b border-border px-2 py-2">
        <button
          type="button"
          aria-label={step === 0 ? t.map : t.back}
          className="grid size-12 place-items-center"
          onClick={() => (step === 0 ? navigate({ to: "/" }) : void patchSurvey(dealershipId, {}, step - 1))}
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{dealer.nameEn}</p>
          <p className="text-[11px] text-muted">
            {dealer.flags.sdId ? `${dealer.flags.sdId} · ` : ""}
            {dealerMarket(dealer) === "shifa" ? `${t.usedCarMarket} · ` : ""}
            {step + 1}/{SURVEY_STEPS.length} · {lang === "ar" ? stepMeta.titleAr : stepMeta.titleEn}
          </p>
        </div>
        <span className="pe-3 text-[11px] text-muted">{t.autoSaved}</span>
      </div>
      <div className="h-1 bg-surface-2">
        <div
          className="h-full bg-primary transition-[width] duration-200"
          style={{ width: `${((step + 1) / SURVEY_STEPS.length) * 100}%` }}
        />
      </div>

      <div className="flex-1 overflow-auto px-4 py-4 pb-8">
        {step === 0 ? (
          <IdentityStep
            dealer={dealer}
            payload={payload}
            gps={gps}
            photos={photos}
            onRunAi={() => setAiOpen(true)}
            onDealer={(patch) => void upsertDealer({ ...dealer, ...patch, updatedAt: new Date().toISOString() })}
            onSave={save}
            onPhoto={async (file) => {
              const dataUrl = await compressImage(file);
              if (!dataUrl) return;
              await addPhoto({
                id: uid(),
                dealershipId,
                dataUrl,
                lat: gps?.lat ?? dealer.lat,
                lng: gps?.lng ?? dealer.lng,
                capturedAt: new Date().toISOString(),
              });
            }}
            onRemove={(id) => void removePhoto(id)}
          />
        ) : null}
        {step === 1 ? <VisitStep payload={payload} onSave={save} /> : null}
        {step === 2 ? <BusinessStep payload={payload} onSave={save} /> : null}
        {step === 3 ? <PeopleStep payload={payload} onSave={save} /> : null}
        {step === 4 ? <CommercialStep payload={payload} onSave={save} /> : null}
        {step === 5 ? <FinancingStep payload={payload} onSave={save} /> : null}
        {step === 6 ? <CustomersStep payload={payload} onSave={save} /> : null}
        {step === 7 ? (
          <QualityStep
            payload={payload}
            photos={photos}
            onSave={save}
            onPhoto={async (file) => {
              const dataUrl = await compressImage(file);
              if (!dataUrl) return;
              await addPhoto({
                id: uid(),
                dealershipId,
                dataUrl,
                lat: gps?.lat ?? dealer.lat,
                lng: gps?.lng ?? dealer.lng,
                capturedAt: new Date().toISOString(),
              });
            }}
            onRemove={(id) => void removePhoto(id)}
          />
        ) : null}
      </div>

      <div className="z-10 flex shrink-0 gap-2 border-t border-border bg-bg px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {step > 0 ? (
          <Button variant="secondary" className="flex-1" onClick={() => void patchSurvey(dealershipId, {}, step - 1)}>
            {t.back}
          </Button>
        ) : null}
        {step < SURVEY_STEPS.length - 1 ? (
          <Button className="flex-1" onClick={() => void patchSurvey(dealershipId, {}, step + 1)}>
            {t.next}
          </Button>
        ) : (
          <Button
            className="flex-1"
            disabled={!submitGate.ok}
            onClick={async () => {
              await patchSurvey(dealershipId, payload, step, "completed");
              navigate({ to: "/" });
            }}
          >
            {t.submit}
          </Button>
        )}
      </div>
      {step === SURVEY_STEPS.length - 1 && !submitGate.ok ? (
        <p className="px-4 pb-3 text-xs text-status-amber">{submitGate.reason}</p>
      ) : null}
      {aiOpen ? (
        <AiSurveySheet mode="existing" dealershipId={dealershipId} onClose={() => setAiOpen(false)} />
      ) : null}
    </div>
  );
}

function FieldBlock({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 flex flex-col gap-2">
      <Label hint={hint}>{label}</Label>
      {children}
    </section>
  );
}

function IdentityStep({
  dealer,
  payload,
  gps,
  photos,
  onDealer,
  onRunAi,
  onSave,
  onPhoto,
  onRemove,
}: {
  dealer: { nameEn: string; nameAr: string; lat: number; lng: number; listedPhone: string };
  payload: SurveyPayload;
  gps: { lat: number; lng: number } | null;
  photos: { id: string; dataUrl: string }[];
  onDealer: (p: { nameEn?: string; nameAr?: string; lat?: number; lng?: number; listedPhone?: string }) => void;
  onRunAi: () => void;
  onSave: (p: Partial<SurveyPayload>) => void;
  onPhoto: (file: File) => Promise<void>;
  onRemove: (id: string) => void;
}) {
  const t = COPY[usePrefs((s) => s.lang)];
  const fileRef = useRef<HTMLInputElement>(null);
  const over5 = payload.inventoryAgePctOver5 ?? 50;

  function setSplit(inside: number | null, outside: number | null) {
    const total = inside == null && outside == null ? null : (inside ?? 0) + (outside ?? 0);
    onSave({
      inventoryInside: inside,
      inventoryOutside: outside,
      inventoryUnits: total,
      inventorySource: "observed",
      inventoryBasis: "counted",
      volumeFiguresAre: payload.volumeFiguresAre || "observed",
    });
  }

  return (
    <div data-field-capture="1">
      <FieldBlock label={t.nameEn}>
        <Input className="bg-surface-2" value={dealer.nameEn} onChange={(e) => onDealer({ nameEn: e.target.value })} />
      </FieldBlock>
      <FieldBlock label={t.nameAr}>
        <Input dir="rtl" className="bg-surface-2" value={dealer.nameAr} onChange={(e) => onDealer({ nameAr: e.target.value })} />
      </FieldBlock>
      <FieldBlock label={t.phone}>
        <Input
          className="bg-surface-2"
          type="tel"
          value={dealer.listedPhone}
          onChange={(e) => onDealer({ listedPhone: e.target.value })}
        />
      </FieldBlock>
      <FieldBlock label={t.aiSurvey} hint={t.aiSurveyPhotosHint}>
        <Button variant="secondary" onClick={onRunAi}>
          {t.aiSurveyRun}
        </Button>
      </FieldBlock>
      <FieldBlock label={t.fieldPhotos} hint={t.fieldPhotosHint}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onPhoto(f);
            e.target.value = "";
          }}
        />
        <Button variant="secondary" onClick={() => fileRef.current?.click()}>
          {t.photos}
        </Button>
        {photos.length ? (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {photos.map((p) => (
              <button key={p.id} type="button" className="relative overflow-hidden rounded-lg" onClick={() => onRemove(p.id)}>
                <img src={p.dataUrl} alt="" className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}
      </FieldBlock>
      <FieldBlock label={`${t.sizeSqm} (m²)`}>
        <Input
          type="number"
          inputMode="numeric"
          className="bg-surface-2"
          value={payload.showroomSizeSqm ?? ""}
          onChange={(e) =>
            onSave({
              showroomSizeSqm: e.target.value === "" ? null : Number(e.target.value),
              showroomSizeSource: "observed",
              sizeBasis: payload.sizeBasis || "estimated",
            })
          }
        />
      </FieldBlock>
      <div className="mb-5 grid grid-cols-2 gap-2">
        <FieldBlock label={t.inventoryInside}>
          <Input
            type="number"
            inputMode="numeric"
            className="bg-surface-2"
            value={payload.inventoryInside ?? ""}
            onChange={(e) =>
              setSplit(e.target.value === "" ? null : Number(e.target.value), payload.inventoryOutside ?? null)
            }
          />
        </FieldBlock>
        <FieldBlock label={t.inventoryOutside}>
          <Input
            type="number"
            inputMode="numeric"
            className="bg-surface-2"
            value={payload.inventoryOutside ?? ""}
            onChange={(e) =>
              setSplit(payload.inventoryInside ?? null, e.target.value === "" ? null : Number(e.target.value))
            }
          />
        </FieldBlock>
      </div>
      <FieldBlock label={t.inventoryAgeOver5}>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={payload.inventoryAgePctOver5 ?? 50}
          onChange={(e) => onSave({ inventoryAgePctOver5: Number(e.target.value) })}
          className="w-full accent-primary"
        />
        <p className="text-sm tabular-nums text-muted">
          {over5}% {t.inventoryAgeOver5} · {100 - over5}% {t.inventoryAgeUnder5}
        </p>
      </FieldBlock>
      <FieldBlock label="Used / new / mix">
        <Choice
          value={payload.vehicleType}
          onChange={(id) => onSave({ vehicleType: id as SurveyPayload["vehicleType"] })}
          options={[
            { id: "used_only", label: "Used" },
            { id: "new_only", label: "New" },
            { id: "mix", label: "Mix" },
          ]}
        />
      </FieldBlock>
      <FieldBlock label="Brands" hint="Tap to toggle. Type and press Enter for others.">
        <ChipMulti
          options={BRAND_OPTIONS}
          value={payload.mainBrands ?? []}
          onChange={(mainBrands) => onSave({ mainBrands })}
          allowCustom
        />
      </FieldBlock>
      <FieldBlock label="Average selling price (SAR)">
        <Input
          type="number"
          inputMode="numeric"
          className="bg-surface-2"
          value={payload.avgSellingPriceSar ?? ""}
          onChange={(e) =>
            onSave({
              avgSellingPriceSar: e.target.value === "" ? null : Number(e.target.value),
              avgPriceSource: "observed",
            })
          }
        />
      </FieldBlock>
      <FieldBlock label="Latitude / Longitude">
        <p className="text-sm tabular-nums text-muted">
          {dealer.lat.toFixed(6)}, {dealer.lng.toFixed(6)}
        </p>
        <Button variant="secondary" disabled={!gps} onClick={() => gps && onDealer({ lat: gps.lat, lng: gps.lng })}>
          {t.updateGps}
        </Button>
      </FieldBlock>
    </div>
  );
}

function VisitStep({ payload, onSave }: { payload: SurveyPayload; onSave: (p: Partial<SurveyPayload>) => void }) {
  return (
    <FieldBlock label="Visit status">
      <Choice
        value={payload.visitStatus}
        onChange={(id) => onSave({ visitStatus: id as VisitStatus })}
        options={[
          { id: "not_visited", label: "Not visited" },
          { id: "completed", label: "Completed" },
          { id: "partial", label: "Partial" },
          { id: "refused", label: "Refused" },
          { id: "closed", label: "Closed or moved" },
          { id: "competitor", label: "Competitor" },
        ]}
      />
    </FieldBlock>
  );
}

function BusinessStep({ payload, onSave }: { payload: SurveyPayload; onSave: (p: Partial<SurveyPayload>) => void }) {
  const t = COPY[usePrefs((s) => s.lang)];
  return (
    <>
      <div className="mb-4 rounded-2xl bg-status-amber/10 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-status-amber">High priority</p>
        <FieldBlock label="CR number (commercial registration)">
          <Input value={payload.crNumber ?? ""} onChange={(e) => onSave({ crNumber: e.target.value })} />
        </FieldBlock>
      </div>
      <FieldBlock label="Showroom size (sqm)">
        <Input
          type="number"
          inputMode="numeric"
          value={payload.showroomSizeSqm ?? ""}
          onChange={(e) => onSave({ showroomSizeSqm: e.target.value === "" ? null : Number(e.target.value) })}
        />
        <SourceToggle
          value={payload.showroomSizeSource}
          onChange={(v) => onSave({ showroomSizeSource: v })}
        />
      </FieldBlock>
      <FieldBlock label="Size basis">
        <Choice
          columns={1}
          value={payload.sizeBasis}
          onChange={(id) => onSave({ sizeBasis: id as SurveyPayload["sizeBasis"] })}
          options={[
            { id: "measured", label: "Measured" },
            { id: "estimated", label: "Estimated" },
            { id: "dealer_stated", label: "Dealer stated" },
          ]}
        />
      </FieldBlock>
      <FieldBlock label="Vehicle type">
        {payload.vehicleType === "used_only" ? (
          <p className="text-xs text-muted">{t.usedOnlyDefault}</p>
        ) : null}
        <Choice
          value={payload.vehicleType}
          onChange={(id) => onSave({ vehicleType: id as SurveyPayload["vehicleType"] })}
          options={[
            { id: "new_only", label: "New only" },
            { id: "used_only", label: "Used only" },
            { id: "mix", label: "Mix" },
          ]}
        />
      </FieldBlock>
      <FieldBlock label="Inventory age mix">
        <Choice
          value={payload.inventoryAgeMix}
          onChange={(id) => onSave({ inventoryAgeMix: id as SurveyPayload["inventoryAgeMix"] })}
          options={[
            { id: "2020plus", label: "Mostly 2020+" },
            { id: "2015_2020", label: "Mostly 2015–2020" },
            { id: "pre2015", label: "Mostly pre-2015" },
            { id: "wide", label: "Wide spread" },
          ]}
        />
      </FieldBlock>
    </>
  );
}

function PeopleStep({ payload, onSave }: { payload: SurveyPayload; onSave: (p: Partial<SurveyPayload>) => void }) {
  return (
    <>
      <FieldBlock label="POC name">
        <Input value={payload.pocName ?? ""} onChange={(e) => onSave({ pocName: e.target.value })} />
      </FieldBlock>
      <FieldBlock label="POC role">
        <Input value={payload.pocRole ?? ""} onChange={(e) => onSave({ pocRole: e.target.value })} />
      </FieldBlock>
      <FieldBlock label="POC mobile">
        <Input type="tel" value={payload.pocMobile ?? ""} onChange={(e) => onSave({ pocMobile: e.target.value })} />
      </FieldBlock>
      <FieldBlock label="Decision maker, if different">
        <Input value={payload.decisionMaker ?? ""} onChange={(e) => onSave({ decisionMaker: e.target.value })} />
      </FieldBlock>
      <FieldBlock label="Number of salesmen">
        <Input
          type="number"
          inputMode="numeric"
          value={payload.salesmenCount ?? ""}
          onChange={(e) => onSave({ salesmenCount: e.target.value === "" ? null : Number(e.target.value) })}
        />
        <SourceToggle value={payload.salesmenSource} onChange={(v) => onSave({ salesmenSource: v })} />
      </FieldBlock>
    </>
  );
}

function CommercialStep({ payload, onSave }: { payload: SurveyPayload; onSave: (p: Partial<SurveyPayload>) => void }) {
  return (
    <>
      <FieldBlock label="Main brands dealt" hint="Tap to toggle. Type and press Enter for others.">
        <ChipMulti
          options={BRAND_OPTIONS}
          value={payload.mainBrands ?? []}
          onChange={(mainBrands) => onSave({ mainBrands })}
          allowCustom
        />
      </FieldBlock>
      <FieldBlock label="Authorised dealer?">
        <Choice
          columns={2}
          value={payload.authorisedDealer}
          onChange={(id) => onSave({ authorisedDealer: id as SurveyPayload["authorisedDealer"] })}
          options={[
            { id: "yes", label: "Yes" },
            { id: "no", label: "No" },
            { id: "unclear", label: "Unclear" },
          ]}
        />
      </FieldBlock>
      {payload.authorisedDealer === "yes" ? (
        <FieldBlock label="Authorised for which brand">
          <Input value={payload.authorisedBrand ?? ""} onChange={(e) => onSave({ authorisedBrand: e.target.value })} />
        </FieldBlock>
      ) : null}
      <FieldBlock label="Inventory — sellable units">
        <Input
          type="number"
          inputMode="numeric"
          value={payload.inventoryUnits ?? ""}
          onChange={(e) => onSave({ inventoryUnits: e.target.value === "" ? null : Number(e.target.value) })}
        />
        <SourceToggle value={payload.inventorySource} onChange={(v) => onSave({ inventorySource: v })} />
      </FieldBlock>
      <FieldBlock label="Inventory count basis">
        <Choice
          value={payload.inventoryBasis}
          onChange={(id) => onSave({ inventoryBasis: id as SurveyPayload["inventoryBasis"] })}
          options={[
            { id: "counted", label: "Counted" },
            { id: "estimated", label: "Estimated" },
            { id: "dealer_stated", label: "Dealer stated" },
          ]}
        />
      </FieldBlock>
      <FieldBlock label="Average selling price (SAR)">
        <Input
          type="number"
          inputMode="numeric"
          value={payload.avgSellingPriceSar ?? ""}
          onChange={(e) => onSave({ avgSellingPriceSar: e.target.value === "" ? null : Number(e.target.value) })}
        />
        <SourceToggle value={payload.avgPriceSource} onChange={(v) => onSave({ avgPriceSource: v })} />
      </FieldBlock>
      <FieldBlock label="Average monthly sold">
        <Choice
          value={payload.avgMonthlySold}
          onChange={(id) => onSave({ avgMonthlySold: id as SurveyPayload["avgMonthlySold"] })}
          options={[
            { id: "0_20", label: "0–20" },
            { id: "21_50", label: "21–50" },
            { id: "51_100", label: "51–100" },
            { id: "100plus", label: "100+" },
            { id: "refused", label: "Refused" },
          ]}
        />
        <Input
          className="mt-2"
          type="number"
          inputMode="numeric"
          placeholder="Exact units / month if known"
          value={payload.monthlySoldExact ?? ""}
          onChange={(e) => onSave({ monthlySoldExact: e.target.value === "" ? null : Number(e.target.value) })}
        />
      </FieldBlock>
      <FieldBlock label="Average monthly financed deals">
        <Choice
          value={payload.avgMonthlyFinanced}
          onChange={(id) => onSave({ avgMonthlyFinanced: id as SurveyPayload["avgMonthlyFinanced"] })}
          options={[
            { id: "0_5", label: "0–5" },
            { id: "6_15", label: "6–15" },
            { id: "16_40", label: "16–40" },
            { id: "40plus", label: "40+" },
            { id: "refused", label: "Refused" },
          ]}
        />
        <Input
          className="mt-2"
          type="number"
          inputMode="numeric"
          placeholder="Exact financed deals / month"
          value={payload.monthlyFinancedExact ?? ""}
          onChange={(e) => onSave({ monthlyFinancedExact: e.target.value === "" ? null : Number(e.target.value) })}
        />
        {payload.fpr != null ? (
          <p className="mt-1 text-xs text-muted">Finance penetration {Math.round(payload.fpr * 100)}%</p>
        ) : null}
      </FieldBlock>
    </>
  );
}

function FinancingStep({ payload, onSave }: { payload: SurveyPayload; onSave: (p: Partial<SurveyPayload>) => void }) {
  return (
    <>
      <div className="mb-4 rounded-2xl bg-primary/10 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Most important — financing pain</p>
      </div>
      <FieldBlock label="Financing enquiries LOST per month">
        <Input
          type="number"
          inputMode="numeric"
          value={payload.financingLostNumber ?? payload.financingLostPerMonth ?? ""}
          onChange={(e) =>
            onSave({
              financingLostNumber: e.target.value === "" ? null : Number(e.target.value),
              financingLostPerMonth: e.target.value,
            })
          }
        />
        <SourceToggle value={payload.financingLostSource} onChange={(v) => onSave({ financingLostSource: v })} />
      </FieldBlock>
      <FieldBlock label="Main reason deals fail">
        <Choice
          value={FAIL_REASON_OPTIONS.includes(payload.mainFailReason ?? "") ? payload.mainFailReason : ""}
          onChange={(id) => onSave({ mainFailReason: id })}
          options={FAIL_REASON_OPTIONS.map((r) => ({ id: r, label: r }))}
        />
        <Input
          placeholder="Or type another reason"
          value={FAIL_REASON_OPTIONS.includes(payload.mainFailReason ?? "") ? "" : (payload.mainFailReason ?? "")}
          onChange={(e) => onSave({ mainFailReason: e.target.value })}
        />
      </FieldBlock>
      <FieldBlock label="Current financing workaround" hint="Which agent or broker, and what it costs them.">
        <Textarea
          value={payload.financingWorkaround ?? ""}
          onChange={(e) => onSave({ financingWorkaround: e.target.value })}
        />
      </FieldBlock>
      <FieldBlock label="Banks partnered">
        <ChipMulti
          options={BANK_OPTIONS}
          value={payload.banksPartnered ?? []}
          onChange={(banksPartnered) => onSave({ banksPartnered })}
          allowCustom
        />
      </FieldBlock>
      <FieldBlock label="Bank representative on site?">
        <Choice
          value={payload.bankRepOnSite}
          onChange={(id) => onSave({ bankRepOnSite: id as SurveyPayload["bankRepOnSite"] })}
          options={[
            { id: "permanent", label: "Yes — permanent" },
            { id: "weekly", label: "Yes — weekly visits" },
            { id: "no", label: "No" },
          ]}
        />
      </FieldBlock>
    </>
  );
}

function CustomersStep({ payload, onSave }: { payload: SurveyPayload; onSave: (p: Partial<SurveyPayload>) => void }) {
  const online = payload.leadOnlinePct ?? 0;
  return (
    <>
      <FieldBlock label="Buyer mix">
        <Choice
          value={payload.buyerMix}
          onChange={(id) => onSave({ buyerMix: id as SurveyPayload["buyerMix"] })}
          options={[
            { id: "saudi", label: "Mostly Saudi" },
            { id: "expat", label: "Mostly expat" },
            { id: "even", label: "Roughly even" },
            { id: "self_employed", label: "Mostly self-employed" },
          ]}
        />
      </FieldBlock>
      <FieldBlock label="Lead mix — online %">
        <input
          type="range"
          min={0}
          max={100}
          value={online}
          onChange={(e) => onSave({ leadOnlinePct: Number(e.target.value) })}
          className="w-full accent-primary"
        />
        <p className="text-sm tabular-nums text-muted">
          Online {online}% · Walk-in {100 - online}%
        </p>
      </FieldBlock>
    </>
  );
}

function QualityStep({
  payload,
  photos,
  onSave,
  onPhoto,
  onRemove,
}: {
  payload: SurveyPayload;
  photos: { id: string; dataUrl: string }[];
  onSave: (p: Partial<SurveyPayload>) => void;
  onPhoto: (file: File) => Promise<void>;
  onRemove: (id: string) => void;
}) {
  const t = COPY[usePrefs((s) => s.lang)];
  const fileRef = useRef<HTMLInputElement>(null);
  const [listening, setListening] = useState(false);
  const recRef = useRef<{ stop: () => void } | null>(null);

  function startVoice(locale: string) {
    const SR = (window as unknown as { webkitSpeechRecognition?: new () => SpeechRec; SpeechRecognition?: new () => SpeechRec })
      .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRec }).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = locale;
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (ev: { results: { 0: { 0: { transcript: string } } } }) => {
      const text = ev.results[0][0].transcript;
      onSave({ notes: `${payload.notes ?? ""}${payload.notes ? "\n" : ""}${text}` });
    };
    rec.onend = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
  }

  return (
    <>
      <FieldBlock label="Volume figures are" hint="Mandatory. Dealers inflate volumes — never mix without this flag.">
        <Choice
          value={payload.volumeFiguresAre}
          onChange={(id) => onSave({ volumeFiguresAre: id as SurveyPayload["volumeFiguresAre"] })}
          options={[
            { id: "observed", label: "Observed" },
            { id: "self_reported", label: "Self-reported" },
            { id: "mixed", label: "Mixed" },
          ]}
        />
      </FieldBlock>
      <FieldBlock label="Open to pilot?">
        <Choice
          value={payload.openToPilot}
          onChange={(id) => onSave({ openToPilot: id as SurveyPayload["openToPilot"] })}
          options={[
            { id: "yes", label: "Yes" },
            { id: "maybe", label: "Maybe" },
            { id: "no", label: "No" },
            { id: "too_early", label: "Too early to ask" },
          ]}
        />
      </FieldBlock>
      <FieldBlock label={t.photos} hint="Camera, auto-geotagged, compressed for offline sync.">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onPhoto(f);
            e.target.value = "";
          }}
        />
        <Button variant="secondary" onClick={() => fileRef.current?.click()}>
          Add photo
        </Button>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <button key={p.id} type="button" className="relative overflow-hidden rounded-lg" onClick={() => onRemove(p.id)}>
              <img src={p.dataUrl} alt="" className="aspect-square w-full object-cover" />
            </button>
          ))}
        </div>
      </FieldBlock>
      <FieldBlock label={t.notes}>
        <Textarea value={payload.notes ?? ""} onChange={(e) => onSave({ notes: e.target.value })} />
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => (listening ? recRef.current?.stop() : startVoice("en-US"))}
          >
            {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            {t.voiceEn}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => (listening ? recRef.current?.stop() : startVoice("ar-SA"))}
          >
            {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            {t.voiceAr}
          </Button>
        </div>
      </FieldBlock>
      <div className="flex items-center gap-2 text-sm">
        <FigureBadge source={payload.volumeFiguresAre} />
        <span className="text-muted">Shown on every record in analysis.</span>
      </div>
    </>
  );
}

type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
