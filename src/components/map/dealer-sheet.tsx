import { COPY, trainingCopy } from "@/lib/i18n";
import { cn, mapsLink, telLink, waLink, uid } from "@/lib/utils";
import { compressImage } from "@/lib/image";
import { isDeepDived } from "@/lib/survey-schema";
import type { Dealership, SurveyPayload } from "@/lib/types";
import { StatusBadge, TrainingBadge } from "@/components/ui/field";
import { usePrefs } from "@/stores/prefs";
import { useField } from "@/stores/field";
import { Phone, MessageCircle, MapPinned, X, Camera, ImagePlus, ChevronRight, MoreHorizontal } from "lucide-react";
import { useRef, useState, type PointerEvent } from "react";
import { formatCoord } from "./map-notes";

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
  dealer, partner, survey, photos = [], gps, expanded, onExpand, onCollapse, onClose, onSurvey,
}: Parameters<typeof DealerSheet>[0]) {
  const { lang } = usePrefs();
  const t = COPY[lang];
  const addPhoto = useField((s) => s.addPhoto);
  const removePhoto = useField((s) => s.removePhoto);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const dragY = useRef(0);
  const [addOpen, setAddOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [shot, setShot] = useState<string | null>(null);

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
  const call = telLink(dealer.listedPhone);
  const wa = waLink(dealer.listedPhone);
  const maps = dealer.flags.mapsUrl || (placed ? mapsLink(dealer.lat, dealer.lng, dealer.nameEn) : "");
  const statusLabel = trainingCopy(lang, dealer.flags);

  function onDragStart(e: PointerEvent) {
    dragY.current = e.clientY;
  }
  function onDragEnd(e: PointerEvent) {
    const dy = e.clientY - dragY.current;
    if (dy < -28) onExpand();
    else if (dy > 28) {
      if (expanded) onCollapse();
      else onClose();
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
      setGalleryOpen(true);
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
    <div className="qads-card" data-open={expanded ? "1" : "0"} key={dealer.id}>
      <div
        className="shrink-0 cursor-grab touch-none px-5 pt-2"
        onPointerDown={onDragStart}
        onPointerUp={onDragEnd}
      >
        <div className="mx-auto h-1 w-9 rounded-full bg-surface-2" />
      </div>
      <div className={cn("min-h-0 flex-1", expanded ? "overflow-y-auto overscroll-contain" : "overflow-hidden")}>
        <div className="px-5 pb-4 pt-3.5" onPointerDown={expanded ? undefined : onDragStart} onPointerUp={expanded ? undefined : onDragEnd}>
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold leading-tight tracking-tight" dir="rtl">{dealer.nameAr}</p>
              <p className="truncate text-sm text-muted">{dealer.nameEn}</p>
            </div>
            <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={onClose} className="grid size-9 shrink-0 place-items-center text-muted" aria-label={t.cancel}>
              <MoreHorizontal className="size-4" />
            </button>
          </div>
          <div className="mt-3.5">{metrics}</div>
          <p className="mt-3 truncate text-xs font-semibold uppercase tracking-wide text-fg">
            {[carType, brands].filter(Boolean).join("  ·  ")}
          </p>
          {expanded ? null : <p className="mt-3 text-center text-[11px] font-medium text-muted">{t.swipeHint}</p>}
        </div>

        {expanded ? (
          <div className="px-5 pb-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={dealer.status} />
              {statusLabel ? <TrainingBadge stage={dealer.flags.trainingStage} priority={dealer.flags.trainingPriority} label={statusLabel} /> : null}
              {partner ? <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-fg">{t.bothMarkets}</span> : null}
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{t.keyMetrics}</p>
            <div className="mt-2">{metrics}</div>

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
              <div className="mt-1 min-h-16 whitespace-pre-wrap text-sm leading-relaxed text-fg">{note}</div>
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
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { void savePhotos(e.target.files); e.target.value = ""; }} />
            <input ref={libraryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { void savePhotos(e.target.files); e.target.value = ""; }} />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setAddOpen((v) => !v)} disabled={photoBusy} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-surface-2 text-sm font-semibold disabled:opacity-40"><Camera className="size-4" />{photoBusy ? t.saving : t.addPhotos}</button>
              <button type="button" onClick={() => setGalleryOpen((v) => !v)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-surface-2 text-sm font-semibold"><ImagePlus className="size-4" />{t.photoLibrary}{photos.length ? ` · ${photos.length}` : ""}</button>
            </div>
            {addOpen ? (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => cameraRef.current?.click()} className="min-h-11 rounded-xl bg-primary text-sm font-semibold text-primary-fg">{t.takePhoto}</button>
                <button type="button" onClick={() => libraryRef.current?.click()} className="min-h-11 rounded-xl bg-primary text-sm font-semibold text-primary-fg">{t.uploadPhoto}</button>
              </div>
            ) : null}
            {galleryOpen ? (
              photos.length ? (
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {photos.map((p) => (
                    <button key={p.id} type="button" className="shrink-0 overflow-hidden rounded-xl" onClick={() => setShot(p.id)}>
                      <img src={p.dataUrl} alt="" className="size-16 object-cover" />
                    </button>
                  ))}
                </div>
              ) : <p className="mt-2 text-xs text-muted">{t.galleryEmpty}</p>
            ) : null}
            <button
              type="button"
              disabled={surveyLocked || dealer.status === "competitor"}
              onClick={() => onSurvey(dealer.id)}
              className="mt-3 flex min-h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-fg disabled:opacity-40"
            >
              {dealer.status === "not_visited" ? t.startSurvey : t.continueSurvey}
            </button>
          </div>
        ) : null}
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
