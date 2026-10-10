import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { Circle, MapContainer, Marker, Polyline, ScaleControl, TileLayer, Tooltip, useMap, useMapEvents, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "@/styles-pins.css";
import { MAP_MAX_ZOOM, MAP_MIN_ZOOM, MARKET_CENTER } from "@/lib/geo";
import { dealerSerials, pinBox } from "@/lib/serial";
import type { Dealership } from "@/lib/types";

export type MapFocus = {
  lat: number;
  lng: number;
  zoom?: number;
  nonce: number;
  padBottom?: boolean;
};

const iconCache = new Map<string, L.DivIcon>();

const TILE = {
  minZoom: MAP_MIN_ZOOM,
  maxZoom: MAP_MAX_ZOOM,
  maxNativeZoom: 19,
  keepBuffer: 12,
  updateWhenZooming: true,
  updateWhenIdle: true,
  detectRetina: false as const,
};

const ESRI_STREET =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}";
const ESRI_SAT =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const OSM = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

function MapClick({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (!onClick) return;
      const origin = e.originalEvent?.target as HTMLElement | null;
      if (origin?.closest?.(".leaflet-marker-icon, .qads-pin-num, .leaflet-control")) return;
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function statusFill(status: string): string {
  if (status === "completed") return "var(--status-green)";
  if (status === "partial") return "var(--status-amber)";
  if (status === "competitor") return "var(--status-purple)";
  if (status === "refused" || status === "closed") return "var(--status-red)";
  return "var(--status-grey)";
}

function numberedIcon(
  status: string,
  n: number,
  selected: boolean,
  trained = false,
  dual = false,
  hit = false,
  dim = false,
) {
  const key = `n:${status}:${n}:${selected ? 1 : 0}:${trained ? 1 : 0}:${dual ? 1 : 0}:${hit ? 1 : 0}:${dim ? 1 : 0}`;
  const cached = iconCache.get(key);
  if (cached) return cached;
  const { w, h } = pinBox(n, selected || hit);
  const icon = L.divIcon({
    className: "",
    html: `<div class="qads-pin-num${selected ? " qads-pin-selected" : ""}${hit ? " qads-pin-hit" : ""}${dim ? " qads-pin-dim" : ""}">${n}</div>`,
    iconSize: [w, h],
    iconAnchor: [w / 2, h / 2],
  });
  iconCache.set(key, icon);
  return icon;
}

function routeIcon(n: number) {
  const key = `r:${n}`;
  const hit = iconCache.get(key);
  if (hit) return hit;
  const icon = L.divIcon({
    className: "",
    html: `<div class="qads-pin-num">${n}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
  iconCache.set(key, icon);
  return icon;
}

function clusterIcon(n: number) {
  const size = Math.round(Math.min(40, 28 + Math.log2(n) * 3));
  const key = `c:${n}:${size}`;
  const hit = iconCache.get(key);
  if (hit) return hit;
  const icon = L.divIcon({
    className: "",
    html: `<div class="qads-cluster" style="width:${size}px;height:${size}px">${n}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
  iconCache.set(key, icon);
  return icon;
}

/** Pixel radius inside which pins fold into one bubble. Pins are 26px wide. */
const CLUSTER_PX = 42;
/** From this zoom up every pin is drawn on its own. */
const CLUSTER_OFF_ZOOM = 18;

type PinGroup = { key: string; lat: number; lng: number; items: Dealership[] };

/** Greedy screen-space grouping: only pins that would overlap are folded. */
function groupPins(map: L.Map, items: Dealership[], zoom: number): PinGroup[] {
  if (zoom >= CLUSTER_OFF_ZOOM) return items.map((d) => ({ key: d.id, lat: d.lat, lng: d.lng, items: [d] }));
  const groups: { x: number; y: number; items: Dealership[] }[] = [];
  const cell = new Map<string, number[]>();
  for (const d of items) {
    const p = map.project([d.lat, d.lng], zoom);
    const cx = Math.floor(p.x / CLUSTER_PX);
    const cy = Math.floor(p.y / CLUSTER_PX);
    let joined = -1;
    for (let dx = -1; dx <= 1 && joined < 0; dx++) {
      for (let dy = -1; dy <= 1 && joined < 0; dy++) {
        for (const gi of cell.get(`${cx + dx}:${cy + dy}`) ?? []) {
          const g = groups[gi];
          if (Math.hypot(g.x - p.x, g.y - p.y) < CLUSTER_PX) {
            joined = gi;
            break;
          }
        }
      }
    }
    if (joined >= 0) {
      const g = groups[joined];
      const n = g.items.length;
      g.x = (g.x * n + p.x) / (n + 1);
      g.y = (g.y * n + p.y) / (n + 1);
      g.items.push(d);
    } else {
      groups.push({ x: p.x, y: p.y, items: [d] });
      const k = `${cx}:${cy}`;
      const arr = cell.get(k) ?? [];
      arr.push(groups.length - 1);
      cell.set(k, arr);
    }
  }
  return groups.map((g) => {
    const ll = map.unproject([g.x, g.y], zoom);
    return { key: g.items.length === 1 ? g.items[0].id : `c:${g.items[0].id}:${g.items.length}`, lat: ll.lat, lng: ll.lng, items: g.items };
  });
}

function PinLayer({
  pins,
  numbers,
  hits,
  filtering,
  dualIds,
  showDualLabels,
  onSelect,
  onCluster,
}: {
  pins: Dealership[];
  numbers: Map<string, number>;
  hits: Set<string>;
  filtering: boolean;
  dualIds?: Set<string>;
  showDualLabels: boolean;
  onSelect: (id: string) => void;
  onCluster?: (items: Dealership[], lat: number, lng: number) => void;
}) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  const groups = useMemo(() => {
    const loose: Dealership[] = [];
    const fixed: Dealership[] = [];
    for (const d of pins) {
      if (hits.has(d.id) || (showDualLabels && dualIds?.has(d.id))) fixed.push(d);
      else loose.push(d);
    }
    return [...groupPins(map, loose, zoom), ...fixed.map((d) => ({ key: d.id, lat: d.lat, lng: d.lng, items: [d] }))];
  }, [map, pins, zoom, hits, showDualLabels, dualIds]);

  function openGroup(g: PinGroup) {
    const bounds = L.latLngBounds(g.items.map((d) => [d.lat, d.lng] as [number, number]));
    const target = Math.min(map.getBoundsZoom(bounds.pad(0.35)), CLUSTER_OFF_ZOOM);
    if (target <= map.getZoom() || bounds.getNorthEast().distanceTo(bounds.getSouthWest()) < 6) {
      onCluster?.(g.items, g.lat, g.lng);
      return;
    }
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(8);
    map.flyToBounds(bounds.pad(0.35), { maxZoom: target, duration: 0.35 });
  }

  return (
    <>
      {groups.map((g) => {
        if (g.items.length > 1) {
          return (
            <Marker
              key={g.key}
              position={[g.lat, g.lng]}
              icon={clusterIcon(g.items.length)}
              zIndexOffset={500 + g.items.length}
              opacity={filtering ? 0.45 : 1}
              eventHandlers={{ click: () => openGroup(g) }}
            />
          );
        }
        const d = g.items[0];
        const dual = Boolean(dualIds?.has(d.id));
        const n = numbers.get(d.id) ?? 0;
        return (
          <Marker
            key={d.id}
            position={[d.lat, d.lng]}
            icon={numberedIcon(d.status, n, false, d.flags?.trainingStage === "trained", dual, hits.has(d.id), filtering && !hits.has(d.id))}
            zIndexOffset={hits.has(d.id) ? 800 : dual ? 600 : n}
            eventHandlers={{ click: () => onSelect(d.id) }}
          >
            {dual && showDualLabels ? (
              <Tooltip direction="top" offset={[0, -14]} permanent className="qads-tip qads-tip-dual">
                {d.nameEn}
              </Tooltip>
            ) : null}
          </Marker>
        );
      })}
    </>
  );
}

const meIcon = L.divIcon({
  className: "",
  html: `<div class="qads-me"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function MapSizer() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const host = el.parentElement ?? el;
    const run = () => map.invalidateSize({ animate: false, pan: false });
    const ro = new ResizeObserver(run);
    ro.observe(host);
    ro.observe(el);
    const a = window.setTimeout(run, 60);
    const b = window.setTimeout(run, 280);
    window.addEventListener("orientationchange", run);
    return () => {
      ro.disconnect();
      window.clearTimeout(a);
      window.clearTimeout(b);
      window.removeEventListener("orientationchange", run);
    };
  }, [map]);
  return null;
}

function StreetTiles() {
  const [fallback, setFallback] = useState(false);
  const fails = useRef(0);
  return (
    <TileLayer
      key={fallback ? "osm" : "esri-street"}
      url={fallback ? OSM : ESRI_STREET}
      attribution={fallback ? "OSM" : "Esri"}
      {...TILE}
      eventHandlers={{
        tileerror: () => {
          fails.current += 1;
          if (fails.current >= 4) setFallback(true);
        },
      }}
    />
  );
}

function SatTiles() {
  const [fallback, setFallback] = useState(false);
  const fails = useRef(0);
  return (
    <TileLayer
      key={fallback ? "osm" : "esri-sat"}
      url={fallback ? OSM : ESRI_SAT}
      attribution={fallback ? "OSM" : "Esri"}
      {...TILE}
      eventHandlers={{
        tileerror: () => {
          fails.current += 1;
          if (fails.current >= 4) setFallback(true);
        },
      }}
    />
  );
}

function FlyTo({ target }: { target: MapFocus | null }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    const zoom = Math.round(target.zoom ?? Math.max(map.getZoom(), 16));
    let latlng = L.latLng(target.lat, target.lng);
    if (target.padBottom) {
      const size = map.getSize();
      const sheet = 230;
      const visible = Math.max(160, size.y - sheet);
      const targetY = visible * 0.38;
      const point = map.project(latlng, zoom);
      point.y += size.y / 2 - targetY;
      latlng = map.unproject(point, zoom);
    }
    const reduce =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) map.setView(latlng, zoom, { animate: false });
    else map.flyTo(latlng, zoom, { duration: 0.3, easeLinearity: 0.25 });
  }, [target, map]);
  return null;
}

export function MapCanvas({
  dealers,
  selectedId,
  onSelect,
  onMapClick,
  onCluster,
  satellite,
  me,
  route,
  focus = null,
  heat = false,
  origin = MARKET_CENTER,
  dualIds,
  showDualLabels = true,
  serials,
  highlightIds = [],
}: {
  dealers: Dealership[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMapClick?: (lat: number, lng: number) => void;
  onCluster?: (items: Dealership[], lat: number, lng: number) => void;
  satellite: boolean;
  me: { lat: number; lng: number; accuracy?: number } | null;
  route: Dealership[];
  focus?: MapFocus | null;
  heat?: boolean;
  origin?: { lat: number; lng: number; zoom?: number };
  dualIds?: Set<string>;
  showDualLabels?: boolean;
  dark?: boolean;
  serials?: Map<string, number>;
  highlightIds?: string[];
}) {
  const routeIds = useMemo(() => new Set(route.map((d) => d.id)), [route]);
  const hits = useMemo(() => new Set(highlightIds), [highlightIds]);
  const filtering = hits.size > 0;
  const selected = dealers.find((d) => d.id === selectedId) ?? null;
  const numbers = useMemo(() => serials ?? dealerSerials(dealers), [serials, dealers]);

  const pins = useMemo(
    () =>
      dealers.filter(
        (d) =>
          d.id !== selectedId &&
          !routeIds.has(d.id) &&
          Number.isFinite(d.lat) &&
          Number.isFinite(d.lng) &&
          !(d.lat === 0 && d.lng === 0),
      ),
    [dealers, selectedId, routeIds],
  );

  const path = useMemo(() => {
    const pts: [number, number][] = [];
    if (me && route.length) pts.push([me.lat, me.lng]);
    for (const d of route) pts.push([d.lat, d.lng]);
    return pts;
  }, [me, route]);

  const accuracy = me?.accuracy ?? 9999;

  return (
    <MapContainer
      center={[origin.lat, origin.lng]}
      zoom={Math.round(origin.zoom ?? 15)}
      minZoom={MAP_MIN_ZOOM}
      maxZoom={MAP_MAX_ZOOM}
      wheelPxPerZoomLevel={110}
      zoomSnap={1}
      zoomDelta={1}
      fadeAnimation
      zoomAnimation
      markerZoomAnimation
      className="z-0 h-full w-full"
      style={{ minHeight: 180, height: "100%", background: "#d8d2c6" }}
      zoomControl={false}
      attributionControl={false}
    >
      <MapSizer />
      <FlyTo target={focus} />
      <MapClick onClick={onMapClick} />
      <ZoomControl position="bottomleft" />
      <ScaleControl imperial={false} position="bottomleft" />
      {satellite ? <SatTiles /> : <StreetTiles />}

      {heat
        ? dealers.filter((d) => Number.isFinite(d.lat) && Number.isFinite(d.lng)).map((d) => (
            <Circle
              key={`h-${d.id}`}
              center={[d.lat, d.lng]}
              radius={90}
              pathOptions={{
                color: "transparent",
                fillColor: statusFill(d.status),
                fillOpacity: d.status === "not_visited" ? 0.18 : 0.35,
              }}
            />
          ))
        : null}

      {!heat ? (
        <PinLayer
          pins={pins}
          numbers={numbers}
          hits={hits}
          filtering={filtering}
          dualIds={dualIds}
          showDualLabels={showDualLabels}
          onSelect={onSelect}
          onCluster={onCluster}
        />
      ) : null}

      {route.map((d, i) => (
        <Marker
          key={`r-${d.id}`}
          position={[d.lat, d.lng]}
          icon={routeIcon(i + 1)}
          zIndexOffset={400}
          eventHandlers={{ click: () => onSelect(d.id) }}
        />
      ))}

      {selected && Number.isFinite(selected.lat) && Number.isFinite(selected.lng) ? (
        <Marker
          key={`s-${selected.id}`}
          position={[selected.lat, selected.lng]}
          icon={numberedIcon(
            selected.status,
            numbers.get(selected.id) ?? 0,
            true,
            selected.flags?.trainingStage === "trained",
            dualIds?.has(selected.id),
          )}
          zIndexOffset={1000}
          eventHandlers={{ click: () => onSelect(selected.id) }}
        >
          <Tooltip
            direction="top"
            offset={[0, -16]}
            permanent
            className={dualIds?.has(selected.id) ? "qads-tip qads-tip-dual" : "qads-tip"}
          >
            {`#${numbers.get(selected.id) ?? "·"} · ${selected.nameEn}`}
          </Tooltip>
        </Marker>
      ) : null}

      {me ? (
        <>
          {accuracy < 180 ? (
            <Circle
              center={[me.lat, me.lng]}
              radius={Math.max(accuracy, 12)}
              pathOptions={{ color: "var(--primary)", weight: 1, fillColor: "var(--primary)", fillOpacity: 0.1 }}
            />
          ) : null}
          <Marker position={[me.lat, me.lng]} icon={meIcon} zIndexOffset={900} interactive={false} />
        </>
      ) : null}

      {path.length > 1 ? (
        <Polyline positions={path} pathOptions={{ color: "var(--primary)", weight: 3, opacity: 0.85 }} />
      ) : null}
    </MapContainer>
  );
}
