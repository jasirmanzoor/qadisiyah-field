import { useNavigate } from "@tanstack/react-router";
import { COPY, STATUS_LABEL } from "@/lib/i18n";
import { formatDistance, haversineM, MARKET_CENTERS, optimizeWalkOrder } from "@/lib/geo";
import { dealersInMarket, dealerMarket, dualPartner, isDualLocation } from "@/lib/markets";
import { cn, uid } from "@/lib/utils";
import type { Dealership } from "@/lib/types";
import { AiSurveySheet } from "@/components/ai/ai-survey-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { ClientOnly } from "@/components/client-only";
import { useField, surveyFor } from "@/stores/field";
import { usePrefs } from "@/stores/prefs";
import { SHIFA_CORRIDOR_ORDER, shifaCorridor } from "@/lib/shifa-seed";
import { MapPinPlus, LocateFixed, Route as RouteIcon, Satellite, Map as MapIcon, Search, X, List as ListIcon, ChevronRight } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { MapFocus } from "./map-canvas";
import { IconTool, LegendDots, ListSheet, DealerRow } from "./map-widgets";
import { DealerSheet } from "./dealer-sheet";

const MapCanvas = lazy(() => import("./map-canvas").then((m) => ({ default: m.MapCanvas })));
type FilterId = "all" | "unvisited" | "partial" | "needsGps" | "noPhone" | "closed" | "authorised" | "trained" | "induction" | "dual";
const NEAR_LIMIT = 12;

