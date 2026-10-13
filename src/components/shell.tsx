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
import { BarChart3, Bot, Compass, Map as MapIcon, Moon, Sun, Workflow } from "lucide-react";
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
    let frame = 0;
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        root.style.setProperty("--vvh", `${Math.round(vv.height)}px`);
        // Do not follow visualViewport.offsetTop. Translating the shell on
        // every keyboard pan made iOS scroll again, and the screen never settled.
        if (window.scrollY !== 0) window.scrollTo(0, 0);
      });
    };
    sync();
    vv.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      cancelAnimationFrame(frame);
      vv.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    let timer = 0;
    const editing = (el: EventTarget | null) =>
      el instanceof HTMLElement && el.matches("input, textarea, select");
    const onFocusIn = (event: FocusEvent) => {
      if (!editing(event.target)) return;
      window.clearTimeout(timer);
      root.classList.add("kb-open");
    };
    const onFocusOut = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (!editing(document.activeElement)) root.classList.remove("kb-open");
      }, 160);
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      window.clearTimeout(timer);
      root.classList.remove("kb-open");
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
    { to: "/", label: lang === "ar" ? "جولة" : "Tour", icon: Compass },
    { to: "/field", label: t.map, icon: MapIcon },
    { to: "/dashboard", label: t.dashboard, icon: BarChart3 },
    { to: "/research", label: t.research, icon: Bot },
    { to: "/ops", label: t.ops, icon: Workflow },
  ] as const;

  const isSurvey = pathname.startsWith("/survey");

  return (
    <div
      className="fixed inset-x-0 top-0 flex w-full max-w-full min-w-0 flex-col overflow-hidden bg-bg text-fg"
      style={{ height: "var(--vvh, 100dvh)" }}
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
      <nav className="qads-tabbar fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border/80 bg-surface/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
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
