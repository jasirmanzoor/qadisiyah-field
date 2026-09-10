import { Button } from "@/components/ui/button";
import { FigureBadge, StatusBadge } from "@/components/ui/field";
import { ClientOnly } from "@/components/client-only";
import { buildCsv, buildExcelXml, downloadBlob } from "@/lib/export";
import {
  DEFAULT_APPROVAL,
  DEFAULT_CAPTURE,
  DEFAULT_TAKE,
  nextInsight,
  runEngine,
  type InsightCategory,
} from "@/lib/engine";
import { COPY } from "@/lib/i18n";
import { MARKET_CENTERS } from "@/lib/geo";
import { MARKET_META, isDualLocation, sliceSnapshot } from "@/lib/markets";
import { MarketSwitch } from "@/components/market-switch";
import { pilotScore } from "@/lib/scoring";
import { formatNumber, formatPct, formatSar, formatSarCompact } from "@/lib/utils";
import { useField, surveyFor } from "@/stores/field";
import { usePrefs } from "@/stores/prefs";
import { RefreshCw } from "lucide-react";
import { lazy, Suspense, useMemo, useState } from "react";

const MapCanvas = lazy(() => import("../map/map-canvas").then((m) => ({ default: m.MapCanvas })));

const CATS: { id: InsightCategory | "all"; en: string; ar: string }[] = [
  { id: "all", en: "All", ar: "الكل" },
  { id: "financing", en: "Financing", ar: "تمويل" },
  { id: "market", en: "Market", ar: "سوق" },
  { id: "targeting", en: "Targets", ar: "أهداف" },
  { id: "scenario", en: "Plan", ar: "خطة" },
  { id: "coverage", en: "Coverage", ar: "تغطية" },
  { id: "risk", en: "Risk", ar: "مخاطر" },
  { id: "unit", en: "Unit", ar: "وحدة" },
];

