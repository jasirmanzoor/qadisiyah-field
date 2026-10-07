import { COPY, trainingCopy } from "@/lib/i18n";
import { dealerMarket } from "@/lib/markets";
import { cn, mapsLink, telLink, uid, waLink } from "@/lib/utils";
import { compressImage } from "@/lib/image";
import { formatDistance, nearestDealers } from "@/lib/geo";
import type { Dealership, SurveyPayload } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input, StatusBadge, FigureBadge, TrainingBadge } from "@/components/ui/field";
import { usePrefs } from "@/stores/prefs";
import { useField } from "@/stores/field";
import { extractNoteProposals } from "@/lib/note-extract";
import { Navigation, Phone, MessageCircle, MapPinned, Crosshair, Copy, Check, Pencil, X, Camera, ImagePlus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatCoord, parseCoordPair, parseCoords, collectRoughNotes, formatThisLotPaste } from "./map-notes";

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
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);
  const [noteLine, setNoteLine] = useState("");
  const [fig, setFig] = useState({ phone: "", cars: "", sqm: "", asp: "" });
  const [latDraft, setLatDraft] = useState(formatCoord(dealer.lat));
  const [lngDraft, setLngDraft] = useState(formatCoord(dealer.lng));
  const [pasteDraft, setPasteDraft] = useState(`${formatCoord(dealer.lat)}, ${formatCoord(dealer.lng)}`);
  const [coordError, setCoordError] = useState(false);
  useEffect(() => {
    setLatDraft(formatCoord(dealer.lat));
    setLngDraft(formatCoord(dealer.lng));
    setPasteDraft(`${formatCoord(dealer.lat)}, ${formatCoord(dealer.lng)}`);
    setCoordError(false);
    setEditingNotes(false);
    setNotesSaved(false);
    setNoteLine("");
    setShot(null);
    setFig({
      phone: dealer.listedPhone ?? "",
      cars: survey?.inventoryUnits != null ? String(survey.inventoryUnits) : "",
      sqm: survey?.showroomSizeSqm != null ? String(survey.showroomSizeSqm) : "",
      asp: survey?.avgSellingPriceSar != null ? String(survey.avgSellingPriceSar) : "",
    });
  }, [dealer.id, editingCoords]);
  const call = telLink(dealer.listedPhone);
  const wa = waLink(dealer.listedPhone);
  const maps = dealer.flags.mapsUrl || mapsLink(dealer.lat, dealer.lng, dealer.nameEn);
  const hasSurvey = dealer.status !== "not_visited";
  const brands = (survey?.mainBrands ?? []).slice(0, 6);
  const lotPaste = formatThisLotPaste(dealer, survey);
  const roughBody = collectRoughNotes({ lotPaste });
  const notesBody = survey?.notes?.trim() || roughBody;
  const [shot, setShot] = useState<string | null>(null);
  const near = useMemo(() => {
    if (dealer.flags.unplaced || dealer.lat === 0 || dealer.lng === 0) return [];
    return nearestDealers(dealer, roster, { excludeId: dealer.id, radiusM: 140, limit: 4 });
  }, [dealer, roster]);
  const noteFigures = useMemo(() => extractNoteProposals(notesBody), [notesBody]);
  async function copyNotes(text = notesBody) {
    try { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 1600); } catch { /* clipboard blocked */ }
  }
  function saveNotes() {
    void patchSurvey(dealer.id, { notes: notesDraft });
    setEditingNotes(false);
    setNotesSaved(true);
  }
  function commitNote() {
    const line = noteLine.trim();
    if (!line) return;
    const prev = (survey?.notes ?? "").trim();
    void patchSurvey(dealer.id, { notes: prev ? `${prev}\n${line}` : line });
    setNoteLine("");
    setNotesSaved(true);
  }
  function commitFig(field: "phone" | "cars" | "sqm" | "asp") {
    if (field === "phone") {
      const phone = fig.phone.trim();
      if (phone && phone !== dealer.listedPhone) {
        void upsertDealer({ ...dealer, listedPhone: phone, updatedAt: new Date().toISOString() });
      }
      return;
    }
    const raw = fig[field].trim();
    if (!raw || !Number.isFinite(Number(raw))) return;
    const n = Number(raw);
    if (field === "cars") {
      if (survey?.inventoryUnits === n) return;
      void patchSurvey(dealer.id, { inventoryUnits: n });
      return;
    }
    if (field === "sqm") {
      if (survey?.showroomSizeSqm === n) return;
      void patchSurvey(dealer.id, { showroomSizeSqm: n });
      return;
    }
    const asp = n < 1000 ? Math.round(n * 1000) : n;
    if (survey?.avgSellingPriceSar === asp) return;
    void patchSurvey(dealer.id, { avgSellingPriceSar: asp });
    setFig((f) => ({ ...f, asp: String(asp) }));
  }
  function applyNoteFigures() {
    const patch: Partial<SurveyPayload> = {};
    for (const item of noteFigures) {
      if (item.key === "phone") {
        if (!dealer.listedPhone.trim()) {
          void upsertDealer({ ...dealer, listedPhone: String(item.value), updatedAt: new Date().toISOString() });
        }
        continue;
      }
      const current = (survey as Record<string, unknown> | undefined)?.[item.key];
      if (current != null && current !== "" && !(Array.isArray(current) && current.length === 0)) continue;
      const value = item.key === "mainBrands"
        ? String(item.value).split(/,|،/).map((s) => s.trim()).filter(Boolean)
        : item.value;
      (patch as Record<string, unknown>)[item.key] = value;
    }
    if (Object.keys(patch).length) void patchSurvey(dealer.id, patch);
  }
  const typeLabel = survey?.vehicleType === "mix" ? t.mixCars : survey?.vehicleType === "new_only" ? t.newOnly : survey?.vehicleType === "used_only" ? t.usedOnly : "";
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
    } finally {
      setPhotoBusy(false);
    }
  }
  return (
    <div className="qads-sheet absolute inset-x-3 bottom-3 z-30 max-h-[72vh] overflow-auto rounded-2xl p-4">
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
      <div className="mb-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => cameraRef.current?.click()} disabled={photoBusy} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-surface-2 text-sm font-semibold text-fg disabled:opacity-40"><Camera className="size-4" />{photoBusy ? t.saving : t.takePhoto}</button>
        <button type="button" onClick={() => libraryRef.current?.click()} disabled={photoBusy} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-surface-2 text-sm font-semibold text-fg disabled:opacity-40"><ImagePlus className="size-4" />{t.photoLibrary}</button>
      </div>
      {photos.length ? (
        <div className="mb-3 flex gap-2 overflow-x-auto">
          {photos.map((p) => (
            <button key={p.id} type="button" className="shrink-0 overflow-hidden rounded-xl" onClick={() => setShot(p.id)}>
              <img src={p.dataUrl} alt="" className="size-16 object-cover" />
            </button>
          ))}
        </div>
      ) : null}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={dealer.status} />
        {partner ? <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-fg">{t.bothMarkets}</span> : null}
        <TrainingBadge stage={dealer.flags.trainingStage} priority={dealer.flags.trainingPriority} label={trainingCopy(lang, dealer.flags) ?? t.induction} />
        <span className="flex items-center gap-1 text-xs tabular-nums text-muted"><Navigation className="size-3" />{formatDistance(distance)}</span>
        {source ? <FigureBadge source={source} /> : null}
        {typeLabel ? <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted">{typeLabel}</span> : null}
      </div>

      <div className="mb-3 flex gap-2">
        <input
          className="qads-note min-w-0 flex-1"
          value={noteLine}
          onChange={(e) => setNoteLine(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitNote(); } }}
          placeholder={t.notePh}
          enterKeyHint="done"
          aria-label={t.notes}
        />
        <button type="button" onClick={commitNote} disabled={!noteLine.trim()} className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-fg disabled:opacity-40" aria-label={t.save}>
          <Check className="size-4" />
        </button>
      </div>
      {notesSaved && !editingNotes ? <p className="-mt-2 mb-2 text-xs text-primary">{t.autoSaved}</p> : null}

      <div className="qads-chips mb-3 flex gap-2 overflow-x-auto pb-1">
        <input className="qads-mini" value={fig.phone} inputMode="tel" placeholder={t.phone} aria-label={t.phone} onChange={(e) => setFig((f) => ({ ...f, phone: e.target.value }))} onBlur={() => commitFig("phone")} />
        <input className="qads-mini" value={fig.cars} inputMode="numeric" placeholder={t.floorCars} aria-label={t.floorCars} onChange={(e) => setFig((f) => ({ ...f, cars: e.target.value }))} onBlur={() => commitFig("cars")} />
        <input className="qads-mini" value={fig.sqm} inputMode="decimal" placeholder={t.floorSqm} aria-label={t.floorSqm} onChange={(e) => setFig((f) => ({ ...f, sqm: e.target.value }))} onBlur={() => commitFig("sqm")} />
        <input className="qads-mini" value={fig.asp} inputMode="decimal" placeholder={t.floorAsp} aria-label={t.floorAsp} onChange={(e) => setFig((f) => ({ ...f, asp: e.target.value }))} onBlur={() => commitFig("asp")} />
      </div>

      <div className="qads-chips mb-3 flex gap-2 overflow-x-auto">
        <button type="button" className={cn("min-h-11 shrink-0 rounded-full px-3 text-xs font-semibold", survey?.vehicleType === "used_only" ? "bg-primary text-primary-fg" : "bg-surface-2 text-fg")} onClick={() => void patchSurvey(dealer.id, { vehicleType: "used_only" })}>{t.usedOnly}</button>
        <button type="button" className={cn("min-h-11 shrink-0 rounded-full px-3 text-xs font-semibold", survey?.vehicleType === "mix" ? "bg-primary text-primary-fg" : "bg-surface-2 text-fg")} onClick={() => void patchSurvey(dealer.id, { vehicleType: "mix" })}>{t.mixCars}</button>
        <button type="button" className={cn("min-h-11 shrink-0 rounded-full px-3 text-xs font-semibold", survey?.financeAvailable === "no" ? "bg-primary text-primary-fg" : "bg-surface-2 text-fg")} onClick={() => void patchSurvey(dealer.id, { financeAvailable: "no" })}>{t.cashOnly}</button>
        <button type="button" className={cn("min-h-11 shrink-0 rounded-full px-3 text-xs font-semibold", survey?.financeAvailable === "yes" ? "bg-primary text-primary-fg" : "bg-surface-2 text-fg")} onClick={() => void patchSurvey(dealer.id, { financeAvailable: "yes" })}>{t.financeYes}</button>
      </div>

      {near.length ? (
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t.aroundHere}</p>
          <div className="mt-1">
            {near.map(({ row, meters }) => (
              <button key={row.id} type="button" onClick={() => onOpenNearby(row.id)} className="flex min-h-11 w-full items-center justify-between gap-2 text-start">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{lang === "ar" && row.nameAr ? row.nameAr : row.nameEn}</span>
                  {row.flags.street ? <span className="block truncate text-xs text-muted">{row.flags.street}</span> : null}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted">{formatDistance(meters)}{meters < 28 ? ` · ${t.nearbyDup}` : ""}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

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
      {brands.length ? <div className="mb-3 flex flex-wrap gap-1">{brands.map((b) => <span key={b} className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">{b}</span>)}</div> : null}

      <div className="mb-3 rounded-xl bg-surface-2 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t.onFile}</p>
          <div className="flex items-center">
            {editingNotes ? (
              <>
                <button type="button" onClick={() => setEditingNotes(false)} className="flex min-h-10 items-center gap-1 px-1 text-xs font-semibold text-muted"><X className="size-3.5" />{t.cancel}</button>
                <button type="button" onClick={saveNotes} className="flex min-h-10 items-center gap-1 px-1 text-xs font-semibold text-primary"><Check className="size-3.5" />{t.save}</button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => { setNotesDraft(notesBody); setNotesSaved(false); setEditingNotes(true); }} className="flex min-h-10 items-center gap-1 px-1 text-xs font-semibold text-primary"><Pencil className="size-3.5" />{t.editNote}</button>
                <button type="button" onClick={() => void copyNotes()} disabled={!notesBody} className="flex min-h-10 items-center gap-1 px-1 text-xs font-semibold text-primary disabled:text-faint">{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied ? t.copied : t.copyNotes}</button>
              </>
            )}
          </div>
        </div>
        {editingNotes ? (
          <textarea value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} rows={6} className="mt-1 w-full resize-y rounded-lg border border-primary/40 bg-surface px-2 py-2 text-xs leading-relaxed text-fg outline-none" />
        ) : notesBody ? (
          <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-xs leading-relaxed text-fg">{notesBody}</p>
        ) : (
          <p className="mt-1 text-xs text-faint">{t.notes}</p>
        )}
        {noteFigures.length && !editingNotes ? (
          <button type="button" onClick={applyNoteFigures} className="mt-2 min-h-10 text-start text-xs font-semibold text-primary">{t.useNoteFigures}</button>
        ) : null}
      </div>

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
