import L from "leaflet";
import { useEffect, useState } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MAP_MAX_ZOOM, MAP_MIN_ZOOM } from "@/lib/geo";

export type TourStop = {
  id: string;
  lat: number;
  lng: number;
  n: number;
  status: string;
};

export type TourFocus = {
  lat: number;
  lng: number;
  zoom: number;
  nonce: number;
};

const ESRI_SAT =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const iconCache = new Map<string, L.DivIcon>();

function statusColor(status: string): string {
  if (status === "completed") return "#8fb56a";
  if (status === "partial") return "#e0a14a";
  if (status === "closed" || status === "refused") return "#f97066";
  if (status === "competitor") return "#c4a0e0";
  return "#d7d3c8";
}

function pinIcon(n: number, status: string, on: boolean, dim: boolean, dot: boolean) {
  const color = statusColor(status);
  const key = `${dot ? "d" : "n"}:${n}:${status}:${on ? 1 : 0}:${dim ? 1 : 0}`;
  const cached = iconCache.get(key);
  if (cached) return cached;
  const opacity = dim ? 0.28 : 1;
  const html = dot
    ? `<div class="tour-dot${on ? " is-on" : ""}" style="background:${color};opacity:${opacity}"></div>`
    : `<div class="tour-pin${on ? " is-on" : ""}" style="background:${color};opacity:${opacity}">${n}</div>`;
  const size = dot ? 12 : on ? 32 : 26;
  const icon = L.divIcon({
    className: "",
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
  iconCache.set(key, icon);
  return icon;
}

function FlyTo({ focus }: { focus: TourFocus | null }) {
  const map = useMap();
  useEffect(() => {
    if (!focus) return;
    const reduce =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) map.setView([focus.lat, focus.lng], focus.zoom, { animate: false });
    else map.flyTo([focus.lat, focus.lng], focus.zoom, { duration: 1.15, easeLinearity: 0.2 });
  }, [focus, map]);
  return null;
}

function ZoomWatch({ onZoom }: { onZoom: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend: () => onZoom(map.getZoom()),
  });
  useEffect(() => {
    onZoom(map.getZoom());
  }, [map, onZoom]);
  return null;
}

function MapSizer() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const host = el.parentElement ?? el;
    const run = () => map.invalidateSize({ animate: false, pan: false });
    const ro = new ResizeObserver(run);
    ro.observe(host);
    window.setTimeout(run, 80);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

export function TourMap({
  stops,
  selectedId,
  dimmed,
  showPath,
  path,
  focus,
  onSelect,
}: {
  stops: TourStop[];
  selectedId: string | null;
  dimmed: Set<string>;
  showPath: boolean;
  path: [number, number][];
  focus: TourFocus | null;
  onSelect: (id: string) => void;
}) {
  const [zoom, setZoom] = useState(focus?.zoom ?? 15);
  const dots = zoom < 16;
  const center: [number, number] = focus ? [focus.lat, focus.lng] : [24.826, 46.823];

  return (
    <MapContainer
      center={center}
      zoom={focus?.zoom ?? 15}
      minZoom={MAP_MIN_ZOOM}
      maxZoom={MAP_MAX_ZOOM}
      zoomControl={false}
      attributionControl={false}
      className="tour-map absolute inset-0"
    >
      <TileLayer url={ESRI_SAT} maxNativeZoom={19} maxZoom={MAP_MAX_ZOOM} />
      <ZoomControl position="bottomright" />
      <MapSizer />
      <FlyTo focus={focus} />
      <ZoomWatch onZoom={setZoom} />
      {showPath && path.length > 1 ? (
        <Polyline
          positions={path}
          pathOptions={{ color: "#e0a14a", weight: 2, opacity: 0.72 }}
        />
      ) : null}
      {stops.map((stop) => {
        const on = stop.id === selectedId;
        return (
          <Marker
            key={stop.id}
            position={[stop.lat, stop.lng]}
            icon={pinIcon(stop.n, stop.status, on, dimmed.has(stop.id), dots && !on)}
            zIndexOffset={on ? 800 : 0}
            eventHandlers={{ click: () => onSelect(stop.id) }}
          />
        );
      })}
    </MapContainer>
  );
}