export function MapPage() {
  const { lang, market, setMarket } = usePrefs();
  const t = COPY[lang];
  const navigate = useNavigate();
  const snapshot = useField((s) => s.snapshot);
  const gps = useField((s) => s.gps);
  const gpsError = useField((s) => s.gpsError);
  const upsertDealer = useField((s) => s.upsertDealer);
  const patchSurvey = useField((s) => s.patchSurvey);
  const marketCenter = MARKET_CENTERS[market];
  const origin = gps ?? { lat: marketCenter.lat, lng: marketCenter.lng, accuracy: 9999 };
  const roster = useMemo(() => dealersInMarket(snapshot.dealerships, market), [snapshot.dealerships, market]);
  const dualIds = useMemo(() => {
    const ids = new Set<string>();
    for (const d of snapshot.dealerships) if (isDualLocation(d, snapshot.dealerships)) ids.add(d.id);
    return ids;
  }, [snapshot.dealerships]);
  const pendingJump = useRef<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [satellite, setSatellite] = useState(false);
  const [nearMe, setNearMe] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [routeIds, setRouteIds] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [aiAdding, setAiAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNameAr, setNewNameAr] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [cluster, setCluster] = useState<Dealership[] | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [listMode, setListMode] = useState(false);
  const [editingCoords, setEditingCoords] = useState(false);

  useEffect(() => {
    setCluster(null); setNearMe(false); setRouteIds([]); setFilter("all"); setSearch("");
    const jump = pendingJump.current; pendingJump.current = null;
    if (jump) {
      const d = snapshot.dealerships.find((x) => x.id === jump);
      setSelectedId(jump);
      if (d) setFocus({ lat: d.lat, lng: d.lng, zoom: 17, nonce: Date.now(), padBottom: true });
      return;
    }
    setSelectedId(null);
    setFocus({ lat: marketCenter.lat, lng: marketCenter.lng, zoom: marketCenter.zoom, nonce: Date.now() });
  }, [market, marketCenter.lat, marketCenter.lng, marketCenter.zoom]);

  const counts = useMemo(() => {
    const all = roster;
    const c = { all: all.length, unvisited: 0, partial: 0, needsGps: 0, noPhone: 0, closed: 0, authorised: 0, walked: 0, completed: 0, trained: 0, induction: 0, dual: 0 };
    for (const d of all) {
      if (d.status === "not_visited") c.unvisited += 1;
      if (d.status === "partial") c.partial += 1;
      if (d.status === "completed") c.completed += 1;
      if (d.status === "closed") c.closed += 1;
      if (d.flags.needsGps) c.needsGps += 1;
      if (!d.listedPhone.trim()) c.noPhone += 1;
      if (d.flags.authorised) c.authorised += 1;
      if (d.status !== "not_visited" && d.status !== "competitor") c.walked += 1;
      if (d.flags.trainingStage === "trained") c.trained += 1;
      if (d.flags.trainingStage || d.flags.trainingPriority) c.induction += 1;
      if (dualIds.has(d.id)) c.dual += 1;
    }
    return c;
  }, [roster, dualIds]);

  const brandsById = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const s of snapshot.surveys) m.set(s.dealershipId, s.payload.mainBrands ?? []);
    return m;
  }, [snapshot.surveys]);

  const dealers = useMemo(() => roster.filter((d) => {
    if (filter === "unvisited") return d.status === "not_visited";
    if (filter === "partial") return d.status === "partial";
    if (filter === "needsGps") return Boolean(d.flags.needsGps);
    if (filter === "noPhone") return !d.listedPhone.trim();
    if (filter === "closed") return d.status === "closed";
    if (filter === "authorised") return Boolean(d.flags.authorised);
    if (filter === "trained") return d.flags.trainingStage === "trained";
    if (filter === "induction") return Boolean(d.flags.trainingStage || d.flags.trainingPriority);
    if (filter === "dual") return dualIds.has(d.id);
    return true;
  }), [roster, filter, dualIds]);

  const selected = dealers.find((d) => d.id === selectedId) ?? snapshot.dealerships.find((d) => d.id === selectedId) ?? null;
  const survey = selected ? surveyFor(snapshot, selected.id) : undefined;
  const partner = selected ? dualPartner(selected, snapshot.dealerships) : null;
  const partnerSurvey = partner ? surveyFor(snapshot, partner.id)?.payload : undefined;
  const mapDealers = useMemo(() => (selected && !dealers.some((d) => d.id === selected.id) ? [...dealers, selected] : dealers), [dealers, selected]);
  const hay = (d: Dealership) => `${d.flags.sdId ?? ""} ${d.nameEn} ${d.nameAr} ${d.listedPhone} ${d.flags.street ?? ""} ${(brandsById.get(d.id) ?? []).join(" ")} ${d.flags.trainingStage ?? ""} ${d.flags.trainingNote ?? ""}`;
  const searchHits = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return roster.filter((d) => hay(d).toLowerCase().includes(q)).slice(0, 8);
  }, [roster, search, brandsById]);
  const nearest = useMemo(() => [...dealers].sort((a, b) => haversineM(origin, a) - haversineM(origin, b)).slice(0, NEAR_LIMIT), [dealers, origin]);
  const listRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const pool = q ? dealers.filter((d) => hay(d).toLowerCase().includes(q)) : dealers;
    return [...pool].sort((a, b) => haversineM(origin, a) - haversineM(origin, b));
  }, [dealers, search, brandsById, origin]);
  const listGroups = useMemo(() => {
    if (market !== "shifa") return null;
    const buckets = new Map<string, Dealership[]>();
    for (const d of listRows) {
      const key = shifaCorridor(d.flags.street ?? "");
      const arr = buckets.get(key) ?? [];
      arr.push(d);
      buckets.set(key, arr);
    }
    const order = SHIFA_CORRIDOR_ORDER as readonly string[];
    const keys = [...buckets.keys()].sort((a, b) => {
      const ia = order.indexOf(a); const ib = order.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    return keys.map((key) => ({ key, items: buckets.get(key) ?? [] }));
  }, [market, listRows]);
  const nextDesk = useMemo(() => {
    const pool = dealers.filter((d) => d.status === "not_visited");
    if (!pool.length) return null;
    return pool.reduce((best, d) => (haversineM(origin, d) < haversineM(origin, best) ? d : best));
  }, [dealers, origin]);
  const routeDealers = useMemo(() => optimizeWalkOrder(origin, dealers.filter((d) => routeIds.includes(d.id))), [dealers, routeIds, origin]);
  const routeMeters = useMemo(() => {
    if (!routeDealers.length) return 0;
    let total = haversineM(origin, routeDealers[0]);
    for (let i = 1; i < routeDealers.length; i++) total += haversineM(routeDealers[i - 1], routeDealers[i]);
    return total;
  }, [origin, routeDealers]);
  const nearbyDupes = useMemo(() => (adding ? roster.filter((d) => haversineM(origin, d) < 40).slice(0, 3) : []), [adding, roster, origin]);
  const sheetOpen = Boolean(selected || nearMe || planning || adding || cluster);
  const walkedPct = counts.all ? Math.round((counts.walked / counts.all) * 100) : 0;
  function flyTo(d: { lat: number; lng: number }, zoom = 17) { setFocus({ lat: d.lat, lng: d.lng, zoom, nonce: Date.now(), padBottom: true }); }
  function pickDealer(id: string) {
    const d = roster.find((x) => x.id === id) ?? snapshot.dealerships.find((x) => x.id === id);
    setSelectedId(id); setEditingCoords(false); setNearMe(false); setCluster(null); setAdding(false);
    if (!listMode) setSearch("");
    if (d) flyTo(d);
  }
  function onSelect(id: string) {
    if (planning) { setRouteIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])); return; }
    pickDealer(id);
  }
  function onCluster(items: Dealership[], lat: number, lng: number) { setSelectedId(null); setNearMe(false); setAdding(false); setCluster(items); flyTo({ lat, lng }, 17); }
  function openNear() { const next = !nearMe; setNearMe(next); setPlanning(false); setAdding(false); setCluster(null); setSelectedId(null); setListMode(false); if (next) flyTo(origin, 16); }
  function toggleList() { setListMode((v) => !v); setPlanning(false); setAdding(false); setNearMe(false); setCluster(null); setSelectedId(null); }
  function openAdd(prefill?: string) { if (prefill?.trim()) setNewName(prefill.trim()); setAdding(true); setNearMe(false); setPlanning(false); setCluster(null); setSelectedId(null); setListMode(false); }
  async function addDealer() {
    if (!newName.trim()) return;
    const hasFix = Boolean(gps && !gpsError);
    const dealer: Dealership = {
      id: uid(), nameEn: newName.trim(), nameAr: newNameAr.trim(), lat: origin.lat, lng: origin.lng, listedPhone: newPhone.trim(),
      seedNote: nearbyDupes.length ? `${t.possibleDup} ${nearbyDupes.map((d) => d.nameEn).join(", ")}` : market === "shifa" ? "Added in field · Al Shifa used-car lot" : "Added in field",
      status: "not_visited", flags: { gpsSource: hasFix ? "survey" : "interpolated", market, needsGps: !hasFix }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    await upsertDealer(dealer);
    if (market === "shifa") await patchSurvey(dealer.id, { vehicleType: "used_only", visitStatus: "not_visited" }, 0, "not_visited");
    setAdding(false); setNewName(""); setNewNameAr(""); setNewPhone("");
    void navigate({ to: "/survey/$id", params: { id: dealer.id } });
  }
  async function saveSelectedCoords(lat: number, lng: number, source: NonNullable<Dealership["flags"]["gpsSource"]> = "manual_pin") {
    if (!selected) return;
    await upsertDealer({ ...selected, lat, lng, flags: { ...selected.flags, needsGps: false, gpsSource: source, gpsStatus: "confirmed", gpsTimestamp: new Date().toISOString(), mapsUrl: `https://www.google.com/maps?q=${lat},${lng}` }, updatedAt: new Date().toISOString() });
    setEditingCoords(false); setListMode(false); flyTo({ lat, lng }, 18);
  }
  async function pinSelectedToGps() { if (!selected || !gps || gpsError) return; await saveSelectedCoords(gps.lat, gps.lng, "field_device_gps"); }
  async function markClosed(id: string) {
    await patchSurvey(id, { visitStatus: "closed" }, 0, "closed");
    const rest = dealers.filter((d) => d.id !== id && d.status === "not_visited");
    const nxt = rest.length ? rest.reduce((best, d) => (haversineM(origin, d) < haversineM(origin, best) ? d : best)) : null;
    if (nxt) pickDealer(nxt.id); else setSelectedId(null);
  }
  const filters: { id: FilterId; label: string; count: number }[] = [
    { id: "all", label: t.filterAll, count: counts.all }, { id: "dual", label: t.bothMarkets, count: counts.dual },
    { id: "unvisited", label: t.unvisited, count: counts.unvisited }, { id: "partial", label: t.partialFilter, count: counts.partial },
    { id: "needsGps", label: t.needsGps, count: counts.needsGps }, { id: "noPhone", label: t.noPhoneFilter, count: counts.noPhone },
    { id: "closed", label: t.closedFilter, count: counts.closed }, { id: "authorised", label: t.authFilter, count: counts.authorised },
    { id: "trained", label: t.trainedFilter, count: counts.trained }, { id: "induction", label: t.inductionFilter, count: counts.induction },
  ].filter((f): f is { id: FilterId; label: string; count: number } => f.id === "all" || f.id === "dual" || !(market === "shifa" && f.count === 0));

  return (
    <div className="relative min-h-0 flex-1 bg-bg">
      <div className="qads-map-host absolute inset-0 z-0">
        <ClientOnly fallback={<div className="grid h-full place-items-center text-sm text-muted">Loading map…</div>}>
          <Suspense fallback={<div className="grid h-full place-items-center text-sm text-muted">Loading map…</div>}>
            <MapCanvas key={market} dealers={mapDealers} selectedId={selectedId} onSelect={onSelect} onCluster={onCluster} satellite={satellite} me={gps} route={routeDealers} focus={focus} origin={marketCenter} dualIds={dualIds} showDualLabels={market === "shifa" && filter === "dual"} />
          </Suspense>
        </ClientOnly>
      </div>
      <div className="qads-vignette" aria-hidden />
      {listMode ? <div className="absolute inset-0 z-10 bg-bg" aria-hidden /> : null}
      <div className="pointer-events-none absolute inset-x-3 top-3 bottom-3 z-20 flex items-start gap-2">
        <div className={cn("flex min-w-0 flex-1 flex-col", listMode && "min-h-0 self-stretch")}>
          <div className="pointer-events-auto relative z-30 min-w-0">
            <div className="qads-hud rounded-2xl p-1">
              <div className="relative">
                <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <input className="min-h-11 w-full bg-transparent pe-11 ps-10 text-sm text-fg placeholder:text-faint focus-visible:outline-none" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.searchShowrooms} enterKeyHint="search" />
                {search ? <button type="button" onClick={() => setSearch("")} className="absolute end-0.5 top-1/2 grid size-10 -translate-y-1/2 place-items-center text-muted" aria-label={t.clearSearch}><X className="size-4" /></button> : null}
              </div>
            </div>
            {search.trim() && !planning && !adding && !listMode ? (
              <div className="qads-sheet relative z-30 mt-1 max-h-56 overflow-auto rounded-2xl p-1">
                {searchHits.length === 0 ? (
                  <div className="px-2 py-2"><p className="px-1 py-2 text-sm text-muted">{t.noShowroomMatch}</p><Button data-add="1" size="sm" className="w-full" onClick={() => openAdd(search)}><MapPinPlus className="size-4" />{t.addThisLot}</Button></div>
                ) : searchHits.map((d) => <DealerRow key={d.id} dealer={d} dual={dualIds.has(d.id)} subtitle={[d.flags.sdId, dualIds.has(d.id) ? t.bothMarkets : null, d.nameAr || d.listedPhone || d.flags.street].filter(Boolean).join(" · ")} lang={lang} onClick={() => pickDealer(d.id)} />)}
              </div>
            ) : (
              <div className="qads-chips mt-1 flex min-w-0 gap-1 overflow-x-auto pb-0.5">
                {filters.map((f) => (
                  <button key={f.id} type="button" onClick={() => setFilter(f.id)} className={cn("qads-chip shrink-0 rounded-full px-3 py-2 text-xs font-semibold", filter === f.id ? "bg-primary text-primary-fg shadow-[var(--shadow-border)]" : "qads-hud text-muted")}>
                    {f.label}<span className="ms-1.5 tabular-nums opacity-80">{f.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {listMode && !planning && !adding ? (
            <div data-list="1" className="pointer-events-auto qads-sheet mt-1 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <div><p className="text-sm font-semibold">{t.list}</p><p className="text-xs font-medium tabular-nums text-muted">{t.showing} <span className="text-fg">{listRows.length}</span></p></div>
                <button type="button" data-add="1" onClick={() => openAdd()} className="flex min-h-10 items-center gap-1 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-fg"><MapPinPlus className="size-3.5" />{t.addDealer}</button>
              </div>
              <div className={cn("min-h-0 flex-1 overflow-auto px-1 pb-1", selected && "pb-56")}>
                {listRows.length === 0 ? (
                  <div className="px-3 py-6"><p className="text-sm text-muted">{t.noShowroomMatch}</p><Button data-add="1" size="sm" className="mt-3 w-full" onClick={() => openAdd(search)}><MapPinPlus className="size-4" />{t.addThisLot}</Button></div>
                ) : listGroups ? listGroups.map((g) => (
                  <div key={g.key}><p className="sticky top-0 z-10 bg-surface px-3 py-1.5 text-xs font-semibold text-muted">{g.key}<span className="ms-1.5 tabular-nums opacity-80">{g.items.length}</span></p>{g.items.map((d) => <DealerRow key={d.id} dealer={d} lang={lang} dual={dualIds.has(d.id)} selected={d.id === selectedId} meta={formatDistance(haversineM(origin, d))} subtitle={[d.flags.sdId, dualIds.has(d.id) ? t.bothMarkets : null, STATUS_LABEL[lang][d.status]].filter(Boolean).join(" · ")} onClick={() => pickDealer(d.id)} />)}</div>
                )) : listRows.map((d) => <DealerRow key={d.id} dealer={d} lang={lang} dual={dualIds.has(d.id)} selected={d.id === selectedId} meta={formatDistance(haversineM(origin, d))} subtitle={[d.flags.sdId, dualIds.has(d.id) ? t.bothMarkets : null, STATUS_LABEL[lang][d.status]].filter(Boolean).join(" · ")} onClick={() => pickDealer(d.id)} />)}
              </div>
            </div>
          ) : null}
        </div>
        <div className="qads-hud pointer-events-auto flex shrink-0 flex-col rounded-2xl p-1">
          <IconTool label={t.locateMe} active={nearMe} onClick={openNear}><LocateFixed className="size-4" /></IconTool>
          <IconTool label={satellite ? t.streets : t.satellite} active={satellite} onClick={() => setSatellite((v) => !v)}>{satellite ? <MapIcon className="size-4" /> : <Satellite className="size-4" />}</IconTool>
          <IconTool label={t.list} active={listMode} onClick={toggleList}><ListIcon className="size-4" /></IconTool>
          <IconTool label={t.planRoute} active={planning} onClick={() => { setPlanning((v) => !v); setNearMe(false); setAdding(false); setCluster(null); setSelectedId(null); setListMode(false); }}><RouteIcon className="size-4" /></IconTool>
          <IconTool label={t.addDealer} active={adding} onClick={() => openAdd()}><MapPinPlus className="size-4" /></IconTool>
        </div>
      </div>
      {!sheetOpen && !listMode ? (
        <div className="qads-hud absolute inset-x-3 bottom-3 z-10 rounded-2xl p-3">
          <div className="flex items-center justify-between gap-3">
            <LegendDots />
            <p className="shrink-0 text-xs font-medium tabular-nums text-muted">{market === "shifa" ? <span className="me-2 font-semibold text-fg">{t.usedCarMarket}</span> : null}{filter === "all" ? <><span className="text-fg">{counts.walked}</span>{` / ${counts.all} ${t.walkedOf}`}</> : <>{t.showing} <span className="text-fg">{dealers.length}</span></>}</p>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-[linear-gradient(90deg,var(--primary),var(--gold))] transition-[width] duration-300" style={{ width: `${filter === "all" ? walkedPct : dealers.length && counts.all ? Math.round((dealers.length / counts.all) * 100) : 0}%` }} /></div>
          {nextDesk ? <button type="button" onClick={() => pickDealer(nextDesk.id)} className="mt-2 flex min-h-11 w-full items-center gap-2 rounded-xl bg-surface-2 px-2 text-start"><span className="text-xs font-semibold text-primary">{t.nextDesk}</span><span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">{lang === "ar" && nextDesk.nameAr ? nextDesk.nameAr : nextDesk.nameEn}</span><span className="shrink-0 text-xs tabular-nums text-muted">{formatDistance(haversineM(origin, nextDesk))}</span><ChevronRight className="size-4 shrink-0 text-muted" /></button> : null}
          <Button data-add="1" className="mt-2 w-full" size="sm" onClick={() => openAdd()}><MapPinPlus className="size-4" />{t.addDealer}</Button>
        </div>
      ) : null}
      {planning ? (
        <div className="qads-sheet absolute inset-x-3 bottom-3 z-30 rounded-2xl p-4">
          <div className="mb-2 flex items-center justify-between gap-2"><div><p className="text-sm font-semibold">{t.selectStops}</p><p className="text-xs tabular-nums text-muted">{routeDealers.length} {t.stops}{routeDealers.length ? ` · ${t.routeTotal} ${formatDistance(routeMeters)}` : ""}</p></div><button type="button" className="min-h-10 px-2 text-xs font-medium text-muted" onClick={() => setRouteIds([])}>{t.clearRoute}</button></div>
          <ol className="max-h-36 space-y-1 overflow-auto">{routeDealers.map((d, i) => { const prev = i === 0 ? origin : routeDealers[i - 1]; return <li key={d.id} className="flex items-center justify-between gap-2 text-sm"><span className="flex min-w-0 items-center gap-2"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-fg">{i + 1}</span><span className="min-w-0 truncate">{lang === "ar" && d.nameAr ? d.nameAr : d.nameEn}</span></span><span className="shrink-0 text-xs tabular-nums text-muted">{formatDistance(haversineM(prev, d))}</span></li>; })}</ol>
          <Button className="mt-3 w-full" variant="secondary" onClick={() => setPlanning(false)}>{t.donePlanning}</Button>
        </div>
      ) : null}
      {nearMe && !planning ? <ListSheet title={t.nearest} hint={gpsError ? t.usingCenter : undefined} onClose={() => setNearMe(false)}>{nearest.map((d) => <DealerRow key={d.id} dealer={d} lang={lang} dual={dualIds.has(d.id)} meta={formatDistance(haversineM(origin, d))} subtitle={[d.flags.sdId, dualIds.has(d.id) ? t.bothMarkets : null, STATUS_LABEL[lang][d.status]].filter(Boolean).join(" · ")} onClick={() => pickDealer(d.id)} />)}</ListSheet> : null}
      {cluster && !planning && !nearMe ? <ListSheet title={t.clusterHere} hint={`${cluster.length}`} onClose={() => setCluster(null)}>{[...cluster].sort((a, b) => haversineM(origin, a) - haversineM(origin, b)).map((d) => <DealerRow key={d.id} dealer={d} lang={lang} dual={dualIds.has(d.id)} meta={formatDistance(haversineM(origin, d))} subtitle={[d.flags.sdId, dualIds.has(d.id) ? t.bothMarkets : null, STATUS_LABEL[lang][d.status]].filter(Boolean).join(" · ")} onClick={() => pickDealer(d.id)} />)}</ListSheet> : null}
      {selected && !planning && !nearMe && !cluster ? <DealerSheet dealer={selected} partner={partner} partnerSurvey={partnerSurvey} distance={haversineM(origin, selected)} source={survey?.payload.volumeFiguresAre} survey={survey?.payload} canPinGps={Boolean(gps && !gpsError)} editingCoords={editingCoords} gps={gps && !gpsError ? gps : null} onClose={() => { setEditingCoords(false); setSelectedId(null); }} onSurvey={(id) => void navigate({ to: "/survey/$id", params: { id } })} onPinGps={() => void pinSelectedToGps()} onEditCoords={() => setEditingCoords(true)} onCancelCoords={() => setEditingCoords(false)} onSaveCoords={(lat, lng) => void saveSelectedCoords(lat, lng)} onMarkClosed={() => void markClosed(selected.id)} onOpenPartner={(p) => { pendingJump.current = p.id; setMarket(dealerMarket(p)); }} /> : null}
      {adding ? (
        <div className="qads-sheet absolute inset-x-3 bottom-3 z-30 rounded-2xl p-4">
          <div className="mb-3 flex items-start justify-between gap-2"><div><p className="text-base font-semibold tracking-tight">{t.addDealer}</p><p className="text-xs text-muted">{t.addDealerHint}</p><p className="mt-1 text-xs text-muted">{gps && !gpsError ? t.pinningGps : t.usingCenter}</p>{market === "shifa" ? <p className="mt-1 text-xs text-muted">{t.usedOnlyDefault}</p> : null}</div><button type="button" onClick={() => setAdding(false)} className="grid size-10 shrink-0 place-items-center"><X className="size-4" /></button></div>
          {nearbyDupes.length ? <p className="mb-2 rounded-xl bg-status-amber/10 px-3 py-2 text-xs text-status-amber">{t.nearbyDup}: {nearbyDupes.map((d) => d.nameEn).join(", ")}</p> : null}
          <div className="flex flex-col gap-2">
            <Input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t.nameEn} />
            <Input dir="rtl" value={newNameAr} onChange={(e) => setNewNameAr(e.target.value)} placeholder={t.nameAr} />
            <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder={t.phone} type="tel" />
            <Button data-save-survey="1" onClick={() => void addDealer()} disabled={!newName.trim()}>{t.saveAndSurvey}</Button>
            <Button variant="secondary" onClick={() => { setAdding(false); setAiAdding(true); }}>{t.aiSurveyNewTitle}</Button>
          </div>
        </div>
      ) : null}
      {aiAdding ? <AiSurveySheet mode="new" dealershipId={null} onClose={() => setAiAdding(false)} onSaved={(id) => { setAiAdding(false); void navigate({ to: "/survey/$id", params: { id } }); }} /> : null}
    </div>
  );
}
