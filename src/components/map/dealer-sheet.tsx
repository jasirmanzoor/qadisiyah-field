import { COPY, trainingCopy } from "@/lib/i18n";
import { dealerMarket } from "@/lib/markets";
import { cn, mapsLink, telLink, uid, waLink } from "@/lib/utils";
import { compressImage } from "@/lib/image";
import { formatDistance, nearestExpanding } from "@/lib/geo";
import type { Dealership, SurveyPayload } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input, StatusBadge, FigureBadge, TrainingBadge } from "@/components/ui/field";
import { usePrefs } from "@/stores/prefs";
import { useField } from "@/stores/field";
import { Navigation, Phone, MessageCircle, MapPinned, Crosshair, Pencil, X, Camera, ImagePlus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatCoord, parseCoordPair, parseCoords } from "./map-notes";

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

function blank(v: unknown) {
  return v == null || v === "" || (Array.isArray(v) && v.length === 0);
}

function cardGaps(survey?: SurveyPayload) {
  const gaps: string[] = [];
  if (blank(survey?.vehicleType)) gaps.push("car type");
  if (blank(survey?.showroomSizeSqm)) gaps.push("size");
  if (blank(survey?.mainBrands)) gaps.push("brands");
  if (blank(survey?.inventoryUnits)) gaps.push("cars");
  if (blank(survey?.avgSellingPriceSar)) gaps.push("ASP");
  if (blank(survey?.inventoryAgePctOver5)) gaps.push(">5 years");
  return gaps;
}

function nameMatches(row: Dealership, q: string) {
  if (q.length < 2) return false;
  const en = row.nameEn.toLowerCase();
  const ar = (row.nameAr || "").toLowerCase();
  return en.includes(q) || ar.includes(q);
}

