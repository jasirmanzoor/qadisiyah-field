import { Command } from "cmdk";
import { useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  Bot,
  CloudUpload,
  Languages,
  LayoutList,
  LocateFixed,
  Map as MapIcon,
  MapPinPlus,
  Mic,
  Moon,
  Repeat,
  Route as RouteIcon,
  Satellite,
  Search,
  Sun,
  Workflow,
  Briefcase,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { COPY, STATUS_LABEL } from "@/lib/i18n";
import { dealerMarket, MARKET_META } from "@/lib/markets";
import { haptic } from "@/lib/haptics";
import { useVoiceInput } from "@/lib/use-voice";
import { cn } from "@/lib/utils";
import type { Dealership } from "@/lib/types";
import { useField } from "@/stores/field";
import { usePrefs } from "@/stores/prefs";
import { useUi } from "@/stores/ui";

/** Fold Arabic letter variants and diacritics so "احمد" finds "أحمد". */
export function foldText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}+]+/gu, " ")
    .trim();
}

type Indexed = { d: Dealership; hay: string; name: string };

function rank(rows: Indexed[], q: string, limit: number): Dealership[] {
  const query = foldText(q);
  if (!query) return [];
  const tokens = query.split(" ").filter(Boolean);
  const digits = q.replace(/\D/g, "");
  const scored: { d: Dealership; score: number }[] = [];
  for (const row of rows) {
    let ok = true;
    let score = 0;
    for (const tk of tokens) {
      const at = row.hay.indexOf(tk);
      if (at === -1) {
        ok = false;
        break;
      }
      score += at === 0 || row.hay[at - 1] === " " ? 4 : 1;
      if (row.name.startsWith(tk)) score += 6;
    }
    if (!ok && digits.length >= 4 && row.hay.replace(/\D/g, "").includes(digits)) {
      ok = true;
      score = 3;
    }
    if (ok) scored.push({ d: row.d, score });
  }
  scored.sort((a, b) => b.score - a.score || a.d.nameEn.localeCompare(b.d.nameEn));
  return scored.slice(0, limit).map((x) => x.d);
}

