import { useNavigate } from "@tanstack/react-router";
import { COPY, STATUS_LABEL, trainingCopy } from "@/lib/i18n";
import { formatDistance, haversineM, MARKET_CENTERS, optimizeWalkOrder } from "@/lib/geo";
import { dealersInMarket, dealerMarket, dualPartner, isDualLocation } from "@/lib/markets";
import { cn, formatNumber, formatPct, formatSar, formatSarCompact, mapsLink, telLink, uid, waLink } from "@/lib/utils";
import type { Dealership, SurveyPayload } from "@/lib/types";
import { AiSurveySheet } from "@/components/ai/ai-survey-sheet";
import { Button } from "@/components/ui/button";
import { Input, StatusBadge, FigureBadge, TrainingBadge } from "@/components/ui/field";
import { ClientOnly } from "@/components/client-only";
import { useField, surveyFor } from "@/stores/field";
import { usePrefs } from "@/stores/prefs";
import { SHIFA_CORRIDOR_ORDER, SHIFA_PUBLIC_SNIPPETS, shifaCorridor } from "@/lib/shifa-seed";
import {
  MapPinPlus,
  LocateFixed,
  Route as RouteIcon,
  Satellite,
  Map as MapIcon,
  Search,
  X,
  Navigation,
  Phone,
  MessageCircle,
  MapPinned,
  Crosshair,
  List as ListIcon,
  Copy,
  Check,
  ChevronRight,
  Pencil,
} from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { MapFocus } from "./map-canvas";

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
    for (const d of snapshot.dealerships) {
      if (isDualLocation(d, snapshot.dealerships)) ids.add(d.id);
    }
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
    setCluster(null);
    setNearMe(false);
    setRouteIds([]);
    setFilter("all");
    setSearch("");
    const jump = pendingJump.current;
    pendingJump.current = null;
    if (jump) {
      const d = snapshot.dealerships.find((x) => x.id === jump);
      setSelectedId(jump);
      if (d) {
        setFocus({ lat: d.lat, lng: d.lng, zoom: 17, nonce: Date.now(), padBottom: true });
      }
      return;
    }
    setSelectedId(null);
    setFocus({
      lat: marketCenter.lat,
      lng: marketCenter.lng,
      zoom: marketCenter.zoom,
      nonce: Date.now(),
    });
  }, [market, marketCenter.lat, marketCenter.lng, marketCenter.zoom]);

  const counts = useMemo(() => {
    const all = roster;
    let unvisited = 0;
    let partial = 0;
    let needsGps = 0;
    let noPhone = 0;
    let closed = 0;
    let authorised = 0;
    let walked = 0;
    let completed = 0;
    let trained = 0;
    let induction = 0;
    let dual = 0;
    for (const d of all) {
      if (d.status === "not_visited") unvisited += 1;
      if (d.status === "partial") partial += 1;
      if (d.status === "completed") completed += 1;
      if (d.status === "closed") closed += 1;
      if (d.flags.needsGps) needsGps += 1;
      if (!d.listedPhone.trim()) noPhone += 1;
      if (d.flags.authorised) authorised += 1;
      if (d.status !== "not_visited" && d.status !== "competitor") walked += 1;
      if (d.flags.trainingStage === "trained") trained += 1;
      if (d.flags.trainingStage || d.flags.trainingPriority) induction += 1;
      if (dualIds.has(d.id)) dual += 1;
    }
    return { all: all.length, unvisited, partial, needsGps, noPhone, closed, authorised, walked, completed, trained, induction, dual };
  }, [roster, dualIds]);

  const brandsById = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const s of snapshot.surveys) m.set(s.dealershipId, s.payload.mainBrands ?? []);
    return m;
  }, [snapshot.surveys]);

  const dealers = useMemo(() => {
    return roster.filter((d) => {
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
    });
  }, [roster, filter, dualIds]);

  const selected =
    dealers.find((d) => d.id === selectedId) ?? snapshot.dealerships.find((d) => d.id === selectedId) ?? null;
  const survey = selected ? surveyFor(snapshot, selected.id) : undefined;
  const partner = selected ? dualPartner(selected, snapshot.dealerships) : null;
  const partnerSurvey = partner ? surveyFor(snapshot, partner.id)?.payload : undefined;

  const mapDealers = useMemo(() => {
    if (selected && !dealers.some((d) => d.id === selected.id)) return [...dealers, selected];
    return dealers;
  }, [dealers, selected]);

  const searchHits = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return roster
      .filter((d) => {
        const brands = (brandsById.get(d.id) ?? []).join(" ");
        return `${d.flags.sdId ?? ""} ${d.nameEn} ${d.nameAr} ${d.listedPhone} ${d.flags.street ?? ""} ${brands} ${d.flags.trainingStage ?? ""} ${d.flags.trainingNote ?? ""}`
          .toLowerCase()
          .includes(q);
      })
      .slice(0, 8);
  }, [roster, search, brandsById]);

  const nearest = useMemo(() => {
    return [...dealers]
      .sort((a, b) => haversineM(origin, a) - haversineM(origin, b))
      .slice(0, NEAR_LIMIT);
  }, [dealers, origin]);

  const listRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const pool = q
      ? dealers.filter((d) => {
          const brands = (brandsById.get(d.id) ?? []).join(" ");
          return `${d.flags.sdId ?? ""} ${d.nameEn} ${d.nameAr} ${d.listedPhone} ${d.flags.street ?? ""} ${brands} ${d.flags.trainingStage ?? ""} ${d.flags.trainingNote ?? ""}`
            .toLowerCase()
            .includes(q);
        })
      : dealers;
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
    const keys = [...buckets.keys()].sort((a, b) => {
      const order = SHIFA_CORRIDOR_ORDER as readonly string[];
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
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

  const routeDealers = useMemo(() => {
    const picked = dealers.filter((d) => routeIds.includes(d.id));
    return optimizeWalkOrder(origin, picked);
  }, [dealers, routeIds, origin]);

  const routeMeters = useMemo(() => {
    if (!routeDealers.length) return 0;
    let total = haversineM(origin, routeDealers[0]);
    for (let i = 1; i < routeDealers.length; i++) total += haversineM(routeDealers[i - 1], routeDealers[i]);
    return total;
  }, [origin, routeDealers]);

  const nearbyDupes = useMemo(() => {
    if (!adding) return [];
    return roster.filter((d) => haversineM(origin, d) < 40).slice(0, 3);
  }, [adding, roster, origin]);

  const sheetOpen = Boolean(selected || nearMe || planning || adding || cluster);
  const walkedPct = counts.all ? Math.round((counts.walked / counts.all) * 100) : 0;

  function flyTo(d: { lat: number; lng: number }, zoom = 17) {
    setFocus({ lat: d.lat, lng: d.lng, zoom, nonce: Date.now(), padBottom: true });
  }

  function pickDealer(id: string) {
    const d = roster.find((x) => x.id === id) ?? snapshot.dealerships.find((x) => x.id === id);
    setSelectedId(id);
    setEditingCoords(false);
    setNearMe(false);
    setCluster(null);
    setAdding(false);
    if (!listMode) setSearch("");
    if (d) flyTo(d);
  }

  function onSelect(id: string) {
    if (planning) {
      setRouteIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
      return;
    }
    pickDealer(id);
  }

  function onCluster(items: Dealership[], lat: number, lng: number) {
    setSelectedId(null);
    setNearMe(false);
    setAdding(false);
    setCluster(items);
    flyTo({ lat, lng }, 17);
  }

  function openNear() {
    const next = !nearMe;
    setNearMe(next);
    setPlanning(false);
    setAdding(false);
    setCluster(null);
    setSelectedId(null);
    setListMode(false);
    if (next) flyTo(origin, 16);
  }

  function toggleList() {
    setListMode((v) => !v);
    setPlanning(false);
    setAdding(false);
    setNearMe(false);
    setCluster(null);
    setSelectedId(null);
  }

  function openAdd(prefill?: string) {
    if (prefill?.trim()) setNewName(prefill.trim());
    setAdding(true);
    setNearMe(false);
    setPlanning(false);
    setCluster(null);
    setSelectedId(null);
    setListMode(false);
  }

  async function addDealer() {
    if (!newName.trim()) return;
    const hasFix = Boolean(gps && !gpsError);
    const dealer: Dealership = {
      id: uid(),
      nameEn: newName.trim(),
      nameAr: newNameAr.trim(),
      lat: origin.lat,
      lng: origin.lng,
      listedPhone: newPhone.trim(),
      seedNote: nearbyDupes.length
        ? `${t.possibleDup} ${nearbyDupes.map((d) => d.nameEn).join(", ")}`
        : market === "shifa"
          ? "Added in field · Al Shifa used-car lot"
          : "Added in field",
      status: "not_visited",
      flags: {
        gpsSource: hasFix ? "survey" : "interpolated",
        market,
        needsGps: !hasFix,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await upsertDealer(dealer);
    if (market === "shifa") {
      await patchSurvey(dealer.id, { vehicleType: "used_only", visitStatus: "not_visited" }, 0, "not_visited");
    }
    setAdding(false);
    setNewName("");
    setNewNameAr("");
    setNewPhone("");
    void navigate({ to: "/survey/$id", params: { id: dealer.id } });
  }

  async function pinSelectedToGps() {
    if (!selected || !gps || gpsError) return;
    await saveSelectedCoords(gps.lat, gps.lng, "field_device_gps");
  }

  async function saveSelectedCoords(
    lat: number,
    lng: number,
    source: NonNullable<Dealership["flags"]["gpsSource"]> = "manual_pin",
  ) {
    if (!selected) return;
    await upsertDealer({
      ...selected,
      lat,
      lng,
      flags: {
        ...selected.flags,
        needsGps: false,
        gpsSource: source,
        gpsStatus: "confirmed",
        gpsTimestamp: new Date().toISOString(),
        mapsUrl: `https://www.google.com/maps?q=${lat},${lng}`,
      },
      updatedAt: new Date().toISOString(),
    });
    setEditingCoords(false);
    setListMode(false);
    flyTo({ lat, lng }, 18);
  }

  async function markClosed(id: string) {
    await patchSurvey(id, { visitStatus: "closed" }, 0, "closed");
    const rest = dealers.filter((d) => d.id !== id && d.status === "not_visited");
    const nxt = rest.length
      ? rest.reduce((best, d) => (haversineM(origin, d) < haversineM(origin, best) ? d : best))
      : null;
    if (nxt) pickDealer(nxt.id);
    else setSelectedId(null);
  }

  const filters: { id: FilterId; label: string; count: number }[] = [
    { id: "all", label: t.filterAll, count: counts.all },
    { id: "dual", label: t.bothMarkets, count: counts.dual },
    { id: "unvisited", label: t.unvisited, count: counts.unvisited },
    { id: "partial", label: t.partialFilter, count: counts.partial },
    { id: "needsGps", label: t.needsGps, count: counts.needsGps },
    { id: "noPhone", label: t.noPhoneFilter, count: counts.noPhone },
    { id: "closed", label: t.closedFilter, count: counts.closed },
    { id: "authorised", label: t.authFilter, count: counts.authorised },
    { id: "trained", label: t.trainedFilter, count: counts.trained },
    { id: "induction", label: t.inductionFilter, count: counts.induction },
  ].filter((f): f is { id: FilterId; label: string; count: number } => {
    if (f.id === "all" || f.id === "dual") return true;
    if (market === "shifa" && f.count === 0) return false;
    return true;
  });

  return (
    <div className="relative min-h-0 flex-1">
      <div className="absolute inset-0 z-0 isolate">
        <ClientOnly fallback={<div className="grid h-full place-items-center text-sm text-muted">Loading map…</div>}>
          <Suspense fallback={<div className="grid h-full place-items-center text-sm text-muted">Loading map…</div>}>
            <MapCanvas
              key={market}
              dealers={mapDealers}
              selectedId={selectedId}
              onSelect={onSelect}
              onCluster={onCluster}
              satellite={satellite}
              me={gps}
              route={routeDealers}
              focus={focus}
              origin={marketCenter}
              dualIds={dualIds}
              showDualLabels={market === "shifa" && filter === "dual"}
            />
          </Suspense>
        </ClientOnly>
      </div>

      {listMode ? <div className="absolute inset-0 z-10 bg-bg" aria-hidden /> : null}

      <div className="pointer-events-none absolute inset-x-3 top-3 bottom-3 z-20 flex items-start gap-2">
        <div className={cn("flex min-w-0 flex-1 flex-col", listMode && "min-h-0 self-stretch")}>
          <div className="pointer-events-auto relative z-30 min-w-0">
            <div className="rounded-2xl bg-surface/95 p-1 shadow-[var(--shadow-border)] backdrop-blur-sm">
              <div className="relative">
                <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <input
                  className="min-h-11 w-full bg-transparent pe-11 ps-10 text-sm text-fg placeholder:text-faint focus-visible:outline-none"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.searchShowrooms}
                  enterKeyHint="search"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute end-0.5 top-1/2 grid size-10 -translate-y-1/2 place-items-center text-muted"
                    aria-label={t.clearSearch}
                  >
                    <X className="size-4" />
                  </button>
                ) : null}
              </div>
            </div>
            {search.trim() && !planning && !adding && !listMode ? (
              <div className="qads-sheet relative z-30 mt-1 max-h-56 overflow-auto rounded-2xl bg-surface p-1 shadow-[var(--shadow-lift)]">
                {searchHits.length === 0 ? (
                  <div className="px-2 py-2">
                    <p className="px-1 py-2 text-sm text-muted">{t.noShowroomMatch}</p>
                    <Button
                      data-add="1"
                      size="sm"
                      className="w-full"
                      onClick={() => openAdd(search)}
                    >
                      <MapPinPlus className="size-4" />
                      {t.addThisLot}
                    </Button>
                  </div>
                ) : (
                  searchHits.map((d) => (
                    <DealerRow
                      key={d.id}
                      dealer={d}
                      dual={dualIds.has(d.id)}
                      subtitle={[d.flags.sdId, dualIds.has(d.id) ? t.bothMarkets : null, d.nameAr || d.listedPhone || d.flags.street]
                        .filter(Boolean)
                        .join(" · ")}
                      lang={lang}
                      onClick={() => pickDealer(d.id)}
                    />
                  ))
                )}
              </div>
            ) : (
              <div className="qads-chips mt-1 flex min-w-0 gap-1 overflow-x-auto pb-0.5">
                {filters.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilter(f.id)}
                    className={cn(
                      "shrink-0 rounded-full px-3 py-2 text-xs font-semibold shadow-[var(--shadow-border)]",
                      filter === f.id ? "bg-primary text-primary-fg" : "bg-surface/95 text-muted backdrop-blur-sm",
                    )}
                  >
                    {f.label}
                    <span className="ms-1.5 tabular-nums opacity-80">{f.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {listMode && !planning && !adding ? (
            <div
              data-list="1"
              className="pointer-events-auto qads-sheet mt-1 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-surface shadow-[var(--shadow-lift)]"
            >
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold">{t.list}</p>
                  <p className="text-xs font-medium tabular-nums text-muted">
                    {t.showing} <span className="text-fg">{listRows.length}</span>
                  </p>
                </div>
                <button
                  type="button"
                  data-add="1"
                  onClick={() => openAdd()}
                  className="flex min-h-10 items-center gap-1 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-fg"
                >
                  <MapPinPlus className="size-3.5" />
                  {t.addDealer}
                </button>
              </div>
              <div className={cn("min-h-0 flex-1 overflow-auto px-1 pb-1", selected && "pb-56")}>
                {listRows.length === 0 ? (
                  <div className="px-3 py-6">
                    <p className="text-sm text-muted">{t.noShowroomMatch}</p>
                    <Button
                      data-add="1"
                      size="sm"
                      className="mt-3 w-full"
                      onClick={() => openAdd(search)}
                    >
                      <MapPinPlus className="size-4" />
                      {t.addThisLot}
                    </Button>
                  </div>
                ) : listGroups ? (
                  listGroups.map((g) => (
                    <div key={g.key}>
                      <p className="sticky top-0 z-10 bg-surface px-3 py-1.5 text-xs font-semibold text-muted">
                        {g.key}
                        <span className="ms-1.5 tabular-nums opacity-80">{g.items.length}</span>
                      </p>
                      {g.items.map((d) => (
                        <DealerRow
                          key={d.id}
                          dealer={d}
                          lang={lang}
                          dual={dualIds.has(d.id)}
                          selected={d.id === selectedId}
                          meta={formatDistance(haversineM(origin, d))}
                          subtitle={[d.flags.sdId, dualIds.has(d.id) ? t.bothMarkets : null, STATUS_LABEL[lang][d.status]]
                            .filter(Boolean)
                            .join(" · ")}
                          onClick={() => pickDealer(d.id)}
                        />
                      ))}
                    </div>
                  ))
                ) : (
                  listRows.map((d) => (
                    <DealerRow
                      key={d.id}
                      dealer={d}
                      lang={lang}
                      dual={dualIds.has(d.id)}
                      selected={d.id === selectedId}
                      meta={formatDistance(haversineM(origin, d))}
                      subtitle={[d.flags.sdId, dualIds.has(d.id) ? t.bothMarkets : null, STATUS_LABEL[lang][d.status]]
                        .filter(Boolean)
                        .join(" · ")}
                      onClick={() => pickDealer(d.id)}
                    />
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="pointer-events-auto flex shrink-0 flex-col rounded-2xl bg-surface/95 p-1 shadow-[var(--shadow-border)] backdrop-blur-sm">
          <IconTool
            label={t.locateMe}
            active={nearMe}
            onClick={openNear}
          >
            <LocateFixed className="size-4" />
          </IconTool>
          <IconTool
            label={satellite ? t.streets : t.satellite}
            active={satellite}
            onClick={() => setSatellite((v) => !v)}
          >
            {satellite ? <MapIcon className="size-4" /> : <Satellite className="size-4" />}
          </IconTool>
          <IconTool label={t.list} active={listMode} onClick={toggleList}>
            <ListIcon className="size-4" />
          </IconTool>
          <IconTool
            label={t.planRoute}
            active={planning}
            onClick={() => {
              setPlanning((v) => !v);
              setNearMe(false);
              setAdding(false);
              setCluster(null);
              setSelectedId(null);
              setListMode(false);
            }}
          >
            <RouteIcon className="size-4" />
          </IconTool>
          <IconTool
            label={t.addDealer}
            active={adding}
            onClick={() => openAdd()}
          >
            <MapPinPlus className="size-4" />
          </IconTool>
        </div>
      </div>

      {!sheetOpen && !listMode ? (
        <div className="absolute inset-x-3 bottom-3 z-10 rounded-2xl bg-surface/95 p-3 shadow-[var(--shadow-border)] backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <LegendDots />
            <p className="shrink-0 text-xs font-medium tabular-nums text-muted">
              {market === "shifa" ? <span className="me-2 font-semibold text-fg">{t.usedCarMarket}</span> : null}
              {filter === "all" ? (
                <>
                  <span className="text-fg">{counts.walked}</span>
                  {` / ${counts.all} ${t.walkedOf}`}
                </>
              ) : (
                <>
                  {t.showing} <span className="text-fg">{dealers.length}</span>
                </>
              )}
            </p>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${filter === "all" ? walkedPct : dealers.length && counts.all ? Math.round((dealers.length / counts.all) * 100) : 0}%` }}
            />
          </div>
          {nextDesk ? (
            <button
              type="button"
              onClick={() => pickDealer(nextDesk.id)}
              className="mt-2 flex min-h-11 w-full items-center gap-2 rounded-xl bg-surface-2 px-2 text-start"
            >
              <span className="text-xs font-semibold text-primary">{t.nextDesk}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
                {lang === "ar" && nextDesk.nameAr ? nextDesk.nameAr : nextDesk.nameEn}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-muted">{formatDistance(haversineM(origin, nextDesk))}</span>
              <ChevronRight className="size-4 shrink-0 text-muted" />
            </button>
          ) : null}
          <Button data-add="1" className="mt-2 w-full" size="sm" onClick={() => openAdd()}>
            <MapPinPlus className="size-4" />
            {t.addDealer}
          </Button>
        </div>
      ) : null}

      {planning ? (
        <div className="qads-sheet absolute inset-x-3 bottom-3 z-30 rounded-2xl bg-surface p-4 shadow-[var(--shadow-lift)]">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{t.selectStops}</p>
              <p className="text-xs tabular-nums text-muted">
                {routeDealers.length} {t.stops}
                {routeDealers.length ? ` · ${t.routeTotal} ${formatDistance(routeMeters)}` : ""}
              </p>
            </div>
            <button type="button" className="min-h-10 px-2 text-xs font-medium text-muted" onClick={() => setRouteIds([])}>
              {t.clearRoute}
            </button>
          </div>
          <ol className="max-h-36 space-y-1 overflow-auto">
            {routeDealers.map((d, i) => {
              const prev = i === 0 ? origin : routeDealers[i - 1];
              return (
                <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-fg">
                      {i + 1}
                    </span>
                    <span className="min-w-0 truncate">{lang === "ar" && d.nameAr ? d.nameAr : d.nameEn}</span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted">{formatDistance(haversineM(prev, d))}</span>
                </li>
              );
            })}
          </ol>
          <Button className="mt-3 w-full" variant="secondary" onClick={() => setPlanning(false)}>
            {t.donePlanning}
          </Button>
        </div>
      ) : null}

      {nearMe && !planning ? (
        <ListSheet
          title={t.nearest}
          hint={gpsError ? t.usingCenter : undefined}
          onClose={() => setNearMe(false)}
        >
          {nearest.map((d) => (
            <DealerRow
              key={d.id}
              dealer={d}
              lang={lang}
              dual={dualIds.has(d.id)}
              meta={formatDistance(haversineM(origin, d))}
              subtitle={[d.flags.sdId, dualIds.has(d.id) ? t.bothMarkets : null, STATUS_LABEL[lang][d.status]]
                .filter(Boolean)
                .join(" · ")}
              onClick={() => pickDealer(d.id)}
            />
          ))}
        </ListSheet>
      ) : null}

      {cluster && !planning && !nearMe ? (
        <ListSheet
          title={t.clusterHere}
          hint={`${cluster.length}`}
          onClose={() => setCluster(null)}
        >
          {[...cluster]
            .sort((a, b) => haversineM(origin, a) - haversineM(origin, b))
            .map((d) => (
              <DealerRow
                key={d.id}
                dealer={d}
                lang={lang}
                dual={dualIds.has(d.id)}
                meta={formatDistance(haversineM(origin, d))}
                subtitle={[d.flags.sdId, dualIds.has(d.id) ? t.bothMarkets : null, STATUS_LABEL[lang][d.status]]
                  .filter(Boolean)
                  .join(" · ")}
                onClick={() => pickDealer(d.id)}
              />
            ))}
        </ListSheet>
      ) : null}

      {selected && !planning && !nearMe && !cluster ? (
        <DealerSheet
          dealer={selected}
          partner={partner}
          partnerSurvey={partnerSurvey}
          distance={haversineM(origin, selected)}
          source={survey?.payload.volumeFiguresAre}
          survey={survey?.payload}
          canPinGps={Boolean(gps && !gpsError)}
          editingCoords={editingCoords}
          gps={gps && !gpsError ? gps : null}
          onClose={() => {
            setEditingCoords(false);
            setSelectedId(null);
          }}
          onSurvey={(id) => void navigate({ to: "/survey/$id", params: { id } })}
          onPinGps={() => void pinSelectedToGps()}
          onEditCoords={() => setEditingCoords(true)}
          onCancelCoords={() => setEditingCoords(false)}
          onSaveCoords={(lat, lng) => void saveSelectedCoords(lat, lng)}
          onMarkClosed={() => void markClosed(selected.id)}
          onOpenPartner={(p) => {
            pendingJump.current = p.id;
            setMarket(dealerMarket(p));
          }}
        />
      ) : null}

      {adding ? (
        <div className="qads-sheet absolute inset-x-3 bottom-3 z-30 rounded-2xl bg-surface p-4 shadow-[var(--shadow-lift)]">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <p className="text-base font-semibold tracking-tight">{t.addDealer}</p>
              <p className="text-xs text-muted">{t.addDealerHint}</p>
              <p className="mt-1 text-xs text-muted">{gps && !gpsError ? t.pinningGps : t.usingCenter}</p>
              {market === "shifa" ? <p className="mt-1 text-xs text-muted">{t.usedOnlyDefault}</p> : null}
            </div>
            <button type="button" onClick={() => setAdding(false)} className="grid size-10 shrink-0 place-items-center">
              <X className="size-4" />
            </button>
          </div>
          {nearbyDupes.length ? (
            <p className="mb-2 rounded-xl bg-status-amber/10 px-3 py-2 text-xs text-status-amber">
              {t.nearbyDup}: {nearbyDupes.map((d) => d.nameEn).join(", ")}
            </p>
          ) : null}
          <div className="flex flex-col gap-2">
            <Input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t.nameEn} />
            <Input dir="rtl" value={newNameAr} onChange={(e) => setNewNameAr(e.target.value)} placeholder={t.nameAr} />
            <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder={t.phone} type="tel" />
            <Button data-save-survey="1" onClick={() => void addDealer()} disabled={!newName.trim()}>
              {t.saveAndSurvey}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setAdding(false);
                setAiAdding(true);
              }}
            >
              {t.aiSurveyNewTitle}
            </Button>
          </div>
        </div>
      ) : null}

      {aiAdding ? (
        <AiSurveySheet
          mode="new"
          dealershipId={null}
          onClose={() => setAiAdding(false)}
          onSaved={(id) => {
            setAiAdding(false);
            void navigate({ to: "/survey/$id", params: { id } });
          }}
        />
      ) : null}
    </div>
  );
}

function IconTool({
  children,
  label,
  active,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "grid size-11 place-items-center rounded-xl transition-colors duration-150",
        active ? "bg-primary text-primary-fg" : "text-fg hover:bg-surface-2",
      )}
    >
      {children}
    </button>
  );
}

function LegendDots() {
  const items = [
    ["not_visited", "Not visited"],
    ["partial", "Partial"],
    ["completed", "Complete"],
    ["closed", "Closed"],
    ["competitor", "Competitor"],
  ] as const;
  return (
    <div className="flex items-center gap-2">
      {items.map(([k, label]) => (
        <span key={k} className="flex items-center gap-1" title={label}>
          <span className={cn("qads-pin qads-pin-sm", `qads-pin-${k}`)} />
        </span>
      ))}
      <span className="flex items-center gap-1" title="Both markets">
        <span className="qads-pin qads-pin-sm qads-pin-not_visited qads-pin-dual" />
      </span>
    </div>
  );
}

function ListSheet({
  title,
  hint,
  onClose,
  children,
}: {
  title: string;
  hint?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="qads-sheet absolute inset-x-3 bottom-3 z-20 max-h-[48vh] overflow-auto rounded-2xl bg-surface p-2 shadow-[var(--shadow-lift)]">
      <div className="mb-1 flex items-center justify-between px-2 pt-1">
        <p className="text-sm font-semibold">
          {title}
          {hint ? <span className="ms-2 text-xs font-medium tabular-nums text-muted">{hint}</span> : null}
        </p>
        <button type="button" onClick={onClose} className="grid size-10 place-items-center text-muted">
          <X className="size-4" />
        </button>
      </div>
      {children}
    </div>
  );
}

function DealerRow({
  dealer,
  lang,
  subtitle,
  meta,
  dual,
  selected,
  onClick,
}: {
  dealer: Dealership;
  lang: "en" | "ar";
  subtitle?: string;
  meta?: string;
  dual?: boolean;
  selected?: boolean;
  onClick: () => void;
}) {
  const name = lang === "ar" && dealer.nameAr ? dealer.nameAr : dealer.nameEn;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-11 w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition-colors duration-150 hover:bg-surface-2",
        selected && "bg-surface-2",
      )}
    >
      <span
        className={cn(
          "qads-pin shrink-0",
          `qads-pin-${dealer.status}`,
          dealer.flags.trainingStage === "trained" && "qads-pin-trained",
          dual && "qads-pin-dual",
        )}
      />
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-sm font-medium", dual && "text-primary")}>{name}</span>
        {subtitle ? <span className="block truncate text-xs text-muted">{subtitle}</span> : null}
      </span>
      {meta ? <span className="shrink-0 text-xs tabular-nums text-muted">{meta}</span> : null}
    </button>
  );
}

function DealerSheet({
  dealer,
  partner,
  partnerSurvey,
  distance,
  source,
  survey,
  canPinGps,
  editingCoords,
  gps,
  onClose,
  onSurvey,
  onPinGps,
  onEditCoords,
  onCancelCoords,
  onSaveCoords,
  onMarkClosed,
  onOpenPartner,
}: {
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
  const relatedPaste =
    dealer.flags.market === "shifa" ? formatRelatedWalkedPaste(partner, partnerSurvey, t.relatedWalked) : null;
  const roughBody = collectRoughNotes({
    nameEn: dealer.nameEn,
    seedNote: dealer.seedNote,
    surveyNotes: survey?.notes,
    publicSnippet,
    lotPaste,
    relatedPaste,
  });

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
    try {
      await navigator.clipboard.writeText(roughBody);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div className="qads-sheet absolute inset-x-3 bottom-3 z-30 max-h-[52vh] overflow-auto rounded-2xl bg-surface p-4 shadow-[var(--shadow-lift)]">
      <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-surface-2" />
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          {dealer.flags.sdId ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{dealer.flags.sdId}</p>
          ) : null}
          <p className={cn("truncate text-base font-semibold tracking-tight", partner && "text-primary")}>
            {dealer.nameEn}
          </p>
          {dealer.nameAr ? (
            <p className="truncate text-sm text-muted" dir="rtl">
              {dealer.nameAr}
            </p>
          ) : null}
        </div>
        <button type="button" onClick={onClose} className="grid size-10 shrink-0 place-items-center">
          <X className="size-4" />
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={dealer.status} />
        {partner ? (
          <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-fg">
            {t.bothMarkets}
          </span>
        ) : null}
        <TrainingBadge
          stage={dealer.flags.trainingStage}
          priority={dealer.flags.trainingPriority}
          label={trainingCopy(lang, dealer.flags) ?? t.induction}
        />
        <span className="flex items-center gap-1 text-xs tabular-nums text-muted">
          <Navigation className="size-3" />
          {formatDistance(distance)}
        </span>
        {source ? <FigureBadge source={source} /> : null}
        {dealer.flags.credibility ? (
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold uppercase text-muted">
            {dealer.flags.credibility}
          </span>
        ) : null}
      </div>

      {editingCoords ? (
        <div className="mb-3 rounded-xl bg-surface-2 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t.location}</p>
          <p className="mt-1 text-xs text-muted">{t.coordsHint}</p>
          <Input
            className="mt-2 bg-surface"
            inputMode="decimal"
            autoFocus
            value={pasteDraft}
            onChange={(e) => {
              const v = e.target.value;
              setPasteDraft(v);
              const parsed = parseCoordPair(v);
              if (parsed) {
                setLatDraft(formatCoord(parsed.lat));
                setLngDraft(formatCoord(parsed.lng));
                setCoordError(false);
              }
            }}
            placeholder={t.pasteCoords}
            aria-label={t.pasteCoords}
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Input
              className="bg-surface"
              inputMode="decimal"
              value={latDraft}
              onChange={(e) => {
                setLatDraft(e.target.value);
                setCoordError(false);
              }}
              placeholder={t.latLabel}
              aria-label={t.latLabel}
            />
            <Input
              className="bg-surface"
              inputMode="decimal"
              value={lngDraft}
              onChange={(e) => {
                setLngDraft(e.target.value);
                setCoordError(false);
              }}
              placeholder={t.lngLabel}
              aria-label={t.lngLabel}
            />
          </div>
          {coordError ? <p className="mt-2 text-xs text-status-red">{t.coordsInvalid}</p> : null}
          {gps ? (
            <button
              type="button"
              onClick={() => {
                setLatDraft(formatCoord(gps.lat));
                setLngDraft(formatCoord(gps.lng));
                setPasteDraft(`${formatCoord(gps.lat)}, ${formatCoord(gps.lng)}`);
                setCoordError(false);
              }}
              className="mt-2 flex min-h-10 w-full items-center justify-center gap-2 text-sm font-medium text-primary"
            >
              <Crosshair className="size-4" />
              {t.pinToGps}
            </button>
          ) : null}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={onCancelCoords}>
              {t.cancel}
            </Button>
            <Button
              data-save="1"
              onClick={() => {
                const parsed = parseCoords(latDraft, lngDraft) ?? parseCoordPair(pasteDraft);
                if (!parsed) {
                  setCoordError(true);
                  return;
                }
                onSaveCoords(parsed.lat, parsed.lng);
              }}
            >
              {t.savePin}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onEditCoords}
          className="mb-3 flex min-h-12 w-full items-center gap-2 rounded-xl bg-surface-2 px-3 text-start"
        >
          <MapPinned className="size-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-muted">{t.location}</span>
            <span className="block truncate text-sm font-semibold tabular-nums text-fg">
              {formatCoord(dealer.lat)}, {formatCoord(dealer.lng)}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
            <Pencil className="size-3.5" />
            {t.editCoords}
          </span>
        </button>
      )}

      {dealer.flags.needsGps ? <p className="mb-2 text-xs text-status-amber">{t.confirmGps}</p> : null}
      {dealer.flags.market === "shifa" ? <p className="mb-2 text-xs text-muted">{t.usedCarMarket}</p> : null}
      {dealer.flags.competitor ? <p className="mb-2 text-xs text-status-purple">{t.competitor}</p> : null}
      {dealer.flags.complex ? <p className="mb-2 text-xs text-muted">{t.complex}</p> : null}
      {dealer.flags.authorised ? <p className="mb-2 text-xs text-muted">{t.authorised}</p> : null}
      {partner ? (
        <div className="mb-3 rounded-xl bg-primary/10 px-3 py-2">
          <p className="text-xs font-semibold text-primary">
            {dealerMarket(dealer) === "shifa" ? t.alsoInQadisiyah : t.alsoInShifa}
          </p>
          <p className="mt-0.5 truncate text-sm font-medium text-fg">
            {partner.flags.sdId ? `${partner.flags.sdId} · ` : ""}
            {lang === "ar" && partner.nameAr ? partner.nameAr : partner.nameEn}
          </p>
          <button
            type="button"
            className="mt-1 min-h-10 text-xs font-semibold text-primary"
            onClick={() => onOpenPartner(partner)}
          >
            {t.openOtherDesk}
          </button>
        </div>
      ) : dealer.flags.relatedSdId ? (
        <p className="mb-2 text-xs text-muted">
          {t.relatedDesk} {dealer.flags.relatedSdId}
        </p>
      ) : null}
      {dealer.flags.trainingNote ? <p className="mb-2 text-xs text-muted">{dealer.flags.trainingNote}</p> : null}
      {dealer.flags.failedSession ? (
        <p className="mb-2 text-xs text-status-red">
          {t.failedSession}: {dealer.flags.failedSession}
        </p>
      ) : null}
      {survey?.pocName ? (
        <p className="mb-2 text-xs text-muted">
          {survey.pocName}
          {survey.pocRole ? ` · ${survey.pocRole}` : ""}
        </p>
      ) : null}
      {dealer.flags.street ? <p className="mb-1 text-xs text-muted">{dealer.flags.street}</p> : null}
      {brands.length ? (
        <div className="mb-2 flex flex-wrap gap-1">
          {brands.map((b) => (
            <span key={b} className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
              {b}
            </span>
          ))}
        </div>
      ) : null}

      {stats.length ? (
        <div className={cn("mb-3 grid gap-1.5", stats.length >= 3 ? "grid-cols-3" : stats.length === 2 ? "grid-cols-2" : "grid-cols-1")}>
          {stats.slice(0, 6).map((s) => (
            <div key={s.k} className="rounded-xl bg-surface-2 px-2 py-2">
              <p className="truncate text-xs text-muted">{s.k}</p>
              <p className="truncate text-sm font-semibold tabular-nums tracking-tight">{s.v}</p>
            </div>
          ))}
        </div>
      ) : null}

      {roughBody ? (
        <div className="mb-3 rounded-xl bg-surface-2 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t.roughNotes}</p>
            <button
              type="button"
              onClick={() => void copyNotes()}
              className="flex min-h-10 items-center gap-1 px-1 text-xs font-semibold text-primary"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? t.copied : t.copyNotes}
            </button>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-fg">{roughBody}</p>
          {dealer.flags.market === "shifa" && dealer.status === "not_visited" && !/this Al Shifa lot is unwalked/i.test(roughBody) ? (
            <p className="mt-1 text-xs text-muted">{t.thisLotUnwalked}</p>
          ) : null}
        </div>
      ) : null}

      {dealer.listedPhone ? (
        <p className="mb-3 text-sm tabular-nums text-muted">{dealer.listedPhone}</p>
      ) : (
        <p className="mb-3 text-sm text-faint">{t.noPhone}</p>
      )}

      <div className="grid grid-cols-3 gap-2">
        <a
          href={maps}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl bg-surface-2 text-xs font-medium text-fg"
        >
          <MapPinned className="size-4" />
          {t.openMaps}
        </a>
        {call ? (
          <a
            href={call}
            className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl bg-surface-2 text-xs font-medium text-fg"
          >
            <Phone className="size-4" />
            {t.call}
          </a>
        ) : (
          <span className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-xs text-faint">
            <Phone className="size-4" />
            {t.call}
          </span>
        )}
        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl bg-surface-2 text-xs font-medium text-fg"
          >
            <MessageCircle className="size-4" />
            {t.whatsapp}
          </a>
        ) : (
          <span className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-xs text-faint">
            <MessageCircle className="size-4" />
            {t.whatsapp}
          </span>
        )}
      </div>

      {dealer.flags.needsGps && canPinGps ? (
        <button
          type="button"
          onClick={onPinGps}
          className="mt-2 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium text-primary"
        >
          <Crosshair className="size-4" />
          {t.pinToGps}
        </button>
      ) : null}

      <Button
        className="mt-2 w-full"
        disabled={dealer.status === "competitor"}
        onClick={() => onSurvey(dealer.id)}
      >
        {hasSurvey ? t.continueSurvey : t.startSurvey}
      </Button>
      {dealer.status === "not_visited" ? (
        <button
          type="button"
          onClick={onMarkClosed}
          className="mt-1 flex min-h-10 w-full items-center justify-center text-sm font-medium text-muted"
        >
          {t.markClosed}
        </button>
      ) : null}
    </div>
  );
}

function formatCoord(n: number) {
  return n.toFixed(6);
}

function parseCoordPair(raw: string): { lat: number; lng: number } | null {
  const nums = raw.replace(/[°NSEW]/gi, " ").match(/-?\d+(?:\.\d+)?/g);
  if (!nums || nums.length < 2) return null;
  const lat = Number(nums[0]);
  const lng = Number(nums[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

function parseCoords(latRaw: string, lngRaw: string): { lat: number; lng: number } | null {
  const fromPair = parseCoordPair(`${latRaw} ${lngRaw}`);
  if (fromPair) return fromPair;
  return parseCoordPair(latRaw) ?? parseCoordPair(lngRaw);
}

const RELATED_MARKER = /Related Qadisiyah desk|مكتب القادسية المرتبط/i;

function uniqueBlobs(...parts: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const t = (p ?? "").trim();
    if (!t) continue;
    const key = t.replace(/\s+/g, " ").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

function formatThisLotPaste(dealer: Dealership, survey?: SurveyPayload): string {
  const inv = survey?.inventoryUnits;
  const inside = survey?.inventoryInside;
  const outside = survey?.inventoryOutside;
  const size = survey?.showroomSizeSqm;
  const age = survey?.inventoryAgePctOver5;
  const lines = [dealer.nameEn];
  lines.push(`Inventory: ${inv != null ? formatNumber(inv) : "–"}`);
  if (inside != null) lines.push(`Inside: ${formatNumber(inside)}`);
  if (outside != null) lines.push(`Outside: ${formatNumber(outside)}`);
  lines.push(`Showroom size: ${size != null ? `${formatNumber(size)} m²` : "–"}`);
  if (inv != null && survey?.avgSellingPriceSar != null) {
    lines.push(`ASP: ${formatSar(survey.avgSellingPriceSar)}`);
  }
  if (inv != null && survey?.monthlySoldExact != null) {
    lines.push(`Monthly sold: ${formatNumber(survey.monthlySoldExact)}`);
  }
  if (age != null) {
    lines.push(`Age: ${age}% ≥5 yr / ${100 - age}% <5 yr`);
  }
  const mix =
    survey?.vehicleType === "used_only"
      ? "used"
      : survey?.vehicleType === "new_only"
        ? "new"
        : survey?.vehicleType === "mix"
          ? "mixed"
          : "";
  if (inv != null && mix) lines.push(`Type: ${mix}`);
  const brands = (survey?.mainBrands ?? []).filter(Boolean);
  if (brands.length) lines.push(`Brands: ${brands.join(", ")}`);
  return lines.join("\n");
}

function stripRelatedSection(text: string): string {
  return text
    .replace(/\n*Related Qadisiyah desk[\s\S]*$/i, "")
    .replace(/\n*مكتب القادسية المرتبط[\s\S]*$/i, "")
    .trim();
}

function stripLeadingLotPaste(text: string, nameEn: string): string {
  if (!nameEn) return text;
  const escaped = nameEn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `^${escaped}\\s*\\nInventory:\\s*[^\\n]*(?:\\nInside:\\s*[^\\n]*)?(?:\\nOutside:\\s*[^\\n]*)?\\nShowroom size:\\s*[^\\n]*(?:\\nASP:\\s*[^\\n]*)?(?:\\nMonthly sold:\\s*[^\\n]*)?(?:\\nAge:\\s*[^\\n]*)?(?:\\nType:\\s*[^\\n]*)?(?:\\nBrands:\\s*[^\\n]*)?\\n*`,
    "i",
  );
  return text.replace(re, "").trim();
}

function formatRelatedWalkedPaste(
  partner: Dealership | null,
  survey?: SurveyPayload,
  heading?: string,
): string | null {
  if (!partner || !survey) return null;
  const inv = survey.inventoryUnits;
  const size = survey.showroomSizeSqm;
  const asp = survey.avgSellingPriceSar;
  const sold = survey.monthlySoldExact;
  const brands = (survey.mainBrands ?? []).filter(Boolean);
  if (inv == null && size == null && asp == null && sold == null) return null;
  const lines = [
    heading || "Related Qadisiyah desk (walked – do not copy onto this lot)",
    `${partner.flags.sdId ?? ""} ${partner.nameEn}`.trim(),
  ];
  if (inv != null) lines.push(`Inventory: ${formatNumber(inv)}`);
  if (size != null) lines.push(`Showroom size: ${formatNumber(size)} m²`);
  if (asp != null) lines.push(`ASP: ${formatSar(asp)}`);
  if (sold != null) lines.push(`Monthly sold: ${formatNumber(sold)}`);
  if (brands.length) lines.push(`Brands: ${brands.join(", ")}`);
  return lines.join("\n");
}

function collectRoughNotes(opts: {
  nameEn?: string;
  seedNote?: string;
  surveyNotes?: string;
  publicSnippet?: string;
  lotPaste?: string;
  relatedPaste?: string | null;
}): string {
  const nameEn = opts.nameEn ?? "";
  const seed = (opts.seedNote ?? "").trim();
  const survey = (opts.surveyNotes ?? "").trim();
  const snippet = (opts.publicSnippet ?? "").trim();
  const skipSnippet =
    !snippet || seed.includes(snippet) || survey.includes(snippet);
  const mapping = uniqueBlobs(seed, survey, skipSnippet ? "" : snippet)
    .map((b) => stripLeadingLotPaste(stripRelatedSection(b), nameEn))
    .filter(Boolean);
  const mappingBody = uniqueBlobs(...mapping).join("\n\n");
  const parts: string[] = [];
  const lotPaste = opts.lotPaste?.trim() || "";
  if (lotPaste) parts.push(lotPaste);
  if (mappingBody) parts.push(mappingBody);
  const paste = opts.relatedPaste?.trim() || "";
  if (paste) parts.push(paste);
  return parts.join("\n\n");
}
