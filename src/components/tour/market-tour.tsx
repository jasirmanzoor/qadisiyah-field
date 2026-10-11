import { Link } from "@tanstack/react-router";
import { Pause, Play, Search, SkipBack, SkipForward } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { MarketSwitch } from "@/components/market-switch";
import { displaySurvey } from "@/components/map/map-notes";
import { MARKET_CENTERS } from "@/lib/geo";
import { STATUS_LABEL } from "@/lib/i18n";
import { dealersInMarket, marketCounts, MARKET_META } from "@/lib/markets";
import { dealerSerials } from "@/lib/serial";
import { isSurveyedShowroom } from "@/lib/survey-schema";
import type { Dealership, SurveyPayload } from "@/lib/types";
import { formatNumber, formatSar } from "@/lib/utils";
import { surveyFor, useField } from "@/stores/field";
import { usePrefs } from "@/stores/prefs";
import type { TourFocus } from "./tour-map";

type MapModule = typeof import("./tour-map");

const SOLD: Record<string, string> = {
  "0_20": "0–20",
  "21_50": "21–50",
  "51_100": "51–100",
  "100plus": "100+",
  refused: "Refused",
};
const FINANCED: Record<string, string> = {
  "0_5": "0–5",
  "6_15": "6–15",
  "16_40": "16–40",
  "40plus": "40+",
  refused: "Refused",
};

function sourceText(value: string | undefined): string {
  if (value === "observed") return "Observed";
  if (value === "self_reported") return "Self-reported";
  if (value === "mixed") return "Mixed";
  return "";
}

function counted(value: number | null | undefined, source: string | undefined, observedOnly: boolean) {
  if (value == null || !Number.isFinite(value)) return false;
  if (!observedOnly) return true;
  return source === "observed";
}