function DealerSheetBody({
  dealer, partner, distance, source, survey, photos = [], canPinGps, editingCoords, gps,
  onClose, onSurvey, onPinGps, onEditCoords, onCancelCoords, onSaveCoords, onMarkClosed, onOpenPartner, onOpenNearby,
}: Parameters<typeof DealerSheet>[0]) {
  const { lang } = usePrefs();
  const t = COPY[lang];
  const patchSurvey = useField((s) => s.patchSurvey);
  const upsertDealer = useField((s) => s.upsertDealer);
  const addPhoto = useField((s) => s.addPhoto);
  const removePhoto = useField((s) => s.removePhoto);
  const roster = useField((s) => s.snapshot.dealerships);
  const surveys = useField((s) => s.snapshot.surveys);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [nameFocus, setNameFocus] = useState(false);
  const [nameEn, setNameEn] = useState(dealer.nameEn);
  const [nameAr, setNameAr] = useState(dealer.nameAr ?? "");
  const [street, setStreet] = useState(dealer.flags.street ?? "");
  const [size, setSize] = useState(survey?.showroomSizeSqm != null ? String(survey.showroomSizeSqm) : "");
  const [brands, setBrands] = useState((survey?.mainBrands ?? []).join(", "));
  const [cars, setCars] = useState(survey?.inventoryUnits != null ? String(survey.inventoryUnits) : "");
  const [inside, setInside] = useState(survey?.inventoryInside != null ? String(survey.inventoryInside) : "");
  const [outside, setOutside] = useState(survey?.inventoryOutside != null ? String(survey.inventoryOutside) : "");
  const [asp, setAsp] = useState(survey?.avgSellingPriceSar != null ? String(survey.avgSellingPriceSar) : "");
  const [over5, setOver5] = useState(survey?.inventoryAgePctOver5 != null ? String(survey.inventoryAgePctOver5) : "");
  const [latDraft, setLatDraft] = useState(formatCoord(dealer.lat));
  const [lngDraft, setLngDraft] = useState(formatCoord(dealer.lng));
  const [pasteDraft, setPasteDraft] = useState(`${formatCoord(dealer.lat)}, ${formatCoord(dealer.lng)}`);
  const [coordError, setCoordError] = useState(false);
  const [shot, setShot] = useState<string | null>(null);
  useEffect(() => {
    setLatDraft(formatCoord(dealer.lat));
    setLngDraft(formatCoord(dealer.lng));
    setPasteDraft(`${formatCoord(dealer.lat)}, ${formatCoord(dealer.lng)}`);
    setCoordError(false);
    setShot(null);
    setAddOpen(false);
    setGalleryOpen(false);
    setNameFocus(false);
    setNameEn(dealer.nameEn);
    setNameAr(dealer.nameAr ?? "");
    setStreet(dealer.flags.street ?? "");
    setSize(survey?.showroomSizeSqm != null ? String(survey.showroomSizeSqm) : "");
    setBrands((survey?.mainBrands ?? []).join(", "));
    setCars(survey?.inventoryUnits != null ? String(survey.inventoryUnits) : "");
    setInside(survey?.inventoryInside != null ? String(survey.inventoryInside) : "");
    setOutside(survey?.inventoryOutside != null ? String(survey.inventoryOutside) : "");
    setAsp(survey?.avgSellingPriceSar != null ? String(survey.avgSellingPriceSar) : "");
    setOver5(survey?.inventoryAgePctOver5 != null ? String(survey.inventoryAgePctOver5) : "");
  }, [dealer.id, editingCoords]);
  const call = telLink(dealer.listedPhone);
  const wa = waLink(dealer.listedPhone);
  const maps = dealer.flags.mapsUrl || mapsLink(dealer.lat, dealer.lng, dealer.nameEn);
  const hasSurvey = dealer.status !== "not_visited";
  const typeLabel = survey?.vehicleType === "mix" ? t.stdMix : survey?.vehicleType === "new_only" ? t.stdNew : survey?.vehicleType === "used_only" ? t.stdOld : "";
  const surveyOf = (id: string) => surveys.find((s) => s.dealershipId === id)?.payload;
  const assist = useMemo(() => {
    if (!nameFocus || dealer.flags.unplaced || dealer.lat === 0) return null;
    const q = nameEn.trim().toLowerCase();
    const point = { lat: dealer.lat, lng: dealer.lng };
    if (q.length >= 2) {
      const named = nearestExpanding(point, roster, (row) => row.id !== dealer.id && nameMatches(row, q), { excludeId: dealer.id, limit: 4 });
      if (named.hits.length) return { ...named, mode: "name" as const };
    }
    const gaps = nearestExpanding(
      point,
      roster,
      (row) => row.id !== dealer.id && cardGaps(surveyOf(row.id)).length > 0,
      { excludeId: dealer.id, limit: 4 },
    );
    return { ...gaps, mode: "gap" as const };
  }, [nameFocus, nameEn, dealer, roster, surveys]);
  function saveName() {
    const en = nameEn.trim();
    const ar = nameAr.trim();
    if (!en || (en === dealer.nameEn && ar === (dealer.nameAr ?? ""))) return;
    void upsertDealer({ ...dealer, nameEn: en, nameAr: ar, updatedAt: new Date().toISOString() });
  }
  function saveStreet() {
    const next = street.trim();
    if (next === (dealer.flags.street ?? "")) return;
    void upsertDealer({ ...dealer, flags: { ...dealer.flags, street: next }, updatedAt: new Date().toISOString() });
  }
  function saveNum(raw: string, key: "showroomSizeSqm" | "inventoryUnits" | "inventoryInside" | "inventoryOutside" | "avgSellingPriceSar" | "inventoryAgePctOver5") {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return;
    const value = key === "avgSellingPriceSar" && n < 1000 ? Math.round(n * 1000) : n;
    if (survey?.[key] === value) return;
    void patchSurvey(dealer.id, { [key]: value });
    if (key === "avgSellingPriceSar") setAsp(String(value));
  }
  function saveBrands() {
    const list = brands.split(/,|،/).map((s) => s.trim()).filter(Boolean);
    const prev = survey?.mainBrands ?? [];
    if (list.join("|") === prev.join("|")) return;
    void patchSurvey(dealer.id, { mainBrands: list });
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
  return (
    <div className="qads-sheet max-w-full min-w-0 overflow-x-hidden rounded-2xl p-4">
      <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-surface-2" />
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          {dealer.flags.sdId ? <p className="text-xs font-semibold uppercase tracking-wide text-muted">{dealer.flags.sdId}</p> : null}
          <p className={cn("truncate text-lg font-semibold tracking-tight", partner && "text-primary")}>{dealer.nameEn}</p>
          {dealer.nameAr ? <p className="truncate text-sm text-muted" dir="rtl">{dealer.nameAr}</p> : null}
        </div>
        <button type="button" onClick={onClose} className="grid size-11 shrink-0 place-items-center" aria-label={t.cancel}><X className="size-4" /></button>
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { void savePhotos(e.target.files); e.target.value = ""; }} />
      <input ref={libraryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { void savePhotos(e.target.files); e.target.value = ""; }} />
      <div className="mb-2 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setAddOpen((v) => !v)} disabled={photoBusy} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-surface-2 text-sm font-semibold text-fg disabled:opacity-40"><Camera className="size-4" />{photoBusy ? t.saving : t.addPhotos}</button>
        <button type="button" onClick={() => setGalleryOpen((v) => !v)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-surface-2 text-sm font-semibold text-fg"><ImagePlus className="size-4" />{t.photoLibrary}{photos.length ? ` · ${photos.length}` : ""}</button>
      </div>
      {addOpen ? (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => cameraRef.current?.click()} className="min-h-11 rounded-xl bg-primary text-sm font-semibold text-primary-fg">{t.takePhoto}</button>
          <button type="button" onClick={() => libraryRef.current?.click()} className="min-h-11 rounded-xl bg-primary text-sm font-semibold text-primary-fg">{t.uploadPhoto}</button>
        </div>
      ) : null}
      {galleryOpen ? (
        photos.length ? (
          <div className="mb-3 flex max-w-full min-w-0 gap-2 overflow-x-auto">
            {photos.map((p) => (
              <button key={p.id} type="button" className="shrink-0 overflow-hidden rounded-xl" onClick={() => setShot(p.id)}>
                <img src={p.dataUrl} alt="" className="size-20 object-cover" />
              </button>
            ))}
          </div>
        ) : <p className="mb-3 text-xs text-muted">{t.galleryEmpty}</p>
      ) : null}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={dealer.status} />
        {partner ? <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-fg">{t.bothMarkets}</span> : null}
        <TrainingBadge stage={dealer.flags.trainingStage} priority={dealer.flags.trainingPriority} label={trainingCopy(lang, dealer.flags) ?? t.induction} />
        <span className="flex items-center gap-1 text-xs tabular-nums text-muted"><Navigation className="size-3" />{formatDistance(distance)}</span>
        {source ? <FigureBadge source={source} /> : null}
        {typeLabel ? <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted">{typeLabel}</span> : null}
      </div>

      <div className="mb-3 rounded-xl bg-surface-2 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t.onFile}</p>
        <label className="mt-2 block">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">{t.stdName}</span>
          <input className="mt-0.5 min-h-9 w-full rounded-lg bg-surface px-2 text-sm" value={nameEn} onChange={(e) => setNameEn(e.target.value)} onFocus={() => setNameFocus(true)} onBlur={() => { setNameFocus(false); saveName(); }} />
        </label>
        <label className="mt-2 block">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">{t.stdNameAr}</span>
          <input className="mt-0.5 min-h-9 w-full rounded-lg bg-surface px-2 text-sm" dir="rtl" value={nameAr} onChange={(e) => setNameAr(e.target.value)} onFocus={() => setNameFocus(true)} onBlur={() => { setNameFocus(false); saveName(); }} />
        </label>
        {nameFocus && assist ? (
          <div className="mt-2 rounded-lg bg-surface px-2 py-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              {assist.hits.length ? (assist.mode === "name" ? t.assistName : t.assistGap) : t.assistNone}
              {assist.hits.length ? ` · ${assist.radius} m` : ""}
            </p>
            {assist.hits.map(({ row, meters }) => {
              const gaps = cardGaps(surveyOf(row.id));
              return (
                <button key={row.id} type="button" onPointerDown={(e) => e.preventDefault()} onClick={() => onOpenNearby(row.id)} className="flex min-h-10 w-full items-center justify-between gap-2 text-start">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{lang === "ar" && row.nameAr ? row.nameAr : row.nameEn}</span>
                    <span className="block truncate text-[11px] text-muted">{[row.flags.street, gaps.length ? gaps.join(", ") : null].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted">{formatDistance(meters)}</span>
                </button>
              );
            })}
          </div>
        ) : null}
        <label className="mt-2 block">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">{t.location}</span>
          <input className="mt-0.5 min-h-9 w-full rounded-lg bg-surface px-2 text-sm" value={street} onChange={(e) => setStreet(e.target.value)} onBlur={saveStreet} />
        </label>
        <div className="mt-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">{t.stdCarType}</span>
          <div className="mt-1 flex gap-1">
            {([
              ["used_only", t.stdOld],
              ["new_only", t.stdNew],
              ["mix", t.stdMix],
            ] as const).map(([id, label]) => (
              <button key={id} type="button" onClick={() => void patchSurvey(dealer.id, { vehicleType: id })} className={cn("min-h-9 flex-1 rounded-full text-xs font-semibold", survey?.vehicleType === id ? "bg-primary text-primary-fg" : "bg-surface text-fg")}>{label}</button>
            ))}
          </div>
        </div>
        <label className="mt-2 block">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">{t.stdSize}</span>
          <input className="mt-0.5 min-h-9 w-full rounded-lg bg-surface px-2 text-sm tabular-nums" inputMode="decimal" value={size} placeholder="m²" onChange={(e) => setSize(e.target.value)} onBlur={() => saveNum(size, "showroomSizeSqm")} />
        </label>
        <label className="mt-2 block">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">{t.stdBrands}</span>
          <input className="mt-0.5 min-h-9 w-full rounded-lg bg-surface px-2 text-sm" value={brands} placeholder="Hyundai, Kia, Toyota" onChange={(e) => setBrands(e.target.value)} onBlur={saveBrands} />
        </label>
        <label className="mt-2 block">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">{t.stdTotal}</span>
          <input className="mt-0.5 min-h-9 w-full rounded-lg bg-surface px-2 text-sm tabular-nums" inputMode="numeric" value={cars} onChange={(e) => setCars(e.target.value)} onBlur={() => saveNum(cars, "inventoryUnits")} />
        </label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">{t.stdInside}</span>
            <input className="mt-0.5 min-h-9 w-full rounded-lg bg-surface px-2 text-sm tabular-nums" inputMode="numeric" value={inside} onChange={(e) => setInside(e.target.value)} onBlur={() => saveNum(inside, "inventoryInside")} />
          </label>
          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">{t.stdOutside}</span>
            <input className="mt-0.5 min-h-9 w-full rounded-lg bg-surface px-2 text-sm tabular-nums" inputMode="numeric" value={outside} onChange={(e) => setOutside(e.target.value)} onBlur={() => saveNum(outside, "inventoryOutside")} />
          </label>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">{t.stdAsp}</span>
            <input className="mt-0.5 min-h-9 w-full rounded-lg bg-surface px-2 text-sm tabular-nums" inputMode="decimal" value={asp} onChange={(e) => setAsp(e.target.value)} onBlur={() => saveNum(asp, "avgSellingPriceSar")} />
          </label>
          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">{t.stdOver5}</span>
            <input className="mt-0.5 min-h-9 w-full rounded-lg bg-surface px-2 text-sm tabular-nums" inputMode="decimal" value={over5} placeholder="%" onChange={(e) => setOver5(e.target.value)} onBlur={() => saveNum(over5, "inventoryAgePctOver5")} />
          </label>
        </div>
      </div>

      {editingCoords ? (
        <div className="mb-3 rounded-xl bg-surface-2 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t.location}</p>
          <p className="mt-1 text-xs text-muted">{t.coordsHint}</p>
          <Input className="mt-2 bg-surface" inputMode="decimal" autoFocus value={pasteDraft} onChange={(e) => { const v = e.target.value; setPasteDraft(v); const parsed = parseCoordPair(v); if (parsed) { setLatDraft(formatCoord(parsed.lat)); setLngDraft(formatCoord(parsed.lng)); setCoordError(false); } }} placeholder={t.pasteCoords} aria-label={t.pasteCoords} />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Input className="bg-surface" inputMode="decimal" value={latDraft} onChange={(e) => { setLatDraft(e.target.value); setCoordError(false); }} placeholder={t.latLabel} aria-label={t.latLabel} />
            <Input className="bg-surface" inputMode="decimal" value={lngDraft} onChange={(e) => { setLngDraft(e.target.value); setCoordError(false); }} placeholder={t.lngLabel} aria-label={t.lngLabel} />
          </div>
          {coordError ? <p className="mt-2 text-xs text-status-red">{t.coordsInvalid}</p> : null}
          {gps ? <button type="button" onClick={() => { setLatDraft(formatCoord(gps.lat)); setLngDraft(formatCoord(gps.lng)); setPasteDraft(`${formatCoord(gps.lat)}, ${formatCoord(gps.lng)}`); setCoordError(false); }} className="mt-2 flex min-h-10 w-full items-center justify-center gap-2 text-sm font-medium text-primary"><Crosshair className="size-4" />{t.pinToGps}</button> : null}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={onCancelCoords}>{t.cancel}</Button>
            <Button data-save="1" onClick={() => { const parsed = parseCoords(latDraft, lngDraft) ?? parseCoordPair(pasteDraft); if (!parsed) { setCoordError(true); return; } onSaveCoords(parsed.lat, parsed.lng); }}>{t.savePin}</Button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={onEditCoords} className="mb-3 flex min-h-12 w-full items-center gap-2 rounded-xl bg-surface-2 px-3 text-start">
          <MapPinned className="size-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-muted">{t.location}</span>
            <span className="block truncate text-sm font-semibold tabular-nums text-fg">{dealer.flags.street ? `${dealer.flags.street} · ` : ""}{formatCoord(dealer.lat)}, {formatCoord(dealer.lng)}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary"><Pencil className="size-3.5" />{t.editCoords}</span>
        </button>
      )}

      {dealer.flags.needsGps ? <p className="mb-2 text-xs text-status-amber">{t.confirmGps}</p> : null}
      {partner ? (
        <div className="mb-3 rounded-xl bg-primary/10 px-3 py-2">
          <p className="text-xs font-semibold text-primary">{dealerMarket(dealer) === "shifa" ? t.alsoInQadisiyah : t.alsoInShifa}</p>
          <p className="mt-0.5 truncate text-sm font-medium text-fg">{partner.flags.sdId ? `${partner.flags.sdId} · ` : ""}{lang === "ar" && partner.nameAr ? partner.nameAr : partner.nameEn}</p>
          <button type="button" className="mt-1 min-h-10 text-xs font-semibold text-primary" onClick={() => onOpenPartner(partner)}>{t.openOtherDesk}</button>
        </div>
      ) : dealer.flags.relatedSdId ? <p className="mb-2 text-xs text-muted">{t.relatedDesk} {dealer.flags.relatedSdId}</p> : null}

      <div className="grid grid-cols-3 gap-2">
        <a href={maps} target="_blank" rel="noreferrer" className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl bg-surface-2 text-xs font-medium text-fg"><MapPinned className="size-4" />{t.openMaps}</a>
        {call ? <a href={call} className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl bg-surface-2 text-xs font-medium text-fg"><Phone className="size-4" />{t.call}</a> : <span className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-xs text-faint"><Phone className="size-4" />{t.call}</span>}
        {wa ? <a href={wa} target="_blank" rel="noreferrer" className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl bg-surface-2 text-xs font-medium text-fg"><MessageCircle className="size-4" />{t.whatsapp}</a> : <span className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-xs text-faint"><MessageCircle className="size-4" />{t.whatsapp}</span>}
      </div>
      {dealer.flags.needsGps && canPinGps ? <button type="button" onClick={onPinGps} className="mt-2 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium text-primary"><Crosshair className="size-4" />{t.pinToGps}</button> : null}
      <Button className="mt-2 w-full" disabled={dealer.status === "competitor"} onClick={() => onSurvey(dealer.id)}>{hasSurvey ? t.continueSurvey : t.startSurvey}</Button>
      {dealer.status === "not_visited" ? <button type="button" onClick={onMarkClosed} className="mt-1 flex min-h-10 w-full items-center justify-center text-sm font-medium text-muted">{t.markClosed}</button> : null}
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
