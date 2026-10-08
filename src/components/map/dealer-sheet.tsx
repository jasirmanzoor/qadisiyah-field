import { COPY, trainingCopy } from "@/lib/i18n";
import { cn, mapsLink, telLink, waLink, uid } from "@/lib/utils";
import { compressImage } from "@/lib/image";
import { isDeepDived } from "@/lib/survey-schema";
import type { Dealership, SurveyPayload } from "@/lib/types";
import { StatusBadge, TrainingBadge } from "@/components/ui/field";
import { usePrefs } from "@/stores/prefs";
import { useField } from "@/stores/field";
import { Phone, MessageCircle, MapPinned, X, Camera, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatCoord, parseStandardNote, standardNoteText } from "./map-notes";
import { isProtectedGps } from "@/lib/types";

export function DealerSheet(props: {
  dealer: Dealership;
  partner: Dealership | null;
  partnerSurvey?: SurveyPayload;
  distance: number;
  source?: string;
  survey?: SurveyPayload;
  photos?: { id: string; dataUrl: string }[];
  canPinGps: boolean;
  editingCoords: boolean;
  gps: { lat: number; lng: number } | null;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onClose: () => void;
  onSurvey: (id: string) => void;
  onPinGps: () => void;
  onEditCoords: () => void;
  onCancelCoords: () => void;
  onSaveCoords: (lat: number, lng: number) => void;
  onMarkClosed: () => void;
  onOpenPartner: (p: Dealership) => void;
  onOpenNearby: (id: string) => void;
  onSaved: () => void;
}) {
  return <DealerSheetBody {...props} />;
}

function filled(v: unknown) {
  return !(v == null || v === "" || (Array.isArray(v) && v.length === 0));
}

function basicRatio(dealer: Dealership, survey?: SurveyPayload) {
  const checks = [
    !dealer.flags.unplaced && dealer.lat !== 0 && dealer.lng !== 0,
    filled(survey?.vehicleType),
    filled(survey?.showroomSizeSqm),
    filled(survey?.mainBrands),
    filled(survey?.inventoryUnits),
    filled(survey?.inventoryInside),
    filled(survey?.inventoryOutside),
    filled(survey?.avgSellingPriceSar),
    filled(survey?.inventoryAgePctOver5),
  ];
  return checks.filter(Boolean).length / checks.length;
}

function aspLabel(n: number | null | undefined) {
  if (n == null) return "";
  if (n >= 1000) return `${Math.round(n / 1000)}K SAR`;
  return `${n} SAR`;
}

