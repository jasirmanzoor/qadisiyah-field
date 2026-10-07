import { useNavigate } from "@tanstack/react-router";
import { COPY, STATUS_LABEL } from "@/lib/i18n";
import { formatDistance, haversineM, MARKET_CENTERS, nearestDealers, optimizeWalkOrder } from "@/lib/geo";
import { dealersInMarket, dealerMarket, dualPartner, isDualLocation } from "@/lib/markets";
import { buildExcelXml, downloadBlob } from "@/lib/export";
import { isDeepDived, isSurveyedShowroom } from "@/lib/survey-schema";
import { cn, uid } from "@/lib/utils";
import type { Dealership } from "@/lib/types";
import { AiSurveySheet } from "@/components/ai/ai-survey-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { ClientOnly } from "@/components/client-only";
import { useField, surveyFor } from "@/stores/field";
import { usePrefs } from "@/stores/prefs";
import { SHIFA_CORRIDOR_ORDER, shifaCorridor } from "@/lib/shifa-seed";
import { MapPinPlus, LocateFixed, Route as RouteIcon, Satellite, Map as MapIcon, Search, X, List as ListIcon, ChevronRight, FileSpreadsheet } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { MapFocus } from "./map-canvas";
import { IconTool, LegendDots, ListSheet, DealerRow } from "./map-widgets";
import { DealerSheet } from "./dealer-sheet";
import { displaySurvey } from "./map-notes";

const MapCanvas = lazy(() => import("./map-canvas").then((m) => ({ default: m.MapCanvas })));
type FilterId = "all" | "surveyed" | "unvisited" | "partial" | "deep" | "needsGps" | "noPhone" | "closed" | "authorised" | "trained" | "induction" | "dual";
const NEAR_LIMIT = 12;