export function MarketTour() {
  const { lang, market } = usePrefs();
  const ar = lang === "ar";
  const snapshot = useField((s) => s.snapshot);
  const [MapView, setMapView] = useState<MapModule["TourMap"] | null>(null);
  const [intro, setIntro] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [showPath, setShowPath] = useState(true);
  const [observedOnly, setObservedOnly] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [focus, setFocus] = useState<TourFocus | null>(null);

  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selectedId;

  useEffect(() => {
    let live = true;
    import("./tour-map").then((mod) => {
      if (live) setMapView(() => mod.TourMap);
    });
    return () => {
      live = false;
    };
  }, []);

  const roster = useMemo(
    () => dealersInMarket(snapshot.dealerships, market),
    [snapshot.dealerships, market],
  );
  const counts = useMemo(() => marketCounts(snapshot.dealerships), [snapshot.dealerships]);
  const serials = useMemo(() => dealerSerials(roster), [roster]);
  const placed = useMemo(() => {
    return roster
      .filter((d) => !d.flags.unplaced && d.lat !== 0 && d.lng !== 0)
      .sort((a, b) => (serials.get(a.id) ?? 0) - (serials.get(b.id) ?? 0));
  }, [roster, serials]);

  const surveyOf = (dealer: Dealership): SurveyPayload | undefined =>
    displaySurvey(dealer, surveyFor(snapshot, dealer.id)?.payload);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return placed;
    return placed.filter((d) => {
      const survey = surveyOf(d);
      const hay = `${d.flags.sdId ?? ""} ${d.nameEn} ${d.nameAr} ${d.listedPhone} ${d.flags.street ?? ""} ${(survey?.mainBrands ?? []).join(" ")}`;
      return hay.toLowerCase().includes(q);
    });
  }, [placed, query, snapshot.surveys]);

  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  const dimmed = useMemo(() => {
    if (!query.trim()) return new Set<string>();
    const keep = new Set(visible.map((d) => d.id));
    return new Set(placed.filter((d) => !keep.has(d.id)).map((d) => d.id));
  }, [placed, visible, query]);

  const selected = placed.find((d) => d.id === selectedId) ?? null;
  const selectedSurvey = selected ? surveyOf(selected) : undefined;
  const meta = MARKET_META[market];
  const center = MARKET_CENTERS[market];

  const figures = useMemo(() => {
    let surveyed = 0;
    let inventory = 0;
    let inventoryN = 0;
    let asp = 0;
    let aspN = 0;
    for (const dealer of placed) {
      const survey = surveyOf(dealer);
      if (isSurveyedShowroom(dealer.status, survey)) surveyed += 1;
      if (counted(survey?.inventoryUnits, survey?.inventorySource, observedOnly) && survey?.inventoryUnits != null) {
        inventory += survey.inventoryUnits;
        inventoryN += 1;
      }
      if (
        counted(survey?.avgSellingPriceSar, survey?.avgPriceSource, observedOnly) &&
        survey?.avgSellingPriceSar != null
      ) {
        asp += survey.avgSellingPriceSar;
        aspN += 1;
      }
    }
    return {
      doors: roster.length,
      placed: placed.length,
      unplaced: roster.length - placed.length,
      surveyed,
      inventory,
      inventoryN,
      asp: aspN ? Math.round(asp / aspN) : null,
      aspN,
    };
  }, [placed, roster.length, snapshot.surveys, observedOnly]);

  function focusStop(dealer: Dealership, zoom = 18) {
    setSelectedId(dealer.id);
    setFocus({ lat: dealer.lat, lng: dealer.lng, zoom, nonce: Date.now() });
    setIntro(false);
  }

  function step(delta: number) {
    const list = visibleRef.current;
    if (!list.length) return;
    const current = list.findIndex((d) => d.id === selectedRef.current);
    const next = list[(current < 0 ? (delta > 0 ? 0 : list.length - 1) : current + delta + list.length) % list.length];
    if (next) focusStop(next);
  }

  useEffect(() => {
    setSelectedId(null);
    setPlaying(false);
    setIntro(true);
    setQuery("");
    setFocus({ lat: center.lat, lng: center.lng, zoom: center.zoom, nonce: Date.now() });
  }, [market, center.lat, center.lng, center.zoom]);

  useEffect(() => {
    if (!playing || intro) return;
    const id = window.setInterval(() => step(1), 5200);
    return () => window.clearInterval(id);
  }, [playing, intro, selectedId, query, market]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
      if (event.key === " ") {
        event.preventDefault();
        setIntro(false);
        setPlaying((v) => !v);
      }
      if (event.key === "Escape") {
        setSelectedId(null);
        setRosterOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function begin(autoplay: boolean) {
    const list = visible.length ? visible : placed;
    const current = list.find((d) => d.id === selectedId) ?? list[0];
    setIntro(false);
    setPlaying(autoplay && Boolean(current));
    if (current) focusStop(current);
  }

  const tourAt = visible.findIndex((d) => d.id === selectedId);
  const path = useMemo(
    () => (query.trim() ? visible : placed).map((d) => [d.lat, d.lng] as [number, number]),
    [placed, visible, query],
  );
  const stops = useMemo(
    () =>
      placed.map((d) => ({
        id: d.id,
        lat: d.lat,
        lng: d.lng,
        n: serials.get(d.id) ?? 0,
        status: d.status,
      })),
    [placed, serials],
  );

  const title = ar ? meta.labelAr : meta.labelEn;
  const sub = ar ? meta.subAr : meta.subEn;

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden bg-bg text-fg">
      <div className="absolute inset-0 z-0">
        {MapView ? (
          <MapView
            stops={stops}
            selectedId={selectedId}
            dimmed={dimmed}
            showPath={showPath}
            path={path}
            focus={focus}
            onSelect={(id) => {
              const dealer = placed.find((d) => d.id === id);
              if (!dealer) return;
              setPlaying(false);
              focusStop(dealer);
            }}
          />
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted">
            {ar ? "جارٍ فتح الخريطة" : "Opening the corridor"}
          </div>
        )}
      </div>
      <div className="tour-vignette pointer-events-none absolute inset-0 z-[1]" />

      <header className="tour-glass absolute inset-x-3 top-3 z-30 flex flex-wrap items-center gap-2 rounded-2xl px-3 py-2 md:inset-x-4">
        <div className="min-w-0 pr-1">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-status-amber uppercase">{sub}</p>
          <h1 className="text-base font-semibold tracking-tight">{title}</h1>
        </div>
        <div className="w-full sm:w-56">
          <MarketSwitch counts={counts} compact />
        </div>
        <label className="flex min-w-40 flex-1 items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
          <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={ar ? "اسم، علامة، هاتف، رقم" : "Name, brand, phone, ID"}
            className="w-full bg-transparent text-sm outline-none placeholder:text-faint"
            aria-label={ar ? "بحث" : "Search showrooms"}
            suppressHydrationWarning
          />
        </label>
        <div className="flex flex-wrap gap-1.5">
          <Chip on={observedOnly} onClick={() => setObservedOnly((v) => !v)} label={ar ? "المرصود فقط" : "Observed only"} />
          <Chip on={showPath} onClick={() => setShowPath((v) => !v)} label={ar ? "مسار المسح" : "Walk path"} />
          <Chip on={rosterOpen} onClick={() => setRosterOpen((v) => !v)} label={ar ? "القائمة" : "Roster"} />
          <Link to="/field" className="inline-flex min-h-9 items-center rounded-full px-3 text-xs font-semibold text-muted">
            {ar ? "أدوات الميدان" : "Field tools"}
          </Link>
        </div>
      </header>

      <section className="tour-glass absolute top-36 left-3 z-30 hidden w-64 rounded-2xl p-4 md:top-32 md:block">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">
          {ar ? "كما هو مسجّل" : "As recorded"}
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-3">
          <Stat label={ar ? "على الخريطة" : "On the map"} value={formatNumber(figures.placed)} />
          <Stat label={ar ? "بمسح" : "Surveyed"} value={formatNumber(figures.surveyed)} />
          <Stat
            label={ar ? "المخزون" : "Inventory"}
            value={figures.inventoryN ? formatNumber(figures.inventory) : "—"}
            hint={figures.inventoryN ? `${figures.inventoryN}` : ""}
          />
          <Stat
            label={ar ? "متوسط السعر" : "Avg price"}
            value={figures.asp != null ? formatSar(figures.asp) : "—"}
            hint={figures.aspN ? `${figures.aspN}` : ""}
          />
        </dl>
        {figures.unplaced > 0 ? (
          <p className="mt-3 text-[11px] text-muted">
            {figures.unplaced} {ar ? "بدون إحداثية" : "without a pin"}
          </p>
        ) : null}
        {observedOnly ? (
          <p className="mt-2 text-[11px] leading-snug text-muted">
            {ar
              ? "المجاميع تعرض الأرقام المرصودة فقط. السجلات نفسها لم تتغير."
              : "Totals use observed figures only. The records themselves are unchanged."}
          </p>
        ) : null}
      </section>

      {selected ? (
        <article className="tour-glass absolute inset-x-3 bottom-20 z-30 max-h-[46%] overflow-auto rounded-2xl p-4 md:inset-x-auto md:top-32 md:right-4 md:bottom-auto md:max-h-[calc(100%-10rem)] md:w-[22rem]">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-status-amber uppercase">
            {selected.flags.sdId || "—"} · {tourAt >= 0 ? `${tourAt + 1}/${visible.length}` : `${visible.length}`}
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">{selected.nameEn || selected.nameAr}</h2>
          {selected.nameAr && selected.nameEn ? (
            <p className="text-sm text-muted" dir="rtl">
              {selected.nameAr}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-surface-2 px-2 py-1 text-[11px] font-semibold">
              {STATUS_LABEL[lang][selected.status] ?? selected.status}
            </span>
            {selected.flags.street ? (
              <span className="rounded-full bg-surface-2 px-2 py-1 text-[11px]">{selected.flags.street}</span>
            ) : null}
            {selected.flags.authorised ? (
              <span className="rounded-full bg-surface-2 px-2 py-1 text-[11px]">
                {selected.flags.authorisedBrand || (ar ? "وكيل" : "Authorised")}
              </span>
            ) : null}
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <Row label={ar ? "الهاتف" : "Phone"} value={selected.listedPhone} />
            <Row
              label={ar ? "المخزون" : "Inventory"}
              value={selectedSurvey?.inventoryUnits != null ? formatNumber(selectedSurvey.inventoryUnits) : ""}
              source={sourceText(selectedSurvey?.inventorySource)}
            />
            <Row
              label={ar ? "المساحة" : "Size"}
              value={selectedSurvey?.showroomSizeSqm != null ? `${formatNumber(selectedSurvey.showroomSizeSqm)} m²` : ""}
              source={sourceText(selectedSurvey?.showroomSizeSource)}
            />
            <Row
              label={ar ? "متوسط البيع" : "Avg price"}
              value={selectedSurvey?.avgSellingPriceSar != null ? formatSar(selectedSurvey.avgSellingPriceSar) : ""}
              source={sourceText(selectedSurvey?.avgPriceSource)}
            />
            <Row
              label={ar ? "مبيعات شهرية" : "Monthly sold"}
              value={
                selectedSurvey?.monthlySoldExact != null
                  ? formatNumber(selectedSurvey.monthlySoldExact)
                  : SOLD[selectedSurvey?.avgMonthlySold ?? ""] ?? ""
              }
            />
            <Row
              label={ar ? "تمويل شهري" : "Monthly financed"}
              value={
                selectedSurvey?.monthlyFinancedExact != null
                  ? formatNumber(selectedSurvey.monthlyFinancedExact)
                  : FINANCED[selectedSurvey?.avgMonthlyFinanced ?? ""] ?? ""
              }
            />
            <Row label="FPR" value={selectedSurvey?.fpr != null ? String(selectedSurvey.fpr) : ""} />
            <Row
              label={ar ? "البائعون" : "Salesmen"}
              value={selectedSurvey?.salesmenCount != null ? formatNumber(selectedSurvey.salesmenCount) : ""}
              source={sourceText(selectedSurvey?.salesmenSource)}
            />
            <Row
              label={ar ? "العلامات" : "Brands"}
              value={(selectedSurvey?.mainBrands ?? []).filter(Boolean).join(", ")}
            />
            <Row label={ar ? "جهة الاتصال" : "Contact"} value={selectedSurvey?.pocName ?? ""} />
            <Row label={ar ? "ملاحظات" : "Notes"} value={selectedSurvey?.notes ?? ""} />
          </dl>
        </article>
      ) : null}

      {rosterOpen ? (
        <aside className="tour-glass absolute inset-y-24 left-3 z-30 w-[min(100%-1.5rem,20rem)] overflow-auto rounded-2xl p-2">
          {visible.map((dealer, index) => {
            const on = dealer.id === selectedId;
            return (
              <button
                key={dealer.id}
                type="button"
                onClick={() => {
                  setPlaying(false);
                  focusStop(dealer);
                }}
                className={`flex w-full items-baseline gap-2 rounded-xl px-3 py-2 text-left ${on ? "bg-primary text-primary-fg" : "hover:bg-surface-2"}`}
              >
                <span className="w-8 shrink-0 text-xs tabular-nums opacity-70">{serials.get(dealer.id)}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{dealer.nameEn || dealer.nameAr}</span>
                <span className="text-[10px] opacity-70">{index + 1}</span>
              </button>
            );
          })}
        </aside>
      ) : null}

      <footer className="tour-glass absolute inset-x-3 bottom-3 z-30 flex items-center gap-2 rounded-2xl px-2 py-1.5 md:inset-x-auto md:bottom-4 md:left-1/2 md:-translate-x-1/2">
        <button type="button" className="grid size-11 place-items-center rounded-xl" onClick={() => step(-1)} aria-label="Previous">
          <SkipBack className="size-4" />
        </button>
        <button
          type="button"
          className="grid size-11 place-items-center rounded-xl bg-primary text-primary-fg"
          onClick={() => {
            if (intro) begin(!playing);
            else setPlaying((v) => !v);
          }}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
        <button type="button" className="grid size-11 place-items-center rounded-xl" onClick={() => step(1)} aria-label="Next">
          <SkipForward className="size-4" />
        </button>
        <p className="min-w-0 pe-2 text-xs text-muted">
          {selected
            ? `${tourAt >= 0 ? tourAt + 1 : "—"} / ${visible.length}`
            : ar
              ? `${formatNumber(figures.placed)} باب`
              : `${formatNumber(figures.placed)} doors`}
        </p>
      </footer>

      {intro ? (
        <div className="absolute inset-0 z-40 grid place-items-center bg-bg/55 px-4 backdrop-blur-[2px]">
          <div className="tour-glass w-full max-w-md rounded-3xl p-6">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-status-amber uppercase">{sub}</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {ar
                ? `${formatNumber(figures.placed)} باباً على الخريطة، ${formatNumber(figures.surveyed)} بسجل مسح. الجولة تعرض السجلات كما هي.`
                : `${formatNumber(figures.placed)} doors on the map, ${formatNumber(figures.surveyed)} with a survey record. The walk shows those records as they stand.`}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-fg"
                onClick={() => begin(true)}
              >
                {ar ? "ابدأ المسار" : "Walk the market"}
              </button>
              <button
                type="button"
                className="min-h-11 rounded-xl bg-surface-2 px-4 text-sm font-semibold"
                onClick={() => begin(false)}
              >
                {ar ? "استكشف" : "Explore"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Chip({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-9 rounded-full px-3 text-xs font-semibold ${on ? "bg-primary text-primary-fg" : "bg-surface-2 text-muted"}`}
      aria-pressed={on}
    >
      {label}
    </button>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="text-[10px] font-medium tracking-wide text-muted uppercase">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums tracking-tight">
        {value}
        {hint ? <span className="ms-1 text-[10px] font-medium text-muted">{hint}</span> : null}
      </dd>
    </div>
  );
}

function Row({ label, value, source }: { label: string; value: string; source?: string }) {
  if (!value.trim()) return null;
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/70 pb-2">
      <dt className="shrink-0 text-xs text-muted">{label}</dt>
      <dd className="text-end text-sm font-medium">
        {value}
        {source ? <span className="mt-0.5 block text-[10px] font-semibold tracking-wide text-status-amber uppercase">{source}</span> : null}
      </dd>
    </div>
  );
}
