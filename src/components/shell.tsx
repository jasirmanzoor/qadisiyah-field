import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useRef } from "react";
import { Toaster, toast } from "sonner";
import { SyncSheet } from "@/components/sync/sync-sheet";
import { AccountMenu } from "@/components/account-menu";
import { CommandPalette } from "@/components/command-palette";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { haptic } from "@/lib/haptics";
import { useUi } from "@/stores/ui";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { MarketSwitch } from "@/components/market-switch";
import { COPY } from "@/lib/i18n";
import { MARKET_CENTERS } from "@/lib/geo";
import { marketCounts } from "@/lib/markets";
import { cn } from "@/lib/utils";
import { useField } from "@/stores/field";
import { usePrefs } from "@/stores/prefs";
import { BarChart3, Bot, CloudOff, Loader2, Map as MapIcon, Search, Workflow } from "lucide-react";
import { useEffect, useMemo } from "react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const { lang, theme, market, hydrate } = usePrefs();
  const t = COPY[lang];
  const hydrateField = useField((s) => s.hydrate);
  const flushField = useField((s) => s.flush);
  const setOnline = useField((s) => s.setOnline);
  const setGps = useField((s) => s.setGps);
  const setGpsError = useField((s) => s.setGpsError);
  const pending = useField((s) => s.pending);
  const syncOpen = useUi((s) => s.syncOpen);
  const setSyncOpen = useUi((s) => s.setSyncOpen);
  const setPaletteOpen = useUi((s) => s.setPaletteOpen);
  const syncing = useField((s) => s.syncing);
  const navigate = useNavigate();
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

  // Toasts on connectivity changes and when the save queue drains.
  const seenOnline = useRef<boolean | null>(null);
  const seenPending = useRef(0);
  useEffect(() => {
    if (!loaded) return;
    if (seenOnline.current !== null && seenOnline.current !== online) {
      haptic(online ? "success" : "warn");
      if (online) toast(t.onlineToast, { id: "net" });
      else toast.warning(t.offlineToast, { id: "net", duration: 6000 });
    }
    seenOnline.current = online;
  }, [online, loaded, t]);
  useEffect(() => {
    if (seenPending.current > 0 && pending === 0 && online && !lastError) {
      toast.success(t.syncedToast, { id: "sync", duration: 2200 });
    }
    seenPending.current = pending;
  }, [pending, online, lastError, t]);

  // ⌘K / Ctrl+K and "/" open the palette; "g" then m/d/r/o jumps between pages.
  useEffect(() => {
    let leader = 0;
    const go: Record<string, string> = { m: "/", d: "/dashboard", r: "/research", o: "/ops" };
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = Boolean(el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)));
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(!useUi.getState().paletteOpen);
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      const k = e.key.toLowerCase();
      if (k === "g") {
        leader = Date.now();
        return;
      }
      if (Date.now() - leader < 900 && go[k]) {
        leader = 0;
        void navigate({ to: go[k] });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate, setPaletteOpen]);

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
      <header className="relative z-40 shrink-0 border-b border-border/70 bg-bg/90 pt-[max(0.35rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="flex items-center gap-1.5 px-3 py-1.5 lg:gap-3 lg:px-4">
          <Link to="/" className="me-1 hidden items-center gap-2 lg:flex" aria-label={t.appName}>
            <span className="qads-logo grid size-8 place-items-center rounded-[10px] text-sm font-bold">Q</span>
            <span className="text-sm font-semibold tracking-tight">{t.appName}</span>
          </Link>
          <div className="min-w-0 flex-1 lg:max-w-sm lg:flex-none lg:basis-80">
            <MarketSwitch counts={counts} compact />
          </div>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="qads-hud hidden h-10 min-w-0 flex-1 items-center gap-2 rounded-full px-3.5 text-sm text-faint lg:flex lg:max-w-md"
          >
            <Search className="size-4 shrink-0 text-muted" />
            <span className="min-w-0 flex-1 truncate text-start">{t.palette}</span>
            <kbd className="shrink-0 rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-muted">⌘K</kbd>
          </button>
          <div className="hidden flex-1 lg:block" />
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="grid size-10 shrink-0 place-items-center rounded-full text-fg hover:bg-surface-2 lg:hidden"
            aria-label={t.search}
          >
            <Search className="size-[18px]" />
          </button>
          <button
            type="button"
            className={cn(
              "flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold tabular-nums",
              !online
                ? "bg-status-amber/15 text-status-amber"
                : pending > 0
                  ? "bg-status-amber/15 text-status-amber"
                  : "bg-status-green/12 text-status-green",
            )}
            onClick={() => setSyncOpen(true)}
            title={lastError || (gpsError ? t.usingCenter : undefined)}
            aria-label={!online ? t.offline : pending > 0 ? `${pending}` : t.synced}
          >
            {!online ? (
              <CloudOff className="size-3.5" />
            ) : syncing && pending > 0 ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <span className={cn("qads-live-dot size-1.5 rounded-full", pending > 0 ? "bg-status-amber" : "bg-status-green")} />
            )}
            <span className={cn(pending === 0 && online && "hidden sm:inline")}>
              {!online ? (pending > 0 ? pending : t.offline) : pending > 0 ? pending : t.synced}
            </span>
          </button>
          <AccountMenu />
        </div>
      </header>
      </>
      )}
      {syncOpen ? <SyncSheet onClose={() => setSyncOpen(false)} /> : null}
      <CommandPalette />
      <Toaster
        position="top-center"
        theme={theme}
        dir={lang === "ar" ? "rtl" : "ltr"}
        offset={{ top: "calc(env(safe-area-inset-top) + 60px)" }}
        mobileOffset={{ top: "calc(env(safe-area-inset-top) + 60px)" }}
        toastOptions={{ className: "qads-toast" }}
      />

      <div className="flex min-h-0 min-w-0 flex-1">
      {isSurvey ? null : (
      <nav className="hidden w-[5.25rem] shrink-0 flex-col gap-1 border-e border-border/70 bg-surface/60 px-2 py-3 lg:flex">
        {nav.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "qads-rail-item relative flex flex-col items-center justify-center gap-1 rounded-2xl py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-fg" : "text-muted hover:bg-surface-2 hover:text-fg",
              )}
              data-active={active ? "1" : undefined}
            >
              <span className={cn("grid h-8 w-12 place-items-center rounded-full transition-colors", active && "bg-primary text-primary-fg")}>
                <Icon className="size-[18px]" />
              </span>
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
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border/70 bg-surface/85 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        {nav.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => haptic()}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                active ? "text-fg" : "text-muted",
              )}
            >
              <span className={cn("grid h-7 w-14 place-items-center rounded-full transition-all duration-200", active ? "bg-primary text-primary-fg" : "")}>
                <Icon className="size-[18px]" />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      )}
    </div>
  );
}
