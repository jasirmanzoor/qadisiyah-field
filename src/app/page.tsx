'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAllDealerships } from '@/lib/db';
import type { Dealership } from '@/lib/types';
import BottomSheet from '@/components/map/BottomSheet';
import ListDrawer from '@/components/map/ListDrawer';
import RoutePanel from '@/components/map/RoutePanel';
import OnlineStatusBadge from '@/components/OnlineStatusBadge';
import MarketSwitcher from '@/components/MarketSwitcher';
import { useSettings } from '@/lib/settings-context';
import { MARKETS, marketOf, type MarketId } from '@/lib/markets';

const MapCanvas = dynamic(() => import('@/components/map/MapCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-muted">Loading map…</div>
  ),
});

export default function MapPage() {
  const { activeMarket, setActiveMarket } = useSettings();
  const [allDealerships, setDealerships] = useState<Dealership[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [basemap, setBasemap] = useState<'street' | 'satellite'>('street');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);

  const [routeMode, setRouteMode] = useState(false);
  const [routeSelectedIds, setRouteSelectedIds] = useState<Set<string>>(new Set());
  const [routePlanned, setRoutePlanned] = useState<Dealership[] | null>(null);

  const refresh = useCallback(async () => {
    setDealerships(await getAllDealerships());
  }, []);

  useEffect(() => {
    (async () => {
      setDealerships(await getAllDealerships());
    })();
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refresh);
    };
  }, [refresh]);

  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const dealerships = useMemo(
    () => allDealerships.filter((d) => marketOf(d) === activeMarket),
    [allDealerships, activeMarket]
  );
  const counts = useMemo(() => {
    const c: Record<MarketId, number> = { qadisiyah: 0, shifa: 0 };
    for (const d of allDealerships) c[marketOf(d)] += 1;
    return c;
  }, [allDealerships]);

  const switchMarket = (m: MarketId) => {
    setSelectedId(null);
    setListOpen(false);
    setRouteMode(false);
    setRoutePlanned(null);
    setRouteSelectedIds(new Set());
    setActiveMarket(m);
  };

  const selected = useMemo(
    () => dealerships.find((d) => d.id === selectedId) ?? null,
    [dealerships, selectedId]
  );

  const routeSelected = useMemo(
    () => dealerships.filter((d) => routeSelectedIds.has(d.id)),
    [dealerships, routeSelectedIds]
  );

  const handleSelect = (id: string) => {
    if (routeMode) {
      setRouteSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      return;
    }
    setSelectedId(id);
    setListOpen(false);
    const d = dealerships.find((x) => x.id === id);
    if (d) setFlyTarget([d.lat, d.lng]);
  };

  const locateMe = () => {
    if (userLocation) {
      setFlyTarget([userLocation.lat, userLocation.lng]);
    } else if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setFlyTarget([loc.lat, loc.lng]);
      });
    }
  };

  return (
    <div className="relative h-full w-full">
      <MapCanvas
        dealerships={dealerships}
        selectedId={selectedId}
        onSelect={handleSelect}
        basemap={basemap}
        userLocation={userLocation}
        routeStops={routePlanned ?? undefined}
        flyTarget={flyTarget}
        center={MARKETS[activeMarket].center}
        zoom={MARKETS[activeMarket].zoom}
      />

      {/* Top controls */}
      <div className="safe-top pointer-events-none absolute inset-x-0 top-0 z-[800] space-y-2 p-3">
        <MarketSwitcher
          value={activeMarket}
          onChange={switchMarket}
          counts={counts}
          className="pointer-events-auto mx-auto max-w-md"
        />
        <div className="flex items-start justify-between gap-2">
        <div className="pointer-events-auto flex gap-2">
          <OnlineStatusBadge />
        </div>
        <div className="pointer-events-auto flex gap-2">
          <button
            onClick={() => setBasemap((b) => (b === 'street' ? 'satellite' : 'street'))}
            className="rounded-full border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground shadow"
          >
            {basemap === 'street' ? '🛰️ Satellite' : '🗺️ Street'}
          </button>
          <button
            onClick={() => {
              setRouteMode((v) => !v);
              setSelectedId(null);
              setRoutePlanned(null);
              setRouteSelectedIds(new Set());
            }}
            className={`rounded-full border px-3 py-2 text-xs font-semibold shadow ${
              routeMode ? 'border-accent bg-accent text-accent-contrast' : 'border-border bg-surface text-foreground'
            }`}
          >
            Route
          </button>
        </div>
        </div>
      </div>

      {/* Bottom-right floating actions */}
      {!selected && !routeMode && (
        <div className="safe-bottom absolute bottom-4 right-3 z-[800] flex flex-col gap-2">
          <button
            onClick={locateMe}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface text-lg shadow"
            aria-label="Locate me"
          >
            📍
          </button>
          <button
            onClick={() => setListOpen(true)}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface text-lg shadow"
            aria-label="List view"
          >
            📃
          </button>
        </div>
      )}

      {selected && !routeMode && (
        <BottomSheet
          dealership={selected}
          userLocation={userLocation}
          onClose={() => setSelectedId(null)}
          onDeleted={refresh}
        />
      )}

      {routeMode && (
        <RoutePanel
          selected={routeSelected}
          userLocation={userLocation}
          planned={routePlanned}
          onPlan={setRoutePlanned}
          onClear={() => {
            setRoutePlanned(null);
            setRouteSelectedIds(new Set());
          }}
          onExitRouteMode={() => {
            setRouteMode(false);
            setRoutePlanned(null);
            setRouteSelectedIds(new Set());
          }}
        />
      )}

      {listOpen && (
        <ListDrawer
          dealerships={dealerships}
          userLocation={userLocation}
          onSelect={handleSelect}
          onClose={() => setListOpen(false)}
        />
      )}
    </div>
  );
}
