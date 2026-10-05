import { useNavigate } from "@tanstack/react-router";
import { Link, useRouterState } from "@tanstack/react-router";
import { RedirectToSignIn, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { MarketSwitch } from "@/components/market-switch";
import { COPY } from "@/lib/i18n";
import { MARKET_CENTERS } from "@/lib/geo";
import { MARKET_META, dealersInMarket, marketCounts } from "@/lib/markets";
import { cn } from "@/lib/utils";
import { useField } from "@/stores/field";
import { useIntel } from "@/stores/intel";
import { usePrefs } from "@/stores/prefs";
import { BarChart3, Briefcase, Compass, FlaskConical, Map as MapIcon, Moon, Search, Sun, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const { lang, theme, market, setLang, setTheme, hydrate } = usePrefs();
  const t = COPY[lang];
  const hydrateField = useField((s) => s.hydrate);
  const hydrateIntel = useIntel((s) => s.hydrate);
  const flushField = useField((s) => s.flush);
  const setOnline = useField((s) => s.setOnline);
  const setGps = useField((s) => s.setGps);
  const setGpsError = useField((s) => s.setGpsError);
  const pending = useField((s) => s.pending);
  const online = useField((s) => s.online);
  const loaded = useField((s) => s.loaded);
  const gpsError = useField((s) => s.gpsError);
  const team = useField((s) => s.snapshot.team);
  const dealers = useField((s) => s.snapshot.dealerships);
  const counts = useMemo(() => marketCounts(dealers), [dealers]);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    hydrate();
    hydrateIntel();
  }, [hydrate, hydrateIntel]);

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

  const [finder, setFinder] = useState(false);
  const nav = [
    { to: "/", label: t.map, icon: MapIcon },
    { to: "/dashboard", label: t.dashboard, icon: BarChart3 },
    { to: "/ceo", label: lang === "ar" ? "الرئيس" : "CEO", icon: Briefcase },
    { to: "/research", label: t.research, icon: Search },
    { to: "/deepdive", label: lang === "ar" ? "تعمق" : "Dive", icon: FlaskConical },
  ] as const;

  const isSurvey = pathname.startsWith("/survey");

  return (
    <div className="flex h-dvh min-h-dvh flex-col bg-bg text-fg">
      {isSurvey ? null : (
      <header className="sticky top-0 z-30 border-b border-border/80 bg-bg/70 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="flex items-center gap-2 px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold uppercase tracking-[0.14em] text-fg">{t.appName}</p>
          <div className="truncate text-[11px] text-muted">
            {lang === "ar" ? MARKET_META[market].labelAr : MARKET_META[market].labelEn}
            {market === "shifa" ? ` · ${t.usedCarMarket}` : ""}
            {" · "}
            {online ? (
              pending > 0 ? (
                <button
                  type="button"
                  className="font-medium text-status-amber"
                  onClick={() => void flushField()}
                >
                  {t.pendingSync} · {pending}
                </button>
              ) : (
                t.synced
              )
            ) : (
              t.offline
            )}
            {team && team.members.length > 1 ? (
              <>
                {" · "}
                <Link to="/ops" className="font-medium text-primary">
                  {team.members.length} {t.team}
                </Link>
              </>
            ) : (
              <>
                {" · "}
                <Link to="/ops" className="font-medium text-primary">
                  {t.team}
                </Link>
              </>
            )}
            {gpsError ? ` · ${t.usingCenter}` : ""}
          </div>
        </div>
        <button
          type="button"
          className="grid size-10 place-items-center rounded-lg text-muted"
          onClick={() => setFinder(true)}
          aria-label={t.searchShowrooms}
        >
          <Compass className="size-4" />
        </button>
        <button
          type="button"
          className="grid size-10 place-items-center rounded-lg text-muted"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label={theme === "dark" ? t.light : t.dark}
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
        <button
          type="button"
          className="min-h-10 rounded-lg px-2 text-xs font-medium text-muted"
          onClick={() => setLang(lang === "en" ? "ar" : "en")}
        >
          {lang === "en" ? t.arabic : t.english}
        </button>
        <div className="[&_span.text-sm]:hidden [&_button]:min-h-10 [&_button]:rounded-lg [&_button]:px-2 [&_button]:text-xs">
          <UserButton />
        </div>
        </div>
        <div className="px-3 pb-2">
          <MarketSwitch counts={counts} compact />
        </div>
      </header>
      )}

      <main
        className={
          isSurvey
            ? "relative flex min-h-0 flex-1 flex-col overflow-hidden"
            : "relative flex min-h-0 flex-1 flex-col overflow-hidden pb-[calc(4.25rem+env(safe-area-inset-bottom))]"
        }
      >
        {loaded ? children : (
          <div className="grid flex-1 place-items-center text-sm text-muted">Loading roster…</div>
        )}
      </main>

      {isSurvey ? null : (
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border/80 bg-surface/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
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
      {finder ? <RosterFinder lang={lang} onClose={() => setFinder(false)} /> : null}
    </div>
  );
}

function RosterFinder({ lang, onClose }: { lang: "en" | "ar"; onClose: () => void }) {
  const navigate = useNavigate();
  const dealers = useField((s) => s.snapshot.dealerships);
  const [q, setQ] = useState("");
  const hits = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (query.length < 1) return [];
    return dealers
      .filter((d) => !d.flags?.hidden && `${d.nameEn} ${d.nameAr} ${d.listedPhone} ${d.flags.sdId ?? ""}`.toLowerCase().includes(query))
      .slice(0, 12);
  }, [dealers, q]);
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-bg/95 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={lang === "ar" ? "ابحث بالعربي أو الإنجليزي" : "Search Arabic or English"}
            className="min-h-12 w-full rounded-xl bg-surface pe-3 ps-10 text-base outline-none"
          />
        </div>
        <button type="button" className="grid size-12 place-items-center" onClick={onClose} aria-label="Close">
          <X className="size-5" />
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">
        {dealersInMarket(dealers, "qadisiyah").length} · {dealersInMarket(dealers, "shifa").length}
      </p>
      <ul className="mt-2 flex flex-col gap-1 overflow-auto pb-8">
        {q && hits.length === 0 ? <li className="px-2 py-6 text-sm text-muted">{lang === "ar" ? "لا نتائج" : "No matches"}</li> : null}
        {hits.map((d) => (
          <li key={d.id}>
            <button
              type="button"
              className="flex min-h-14 w-full flex-col justify-center rounded-xl bg-surface px-3 text-start"
              onClick={() => {
                onClose();
                void navigate({ to: "/dossier/$id", params: { id: d.id } });
              }}
            >
              <span className="truncate font-semibold">{d.nameEn}</span>
              <span className="truncate text-xs text-muted" dir="rtl">{d.flags.sdId} · {d.nameAr}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