function DealerSheetBody({
  dealer, partner, survey, photos = [], gps, expanded, onExpand, onCollapse, onClose, onSurvey, onSaved,
}: Parameters<typeof DealerSheet>[0]) {
  const { lang } = usePrefs();
  const t = COPY[lang];
  const addPhoto = useField((s) => s.addPhoto);
  const removePhoto = useField((s) => s.removePhoto);
  const upsertDealer = useField((s) => s.upsertDealer);
  const patchSurvey = useField((s) => s.patchSurvey);
  const knownDealer = useField((s) => s.snapshot.dealerships.some((d) => d.id === dealer.id));
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [shot, setShot] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  const cars = survey?.inventoryUnits != null ? String(survey.inventoryUnits) : "";
  const asp = aspLabel(survey?.avgSellingPriceSar);
  const over5 = survey?.inventoryAgePctOver5 != null ? `${survey.inventoryAgePctOver5}%` : "";
  const carType = survey?.vehicleType === "mix" ? t.stdMix : survey?.vehicleType === "new_only" ? t.stdNew : survey?.vehicleType === "used_only" ? t.stdOld : "";
  const brands = (survey?.mainBrands ?? []).join(" · ");
  const placed = !dealer.flags.unplaced && dealer.lat !== 0 && dealer.lng !== 0;
  const location = placed ? `${formatCoord(dealer.lat)}, ${formatCoord(dealer.lng)}` : "";
  const note = survey?.notes?.trim() ?? "";
  const deep = isDeepDived(survey);
  const phaseStarted = Boolean(
    survey && (survey.monthlySoldExact != null || survey.avgMonthlySold || survey.monthlyFinancedExact != null || survey.avgMonthlyFinanced || survey.fpr != null),
  );
  const phase = deep ? t.phaseDone : phaseStarted ? t.phaseProgress : t.phaseNot;
  const surveyLocked = basicRatio(dealer, survey) >= 0.7;
  const needsDetails = placed && !surveyLocked && dealer.status !== "competitor";
  const call = telLink(dealer.listedPhone);
  const wa = waLink(dealer.listedPhone);
  const maps = dealer.flags.mapsUrl || (placed ? mapsLink(dealer.lat, dealer.lng, dealer.nameEn) : "");
  const statusLabel = trainingCopy(lang, dealer.flags);

  useEffect(() => {
    setDraft(standardNoteText(dealer, survey));
    setNoteSaving(false);
  }, [dealer.id, survey?.notes, survey?.inventoryUnits, survey?.avgSellingPriceSar, survey?.inventoryAgePctOver5, survey?.showroomSizeSqm, survey?.vehicleType]);

  function openNotes() {
    onExpand();
    window.setTimeout(() => {
      noteRef.current?.focus();
      noteRef.current?.scrollIntoView({ block: "center" });
    }, 340);
  }

  async function saveNote() {
    setNoteSaving(true);
    try {
      const edit = parseStandardNote(draft);
      if (!knownDealer) await upsertDealer(dealer);
      const nextNameEn = edit.nameEn || dealer.nameEn;
      const nextNameAr = edit.nameAr || dealer.nameAr;
      const canMove = edit.coords && !isProtectedGps(dealer.flags);
      const moved = Boolean(canMove && edit.coords && (edit.coords.lat !== dealer.lat || edit.coords.lng !== dealer.lng));
      if (nextNameEn !== dealer.nameEn || nextNameAr !== dealer.nameAr || moved) {
        await upsertDealer({
          ...dealer,
          nameEn: nextNameEn,
          nameAr: nextNameAr,
          lat: moved && edit.coords ? edit.coords.lat : dealer.lat,
          lng: moved && edit.coords ? edit.coords.lng : dealer.lng,
          updatedAt: new Date().toISOString(),
        });
      }
      await patchSurvey(dealer.id, edit.patch);
      onSaved();
    } finally {
      setNoteSaving(false);
    }
  }

  async function savePhotos(list: FileList | null) {
    if (!list?.length) return;
    setPhotoBusy(true);
    try {
      for (const file of Array.from(list)) {
        const dataUrl = await compressImage(file);
        if (!dataUrl) continue;
        await addPhoto({
          id: uid(),
          dealershipId: dealer.id,
          dataUrl,
          lat: gps?.lat ?? dealer.lat,
          lng: gps?.lng ?? dealer.lng,
          capturedAt: new Date().toISOString(),
        });
      }
      setAddOpen(false);
    } finally {
      setPhotoBusy(false);
    }
  }

  const metrics = (
    <div className="grid grid-cols-3 gap-2">
      <p className="min-w-0 truncate text-sm font-semibold tabular-nums text-fg">{cars} <span className="text-xs font-medium text-muted">{lang === "ar" ? "سيارات" : "Cars"}</span></p>
      <p className="min-w-0 truncate text-sm font-semibold tabular-nums text-fg">{asp}{asp ? " " : ""}<span className="text-xs font-medium text-muted">{t.stdAsp}</span></p>
      <p className="min-w-0 truncate text-sm font-semibold tabular-nums text-fg">{over5}{over5 ? " " : ""}<span className="text-xs font-medium text-muted">{">5Y"}</span></p>
    </div>
  );

  return (
    <div className="qads-card" data-open={expanded ? "1" : "0"}>
      <button
        type="button"
        onClick={needsDetails && !expanded ? openNotes : expanded ? onCollapse : onExpand}
        className="flex h-11 w-full shrink-0 items-center justify-center gap-1.5 text-xs font-semibold text-muted"
        aria-label={needsDetails && !expanded ? t.addDetails : expanded ? t.collapseCard : t.swipeHint}
      >
        {expanded ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
        {needsDetails && !expanded ? t.addDetails : expanded ? t.collapseCard : t.swipeHint}
      </button>
      <div className={cn("min-h-0 flex-1", expanded ? "overflow-y-auto overscroll-contain" : "overflow-hidden")}>
        <div className="px-4 pb-3">
          <div className="flex items-start gap-2">
            <button type="button" onClick={onClose} className="grid size-9 shrink-0 place-items-center text-muted" aria-label={t.cancel}>
              <X className="size-4" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-end text-base font-semibold leading-snug" dir="rtl">{dealer.nameAr}</p>
              <p className="truncate text-sm text-muted">{dealer.nameEn}</p>
            </div>
          </div>
          <div className="mt-3">{metrics}</div>
          <p className="mt-2.5 truncate text-xs font-semibold uppercase tracking-wide text-fg">
            {[carType, brands].filter(Boolean).join("  ·  ")}
          </p>
        </div>

        <div className="px-4 pb-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={dealer.status} />
            {statusLabel ? <TrainingBadge stage={dealer.flags.trainingStage} priority={dealer.flags.trainingPriority} label={statusLabel} /> : null}
            {partner ? <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-fg">{t.bothMarkets}</span> : null}
          </div>

          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{t.photoLibrary}</p>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {photos.map((p) => (
              <button key={p.id} type="button" className="size-[4.75rem] shrink-0 overflow-hidden rounded-xl bg-surface-2" onClick={() => setShot(p.id)}>
                <img src={p.dataUrl} alt="" className="size-full object-cover" />
              </button>
            ))}
            <button type="button" onClick={() => setAddOpen((v) => !v)} disabled={photoBusy} className="flex size-[4.75rem] shrink-0 flex-col items-center justify-center gap-1 rounded-xl bg-surface-2 text-[10px] font-semibold text-muted">
              <Camera className="size-4" />
              {photoBusy ? t.saving : t.addPhotos}
            </button>
          </div>
          {addOpen ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => cameraRef.current?.click()} className="min-h-11 rounded-xl bg-primary text-sm font-semibold text-primary-fg">{t.takePhoto}</button>
              <button type="button" onClick={() => libraryRef.current?.click()} className="min-h-11 rounded-xl bg-primary text-sm font-semibold text-primary-fg">{t.uploadPhoto}</button>
            </div>
          ) : null}
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { void savePhotos(e.target.files); e.target.value = ""; }} />
          <input ref={libraryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { void savePhotos(e.target.files); e.target.value = ""; }} />

          <p className="mb-1 mt-5 text-[10px] font-semibold uppercase tracking-wide text-muted">{t.surveyRecord}</p>
          <Record label={t.location} value={location} />
          <Record label={t.stdCarType} value={carType} />
          <Record label={t.stdSize} value={survey?.showroomSizeSqm != null ? `${survey.showroomSizeSqm} mtrs` : ""} />
          <Record label={t.stdBrands} value={brands} />
          <Record label={t.stdTotal} value={cars} />
          <Record label={t.stdInside} value={survey?.inventoryInside != null ? String(survey.inventoryInside) : ""} />
          <Record label={t.stdOutside} value={survey?.inventoryOutside != null ? String(survey.inventoryOutside) : ""} />
          <Record label={t.stdAsp} value={survey?.avgSellingPriceSar != null ? `${survey.avgSellingPriceSar.toLocaleString("en-US")} SAR` : ""} />
          <Record label={t.stdOver5} value={over5} />

          <div className="mt-5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{t.noteLabel}</p>
            {needsDetails ? (
              <>
                <textarea
                  ref={noteRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={12}
                  className="mt-2 w-full resize-y rounded-xl bg-surface-2 px-3 py-3 text-sm leading-relaxed text-fg focus-visible:outline-none"
                />
                <button type="button" onClick={() => void saveNote()} disabled={noteSaving} className="mt-2 flex min-h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-fg disabled:opacity-40">
                  {noteSaving ? t.saving : t.save}
                </button>
              </>
            ) : (
              <div className="mt-1 min-h-16 whitespace-pre-wrap text-sm leading-relaxed text-fg">{note}</div>
            )}
          </div>

          <button type="button" onClick={() => onSurvey(dealer.id)} className="mt-4 flex min-h-12 w-full items-center justify-between gap-3 border-t border-border pt-3 text-start">
            <span>
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted">{t.phase2}</span>
              <span className="mt-0.5 block text-sm font-semibold text-fg">{deep ? `✓ ${phase}` : phase}</span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted" />
          </button>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {maps ? <a href={maps} target="_blank" rel="noreferrer" className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl bg-surface-2 text-xs font-medium text-fg"><MapPinned className="size-4" />{t.openMaps}</a> : <span className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-xs text-faint"><MapPinned className="size-4" />{t.openMaps}</span>}
            {call ? <a href={call} className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl bg-surface-2 text-xs font-medium text-fg"><Phone className="size-4" />{t.call}</a> : <span className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-xs text-faint"><Phone className="size-4" />{t.call}</span>}
            {wa ? <a href={wa} target="_blank" rel="noreferrer" className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl bg-surface-2 text-xs font-medium text-fg"><MessageCircle className="size-4" />{t.whatsapp}</a> : <span className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-xs text-faint"><MessageCircle className="size-4" />{t.whatsapp}</span>}
          </div>
        </div>
      </div>
      {shot ? (
        <div className="evidence-lightbox fixed inset-0 z-50 flex flex-col bg-fg/95" onClick={() => setShot(null)}>
          <div className="flex justify-end">
            <button type="button" className="grid size-12 place-items-center text-bg" onClick={(e) => { e.stopPropagation(); void removePhoto(shot); setShot(null); }} aria-label={t.deletePhoto}>{t.deletePhoto}</button>
            <button type="button" className="grid size-12 place-items-center text-bg" aria-label={t.back}><X className="size-6" /></button>
          </div>
          <img src={photos.find((p) => p.id === shot)?.dataUrl ?? ""} alt="" className="min-h-0 flex-1 object-contain p-3" />
        </div>
      ) : null}
    </div>
  );
}

function Record({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-11 items-start justify-between gap-4 border-b border-border/70 py-2">
      <span className="shrink-0 pt-0.5 text-xs text-muted">{label}</span>
      <span className="min-w-0 text-end text-sm font-medium leading-snug text-fg">{value}</span>
    </div>
  );
}