export function CommandPalette() {
  const open = useUi((s) => s.paletteOpen);
  const setOpen = useUi((s) => s.setPaletteOpen);
  const requestFocus = useUi((s) => s.requestFocus);
  const requestMapAction = useUi((s) => s.requestMapAction);
  const setSyncOpen = useUi((s) => s.setSyncOpen);
  const { lang, theme, market, setLang, setTheme, setMarket } = usePrefs();
  const t = COPY[lang];
  const dealers = useField((s) => s.snapshot.dealerships);
  const surveys = useField((s) => s.snapshot.surveys);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const voice = useVoiceInput(lang, (text) => setQ(text));

  useEffect(() => {
    if (!open) {
      setQ("");
      voice.stop();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const index = useMemo<Indexed[]>(() => {
    const brands = new Map<string, string>();
    for (const s of surveys) brands.set(s.dealershipId, (s.payload.mainBrands ?? []).join(" "));
    return dealers
      .filter((d) => !d.flags.hidden)
      .map((d) => ({
        d,
        name: foldText(`${d.nameEn} ${d.nameAr}`),
        hay: foldText(
          `${d.nameEn} ${d.nameAr} ${d.flags.sdId ?? ""} ${d.listedPhone} ${d.flags.street ?? ""} ${brands.get(d.id) ?? ""} ${MARKET_META[dealerMarket(d)].labelEn}`,
        ),
      }));
  }, [dealers, surveys]);

  const hits = useMemo(() => rank(index, q, 40), [index, q]);
  const other = market === "shifa" ? "qadisiyah" : "shifa";
  const qTokens = foldText(q).split(" ").filter(Boolean);
  const show = (text: string) => {
    if (!qTokens.length) return true;
    const hay = foldText(text);
    return qTokens.every((tk) => hay.includes(tk));
  };

  function run(fn: () => void) {
    haptic();
    setOpen(false);
    fn();
  }

  function openDealer(d: Dealership) {
    run(() => {
      const m = dealerMarket(d);
      if (m !== market) setMarket(m);
      requestFocus(d.id);
      void navigate({ to: "/" });
    });
  }

  function mapTool(kind: Parameters<typeof requestMapAction>[0]) {
    run(() => {
      requestMapAction(kind);
      void navigate({ to: "/" });
    });
  }

  const pages = [
    { to: "/", label: t.map, icon: MapIcon, key: "M" },
    { to: "/dashboard", label: t.dashboard, icon: BarChart3, key: "D" },
    { to: "/research", label: t.research, icon: Bot, key: "R" },
    { to: "/ops", label: t.ops, icon: Workflow, key: "O" },
    { to: "/ceo", label: "CEO brief", icon: Briefcase, key: "" },
  ] as const;

  const otherLabel = lang === "ar" ? MARKET_META[other].labelAr : MARKET_META[other].labelEn;
  const actions = [
    { id: "near", label: t.locateMe, icon: LocateFixed, search: `${t.locateMe} near gps`, run: () => mapTool("near") },
    { id: "add", label: t.addDealer, icon: MapPinPlus, search: `${t.addDealer} add new pin`, run: () => mapTool("add") },
    { id: "route", label: t.planRoute, icon: RouteIcon, search: `${t.planRoute} route walk`, run: () => mapTool("route") },
    { id: "list", label: t.list, icon: LayoutList, search: `${t.list} list export excel`, run: () => mapTool("list") },
    { id: "sat", label: `${t.satellite} / ${t.streets}`, icon: Satellite, search: `${t.satellite} ${t.streets} satellite`, run: () => mapTool("satellite") },
    { id: "market", label: t.palSwitchMarket, meta: otherLabel, icon: Repeat, search: `${t.palSwitchMarket} market ${MARKET_META[other].labelEn} ${MARKET_META[other].labelAr}`, run: () => run(() => setMarket(other)) },
    { id: "theme", label: t.palToggleTheme, icon: theme === "dark" ? Sun : Moon, search: `${t.palToggleTheme} theme dark light`, run: () => run(() => setTheme(theme === "dark" ? "light" : "dark")) },
    { id: "lang", label: t.palToggleLang, icon: Languages, search: `${t.palToggleLang} language arabic english`, run: () => run(() => setLang(lang === "en" ? "ar" : "en")) },
    { id: "sync", label: t.palSync, icon: CloudUpload, search: `${t.palSync} sync queue offline`, run: () => run(() => setSyncOpen(true)) },
  ];

  const itemCls =
    "group flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm text-fg outline-none data-[selected=true]:bg-primary data-[selected=true]:text-primary-fg";

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label={t.palette}
      shouldFilter={false}
      loop
      overlayClassName="qads-palette-overlay fixed inset-0 z-[80] bg-fg/35 backdrop-blur-[2px]"
      contentClassName="qads-palette fixed inset-x-2 top-[max(0.5rem,env(safe-area-inset-top))] z-[81] mx-auto flex max-h-[min(36rem,calc(var(--vvh,100dvh)-1rem))] max-w-xl flex-col overflow-hidden rounded-2xl sm:top-[12vh]"
    >
      <div className="flex items-center gap-2 border-b border-border px-3">
        <Search className="size-4 shrink-0 text-muted" />
        <Command.Input
          ref={inputRef}
          value={q}
          onValueChange={setQ}
          placeholder={voice.listening ? t.listening : t.palette}
          className="min-h-13 w-full min-w-0 bg-transparent py-3 text-base text-fg placeholder:text-faint focus-visible:outline-none"
        />
        {voice.supported ? (
          <button
            type="button"
            onClick={() => (voice.listening ? voice.stop() : voice.start())}
            aria-label={t.voiceSearch}
            aria-pressed={voice.listening}
            className={cn(
              "relative grid size-9 shrink-0 place-items-center rounded-full",
              voice.listening ? "qads-mic-live bg-status-red text-white" : "text-muted hover:bg-surface-2",
            )}
          >
            <Mic className="size-4" />
          </button>
        ) : null}
        <kbd className="hidden shrink-0 rounded-md border border-border px-1.5 py-0.5 text-[10px] font-semibold text-muted sm:block">ESC</kbd>
      </div>
      <Command.List className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5">
        <Command.Empty className="px-3 py-8 text-center text-sm text-muted">{t.palNoResults}</Command.Empty>

        {hits.length ? (
          <Command.Group heading={`${t.palShowrooms} · ${hits.length}`} className="qads-cmd-group">
            {hits.map((d) => {
              const m = dealerMarket(d);
              const primary = lang === "ar" && d.nameAr ? d.nameAr : d.nameEn;
              const secondary = lang === "ar" ? d.nameEn : d.nameAr;
              return (
                <Command.Item key={d.id} value={`dealer:${d.id}`} onSelect={() => openDealer(d)} className={itemCls}>
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-[10px] font-bold tabular-nums text-muted group-data-[selected=true]:bg-primary-fg/20 group-data-[selected=true]:text-primary-fg">
                    {(d.flags.sdId ?? "").replace(/^\D+/, "").slice(0, 4) || "•"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{primary}</span>
                    <span className="block truncate text-xs opacity-70">
                      {[secondary, d.flags.street, STATUS_LABEL[lang][d.status]].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full border border-current/20 px-2 py-0.5 text-[10px] font-semibold opacity-80">
                    {lang === "ar" ? MARKET_META[m].labelAr : MARKET_META[m].labelEn}
                  </span>
                </Command.Item>
              );
            })}
          </Command.Group>
        ) : null}

        {pages.some((p) => show(`${p.label} page go ${p.to}`)) ? (
        <Command.Group heading={t.palPages} className="qads-cmd-group">
          {pages.filter((p) => show(`${p.label} page go ${p.to}`)).map((p) => (
            <Command.Item key={p.to} value={`page ${p.label}`} onSelect={() => run(() => void navigate({ to: p.to }))} className={itemCls}>
              <p.icon className="size-4 shrink-0 opacity-80" />
              <span className="flex-1">{p.label}</span>
              {p.key ? <kbd className="hidden text-[10px] font-semibold opacity-60 sm:block">G {p.key}</kbd> : null}
            </Command.Item>
          ))}
        </Command.Group>
        ) : null}

        {actions.some((a) => show(a.search)) ? (
        <Command.Group heading={t.palActions} className="qads-cmd-group">
          {actions.filter((a) => show(a.search)).map((a) => (
            <Command.Item key={a.id} value={`action ${a.id}`} onSelect={a.run} className={itemCls}>
              <a.icon className="size-4 shrink-0 opacity-80" />
              <span className="flex-1">{a.label}</span>
              {a.meta ? <span className="text-xs opacity-70">{a.meta}</span> : null}
            </Command.Item>
          ))}
        </Command.Group>
        ) : null}
      </Command.List>
      <div className="hidden items-center gap-3 border-t border-border px-3 py-2 text-[11px] text-muted sm:flex">
        <span><kbd className="font-semibold">↑↓</kbd> navigate</span>
        <span><kbd className="font-semibold">↵</kbd> open</span>
        <span><kbd className="font-semibold">/</kbd> or <kbd className="font-semibold">⌘K</kbd> search</span>
        <span className="ms-auto"><kbd className="font-semibold">G</kbd> then <kbd className="font-semibold">M D R O</kbd></span>
      </div>
    </Command.Dialog>
  );
}
