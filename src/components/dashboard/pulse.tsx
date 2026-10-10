import { useMemo, useState } from "react";
import { COPY, type Lang } from "@/lib/i18n";
import { isDeepDived, isSurveyedShowroom } from "@/lib/survey-schema";
import type { Snapshot } from "@/lib/types";
import { displaySurvey } from "@/components/map/map-notes";
import { surveyFor } from "@/stores/field";
import { cn } from "@/lib/utils";

const DAYS = 14;

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Live field-progress strip: rings, coverage funnel and a 14-day activity chart. */
export function PulseSection({ snapshot, lang }: { snapshot: Snapshot; lang: Lang }) {
  const t = COPY[lang];
  const [hover, setHover] = useState<number | null>(null);

  const stats = useMemo(() => {
    let surveyed = 0;
    let deep = 0;
    let gps = 0;
    let trained = 0;
    for (const d of snapshot.dealerships) {
      const payload = displaySurvey(d, surveyFor(snapshot, d.id)?.payload);
      if (isSurveyedShowroom(d.status, payload)) surveyed += 1;
      if (isDeepDived(payload)) deep += 1;
      if (!d.flags.needsGps && !d.flags.unplaced && d.lat !== 0) gps += 1;
      if (d.flags.trainingStage === "trained") trained += 1;
    }
    const pins = snapshot.dealerships.length;

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (DAYS - 1));
    const days = Array.from({ length: DAYS }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      return { date: d, key: dayKey(d), n: 0 };
    });
    const byKey = new Map(days.map((d) => [d.key, d]));
    const bump = (iso: string | null | undefined) => {
      if (!iso) return;
      const at = new Date(iso);
      if (Number.isNaN(at.getTime()) || at < start) return;
      const slot = byKey.get(dayKey(at));
      if (slot) slot.n += 1;
    };
    for (const s of snapshot.surveys) bump(s.updatedAt);
    for (const p of snapshot.photos) bump(p.capturedAt);
    for (const d of snapshot.dealerships) if (d.createdAt !== d.updatedAt) bump(d.updatedAt);
    const today = days[DAYS - 1].n;
    const week = days.slice(-7).reduce((a, d) => a + d.n, 0);
    const prevWeek = days.slice(0, 7).reduce((a, d) => a + d.n, 0);
    const max = Math.max(1, ...days.map((d) => d.n));

    return { pins, surveyed, deep, gps, trained, days, today, week, prevWeek, max };
  }, [snapshot]);

  const pct = (n: number) => (stats.pins ? Math.round((n / stats.pins) * 100) : 0);
  const funnel = [
    { label: t.pinsEstablished, n: stats.pins },
    { label: t.surveyedCat, n: stats.surveyed },
    { label: t.deepDived, n: stats.deep },
    { label: t.trainedFilter, n: stats.trained },
  ];
  const trend = stats.prevWeek ? Math.round(((stats.week - stats.prevWeek) / stats.prevWeek) * 100) : null;
  const shown = hover ?? DAYS - 1;
  const fmtDay = (d: Date) => d.toLocaleDateString(lang === "ar" ? "ar-u-ca-gregory-nu-latn" : "en-GB", { weekday: "short", day: "numeric", month: "short" });

  return (
    <section className="qads-pulse overflow-hidden rounded-[28px] p-4 shadow-[var(--shadow-border)]">
      <div className="flex items-baseline justify-between gap-3">
        <p className="inspect-kicker">
          <span className="qads-live-dot size-1.5 rounded-full bg-status-green" />
          {t.pulseTitle}
        </p>
        <p className="text-[11px] text-muted tabular-nums">
          <span className="font-semibold text-fg">{stats.today}</span> {t.pulseToday} ·{" "}
          <span className="font-semibold text-fg">{stats.week}</span> {t.pulseWeek}
          {trend != null ? (
            <span className={cn("ms-1 font-semibold", trend >= 0 ? "text-status-green" : "text-status-red")}>
              {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
            </span>
          ) : null}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Ring label={t.surveyedCat} value={stats.surveyed} of={stats.pins} pct={pct(stats.surveyed)} tone="var(--primary)" />
        <Ring label={t.deepDived} value={stats.deep} of={stats.pins} pct={pct(stats.deep)} tone="var(--gold)" />
        <Ring label="GPS" value={stats.gps} of={stats.pins} pct={pct(stats.gps)} tone="var(--status-green)" />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1.15fr]">
        <div>
          <p className="text-xs font-semibold text-muted">{t.pulseFunnel}</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {funnel.map((f, i) => {
              const w = stats.pins ? Math.max(3, (f.n / stats.pins) * 100) : 0;
              const conv = i > 0 && funnel[i - 1].n ? Math.round((f.n / funnel[i - 1].n) * 100) : null;
              return (
                <li key={f.label} className="relative h-9 overflow-hidden rounded-xl bg-surface-2">
                  <div
                    className="absolute inset-y-0 start-0"
                    style={{
                      width: `${w}%`,
                      background: `color-mix(in oklab, var(--primary) ${92 - i * 18}%, var(--gold))`,
                      transition: "width 700ms var(--ease-out)",
                    }}
                  />
                  <div className="relative flex h-full items-center justify-between gap-2 px-3 text-xs">
                    <span className={cn("truncate font-semibold", w > 40 ? "text-primary-fg" : "text-fg")}>{f.label}</span>
                    <span className={cn("flex shrink-0 items-baseline gap-1.5 tabular-nums font-semibold", w > 82 ? "text-primary-fg" : "text-fg")}>
                      <span>{f.n}</span>
                      {conv != null ? <span className="font-medium opacity-70" dir="ltr">{conv}%</span> : null}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs font-semibold text-muted">{t.pulseActivity}</p>
            <p className="text-[11px] tabular-nums text-muted">
              {fmtDay(stats.days[shown].date)} · <span className="font-semibold text-fg">{stats.days[shown].n}</span> {t.updates}
            </p>
          </div>
          <div className="relative mt-2 flex h-[7.25rem] items-end gap-[3px]" onMouseLeave={() => setHover(null)} role="img" aria-label={t.pulseActivity}>
            {stats.week + stats.prevWeek === 0 ? (
              <p className="pointer-events-none absolute inset-0 grid place-items-center px-6 text-center text-xs text-muted">
                {lang === "ar" ? "لا تحديثات ميدانية خلال 14 يوماً. ستظهر هنا مع كل زيارة وصورة." : "No field updates in 14 days. Every visit, photo and note will chart here."}
              </p>
            ) : null}
            {stats.days.map((d, i) => {
              const h = d.n ? Math.max(6, (d.n / stats.max) * 100) : 3;
              const isToday = i === DAYS - 1;
              return (
                <button
                  key={d.key}
                  type="button"
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onClick={() => setHover(i)}
                  className="group flex h-full min-w-0 flex-1 items-end rounded-md"
                  aria-label={`${fmtDay(d.date)}: ${d.n}`}
                >
                  <span
                    className={cn("block w-full rounded-[5px] transition-[height,opacity] duration-500", shown === i ? "opacity-100" : "opacity-70 group-hover:opacity-100")}
                    style={{
                      height: `${h}%`,
                      background: isToday ? "var(--gold)" : d.n ? "var(--primary)" : "var(--surface-2)",
                    }}
                  />
                </button>
              );
            })}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-faint tabular-nums">
            <span>{fmtDay(stats.days[0].date)}</span>
            <span>{t.pulseToday}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function Ring({ label, value, of, pct, tone }: { label: string; value: number; of: number; pct: number; tone: string }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-surface p-2.5 text-center shadow-[var(--shadow-border)] sm:flex-row sm:gap-2.5 sm:text-start">
      <div className="relative grid size-14 shrink-0 place-items-center">
        <svg viewBox="0 0 52 52" className="absolute inset-0 size-full -rotate-90">
          <circle cx="26" cy="26" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="5" />
          <circle
            cx="26"
            cy="26"
            r={r}
            fill="none"
            stroke={tone}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct / 100)}
            style={{ transition: "stroke-dashoffset 800ms var(--ease-out)" }}
          />
        </svg>
        <span className="text-xs font-bold tabular-nums">{pct}%</span>
      </div>
      <div className="min-w-0 max-w-full">
        <p className="truncate text-[11px] text-muted">{label}</p>
        <p className="text-lg font-semibold leading-tight tabular-nums tracking-tight">
          {value}
          <span className="ms-1 text-[10px] font-medium text-faint">/ {of}</span>
        </p>
      </div>
    </div>
  );
}
