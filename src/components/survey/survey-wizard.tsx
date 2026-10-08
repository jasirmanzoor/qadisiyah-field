import { Link, useNavigate } from "@tanstack/react-router";
import { AiSurveySheet } from "@/components/ai/ai-survey-sheet";
import { Button } from "@/components/ui/button";
import { ChipMulti, Choice, FigureBadge, Input, Label, SourceToggle, Textarea } from "@/components/ui/field";
import { BANK_OPTIONS, BRAND_OPTIONS, FAIL_REASON_OPTIONS } from "@/lib/seed";
import { COPY } from "@/lib/i18n";
import { compressImage } from "@/lib/image";
import { dealerMarket } from "@/lib/markets";
import { shifaFloorDealers } from "@/lib/shifa-floor-overlay";
import { canSubmitSurvey, isDeepDived, isSurveyedShowroom, surveyCompleteness, SURVEY_STEPS } from "@/lib/survey-schema";
import type { SurveyPayload, VisitStatus } from "@/lib/types";
import { todayISO, uid } from "@/lib/utils";
import { useField, surveyFor } from "@/stores/field";
import { usePrefs } from "@/stores/prefs";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import {
  Banknote,
  Camera,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  MapPinned,
  Mic,
  MicOff,
  Ruler,
  StickyNote,
  Trash2,
  Users,
  X,
} from "lucide-react";
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
  const reorderPhotos = useField((s) => s.reorderPhotos);
  const loaded = useField((s) => s.loaded);

  const dealer = snapshot.dealerships.find((d) => d.id === dealershipId) ?? shifaFloorDealers().find((d) => d.id === dealershipId) ?? null;
  const record = surveyFor(snapshot, dealershipId);
  const payload: SurveyPayload = record?.payload ?? {};
  const step = record?.step ?? 0;
  const photos = snapshot.photos.filter((p) => p.dealershipId === dealershipId);

  const [aiOpen, setAiOpen] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const timer = useRef<number | null>(null);
  function save(patch: Partial<SurveyPayload>, nextStep = step, status?: VisitStatus) {
    setSaveState("saving");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      void patchSurvey(dealershipId, patch, nextStep, status)
        .then(() => setSaveState("saved"))
        .catch(() => setSaveState("error"));
    }, 250);
  }

  async function saveNow() {
    if (timer.current) window.clearTimeout(timer.current);
    setSaveState("saving");
    try {
      await patchSurvey(dealershipId, {}, step);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  useEffect(() => {
    if (!dealer) return;
    if (!snapshot.dealerships.some((d) => d.id === dealer.id)) void upsertDealer(dealer);
  }, [dealer, snapshot.dealerships, upsertDealer]);

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

  if (!loaded) {
    return (
      <div className="flex flex-1 flex-col gap-3 bg-bg p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="h-14 animate-pulse rounded-2xl bg-surface-2" />
        <div className="h-24 animate-pulse rounded-2xl bg-surface-2" />
        <div className="h-40 animate-pulse rounded-2xl bg-surface-2" />
      </div>
    );
  }

  if (!dealer) {
    return (
      <div className="p-6 text-sm text-muted">
        Dealership not found. <Link to="/">Back to map</Link>
      </div>
    );
  }

  const stepMeta = SURVEY_STEPS[step];
  const submitGate = canSubmitSurvey(payload);
  const completeness = surveyCompleteness(payload);
  const progress = Math.round((completeness.filled / completeness.total) * 100);
  const deep = isDeepDived(payload);
  const surveyed = isSurveyedShowroom(dealer.status, payload);
  const saveLabel = saveState === "saving" ? t.saving : saveState === "error" ? t.saveFailed : saveState === "saved" ? t.autoSaved : t.save;

  return (
    <div className="relative mx-auto flex h-full min-h-0 w-full max-w-3xl flex-1 flex-col bg-bg pt-[env(safe-area-inset-top)]">
      <div className="flex items-center gap-2 border-b border-border px-2 py-2">
        <button
          type="button"
          aria-label={step === 0 ? t.map : t.back}
          className="grid size-12 shrink-0 place-items-center rounded-xl"
          onClick={() => (step === 0 ? navigate({ to: "/" }) : void patchSurvey(dealershipId, {}, step - 1))}
        >
          <ChevronLeft className="size-6" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold tracking-tight">{dealer.nameEn}</p>
          <p className="truncate text-xs text-muted">
            {dealer.flags.sdId ? `${dealer.flags.sdId} · ` : ""}
            {dealerMarket(dealer) === "shifa" ? `${t.usedCarMarket} · ` : ""}
            {lang === "ar" ? stepMeta.titleAr : stepMeta.titleEn}
          </p>
        </div>
        <span
          className={`me-1 shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
            deep
              ? "bg-status-amber/15 text-status-amber"
              : surveyed
                ? "bg-primary/12 text-primary"
                : "bg-surface-2 text-muted"
          }`}
        >
          {deep ? t.deepDived : surveyed ? t.surveyedCat : dealer.status.replace("_", " ")}
        </span>
      </div>
      <div className="flex items-center gap-2 px-3 pt-2">
        <p className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted">
          {t.fieldsProgress} {completeness.filled}/{completeness.total}
        </p>
        <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="qads-chips flex gap-1 overflow-x-auto px-3 py-2">
        {SURVEY_STEPS.map((s, i) => {
          const on = i === step;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => void patchSurvey(dealershipId, {}, i)}
              className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold ${
                on ? "bg-primary text-primary-fg" : i < step ? "bg-primary/12 text-primary" : "bg-surface text-muted shadow-[var(--shadow-border)]"
              }`}
            >
              {i + 1} {lang === "ar" ? s.titleAr : s.titleEn}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-auto px-3 py-2 pb-4">
        <div key={step} className="insight-swap">
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
            onReorder={(ids) => reorderPhotos(dealershipId, ids)}
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
            onReorder={(ids) => reorderPhotos(dealershipId, ids)}
          />
        ) : null}
        </div>
      </div>

      {step === SURVEY_STEPS.length - 1 && !submitGate.ok ? (
        <p className="mx-3 mb-2 rounded-xl bg-status-amber/15 px-3 py-2 text-sm font-medium text-status-amber">{submitGate.reason}</p>
      ) : null}
      <div className="z-10 grid shrink-0 grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] gap-2 border-t border-border bg-bg px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button variant="secondary" onClick={() => void saveNow()}>
          {saveState === "saved" ? <Check className="size-4" /> : null}
          {saveLabel}
        </Button>
        {step < SURVEY_STEPS.length - 1 ? (
          <Button onClick={() => void patchSurvey(dealershipId, {}, step + 1)}>
            {t.continueStep}
          </Button>
        ) : (
          <Button
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
      {aiOpen ? (
        <AiSurveySheet mode="existing" dealershipId={dealershipId} onClose={() => setAiOpen(false)} />
      ) : null}
    </div>
  );
}

function FieldBlock({
  label,
  hint,
  icon,
  children,
}: {
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="inspect-card mb-3 flex flex-col gap-2">
      <Label hint={hint}>
        <span className="inline-flex items-center gap-2">
          {icon}
          {label}
        </span>
      </Label>
      {children}
    </section>
  );
}

function EvidenceGallery({
  photos,
  onPhoto,
  onRemove,
  onReorder,
}: {
  photos: { id: string; dataUrl: string }[];
  onPhoto: (file: File) => Promise<void>;
  onRemove: (id: string) => void;
  onReorder: (ids: string[]) => void;
}) {
  const t = COPY[usePrefs((s) => s.lang)];
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);

  async function take(list: FileList | null) {
    if (!list?.length) return;
    const files = Array.from(list);
    setBusy((n) => n + files.length);
    for (const file of files) {
      try {
        await onPhoto(file);
      } finally {
        setBusy((n) => Math.max(0, n - 1));
      }
    }
  }

  function move(id: string, dir: -1 | 1) {
    const ids = photos.map((p) => p.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    const next = ids.slice();
    const [item] = next.splice(i, 1);
    next.splice(j, 0, item);
    onReorder(next);
  }

  const open = photos.find((p) => p.id === preview) ?? null;

  return (
    <section className="inspect-card mb-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="inspect-kicker">
          <Camera className="size-4" />
          {t.evidence}
        </p>
        <span className="text-xs font-semibold tabular-nums text-muted">{photos.length}</span>
      </div>
      <p className="mb-3 text-sm text-muted">{t.fieldPhotosHint}</p>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void take(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void take(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => cameraRef.current?.click()}>
          <Camera className="size-4" />
          {t.takePhoto}
        </Button>
        <Button variant="secondary" onClick={() => libraryRef.current?.click()}>
          {busy ? t.saving : t.photoLibrary}
        </Button>
      </div>
      {photos.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-border-strong px-3 py-6 text-center">
          <p className="text-base font-semibold">{t.photoEmpty}</p>
          <p className="mt-1 text-sm text-muted">{t.addPhotos}</p>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {photos.map((p, index) => (
            <div key={p.id} className="overflow-hidden rounded-xl bg-surface-2 shadow-[var(--shadow-border)]">
              <button type="button" className="block w-full" onClick={() => setPreview(p.id)} aria-label={t.evidence}>
                <img src={p.dataUrl} alt="" className="aspect-square w-full object-cover" />
              </button>
              <div className="grid grid-cols-3">
                <button
                  type="button"
                  className="grid min-h-11 place-items-center text-muted disabled:opacity-30"
                  disabled={index === 0}
                  onClick={() => move(p.id, -1)}
                  aria-label={t.earlier}
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  className="grid min-h-11 place-items-center text-danger"
                  onClick={() => onRemove(p.id)}
                  aria-label={t.deletePhoto}
                >
                  <Trash2 className="size-4" />
                </button>
                <button
                  type="button"
                  className="grid min-h-11 place-items-center text-muted disabled:opacity-30"
                  disabled={index === photos.length - 1}
                  onClick={() => move(p.id, 1)}
                  aria-label={t.later}
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {open ? (
        <div className="evidence-lightbox fixed inset-0 z-50 flex flex-col bg-fg/95 text-bg">
          <div className="flex items-center justify-between px-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
            <button type="button" className="grid size-12 place-items-center" onClick={() => setPreview(null)} aria-label={t.back}>
              <X className="size-6" />
            </button>
            <button
              type="button"
              className="min-h-12 rounded-xl px-4 text-sm font-semibold text-danger"
              onClick={() => {
                onRemove(open.id);
                setPreview(null);
              }}
            >
              {t.deletePhoto}
            </button>
          </div>
          <button type="button" className="flex min-h-0 flex-1 items-center justify-center p-3" onClick={() => setPreview(null)}>
            <img src={open.dataUrl} alt="" className="max-h-full max-w-full object-contain" />
          </button>
        </div>
      ) : null}
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
  onReorder,
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
  onReorder: (ids: string[]) => void;
}) {
  const t = COPY[usePrefs((s) => s.lang)];
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
      <section className="inspect-card mb-3">
        <p className="inspect-kicker mb-3">
          <ClipboardCheck className="size-4" />
          {t.floorCheck}
        </p>
        <div className="flex flex-col gap-2">
          <Input className="bg-surface-2" value={dealer.nameEn} aria-label={t.nameEn} onChange={(e) => onDealer({ nameEn: e.target.value })} />
          <Input dir="rtl" className="bg-surface-2" value={dealer.nameAr} aria-label={t.nameAr} onChange={(e) => onDealer({ nameAr: e.target.value })} />
          <Input
            className="bg-surface-2"
            type="tel"
            aria-label={t.phone}
            value={dealer.listedPhone}
            onChange={(e) => onDealer({ listedPhone: e.target.value })}
          />
        </div>
      </section>
      <button
        type="button"
        className="inspect-card mb-3 flex min-h-14 w-full items-center gap-3 text-start"
        disabled={!gps}
        onClick={() => gps && onDealer({ lat: gps.lat, lng: gps.lng })}
      >
        <MapPinned className="size-5 shrink-0 text-primary" />
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold uppercase tracking-wide text-muted">{t.location}</span>
          <span className="block truncate text-base font-semibold tabular-nums">
            {dealer.lat.toFixed(5)}, {dealer.lng.toFixed(5)}
          </span>
        </span>
        <span className="shrink-0 text-sm font-semibold text-primary">{t.updateGps}</span>
      </button>
      <EvidenceGallery photos={photos} onPhoto={onPhoto} onRemove={onRemove} onReorder={onReorder} />
      <section className="inspect-card mb-3">
        <div className="mb-3 grid grid-cols-3 gap-2">
          <Metric
            label={t.stock}
            value={payload.inventoryUnits ?? ""}
            readOnly
          />
          <Metric
            label={t.inventoryInside}
            value={payload.inventoryInside ?? ""}
            onChange={(n) => setSplit(n, payload.inventoryOutside ?? null)}
          />
          <Metric
            label={t.inventoryOutside}
            value={payload.inventoryOutside ?? ""}
            onChange={(n) => setSplit(payload.inventoryInside ?? null, n)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Metric
            icon={<Ruler className="size-3.5" />}
            label={t.sizeSqm}
            suffix="m²"
            value={payload.showroomSizeSqm ?? ""}
            onChange={(n) =>
              onSave({
                showroomSizeSqm: n,
                showroomSizeSource: "observed",
                sizeBasis: payload.sizeBasis || "estimated",
              })
            }
          />
          <Metric
            icon={<Banknote className="size-3.5" />}
            label="ASP"
            value={payload.avgSellingPriceSar ?? ""}
            onChange={(n) => onSave({ avgSellingPriceSar: n, avgPriceSource: "observed" })}
          />
          <Metric
            icon={<Users className="size-3.5" />}
            label={t.salesMenLabel}
            value={payload.salesmenCount ?? ""}
            onChange={(n) => onSave({ salesmenCount: n })}
          />
          <div className="rounded-xl bg-surface-2 px-2 py-2">
            <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted">
              <Car className="size-3.5" />
              {t.inventoryAgeOver5}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{over5}%</p>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={payload.inventoryAgePctOver5 ?? 50}
              onChange={(e) => onSave({ inventoryAgePctOver5: Number(e.target.value) })}
              className="mt-1 w-full accent-primary"
              aria-label={t.inventoryAgeOver5}
            />
          </div>
        </div>
      </section>
      <FieldBlock label="Used / new / mix" icon={<Car className="size-4 text-primary" />}>
        <Choice
          columns={2}
          value={payload.vehicleType}
          onChange={(id) => onSave({ vehicleType: id as SurveyPayload["vehicleType"] })}
          options={[
            { id: "used_only", label: "Used" },
            { id: "new_only", label: "New" },
            { id: "mix", label: "Mix" },
            { id: "commercial", label: "Commercial" },
          ]}
        />
      </FieldBlock>
      <FieldBlock label={t.financeLabel} icon={<Banknote className="size-4 text-primary" />}>
        <Choice
          columns={3}
          value={payload.financeAvailable}
          onChange={(id) => onSave({ financeAvailable: id as SurveyPayload["financeAvailable"] })}
          options={[
            { id: "yes", label: "Yes" },
            { id: "no", label: "No" },
            { id: "unknown", label: "Unknown" },
          ]}
        />
      </FieldBlock>
      <FieldBlock label="Brands" hint="Tap to toggle. Type and press Enter for others." icon={<Car className="size-4 text-primary" />}>
        <ChipMulti
          options={BRAND_OPTIONS}
          value={payload.mainBrands ?? []}
          onChange={(mainBrands) => onSave({ mainBrands })}
          allowCustom
        />
      </FieldBlock>
      <FieldBlock label={t.aiSurvey} hint={t.aiSurveyPhotosHint}>
        <Button variant="secondary" onClick={onRunAi}>
          {t.aiSurveyRun}
        </Button>
      </FieldBlock>
    </div>
  );
}

function Metric({
  label,
  value,
  suffix,
  icon,
  readOnly,
  onChange,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  icon?: React.ReactNode;
  readOnly?: boolean;
  onChange?: (n: number | null) => void;
}) {
  return (
    <label className="rounded-xl bg-surface-2 px-2 py-2">
      <span className="flex items-center gap-1 truncate text-xs font-semibold uppercase tracking-wide text-muted">
        {icon}
        {label}
      </span>
      <span className="mt-1 flex items-baseline gap-1">
        <input
          type="number"
          inputMode="numeric"
          readOnly={readOnly}
          className="w-full bg-transparent text-xl font-semibold tabular-nums tracking-tight text-fg outline-none read-only:opacity-80"
          value={value}
          onChange={(e) => onChange?.(e.target.value === "" ? null : Number(e.target.value))}
        />
        {suffix ? <span className="text-xs text-muted">{suffix}</span> : null}
      </span>
    </label>
  );
}

function VisitStep({ payload, onSave }: { payload: SurveyPayload; onSave: (p: Partial<SurveyPayload>) => void }) {
  return (
    <FieldBlock label="Visit status" icon={<ClipboardCheck className="size-4 text-primary" />}>
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
            { id: "commercial", label: "Commercial" },
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
      <FieldBlock label="Number of salesmen" icon={<Users className="size-4 text-primary" />}>
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
  const t = COPY[usePrefs((s) => s.lang)];
  return (
    <>
      <div className="inspect-card mb-3">
        <p className="inspect-kicker text-primary">
          <Banknote className="size-4" />
          Most important — financing pain
        </p>
      </div>
      <FieldBlock label={t.financeLabel} icon={<Banknote className="size-4 text-primary" />}>
        <Choice
          columns={3}
          value={payload.financeAvailable}
          onChange={(id) => onSave({ financeAvailable: id as SurveyPayload["financeAvailable"] })}
          options={[
            { id: "yes", label: "Yes" },
            { id: "no", label: "No" },
            { id: "unknown", label: "Unknown" },
          ]}
        />
      </FieldBlock>
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
  onReorder,
}: {
  payload: SurveyPayload;
  photos: { id: string; dataUrl: string }[];
  onSave: (p: Partial<SurveyPayload>) => void;
  onPhoto: (file: File) => Promise<void>;
  onRemove: (id: string) => void;
  onReorder: (ids: string[]) => void;
}) {
  const t = COPY[usePrefs((s) => s.lang)];
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
      <EvidenceGallery photos={photos} onPhoto={onPhoto} onRemove={onRemove} onReorder={onReorder} />
      <FieldBlock label={t.notes} icon={<StickyNote className="size-4 text-primary" />}>
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
