import { useNavigate } from "@tanstack/react-router";
import { COPY, STATUS_LABEL, trainingCopy } from "@/lib/i18n";
import { formatDistance, haversineM, MARKET_CENTERS, optimizeWalkOrder } from "@/lib/geo";
import { dealersInMarket, dealerMarket, dualPartner, isDualLocation } from "@/lib/markets";
import { cn, formatNumber, formatPct, formatSarCompact, mapsLink, telLink, uid, waLink } from "@/lib/utils";
import type { Dealership, SurveyPayload } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input, StatusBadge, FigureBadge, TrainingBadge } from "@/components/ui/field";
import { ClientOnly } from "@/components/client-only";
import { useField, surveyFor } from "@/stores/field";
import { usePrefs } from "@/stores/prefs";
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
  const [newName, setNewName] = useState("");
  const [newNameAr, setNewNameAr] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [cluster, setCluster] = useState<Dealership[] | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);

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
    setNearMe(false);
    setCluster(null);
    setAdding(false);
    setSearch("");
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
    if (next) flyTo(origin, 16);
  }

  async function addDealer() {
    if (!newName.trim()) return;
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
      flags: { gpsSource: "survey", market },
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
    setSelectedId(dealer.id);
    flyTo(dealer);
  }

  async function pinSelectedToGps() {
    if (!selected || !gps || gpsError) return;
    await upsertDealer({
      ...selected,
      lat: gps.lat,
      lng: gps.lng,
      flags: { ...selected.flags, needsGps: false, gpsSource: "survey" },
      updatedAt: new Date().toISOString(),
    });
    flyTo(gps);
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
  ];

  return (
    <div className="relative min-h-0 flex-1">
      <div className="absolute inset-0">
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
              showDualLabels={market === "shifa"}
            />
          </Suspense>
        </ClientOnly>
      </div>

      <div className="absolute inset-x-3 top-3 z-20 flex items-start gap-2">
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="relative z-30 min-w-0">
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
            {search.trim() && !planning && !adding ? (
              <div className="qads-sheet relative z-30 mt-1 max-h-56 overflow-auto rounded-2xl bg-surface p-1 shadow-[var(--shadow-lift)]">
                {searchHits.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-muted">{t.noShowroomMatch}</p>
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
        </div>

        <div className="flex shrink-0 flex-col rounded-2xl bg-surface/95 p-1 shadow-[var(--shadow-border)] backdrop-blur-sm">
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
          <IconTool
            label={t.planRoute}
            active={planning}
            onClick={() => {
              setPlanning((v) => !v);
              setNearMe(false);
              setAdding(false);
              setCluster(null);
              setSelectedId(null);
            }}
          >
            <RouteIcon className="size-4" />
          </IconTool>
          <IconTool
            label={t.addDealer}
            active={adding}
            onClick={() => {
              setAdding(true);
              setNearMe(false);
              setPlanning(false);
              setCluster(null);
              setSelectedId(null);
            }}
          >
            <MapPinPlus className="size-4" />
          </IconTool>
        </div>
      </div>

      {!sheetOpen ? (
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
        </div>
      ) : null}

      {planning ? (
        <div className="qads-sheet absolute inset-x-3 bottom-3 z-20 rounded-2xl bg-surface p-4 shadow-[var(--shadow-lift)]">
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
          partner={dualPartner(selected, snapshot.dealerships)}
          distance={haversineM(origin, selected)}
          source={survey?.payload.volumeFiguresAre}
          survey={survey?.payload}
          canPinGps={Boolean(gps && !gpsError)}
          onClose={() => setSelectedId(null)}
          onSurvey={(id) => void navigate({ to: "/survey/$id", params: { id } })}
          onPinGps={() => void pinSelectedToGps()}
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
            <Button onClick={() => void addDealer()} disabled={!newName.trim()}>
              {t.save}
            </Button>
          </div>
        </div>
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
  onClick,
}: {
  dealer: Dealership;
  lang: "en" | "ar";
  subtitle?: string;
  meta?: string;
  dual?: boolean;
  onClick: () => void;
}) {
  const name = lang === "ar" && dealer.nameAr ? dealer.nameAr : dealer.nameEn;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left transition-colors duration-150 hover:bg-surface-2"
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
  distance,
  source,
  survey,
  canPinGps,
  onClose,
  onSurvey,
  onPinGps,
  onOpenPartner,
}: {
  dealer: Dealership;
  partner: Dealership | null;
  distance: number;
  source?: string;
  survey?: SurveyPayload;
  canPinGps: boolean;
  onClose: () => void;
  onSurvey: (id: string) => void;
  onPinGps: () => void;
  onOpenPartner: (p: Dealership) => void;
}) {
  const { lang } = usePrefs();
  const t = COPY[lang];
  const call = telLink(dealer.listedPhone);
  const wa = waLink(dealer.listedPhone);
  const maps = dealer.flags.mapsUrl || mapsLink(dealer.lat, dealer.lng, dealer.nameEn);
  const hasSurvey = dealer.status !== "not_visited";
  const brands = (survey?.mainBrands ?? []).slice(0, 4);

  const stats = [
    survey?.inventoryUnits != null ? { k: t.stock, v: formatNumber(survey.inventoryUnits) } : null,
    survey?.monthlySoldExact != null ? { k: t.soldMo, v: formatNumber(survey.monthlySoldExact) } : null,
    survey?.avgSellingPriceSar != null ? { k: "ASP", v: formatSarCompact(survey.avgSellingPriceSar) } : null,
    survey?.showroomSizeSqm != null ? { k: t.sizeSqm, v: `${formatNumber(survey.showroomSizeSqm)} m²` } : null,
    survey?.fpr != null ? { k: "FPR", v: formatPct(survey.fpr * 100) } : null,
  ].filter(Boolean) as { k: string; v: string }[];

  return (
    <div className="qads-sheet absolute inset-x-3 bottom-3 z-20 max-h-[52vh] overflow-auto rounded-2xl bg-surface p-4 shadow-[var(--shadow-lift)]">
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
          {stats.slice(0, 3).map((s) => (
            <div key={s.k} className="rounded-xl bg-surface-2 px-2 py-2">
              <p className="truncate text-xs text-muted">{s.k}</p>
              <p className="truncate text-sm font-semibold tabular-nums tracking-tight">{s.v}</p>
            </div>
          ))}
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
    </div>
  );
}
