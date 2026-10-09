import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { SyncSheet } from "@/components/sync/sync-sheet";
import { RedirectToSignIn, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { MarketSwitch } from "@/components/market-switch";
import { COPY } from "@/lib/i18n";
import { MARKET_CENTERS } from "@/lib/geo";
import { marketCounts } from "@/lib/markets";
import { cn } from "@/lib/utils";
import { useField } from "@/stores/field";
import { usePrefs } from "@/stores/prefs";
import { BarChart3, Bot, Map as MapIcon, Moon, Sun, Workflow } from "lucide-react";
import { useEffect, useMemo } from "react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const { lang, theme, market, setLang, setTheme, hydrate } = usePrefs();
  const t = COPY[lang];
  const hydrateField = useField((s) => s.hydrate);
  const flushField = useField((s) => s.flush);
  const setOnline = useField((s) => s.setOnline);
  const setGps = useField((s) => s.setGps);
  const setGpsError = useField((s) => s.setGpsError);
  const pending = useField((s) => s.pending);
  const [syncOpen, setSyncOpen] = useState(false);
  const lastError = useField((s) => s.lastError);
  const online = useField((s) => s.online);
  const loaded = useField((s) => s.loaded);
  const gpsError = useField((s) => s.gpsError);
  const dealers = useField((s) => s.snapshot.dealerships);
  const counts = useMemo(() => marketCounts(dealers), [dealers]);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    const sync = () => {
      root.style.setProperty("--vvh", `${vv.height}px`);
      root.style.setProperty("--vvtop", `${vv.offsetTop}px`);
    };
    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    void hydrateField();
  }, [user?.id, hydrateField]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [setOnline]);

  useEffect(() => {
    const center = MARKET_CENTERS[market];
    if (!navigator.geolocation) {
      setGpsError(true);
      setGps({ lat: center.lat, lng: center.lng, accuracy: 9999 });
      return;
    }
    const watch = navigator.geolocation.watchPosition(
      (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => {
        setGpsError(true);
        setGps({ lat: center.lat, lng: center.lng, accuracy: 9999 });
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 8000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [setGps, setGpsError, market]);

  if (isPending) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg text-fg">
        <div className="h-10 w-40 animate-pulse rounded-xl bg-surface-2" />
      </div>
    );
  }
  if (!user) return <RedirectToSignIn />;

  const nav = [
    { to: "/", label: t.map, icon: MapIcon },
    { to: "/dashboard", label: t.dashboard, icon: BarChart3 },
    { to: "/research", label: t.research, icon: Bot },
    { to: "/ops", label: t.ops, icon: Workflow },
  ] as const;

  const isSurvey = pathname.startsWith("/survey");

  return (
    <div
      className="flex w-full max-w-full min-w-0 flex-col overflow-hidden bg-bg text-fg"
      style={{ height: "var(--vvh, 100dvh)", transform: "translateY(var(--vvtop, 0px))" }}
    >
      {isSurvey ? null : (
      <>
      <header className="relative z-40 shrink-0 border-b border-border/80 bg-bg pt-[max(0.35rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2 px-3 py-1.5">
          <div className="min-w-0 flex-1 lg:max-w-md">
            <MarketSwitch counts={counts} compact />
          </div>
          <button
            type="button"
            className={cn(
              "min-h-11 shrink-0 rounded-xl px-2.5 text-xs font-semibold",
              !online || pending > 0 ? "bg-status-amber/15 text-status-amber" : "text-muted",
            )}
            onClick={() => setSyncOpen(true)}
            title={lastError || (gpsError ? t.usingCenter : undefined)}
          >
            {!online ? t.offline : pending > 0 ? `${pending}` : t.synced}
          </button>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-xl text-muted"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? t.light : t.dark}
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <button
            type="button"
            className="min-h-11 rounded-xl px-2 text-xs font-semibold text-muted"
            onClick={() => setLang(lang === "en" ? "ar" : "en")}
          >
            {lang === "en" ? "ع" : "EN"}
          </button>
          <div className="[&_span.text-sm]:hidden [&_button]:min-h-11 [&_button]:rounded-xl [&_button]:px-2 [&_button]:text-xs">
            <UserButton />
          </div>
        </div>
      </header>
      {syncOpen ? <SyncSheet onClose={() => setSyncOpen(false)} /> : null}
      </>
      )}

      <div className="flex min-h-0 min-w-0 flex-1">
      {isSurvey ? null : (
      <nav className="hidden w-[4.75rem] shrink-0 flex-col border-r border-border/80 bg-surface lg:flex">
        {nav.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium",
                active ? "text-primary" : "text-muted",
              )}
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      )}
      <main
        className={
          isSurvey
            ? "relative flex min-h-0 flex-1 flex-col overflow-hidden"
            : "relative flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-hidden pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:pb-0"
        }
      >
        {loaded ? children : (
          <div className="grid flex-1 place-items-center text-sm text-muted">Loading roster…</div>
        )}
      </main>
      </div>

      {isSurvey ? null : (
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border/80 bg-surface/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        {nav.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                active ? "text-primary" : "text-muted",
              )}
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      )}
    </div>
  );
}
