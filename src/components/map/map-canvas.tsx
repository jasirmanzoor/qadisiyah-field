import L from "leaflet";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Circle, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { clusterByZoom, MARKET_CENTER } from "@/lib/geo";
import type { Dealership } from "@/lib/types";

export type MapFocus = {
  lat: number;
  lng: number;
  zoom?: number;
  nonce: number;
  padBottom?: boolean;
};

const iconCache = new Map<string, L.DivIcon>();

function statusFill(status: string): string {
  if (status === "completed") return "var(--status-green)";
  if (status === "partial") return "var(--status-amber)";
  if (status === "competitor") return "var(--status-purple)";
  if (status === "refused" || status === "closed") return "var(--status-red)";
  return "var(--status-grey)";
}

function pinIcon(status: string, selected: boolean, trained = false, dual = false) {
  const key = `p:${status}:${selected ? 1 : 0}:${trained ? 1 : 0}:${dual ? 1 : 0}`;
  const hit = iconCache.get(key);
  if (hit) return hit;
  const size = selected ? 22 : dual ? 20 : 18;
  const icon = L.divIcon({
    className: "",
    html: `<div class="qads-pin qads-pin-${status} ${selected ? "qads-pin-selected" : ""} ${trained ? "qads-pin-trained" : ""} ${dual ? "qads-pin-dual" : ""}"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
  iconCache.set(key, icon);
  return icon;
}

function clusterIcon(count: number, fill: string) {
  const size = count >= 40 ? 40 : count >= 12 ? 34 : 28;
  const key = `c:${count}:${fill}:${size}`;
  const hit = iconCache.get(key);
  if (hit) return hit;
  const icon = L.divIcon({
    className: "",
            html: `<div class="qads-cluster" data-cluster="1" style="--cluster-fill:${fill};width:${size}px;height:${size}px">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
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
    const run = () => map.invalidateSize();
    const a = window.setTimeout(run, 50);
    const b = window.setTimeout(run, 350);
    window.addEventListener("resize", run);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
      window.removeEventListener("resize", run);
    };
  }, [map]);
  return null;
}

function ZoomWatcher({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMap();
  useEffect(() => {
    onZoom(map.getZoom());
  }, [map, onZoom]);
  useMapEvents({
    zoomend: () => onZoom(map.getZoom()),
  });
  return null;
}

function FlyTo({ target }: { target: MapFocus | null }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    const zoom = target.zoom ?? Math.max(map.getZoom(), 16);
    const offsetY = target.padBottom ? Math.round(map.getSize().y * 0.2) : 0;
    const point = map.project([target.lat, target.lng], zoom);
    point.y += offsetY;
    const latlng = map.unproject(point, zoom);
    const reduce =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) map.setView(latlng, zoom, { animate: false });
    else map.flyTo(latlng, zoom, { duration: 0.45 });
  }, [target, map]);
  return null;
}

export function MapCanvas({
  dealers,
  selectedId,
  onSelect,
  onCluster,
  satellite,
  me,
  route,
  focus = null,
  heat = false,
  origin = MARKET_CENTER,
  dualIds,
  showDualLabels = true,
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
}) {
  const [zoom, setZoom] = useState(15);
  const onZoom = useCallback((z: number) => setZoom(Math.round(z)), []);

  const routeIds = useMemo(() => new Set(route.map((d) => d.id)), [route]);

  const clusters = useMemo(() => {
    const rest = dealers.filter((d) => d.id !== selectedId && !routeIds.has(d.id) && !dualIds?.has(d.id));
    return clusterByZoom(rest, zoom);
  }, [dealers, selectedId, routeIds, zoom, dualIds]);

  const labeledDealers = useMemo(
    () => dealers.filter((d) => dualIds?.has(d.id) && d.id !== selectedId && !routeIds.has(d.id)),
    [dealers, dualIds, selectedId, routeIds],
  );

  const selected = dealers.find((d) => d.id === selectedId) ?? null;

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
      zoom={origin.zoom ?? 15}
      className="z-0 h-full w-full"
      style={{ minHeight: 180, height: "100%" }}
      zoomControl={false}
      attributionControl={false}
    >
      <MapSizer />
      <ZoomWatcher onZoom={onZoom} />
      <FlyTo target={focus} />
      {satellite ? (
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Esri"
        />
      ) : (
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="OpenStreetMap" />
      )}

      {heat
        ? dealers.map((d) => (
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
        ? clusters.map((c) => {
            if (c.items.length === 1) {
              const d = c.items[0];
              return (
                <Marker
                  key={d.id}
                  position={[d.lat, d.lng]}
                  icon={pinIcon(d.status, false, d.flags.trainingStage === "trained", dualIds?.has(d.id))}
                  eventHandlers={{ click: () => onSelect(d.id) }}
                />
              );
            }
            const same = c.items.every((d) => d.status === c.items[0].status);
            const fill = same ? statusFill(c.items[0].status) : "var(--primary)";
            return (
              <Marker
                key={c.id}
                position={[c.lat, c.lng]}
                icon={clusterIcon(c.items.length, fill)}
                zIndexOffset={200}
                eventHandlers={{
                  click: (e) => {
                    L.DomEvent.stopPropagation(e.originalEvent);
                    if (onCluster) onCluster(c.items, c.lat, c.lng);
                    else onSelect(c.items[0].id);
                  },
                }}
              />
            );
          })
        : null}

      {!heat
        ? labeledDealers.map((d) => (
            <Marker
              key={`dual-${d.id}`}
              position={[d.lat, d.lng]}
              icon={pinIcon(d.status, false, d.flags.trainingStage === "trained", true)}
              zIndexOffset={600}
              eventHandlers={{ click: () => onSelect(d.id) }}
            >
              {showDualLabels ? (
                <Tooltip direction="top" offset={[0, -14]} permanent className="qads-tip qads-tip-dual">
                  {d.nameEn}
                </Tooltip>
              ) : null}
            </Marker>
          ))
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

      {selected ? (
        <Marker
          key={`s-${selected.id}`}
          position={[selected.lat, selected.lng]}
          icon={pinIcon(
            selected.status,
            true,
            selected.flags.trainingStage === "trained",
            dualIds?.has(selected.id),
          )}
          zIndexOffset={1000}
          eventHandlers={{ click: () => onSelect(selected.id) }}
        >
          <Tooltip
            direction="top"
            offset={[0, -12]}
            permanent
            className={dualIds?.has(selected.id) ? "qads-tip qads-tip-dual" : "qads-tip"}
          >
            {selected.nameEn}
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