function requestStandingFix(done?: (ok: boolean) => void) {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    done?.(false);
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      useField.getState().setGps({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      });
      done?.(true);
    },
    () => {
      const live = useField.getState();
      done?.(Boolean(live.gps && !live.gpsError && live.gps.accuracy < 800));
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 },
  );
}

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
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftAt, setDraftAt] = useState<{ lat: number; lng: number } | null>(null);
  const [detailUnits, setDetailUnits] = useState("");
  const [detailSqm, setDetailSqm] = useState("");
  const [detailAsp, setDetailAsp] = useState("");
  const draftRef = useRef<string | null>(null);
  const nameRef = useRef("");
  const phoneRef = useRef("");
  const unitsRef = useRef("");
  const sqmRef = useRef("");
  const aspRef = useRef("");
  const streetRef = useRef("");
  const pinLocked = useRef(false);
  const [streetPick, setStreetPick] = useState("");
  const [locBusy, setLocBusy] = useState(false);
  const [aiAdding, setAiAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [cluster, setCluster] = useState<Dealership[] | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [listMode, setListMode] = useState(false);
  const [editingCoords, setEditingCoords] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  const surveyByDealer = useMemo(() => {
    const live = new Map<string, (typeof snapshot.surveys)[number]["payload"]>();
    for (const s of snapshot.surveys) live.set(s.dealershipId, s.payload);
    const m = new Map<string, (typeof snapshot.surveys)[number]["payload"]>();
    for (const d of roster) {
      const merged = displaySurvey(d, live.get(d.id));
      if (merged) m.set(d.id, merged);
    }
    return m;
  }, [snapshot.surveys, roster]);
  const isDeep = (id: string) => isDeepDived(surveyByDealer.get(id));
  const isSurveyed = (d: Dealership) => isSurveyedShowroom(d.status, surveyByDealer.get(d.id));
  const isPartialBasic = (d: Dealership) => {
    if (d.status === "closed" || isDeep(d.id)) return false;
    if (d.status === "partial") return true;
    const p = surveyByDealer.get(d.id);
    if (!p) return false;
    return p.inventoryUnits != null || (p.mainBrands?.length ?? 0) > 0 || p.avgSellingPriceSar != null;
  };
  const counts = useMemo(() => {
    const all = roster;
    const c = { all: all.length, surveyed: 0, unvisited: 0, partial: 0, deep: 0, needsGps: 0, noPhone: 0, closed: 0, authorised: 0, walked: 0, completed: 0, trained: 0, induction: 0, dual: 0 };
    for (const d of all) {
      if (isSurveyed(d)) c.surveyed += 1;
      if (d.status === "not_visited") c.unvisited += 1;
      if (market === "shifa" ? isPartialBasic(d) : d.status === "partial") c.partial += 1;
      if (isDeep(d.id)) c.deep += 1;
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
  }, [roster, dualIds, market, surveyByDealer]);

  const brandsById = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const s of snapshot.surveys) m.set(s.dealershipId, s.payload.mainBrands ?? []);
    return m;
  }, [snapshot.surveys]);

  const dealers = useMemo(() => roster.filter((d) => {
    if (filter === "surveyed") return isSurveyed(d);
    if (filter === "unvisited") return d.status === "not_visited";
    if (filter === "partial") return market === "shifa" ? isPartialBasic(d) : d.status === "partial";
    if (filter === "deep") return isDeep(d.id);
    if (filter === "needsGps") return Boolean(d.flags.needsGps);
    if (filter === "noPhone") return !d.listedPhone.trim();
    if (filter === "closed") return d.status === "closed";
    if (filter === "authorised") return Boolean(d.flags.authorised);
    if (filter === "trained") return d.flags.trainingStage === "trained";
    if (filter === "induction") return Boolean(d.flags.trainingStage || d.flags.trainingPriority);
    if (filter === "dual") return dualIds.has(d.id);
    return true;
  }), [roster, filter, dualIds, market, surveyByDealer]);

  const selected = dealers.find((d) => d.id === selectedId) ?? snapshot.dealerships.find((d) => d.id === selectedId) ?? null;
  const survey = selected ? displaySurvey(selected, surveyFor(snapshot, selected.id)?.payload) : undefined;
  const partner = selected ? dualPartner(selected, snapshot.dealerships) : null;
  const partnerSurvey = partner ? surveyFor(snapshot, partner.id)?.payload : undefined;
  const mapDealers = useMemo(() => {
    const onMap = (d: Dealership) => !d.flags.unplaced && d.lat !== 0 && d.lng !== 0;
    const placed = dealers.filter(onMap);
    return selected && onMap(selected) && !placed.some((d) => d.id === selected.id) ? [...placed, selected] : placed;
  }, [dealers, selected]);
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
    return [...pool].sort((a, b) => {
      const au = Boolean(a.flags.unplaced || (a.lat === 0 && a.lng === 0));
      const bu = Boolean(b.flags.unplaced || (b.lat === 0 && b.lng === 0));
      if (au !== bu) return au ? 1 : -1;
      return haversineM(origin, a) - haversineM(origin, b);
    });
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
    const partial = dealers.filter((d) => d.status === "partial");
    const pool = (partial.length ? partial : dealers.filter((d) => d.status === "not_visited")).filter((d) => !d.flags.unplaced && d.lat !== 0 && d.lng !== 0);
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
  const pinPoint = draftAt ?? (gps && !gpsError && gps.accuracy < 800 ? { lat: gps.lat, lng: gps.lng } : null);
  const nearby = useMemo(() => {
    if (!adding || !pinPoint) return [];
    return nearestDealers(pinPoint, roster, { excludeId: draftId, radiusM: 140, limit: 5 });
  }, [adding, roster, pinPoint, draftId]);
  const streetNearby = nearby.find((x) => x.row.flags.street)?.row.flags.street ?? "";
  const sheetOpen = Boolean(selected || nearMe || planning || adding || cluster);
  const surveyedPct = counts.all ? Math.round((counts.surveyed / counts.all) * 100) : 0;
  const deepPct = counts.all ? Math.round((counts.deep / counts.all) * 100) : 0;
  function flyTo(d: { lat: number; lng: number }, zoom = 17) { setFocus({ lat: d.lat, lng: d.lng, zoom, nonce: Date.now(), padBottom: true }); }
  function exportListExcel() {
    const surveys = listRows.flatMap((d) => {
      const live = surveyFor(snapshot, d.id) ?? (d.flags.sdId ? surveyFor(snapshot, d.flags.sdId) : undefined);
      return live ? [{ ...live, dealershipId: d.id }] : [];
    });
    const xml = buildExcelXml(listRows, surveys, snapshot.photos);
    downloadBlob(`${market}-survey-${listRows.length}.xls`, "application/vnd.ms-excel", xml);
  }
  function pickDealer(id: string) {
    const d = roster.find((x) => x.id === id) ?? snapshot.dealerships.find((x) => x.id === id);
    setSelectedId(id); setEditingCoords(false); setNearMe(false); setCluster(null); setAdding(false);
    if (d) flyTo(d);
  }
  useEffect(() => {
    const q = search.trim();
    if (!q || listMode || selectedId) return;
    if (searchHits.length === 1 && searchHits[0].lat !== 0 && searchHits[0].lng !== 0 && !searchHits[0].flags.unplaced) flyTo(searchHits[0], 17);
  }, [search, searchHits, listMode, selectedId]);
  function onSelect(id: string) {
    if (planning) { setRouteIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])); return; }
    pickDealer(id);
  }
  function onCluster(items: Dealership[], lat: number, lng: number) { setSelectedId(null); setNearMe(false); setAdding(false); setCluster(items); flyTo({ lat, lng }, 17); }
  function openNear() { const next = !nearMe; setNearMe(next); setPlanning(false); setAdding(false); setCluster(null); setSelectedId(null); setListMode(false); if (next) flyTo(origin, 16); }
  function toggleList() { setListMode((v) => !v); setPlanning(false); setAdding(false); setNearMe(false); setCluster(null); setSelectedId(null); }
  function hasPin(d: Dealership) {
    return !d.flags.unplaced && d.lat !== 0 && d.lng !== 0;
  }
  function rowMeta(d: Dealership) {
    return hasPin(d) ? formatDistance(haversineM(origin, d)) : t.noPin;
  }
  function openAdd(prefill?: string) {
    const name = prefill?.trim() ?? "";
    nameRef.current = name;
    phoneRef.current = "";
    unitsRef.current = "";
    sqmRef.current = "";
    aspRef.current = "";
    streetRef.current = "";
    pinLocked.current = false;
    draftRef.current = null;
    setNewName(name);
    setNewPhone("");
    setDetailUnits("");
    setDetailSqm("");
    setDetailAsp("");
    setStreetPick("");
    setDraftId(null);
    setDraftAt(null);
    setLocBusy(true);
    setAdding(true); setNearMe(false); setPlanning(false); setCluster(null); setSelectedId(null); setListMode(false);
    const live = useField.getState();
    if (live.gps && !live.gpsError && live.gps.accuracy < 800) flyTo(live.gps, 18);
    requestStandingFix((ok) => {
      setLocBusy(false);
      if (!ok || pinLocked.current) return;
      const g = useField.getState().gps;
      if (g && g.accuracy < 800) flyTo(g, 18);
    });
  }
  function closeAdd() { setAdding(false); }
  async function saveDraft(at?: { lat: number; lng: number }) {
    const typed = nameRef.current.trim();
    if (!typed && !at && !draftRef.current) return;
    const id = draftRef.current ?? uid();
    draftRef.current = id;
    const snap = useField.getState().snapshot;
    const prev = snap.dealerships.find((d) => d.id === id);
    const liveGps = useField.getState().gps;
    const liveGpsOk = Boolean(liveGps && !useField.getState().gpsError && liveGps.accuracy < 800);
    const arabic = /[\u0600-\u06FF]/.test(typed);
    const nameEn = typed || prev?.nameEn || "New lot";
    const nameAr = (arabic ? typed : prev?.nameAr) || "";
    const already = Boolean(prev && !prev.flags.unplaced && prev.lat !== 0 && prev.lng !== 0);
    let lat = 0;
    let lng = 0;
    let placed = false;
    if (at) { lat = at.lat; lng = at.lng; placed = true; pinLocked.current = true; }
    else if (already && prev) { lat = prev.lat; lng = prev.lng; placed = true; }
    else if (liveGpsOk && liveGps && !pinLocked.current) { lat = liveGps.lat; lng = liveGps.lng; placed = true; }
    const now = new Date().toISOString();
    await upsertDealer({
      id,
      nameEn,
      nameAr,
      lat: placed ? lat : 0,
      lng: placed ? lng : 0,
      listedPhone: phoneRef.current.trim() || prev?.listedPhone || "",
      seedNote: prev?.seedNote || (market === "shifa" ? "Added in field · Al Shifa" : "Added in field"),
      status: prev?.status ?? "not_visited",
      createdAt: prev?.createdAt ?? now,
      updatedAt: now,
      flags: {
        ...(prev?.flags ?? {}),
        market,
        unplaced: !placed,
        needsGps: !placed,
        gpsSource: at ? "manual_pin" : placed && !already ? "field_device_gps" : prev?.flags.gpsSource,
        gpsStatus: placed ? "confirmed" : "unresolved",
        gpsTimestamp: placed ? now : prev?.flags.gpsTimestamp,
        mapsUrl: placed ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : "",
        street: streetRef.current || prev?.flags.street,
      },
    });
    setDraftId(id);
    if (placed) { setDraftAt({ lat, lng }); flyTo({ lat, lng }, 18); }
  }
  function acceptStreet(street: string) {
    streetRef.current = street;
    setStreetPick(street);
    const id = draftRef.current;
    if (!id) return;
    const prev = useField.getState().snapshot.dealerships.find((d) => d.id === id);
    if (!prev) return;
    void upsertDealer({ ...prev, flags: { ...prev.flags, street }, updatedAt: new Date().toISOString() });
  }
  useEffect(() => {
    if (!adding || pinLocked.current || !draftRef.current) return;
    if (!gps || gpsError || gps.accuracy >= 800) return;
    const prev = useField.getState().snapshot.dealerships.find((d) => d.id === draftRef.current);
    if (!prev?.flags.unplaced) return;
    void saveDraft();
  }, [adding, gps, gpsError]);
  async function saveDraftDetails() {
    const id = draftRef.current;
    if (!id) return;
    const units = unitsRef.current.trim();
    const sqm = sqmRef.current.trim();
    const aspRaw = aspRef.current.trim();
    const patch: Partial<import("@/lib/types").SurveyPayload> = {};
    if (units && Number.isFinite(Number(units))) patch.inventoryUnits = Number(units);
    if (sqm && Number.isFinite(Number(sqm))) patch.showroomSizeSqm = Number(sqm);
    if (aspRaw && Number.isFinite(Number(aspRaw))) {
      const asp = Number(aspRaw);
      patch.avgSellingPriceSar = asp < 1000 ? Math.round(asp * 1000) : asp;
    }
    if (market === "shifa" && Object.keys(patch).length) patch.vehicleType = "used_only";
    if (Object.keys(patch).length) await patchSurvey(id, patch, 0);
    const phone = phoneRef.current.trim();
    if (!phone) return;
    const prev = useField.getState().snapshot.dealerships.find((d) => d.id === id);
    if (prev && prev.listedPhone !== phone) {
      await upsertDealer({ ...prev, listedPhone: phone, updatedAt: new Date().toISOString() });
    }
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
  const qadisiyahFilters: { id: FilterId; label: string; count: number }[] = [
    { id: "dual", label: t.bothMarkets, count: counts.dual },
    { id: "unvisited", label: t.unvisited, count: counts.unvisited }, { id: "partial", label: t.partialFilter, count: counts.partial },
    { id: "needsGps", label: t.needsGps, count: counts.needsGps }, { id: "noPhone", label: t.noPhoneFilter, count: counts.noPhone },
    { id: "closed", label: t.closedFilter, count: counts.closed }, { id: "authorised", label: t.authFilter, count: counts.authorised },
    { id: "trained", label: t.trainedFilter, count: counts.trained }, { id: "induction", label: t.inductionFilter, count: counts.induction },
  ];
  const shifaFilters: { id: FilterId; label: string; count: number }[] = [
    { id: "dual", label: t.bothMarkets, count: counts.dual },
    { id: "partial", label: t.partialFilter, count: counts.partial },
    { id: "closed", label: t.closedFilter, count: counts.closed },
  ];
  const filters = market === "shifa" ? shifaFilters : qadisiyahFilters;

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-bg">
      <div className="qads-map-host relative z-0 min-h-0 flex-1">
        <ClientOnly fallback={<div className="grid h-full place-items-center text-sm text-muted">Loading map…</div>}>
          <Suspense fallback={<div className="grid h-full place-items-center text-sm text-muted">Loading map…</div>}>
            <MapCanvas key={market} dealers={mapDealers} selectedId={selectedId} highlightIds={search.trim() ? searchHits.map((d) => d.id) : []} onSelect={onSelect} onMapClick={adding ? (lat, lng) => void saveDraft({ lat, lng }) : undefined} onCluster={onCluster} satellite={satellite} me={gps} route={routeDealers} focus={focus} origin={marketCenter} dualIds={dualIds} showDualLabels={market === "shifa" && filter === "dual"} />
          </Suspense>
        </ClientOnly>
        <div className="qads-vignette" aria-hidden />
      </div>
      {listMode ? <div className="absolute inset-0 z-10 bg-bg" aria-hidden /> : null}
      <div className={cn("pointer-events-none absolute inset-x-3 top-2 z-20 flex items-start gap-2", listMode && "bottom-3")}>
        <div className={cn("flex min-w-0 flex-1 flex-col gap-2", listMode && "min-h-0 self-stretch")}>
          <div className="pointer-events-auto relative z-30 min-w-0">
            <div className="qads-hud rounded-2xl p-1">
              <div className="relative">
                <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <input className="min-h-11 w-full bg-transparent pe-11 ps-10 text-sm text-fg placeholder:text-faint focus-visible:outline-none" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.searchShowrooms} enterKeyHint="search" />
                {search ? <button type="button" onClick={() => setSearch("")} className="absolute end-0.5 top-1/2 grid size-10 -translate-y-1/2 place-items-center text-muted" aria-label={t.clearSearch}><X className="size-4" /></button> : null}
              </div>
            </div>
            {search.trim() && !planning && !adding && !listMode && !selected ? (
              <div className="qads-sheet relative z-30 mt-1 max-h-56 overflow-auto rounded-2xl p-1">
                {searchHits.length === 0 ? (
                  <div className="px-2 py-2"><p className="px-1 py-2 text-sm text-muted">{t.noShowroomMatch}</p><Button data-add="1" size="sm" className="w-full" onClick={() => openAdd(search)}><MapPinPlus className="size-4" />{t.addThisLot}</Button></div>
                ) : searchHits.map((d) => <DealerRow key={d.id} dealer={d} dual={dualIds.has(d.id)} subtitle={[d.flags.sdId, dualIds.has(d.id) ? t.bothMarkets : null, hasPin(d) ? (d.nameAr || d.listedPhone || d.flags.street) : t.noPin].filter(Boolean).join(" · ")} lang={lang} onClick={() => pickDealer(d.id)} />)}
              </div>
            ) : (
              <>
              <div className="grid grid-cols-3 gap-1">
                {([
                  ["all", t.pinsEstablished, counts.all],
                  ["surveyed", t.surveyedCat, counts.surveyed],
                  ["deep", t.deepDived, counts.deep],
                ] as const).map(([id, label, count]) => {
                  const on = filter === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setFilter(id)}
                      className={cn(
                        "cat-tile",
                        on && id === "deep" && "bg-status-amber text-primary-fg",
                        on && id === "surveyed" && "bg-primary text-primary-fg",
                        on && id === "all" && "bg-fg text-bg",
                        !on && "qads-hud text-fg",
                      )}
                    >
                      <span className="block text-base font-semibold tabular-nums leading-none tracking-tight">{count}</span>
                      <span className={cn("mt-0.5 block truncate text-xs font-medium", on ? "opacity-90" : "text-muted")}>{label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setFiltersOpen((v) => !v)}
                  className={cn(
                    "qads-chip shrink-0 rounded-full px-3 py-2 text-xs font-semibold",
                    filtersOpen || filters.some((f) => f.id === filter) ? "bg-primary text-primary-fg" : "qads-hud text-muted",
                  )}
                >
                  {t.filters}
                </button>
                {filtersOpen || filters.some((f) => f.id === filter) ? (
                  <div className="qads-chips flex min-w-0 flex-1 gap-1 overflow-x-auto">
                    {filters.map((f) => (
                      <button key={f.id} type="button" onClick={() => setFilter(f.id)} className={cn("qads-chip shrink-0 rounded-full px-3 py-2 text-xs font-semibold", filter === f.id ? "bg-primary text-primary-fg" : "qads-hud text-muted")}>
                        {f.label}<span className="ms-1.5 tabular-nums opacity-80">{f.count}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              </>
            )}
          </div>
          {listMode && !planning && !adding ? (
            <div data-list="1" className="pointer-events-auto qads-sheet mt-1 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <div><p className="text-sm font-semibold">{t.list}</p><p className="text-xs font-medium tabular-nums text-muted">{t.showing} <span className="text-fg">{listRows.length}</span></p></div>
                <button type="button" data-add="1" onClick={() => openAdd()} className="flex min-h-10 items-center gap-1 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-fg"><MapPinPlus className="size-3.5" />{t.addDealer}</button>
              </div>
              <div className={cn("min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-1 pb-1", selected && "pb-56")}>
                {listRows.length === 0 ? (
                  <div className="px-3 py-6"><p className="text-sm text-muted">{t.noShowroomMatch}</p><Button data-add="1" size="sm" className="mt-3 w-full" onClick={() => openAdd(search)}><MapPinPlus className="size-4" />{t.addThisLot}</Button></div>
                ) : listGroups ? listGroups.map((g) => (
                  <div key={g.key}><p className="sticky top-0 z-10 bg-surface px-3 py-1.5 text-xs font-semibold text-muted">{g.key}<span className="ms-1.5 tabular-nums opacity-80">{g.items.length}</span></p>{g.items.map((d) => <DealerRow key={d.id} dealer={d} lang={lang} dual={dualIds.has(d.id)} selected={d.id === selectedId} meta={rowMeta(d)} subtitle={[d.flags.sdId, dualIds.has(d.id) ? t.bothMarkets : null, hasPin(d) ? STATUS_LABEL[lang][d.status] : t.noPin].filter(Boolean).join(" · ")} onClick={() => pickDealer(d.id)} />)}</div>
                )) : listRows.map((d) => <DealerRow key={d.id} dealer={d} lang={lang} dual={dualIds.has(d.id)} selected={d.id === selectedId} meta={rowMeta(d)} subtitle={[d.flags.sdId, dualIds.has(d.id) ? t.bothMarkets : null, hasPin(d) ? STATUS_LABEL[lang][d.status] : t.noPin].filter(Boolean).join(" · ")} onClick={() => pickDealer(d.id)} />)}
              </div>
              <div className="border-t border-border px-3 py-2">
                <button type="button" onClick={exportListExcel} disabled={listRows.length === 0} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-fg disabled:opacity-40">
                  <FileSpreadsheet className="size-4" />{t.exportExcel}<span className="tabular-nums opacity-80">{listRows.length}</span>
                </button>
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
        <div className="qads-hud absolute inset-x-3 bottom-3 z-10 rounded-2xl px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <LegendDots />
            <p className="shrink-0 text-xs font-medium tabular-nums text-muted">{market === "shifa" ? <span className="me-2 font-semibold text-fg">{t.usedCarMarket}</span> : null}{filter === "all" ? <><span className="font-semibold text-fg">{counts.surveyed}</span>{` / `}<span className="font-semibold text-fg">{counts.all}</span></> : <>{t.showing} <span className="text-fg">{dealers.length}</span></>}</p>
          </div>
          <div className="relative mt-2 h-1 overflow-hidden rounded-full bg-surface-2">
            <div className="absolute inset-y-0 start-0 rounded-full bg-primary transition-[width] duration-300" style={{ width: `${filter === "all" ? surveyedPct : dealers.length && counts.all ? Math.round((dealers.length / counts.all) * 100) : 0}%` }} />
            {filter === "all" ? <div className="absolute inset-y-0 start-0 rounded-full bg-status-amber transition-[width] duration-300" style={{ width: `${deepPct}%` }} /> : null}
          </div>
          {nextDesk ? <button type="button" onClick={() => pickDealer(nextDesk.id)} className="mt-2 flex min-h-12 w-full items-center gap-2 rounded-xl bg-primary px-3 text-start text-primary-fg"><span className="shrink-0 text-xs font-semibold uppercase tracking-wide opacity-80">{t.nextDesk}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold">{lang === "ar" && nextDesk.nameAr ? nextDesk.nameAr : nextDesk.nameEn}</span><span className="shrink-0 text-xs tabular-nums opacity-80">{formatDistance(haversineM(origin, nextDesk))}</span><ChevronRight className="size-4 shrink-0" /></button> : null}
        </div>
      ) : null}
      {sheetOpen ? (
      <div className="qads-dock z-30 max-h-[48%] shrink-0 overflow-y-auto px-3 pb-2">
      {planning ? (
        <div className="qads-sheet rounded-2xl p-4">
          <div className="mb-2 flex items-center justify-between gap-2"><div><p className="text-sm font-semibold">{t.selectStops}</p><p className="text-xs tabular-nums text-muted">{routeDealers.length} {t.stops}{routeDealers.length ? ` · ${t.routeTotal} ${formatDistance(routeMeters)}` : ""}</p></div><button type="button" className="min-h-10 px-2 text-xs font-medium text-muted" onClick={() => setRouteIds([])}>{t.clearRoute}</button></div>
          <ol className="max-h-36 space-y-1 overflow-auto">{routeDealers.map((d, i) => { const prev = i === 0 ? origin : routeDealers[i - 1]; return <li key={d.id} className="flex items-center justify-between gap-2 text-sm"><span className="flex min-w-0 items-center gap-2"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-fg">{i + 1}</span><span className="min-w-0 truncate">{lang === "ar" && d.nameAr ? d.nameAr : d.nameEn}</span></span><span className="shrink-0 text-xs tabular-nums text-muted">{formatDistance(haversineM(prev, d))}</span></li>; })}</ol>
          <Button className="mt-3 w-full" variant="secondary" onClick={() => setPlanning(false)}>{t.donePlanning}</Button>
        </div>
      ) : null}
      {nearMe && !planning ? <ListSheet title={t.nearest} hint={gpsError ? t.usingCenter : undefined} onClose={() => setNearMe(false)}>{nearest.map((d) => <DealerRow key={d.id} dealer={d} lang={lang} dual={dualIds.has(d.id)} meta={formatDistance(haversineM(origin, d))} subtitle={[d.flags.sdId, dualIds.has(d.id) ? t.bothMarkets : null, STATUS_LABEL[lang][d.status]].filter(Boolean).join(" · ")} onClick={() => pickDealer(d.id)} />)}</ListSheet> : null}
      {cluster && !planning && !nearMe ? <ListSheet title={t.clusterHere} hint={`${cluster.length}`} onClose={() => setCluster(null)}>{[...cluster].sort((a, b) => haversineM(origin, a) - haversineM(origin, b)).map((d) => <DealerRow key={d.id} dealer={d} lang={lang} dual={dualIds.has(d.id)} meta={formatDistance(haversineM(origin, d))} subtitle={[d.flags.sdId, dualIds.has(d.id) ? t.bothMarkets : null, STATUS_LABEL[lang][d.status]].filter(Boolean).join(" · ")} onClick={() => pickDealer(d.id)} />)}</ListSheet> : null}
      {selected && !planning && !nearMe && !cluster ? <DealerSheet dealer={selected} partner={partner} partnerSurvey={partnerSurvey} distance={haversineM(origin, selected)} source={survey?.volumeFiguresAre} survey={survey} photos={snapshot.photos.filter((p) => p.dealershipId === selected.id)} canPinGps={Boolean(gps && !gpsError)} editingCoords={editingCoords} gps={gps && !gpsError ? gps : null} onClose={() => { setEditingCoords(false); setSelectedId(null); }} onSurvey={(id) => void navigate({ to: "/survey/$id", params: { id } })} onPinGps={() => void pinSelectedToGps()} onEditCoords={() => setEditingCoords(true)} onCancelCoords={() => setEditingCoords(false)} onSaveCoords={(lat, lng) => void saveSelectedCoords(lat, lng)} onMarkClosed={() => void markClosed(selected.id)} onOpenPartner={(p) => { pendingJump.current = p.id; setMarket(dealerMarket(p)); }} onOpenNearby={(id) => pickDealer(id)} /> : null}
      {adding ? (
        <div className="qads-sheet qads-add overflow-y-auto rounded-2xl p-3">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold tracking-tight">{t.addDealer}</p>
              <p className="text-xs text-muted">{draftId ? t.savedLot : t.addDealerHint}</p>
            </div>
            <button type="button" onClick={closeAdd} className="grid size-10 shrink-0 place-items-center" aria-label={t.cancel}><X className="size-4" /></button>
          </div>
          <Input
            autoFocus
            value={newName}
            onChange={(e) => { nameRef.current = e.target.value; setNewName(e.target.value); }}
            onBlur={() => void saveDraft()}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); } }}
            placeholder={t.name}
            enterKeyHint="done"
          />
          <p className="mt-2 text-xs text-muted">
            {locBusy ? t.fetchingGps : pinPoint && !draftAt ? `${t.stoodHere}${gps ? ` · ${Math.round(gps.accuracy)} m` : ""}` : t.dropPin}
            {draftAt ? ` · ${draftAt.lat.toFixed(5)}, ${draftAt.lng.toFixed(5)}` : draftId ? ` · ${t.noPin}` : ""}
          </p>
          {streetNearby && streetPick !== streetNearby ? (
            <button type="button" onClick={() => acceptStreet(streetNearby)} className="mt-2 flex min-h-11 w-full items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 text-start">
              <span className="min-w-0"><span className="block text-xs text-muted">{t.streetHint}</span><span className="block truncate text-sm font-semibold">{streetNearby}</span></span>
            </button>
          ) : streetPick ? <p className="mt-2 text-xs font-medium text-fg">{streetPick}</p> : null}
          {nearby.length ? (
            <div className="mt-2">
              <p className="text-xs font-semibold text-muted">{t.aroundHere}</p>
              {nearby.map(({ row, meters }) => (
                <button key={row.id} type="button" onClick={() => pickDealer(row.id)} className="flex min-h-11 w-full items-center justify-between gap-2 text-start">
                  <span className="min-w-0 truncate text-sm">{lang === "ar" && row.nameAr ? row.nameAr : row.nameEn}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted">{formatDistance(meters)}{meters < 28 ? ` · ${t.nearbyDup}` : ""}</span>
                </button>
              ))}
            </div>
          ) : null}
          {draftId ? (
            <div className="mt-3">
              <p className="text-xs text-muted">{t.detailsLater}</p>
              <div className="qads-chips mt-2 flex gap-2 overflow-x-auto pb-1">
                <input className="qads-mini" value={newPhone} inputMode="tel" placeholder={t.phone} onChange={(e) => { phoneRef.current = e.target.value; setNewPhone(e.target.value); }} onBlur={() => void saveDraft()} />
                <input className="qads-mini" value={detailUnits} inputMode="numeric" placeholder={t.floorCars} onChange={(e) => { unitsRef.current = e.target.value; setDetailUnits(e.target.value); }} onBlur={() => void saveDraftDetails()} />
                <input className="qads-mini" value={detailSqm} inputMode="decimal" placeholder={t.floorSqm} onChange={(e) => { sqmRef.current = e.target.value; setDetailSqm(e.target.value); }} onBlur={() => void saveDraftDetails()} />
                <input className="qads-mini" value={detailAsp} inputMode="decimal" placeholder={t.floorAsp} onChange={(e) => { aspRef.current = e.target.value; setDetailAsp(e.target.value); }} onBlur={() => void saveDraftDetails()} />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      </div>
      ) : null}
      {aiAdding ? <AiSurveySheet mode="new" dealershipId={null} onClose={() => setAiAdding(false)} onSaved={(id) => { setAiAdding(false); void navigate({ to: "/survey/$id", params: { id } }); }} /> : null}
    </div>
  );
}
