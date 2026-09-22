import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { Circle, MapContainer, Marker, Polyline, ScaleControl, TileLayer, Tooltip, useMap, ZoomControl } from "react-leaflet";
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
  updateWhenZooming: false,
  updateWhenIdle: true,
  detectRetina: false as const,
};

const ESRI_STREET =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}";
const ESRI_SAT =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const OSM = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

function coarsePointer() {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
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
) {
  const key = `n:${status}:${n}:${selected ? 1 : 0}:${trained ? 1 : 0}:${dual ? 1 : 0}`;
  const hit = iconCache.get(key);
  if (hit) return hit;
  const { w, h } = pinBox(n, selected);
  const icon = L.divIcon({
    className: "",
    html: `<div class="qads-pin-num qads-pin-${status}${selected ? " qads-pin-selected" : ""}${trained ? " qads-pin-trained" : ""}${dual ? " qads-pin-dual" : ""}">${n}</div>`,
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
    html: `<div class="qads-route-num">${n}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
  iconCache.set(key, icon);
  return icon;
}

const meIcon = L.divIcon({
  className: "",
  html: `<div class="qads-me"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function MapSizer() {
  const map = useMap();
  useEffect(() => {
    const run = () => map.invalidateSize({ animate: false });
    const a = window.setTimeout(run, 80);
    const b = window.setTimeout(run, 400);
    window.addEventListener("resize", run);
    window.addEventListener("orientationchange", run);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
      window.removeEventListener("resize", run);
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
    const offsetY = target.padBottom ? Math.round(map.getSize().y * 0.2) : 0;
    const point = map.project([target.lat, target.lng], zoom);
    point.y += offsetY;
    const latlng = map.unproject(point, zoom);
    const reduce =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.setView(latlng, zoom, { animate: !reduce && !coarsePointer() });
  }, [target, map]);
  return null;
}

export function MapCanvas({
  dealers,
  selectedId,
  onSelect,
  satellite,
  me,
  route,
  focus = null,
  heat = false,
  origin = MARKET_CENTER,
  dualIds,
  showDualLabels = true,
  serials,
}: {
  dealers: Dealership[];
  selectedId: string | null;
  onSelect: (id: string) => void;
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
}) {
  const routeIds = useMemo(() => new Set(route.map((d) => d.id)), [route]);
  const selected = dealers.find((d) => d.id === selectedId) ?? null;
  const numbers = useMemo(() => serials ?? dealerSerials(dealers), [serials, dealers]);

  const pins = useMemo(
    () =>
      dealers.filter(
        (d) =>
          d.id !== selectedId &&
          !routeIds.has(d.id) &&
          Number.isFinite(d.lat) &&
          Number.isFinite(d.lng),
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
      zoomSnap={1}
      zoomDelta={1}
      fadeAnimation={false}
      zoomAnimation={false}
      markerZoomAnimation={false}
      className="z-0 h-full w-full"
      style={{ minHeight: 180, height: "100%", background: "#d8d2c6" }}
      zoomControl={false}
      attributionControl={false}
    >
      <MapSizer />
      <FlyTo target={focus} />
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

      {!heat
        ? pins.map((d) => {
            const dual = Boolean(dualIds?.has(d.id));
            const n = numbers.get(d.id) ?? 0;
            return (
              <Marker
                key={d.id}
                position={[d.lat, d.lng]}
                icon={numberedIcon(d.status, n, false, d.flags?.trainingStage === "trained", dual)}
                zIndexOffset={dual ? 600 : n}
                eventHandlers={{ click: () => onSelect(d.id) }}
              >
                {dual && showDualLabels ? (
                  <Tooltip direction="top" offset={[0, -14]} permanent className="qads-tip qads-tip-dual">
                    {d.nameEn}
                  </Tooltip>
                ) : null}
              </Marker>
            );
          })
        : null}

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
            offset={[0, -14]}
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
