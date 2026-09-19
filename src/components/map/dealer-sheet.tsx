import { COPY, trainingCopy } from "@/lib/i18n";
import { dealerMarket } from "@/lib/markets";
import { cn, formatNumber, formatPct, formatSarCompact, mapsLink, telLink, waLink } from "@/lib/utils";
import { formatDistance } from "@/lib/geo";
import type { Dealership, SurveyPayload } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input, StatusBadge, FigureBadge, TrainingBadge } from "@/components/ui/field";
import { usePrefs } from "@/stores/prefs";
import { SHIFA_PUBLIC_SNIPPETS } from "@/lib/shifa-seed";
import { Navigation, Phone, MessageCircle, MapPinned, Crosshair, Copy, Check, Pencil, X } from "lucide-react";
import { useEffect, useState } from "react";
import { formatCoord, parseCoordPair, parseCoords, collectRoughNotes, formatThisLotPaste, formatRelatedWalkedPaste } from "./map-notes";

export function DealerSheet(props: {
  dealer: Dealership;
  partner: Dealership | null;
  partnerSurvey?: SurveyPayload;
  distance: number;
  source?: string;
  survey?: SurveyPayload;
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
}) {
  return <DealerSheetBody {...props} />;
}

function DealerSheetBody({
  dealer, partner, partnerSurvey, distance, source, survey, canPinGps, editingCoords, gps,
  onClose, onSurvey, onPinGps, onEditCoords, onCancelCoords, onSaveCoords, onMarkClosed, onOpenPartner,
}: Parameters<typeof DealerSheet>[0]) {
  const { lang } = usePrefs();
  const t = COPY[lang];
  const [copied, setCopied] = useState(false);
  const [latDraft, setLatDraft] = useState(formatCoord(dealer.lat));
  const [lngDraft, setLngDraft] = useState(formatCoord(dealer.lng));
  const [pasteDraft, setPasteDraft] = useState(`${formatCoord(dealer.lat)}, ${formatCoord(dealer.lng)}`);
  const [coordError, setCoordError] = useState(false);
  useEffect(() => {
    setLatDraft(formatCoord(dealer.lat));
    setLngDraft(formatCoord(dealer.lng));
    setPasteDraft(`${formatCoord(dealer.lat)}, ${formatCoord(dealer.lng)}`);
    setCoordError(false);
  }, [dealer.id, dealer.lat, dealer.lng, editingCoords]);
  const call = telLink(dealer.listedPhone);
  const wa = waLink(dealer.listedPhone);
  const maps = dealer.flags.mapsUrl || mapsLink(dealer.lat, dealer.lng, dealer.nameEn);
  const hasSurvey = dealer.status !== "not_visited";
  const brands = (survey?.mainBrands ?? []).slice(0, 4);
  const sd = dealer.flags.sdId ?? "";
  const publicSnippet = dealer.flags.market === "shifa" ? SHIFA_PUBLIC_SNIPPETS[sd] : undefined;
  const lotPaste = dealer.flags.market === "shifa" ? formatThisLotPaste(dealer, survey) : "";
  const relatedPaste = dealer.flags.market === "shifa" ? formatRelatedWalkedPaste(partner, partnerSurvey, t.relatedWalked) : null;
  const roughBody = collectRoughNotes({ nameEn: dealer.nameEn, seedNote: dealer.seedNote, surveyNotes: survey?.notes, publicSnippet, lotPaste, relatedPaste });
  const stats = [
    survey?.inventoryUnits != null ? { k: t.stock, v: formatNumber(survey.inventoryUnits) } : null,
    survey?.inventoryInside != null ? { k: t.inventoryInside, v: formatNumber(survey.inventoryInside) } : null,
    survey?.inventoryOutside != null ? { k: t.inventoryOutside, v: formatNumber(survey.inventoryOutside) } : null,
    survey?.monthlySoldExact != null ? { k: t.soldMo, v: formatNumber(survey.monthlySoldExact) } : null,
    survey?.avgSellingPriceSar != null ? { k: "ASP", v: formatSarCompact(survey.avgSellingPriceSar) } : null,
    survey?.showroomSizeSqm != null ? { k: t.sizeSqm, v: `${formatNumber(survey.showroomSizeSqm)} m²` } : null,
    survey?.inventoryAgePctOver5 != null ? { k: t.inventoryAgeOver5, v: `${survey.inventoryAgePctOver5}%` } : null,
    survey?.fpr != null ? { k: "FPR", v: formatPct(survey.fpr * 100) } : null,
  ].filter(Boolean) as { k: string; v: string }[];
  async function copyNotes() {
    try { await navigator.clipboard.writeText(roughBody); setCopied(true); window.setTimeout(() => setCopied(false), 1600); } catch { /* clipboard blocked */ }
  }
  return (
    <div className="qads-sheet absolute inset-x-3 bottom-3 z-30 max-h-[52vh] overflow-auto rounded-2xl p-4">
      <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-surface-2" />
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          {dealer.flags.sdId ? <p className="text-xs font-semibold uppercase tracking-wide text-muted">{dealer.flags.sdId}</p> : null}
          <p className={cn("truncate text-base font-semibold tracking-tight", partner && "text-primary")}>{dealer.nameEn}</p>
          {dealer.nameAr ? <p className="truncate text-sm text-muted" dir="rtl">{dealer.nameAr}</p> : null}
        </div>
        <button type="button" onClick={onClose} className="grid size-10 shrink-0 place-items-center"><X className="size-4" /></button>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={dealer.status} />
        {partner ? <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-fg">{t.bothMarkets}</span> : null}
        <TrainingBadge stage={dealer.flags.trainingStage} priority={dealer.flags.trainingPriority} label={trainingCopy(lang, dealer.flags) ?? t.induction} />
        <span className="flex items-center gap-1 text-xs tabular-nums text-muted"><Navigation className="size-3" />{formatDistance(distance)}</span>
        {source ? <FigureBadge source={source} /> : null}
        {dealer.flags.credibility ? <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold uppercase text-muted">{dealer.flags.credibility}</span> : null}
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
            <span className="block truncate text-sm font-semibold tabular-nums text-fg">{formatCoord(dealer.lat)}, {formatCoord(dealer.lng)}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary"><Pencil className="size-3.5" />{t.editCoords}</span>
        </button>
      )}
      {dealer.flags.needsGps ? <p className="mb-2 text-xs text-status-amber">{t.confirmGps}</p> : null}
      {dealer.flags.market === "shifa" ? <p className="mb-2 text-xs text-muted">{t.usedCarMarket}</p> : null}
      {dealer.flags.competitor ? <p className="mb-2 text-xs text-status-purple">{t.competitor}</p> : null}
      {dealer.flags.complex ? <p className="mb-2 text-xs text-muted">{t.complex}</p> : null}
      {dealer.flags.authorised ? <p className="mb-2 text-xs text-muted">{t.authorised}</p> : null}
      {partner ? (
        <div className="mb-3 rounded-xl bg-primary/10 px-3 py-2">
          <p className="text-xs font-semibold text-primary">{dealerMarket(dealer) === "shifa" ? t.alsoInQadisiyah : t.alsoInShifa}</p>
          <p className="mt-0.5 truncate text-sm font-medium text-fg">{partner.flags.sdId ? `${partner.flags.sdId} · ` : ""}{lang === "ar" && partner.nameAr ? partner.nameAr : partner.nameEn}</p>
          <button type="button" className="mt-1 min-h-10 text-xs font-semibold text-primary" onClick={() => onOpenPartner(partner)}>{t.openOtherDesk}</button>
        </div>
      ) : dealer.flags.relatedSdId ? <p className="mb-2 text-xs text-muted">{t.relatedDesk} {dealer.flags.relatedSdId}</p> : null}
      {dealer.flags.trainingNote ? <p className="mb-2 text-xs text-muted">{dealer.flags.trainingNote}</p> : null}
      {dealer.flags.failedSession ? <p className="mb-2 text-xs text-status-red">{t.failedSession}: {dealer.flags.failedSession}</p> : null}
      {survey?.pocName ? <p className="mb-2 text-xs text-muted">{survey.pocName}{survey.pocRole ? ` · ${survey.pocRole}` : ""}</p> : null}
      {dealer.flags.street ? <p className="mb-1 text-xs text-muted">{dealer.flags.street}</p> : null}
      {brands.length ? <div className="mb-2 flex flex-wrap gap-1">{brands.map((b) => <span key={b} className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">{b}</span>)}</div> : null}
      {stats.length ? <div className={cn("mb-3 grid gap-1.5", stats.length >= 3 ? "grid-cols-3" : stats.length === 2 ? "grid-cols-2" : "grid-cols-1")}>{stats.slice(0, 6).map((s) => <div key={s.k} className="rounded-xl bg-surface-2 px-2 py-2"><p className="truncate text-xs text-muted">{s.k}</p><p className="truncate text-sm font-semibold tabular-nums tracking-tight">{s.v}</p></div>)}</div> : null}
      {roughBody ? (
        <div className="mb-3 rounded-xl bg-surface-2 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t.roughNotes}</p>
            <button type="button" onClick={() => void copyNotes()} className="flex min-h-10 items-center gap-1 px-1 text-xs font-semibold text-primary">{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied ? t.copied : t.copyNotes}</button>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-fg">{roughBody}</p>
          {dealer.flags.market === "shifa" && dealer.status === "not_visited" && !/this Al Shifa lot is unwalked/i.test(roughBody) ? <p className="mt-1 text-xs text-muted">{t.thisLotUnwalked}</p> : null}
        </div>
      ) : null}
      {dealer.listedPhone ? <p className="mb-3 text-sm tabular-nums text-muted">{dealer.listedPhone}</p> : <p className="mb-3 text-sm text-faint">{t.noPhone}</p>}
      <div className="grid grid-cols-3 gap-2">
        <a href={maps} target="_blank" rel="noreferrer" className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl bg-surface-2 text-xs font-medium text-fg"><MapPinned className="size-4" />{t.openMaps}</a>
        {call ? <a href={call} className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl bg-surface-2 text-xs font-medium text-fg"><Phone className="size-4" />{t.call}</a> : <span className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-xs text-faint"><Phone className="size-4" />{t.call}</span>}
        {wa ? <a href={wa} target="_blank" rel="noreferrer" className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl bg-surface-2 text-xs font-medium text-fg"><MessageCircle className="size-4" />{t.whatsapp}</a> : <span className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-xs text-faint"><MessageCircle className="size-4" />{t.whatsapp}</span>}
      </div>
      {dealer.flags.needsGps && canPinGps ? <button type="button" onClick={onPinGps} className="mt-2 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium text-primary"><Crosshair className="size-4" />{t.pinToGps}</button> : null}
      <Button className="mt-2 w-full" disabled={dealer.status === "competitor"} onClick={() => onSurvey(dealer.id)}>{hasSurvey ? t.continueSurvey : t.startSurvey}</Button>
      {dealer.status === "not_visited" ? <button type="button" onClick={onMarkClosed} className="mt-1 flex min-h-10 w-full items-center justify-center text-sm font-medium text-muted">{t.markClosed}</button> : null}
    </div>
  );
}