export function DashboardPage() {
  const { lang, market } = usePrefs();
  const t = COPY[lang];
  const raw = useField((s) => s.snapshot);
  const snapshot = useMemo(() => sliceSnapshot(raw, market), [raw, market]);
  const gps = useField((s) => s.gps);
  const marketCenter = MARKET_CENTERS[market];
  const [observedOnly, setObservedOnly] = useState(false);
  const [heat, setHeat] = useState(true);
  const [capture, setCapture] = useState(DEFAULT_CAPTURE);
  const [take, setTake] = useState(DEFAULT_TAKE);
  const [approval, setApproval] = useState(DEFAULT_APPROVAL);
  const [cat, setCat] = useState<InsightCategory | "all">("all");
  const [insightId, setInsightId] = useState<string | null>(null);
  const [swapKey, setSwapKey] = useState(0);

  const engine = useMemo(
    () =>
      runEngine(snapshot, {
        observedOnly,
        capturePct: capture,
        takePct: take,
        approvalPct: approval,
        lang,
      }),
    [snapshot, observedOnly, capture, take, approval, lang],
  );

  const ranked = useMemo(
    () =>
      [...snapshot.dealerships]
        .map((d) => ({ d, score: pilotScore(d, surveyFor(snapshot, d.id)?.payload) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 8),
    [snapshot],
  );

  const pool = useMemo(() => {
    const p = cat === "all" ? engine.insights : engine.insights.filter((i) => i.category === cat);
    return p.length ? p : engine.insights;
  }, [engine.insights, cat]);
  const current = pool.find((i) => i.id === insightId) ?? pool[0] ?? nextInsight([], null, "all");

  function flashNext() {
    if (!current) return;
    const n = nextInsight(engine.insights, current.id, cat);
    setInsightId(n.id);
    setSwapKey((k) => k + 1);
  }

  function exportCsv() {
    const csv = buildCsv(snapshot.dealerships, snapshot.surveys, snapshot.photos);
    downloadBlob(`qadisiyah-field-${market}.csv`, "text/csv;charset=utf-8", csv);
  }
  function exportXls() {
    const xml = buildExcelXml(snapshot.dealerships, snapshot.surveys, snapshot.photos);
    downloadBlob(`qadisiyah-field-${market}.xls`, "application/vnd.ms-excel", xml);
  }

  const quality = current.evidence.quality;
  const qualityLabel =
    quality === "thin"
      ? t.thinSample
      : quality === "low"
        ? t.lowCoverage
        : quality === "medium"
          ? t.mediumCoverage
          : t.highCoverage;

  return (
    <div className="flex flex-col gap-4 overflow-auto px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight">{t.dashboard}</h1>
          <p className="text-xs text-muted">{market === "shifa" ? t.engineSubShifa : t.engineSub}</p>
        </div>
        <button
          type="button"
          onClick={() => setObservedOnly((v) => !v)}
          className="min-h-10 shrink-0 rounded-full bg-surface px-3 text-xs font-semibold shadow-[var(--shadow-border)]"
        >
          {observedOnly ? t.observedOnly : t.disclosedFigures}
        </button>
      </div>

      <MarketSwitch />

      {market === "shifa" ? (
        <section className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t.shifaBriefTitle}</p>
          <p className="mt-1 text-base font-semibold tracking-tight">
            {lang === "ar" ? MARKET_META.shifa.labelAr : MARKET_META.shifa.labelEn}
            <span className="ms-2 text-xs font-medium text-muted">{t.usedCarMarket}</span>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-fg">{t.shifaBrief}</p>
          <p className="mt-2 text-xs text-muted">{t.shifaCorridors}</p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-surface-2 px-3 py-2">
              <dt className="text-muted">{t.namedLots}</dt>
              <dd className="mt-0.5 text-base font-semibold tabular-nums">{snapshot.dealerships.length}</dd>
            </div>
            <div className="rounded-xl bg-surface-2 px-3 py-2">
              <dt className="text-muted">{t.publicGps}</dt>
              <dd className="mt-0.5 text-base font-semibold tabular-nums">
                {snapshot.dealerships.filter((d) => !d.flags.needsGps).length}
              </dd>
            </div>
            <div className="rounded-xl bg-surface-2 px-3 py-2">
              <dt className="text-muted">{t.usedOnlyLots}</dt>
              <dd className="mt-0.5 text-base font-semibold tabular-nums">
                {snapshot.surveys.filter((s) => s.payload.vehicleType === "used_only").length}
              </dd>
            </div>
            <div className="rounded-xl bg-surface-2 px-3 py-2">
              <dt className="text-muted">{t.bothMarkets}</dt>
              <dd className="mt-0.5 text-base font-semibold tabular-nums">
                {snapshot.dealerships.filter((d) => isDualLocation(d)).length}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-xs tabular-nums text-muted">
            {t.mappingSeed} · {t.surveyStarting}
          </p>
        </section>
      ) : null}

      <section className="rounded-[28px] bg-surface p-4 shadow-[var(--shadow-border)]">
        <div className="mb-3 flex flex-nowrap gap-1 overflow-x-auto pb-1">
          {CATS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setCat(c.id);
                setInsightId(null);
                setSwapKey((k) => k + 1);
              }}
              className={`min-h-9 shrink-0 rounded-full px-3 text-xs font-semibold ${
                cat === c.id ? "bg-primary text-primary-fg" : "bg-surface-2 text-muted"
              }`}
            >
              {lang === "ar" ? c.ar : c.en}
            </button>
          ))}
        </div>
        <article key={swapKey} className="insight-swap rounded-2xl bg-surface-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{current.title}</p>
            <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-muted">{qualityLabel}</span>
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{current.headline}</p>
          <p className="mt-2 text-sm leading-relaxed text-fg">{current.body}</p>
          <p className="mt-2 text-xs leading-relaxed text-muted">{current.why}</p>
          <p className="mt-3 text-[11px] text-muted">
            n={current.evidence.n}/{current.evidence.of}
            {current.evidence.observedOnly ? ` · ${t.observedOnly}` : ""}
            {` · ${engine.insights.length} ${t.derivations}`}
          </p>
        </article>
        <Button variant="secondary" className="mt-3 w-full" onClick={flashNext}>
          <RefreshCw className="size-4" />
          {t.refreshDerivation}
        </Button>
      </section>

      {engine.sampleN > 0 ? (
      <section className="grid grid-cols-2 gap-2">
        <HeroStat label={t.deskTam} value={formatSarCompact(engine.impliedWalkinGapGmv)} hint={t.perMonth} />
        <HeroStat label={t.financeGap} value={formatSarCompact(engine.impliedGapGmv)} hint={t.perMonth} />
        <HeroStat label={t.impliedGmv} value={formatSarCompact(engine.impliedMonthlyGmv)} hint={t.perMonth} />
        <HeroStat
          label={t.disclosedGmv}
          value={formatSarCompact(engine.sampleGmv)}
          hint={`${engine.sampleN} ${t.lotsDisclosed}`}
        />
      </section>
      ) : (
      <section className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <p className="text-sm leading-relaxed text-muted">{t.noVolumesYet}</p>
      </section>
      )}

      {engine.sampleN > 0 ? (
      <section className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <p className="text-sm font-medium">{t.planningSliders}</p>
        <p className="mt-1 text-xs text-muted">{t.planningHint}</p>
        <SliderRow
          label={t.captureRate}
          value={`${capture}%`}
          min={5}
          max={40}
          step={1}
          n={capture}
          onChange={setCapture}
        />
        <SliderRow
          label={t.approvalRate}
          value={`${approval}%`}
          min={30}
          max={90}
          step={5}
          n={approval}
          onChange={setApproval}
        />
        <SliderRow
          label={t.takeRate}
          value={`${take.toFixed(1)}%`}
          min={0.5}
          max={3}
          step={0.1}
          n={take}
          onChange={setTake}
        />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <StatCard
            label={t.fundedGmv}
            value={formatSarCompact(engine.capturedMonthlyGmv != null ? engine.capturedMonthlyGmv * 12 : null)}
          />
          <StatCard label={t.annualTake} value={formatSarCompact(engine.annualOrigination)} />
          <StatCard label={t.monthlyDeals} value={formatNumber(engine.monthlyDeals)} />
          <StatCard label={t.sampleFpr} value={formatPct(engine.sampleFpr != null ? engine.sampleFpr * 100 : null)} />
        </div>
      </section>
      ) : null}

      <section className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{t.walked}</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">
          {engine.walked}/{engine.universe}
          <span className="ms-2 text-base font-medium text-muted">
            {formatPct(engine.universe ? (engine.walked / engine.universe) * 100 : 0)}
          </span>
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full bg-primary"
            style={{ width: `${engine.universe ? (engine.walked / engine.universe) * 100 : 0}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-muted">
          {t.deepComplete} {engine.complete} · {engine.independents} {t.independents} · {engine.needsGps}{" "}
          {t.interpolatedGps}
          {engine.trained
            ? ` · ${engine.trained} ${t.trainedFilter} · ${engine.trainingPriority} ${t.trainedActive}`
            : ""}
        </p>
      </section>

      <section className="overflow-hidden rounded-2xl bg-surface shadow-[var(--shadow-border)]">
        <div className="flex items-center justify-between px-4 py-2">
          <p className="text-sm font-medium">Coverage</p>
          <button type="button" className="text-xs text-muted" onClick={() => setHeat((v) => !v)}>
            {heat ? "Heat" : "Pins"}
          </button>
        </div>
        <div className="relative h-52 w-full bg-surface-2">
          <ClientOnly fallback={<div className="grid h-full place-items-center text-xs text-muted">Map</div>}>
            <Suspense fallback={null}>
              <MapCanvas
                key={market}
                dealers={snapshot.dealerships}
                selectedId={null}
                onSelect={() => undefined}
                satellite={false}
                me={gps}
                route={[]}
                heat={heat}
                origin={marketCenter}
                focus={{ lat: marketCenter.lat, lng: marketCenter.lng, zoom: marketCenter.zoom, nonce: market === "shifa" ? 2 : 1 }}
              />
            </Suspense>
          </ClientOnly>
        </div>
      </section>

      <MixBlock title={t.vehicleMix} slices={engine.typeMix} />
      <MixBlock title={t.aspMix} slices={engine.aspMix} />
      <MixBlock title={t.brandMix} slices={engine.brandMix} />
      <MixBlock title={t.corridorMix} slices={engine.streetMix} />

      <section className="grid grid-cols-2 gap-2">
        <StatCard label={t.inventory} value={formatNumber(engine.inventoryUnits)} />
        <StatCard label={t.stockValue} value={formatSarCompact(engine.stockValue)} />
        <StatCard label={t.avgPrice} value={formatSar(engine.medianAsp)} />
        <StatCard label={t.salesmen} value={formatNumber(engine.avgSalesmen, 1)} />
        <StatCard label={t.mapsPins} value={formatNumber(engine.withMaps)} />
        <StatCard label={t.namedStreets} value={formatNumber(engine.withStreet)} />
        <StatCard label={t.trainedFilter} value={formatNumber(engine.trained)} />
        <StatCard label={t.trainingHold} value={formatNumber(engine.trainingHold)} />
      </section>

      <RankBlock title={t.whiteSpace} rows={engine.whiteSpace} empty={t.noWhiteSpace} />
      <RankBlock title={t.topStock} rows={engine.topByStock} empty="—" />
      <RankBlock title={t.topGap} rows={engine.topByGap} empty={t.thinSample} />

      <section className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <p className="mb-3 text-sm font-medium">{t.score}</p>
        <ul className="flex flex-col gap-2">
          {ranked.map(({ d, score }) => {
            const s = surveyFor(snapshot, d.id)?.payload;
            return (
              <li key={d.id} className="flex items-center gap-2">
                <span className="w-8 tabular-nums text-sm font-semibold">{score}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{d.nameEn}</span>
                <StatusBadge status={d.status} />
                <FigureBadge source={s?.volumeFiguresAre} />
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid grid-cols-2 gap-2 pb-4">
        <Button variant="secondary" onClick={exportCsv}>
          {t.exportCsv}
        </Button>
        <Button onClick={exportXls}>{t.exportExcel}</Button>
      </div>
    </div>
  );
}

function HeroStat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-surface p-3 shadow-[var(--shadow-border)]">
      <p className="text-[11px] leading-snug text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight">{value}</p>
      {hint ? <p className="text-[11px] text-faint">{hint}</p> : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface p-3 shadow-[var(--shadow-border)]">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight">{value}</p>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  n,
  onChange,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  n: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="mt-3 block">
      <span className="flex items-center justify-between text-xs font-medium">
        {label}
        <span className="tabular-nums text-muted">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={n}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 h-8 w-full accent-[var(--primary)]"
      />
    </label>
  );
}

function MixBlock({
  title,
  slices,
}: {
  title: string;
  slices: { key: string; label: string; n: number; share: number }[];
}) {
  if (!slices.length) return null;
  return (
    <section className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <p className="mb-3 text-sm font-medium">{title}</p>
      <ul className="flex flex-col gap-2">
        {slices.map((s) => (
          <li key={s.key}>
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="min-w-0 truncate">{s.label}</span>
              <span className="shrink-0 tabular-nums text-muted">
                {formatNumber(s.n)} · {formatPct(s.share * 100)}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, s.share * 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RankBlock({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: { id: string; name: string; sdId?: string; label: string; note: string }[];
  empty: string;
}) {
  return (
    <section className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <p className="mb-3 text-sm font-medium">{title}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.id} className="flex items-baseline gap-2">
              <span className="min-w-0 flex-1 truncate text-sm">
                {r.sdId ? <span className="me-1 text-[11px] text-muted">{r.sdId}</span> : null}
                {r.name}
              </span>
              <span className="shrink-0 text-xs tabular-nums font-semibold">{r.label}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
