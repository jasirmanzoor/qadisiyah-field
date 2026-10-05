import { Link } from "@tanstack/react-router";
import { displaySurvey } from "@/components/map/map-notes";
import { tx } from "@/lib/intel";
import { dealersInMarket, MARKET_META, marketCounts } from "@/lib/markets";
import { isDeepDived, isSurveyedShowroom } from "@/lib/survey-schema";
import type { Dealership, MarketId, SurveyPayload } from "@/lib/types";
import { useField, surveyFor } from "@/stores/field";
import { usePrefs } from "@/stores/prefs";
import { useMemo } from "react";

function lane(dealers: Dealership[], surveyOf: (d: Dealership) => SurveyPayload | undefined) {
  let surveyed = 0;
  let deep = 0;
  const deepNames: string[] = [];
  for (const d of dealers) {
    const payload = surveyOf(d);
    const isDeep = isDeepDived(payload);
    if (isDeep) {
      deep += 1;
      if (deepNames.length < 8) deepNames.push(d.nameEn);
    }
    if (isSurveyedShowroom(d.status, payload)) surveyed += 1;
  }
  const pins = dealers.length;
  return { pins, surveyed, deep, pending: Math.max(0, pins - surveyed), deepNames };
}

export function CeoPage() {
  const lang = usePrefs((s) => s.lang);
  const snapshot = useField((s) => s.snapshot);
  const counts = useMemo(() => marketCounts(snapshot.dealerships), [snapshot.dealerships]);
  const stats = useMemo(() => {
    const surveyOf = (d: Dealership) => displaySurvey(d, surveyFor(snapshot, d.id)?.payload);
    const by = (market: MarketId) => lane(dealersInMarket(snapshot.dealerships, market), surveyOf);
    const q = by("qadisiyah");
    const s = by("shifa");
    return {
      q,
      s,
      total: {
        pins: q.pins + s.pins,
        surveyed: q.surveyed + s.surveyed,
        deep: q.deep + s.deep,
        pending: q.pending + s.pending,
      },
    };
  }, [snapshot]);

  return (
    <div className="mx-auto h-full w-full max-w-3xl overflow-auto px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{tx(lang, "Leadership view", "عرض الإدارة")}</p>
      <h1 className="text-2xl font-semibold tracking-tight">{tx(lang, "CEO brief", "موجز الرئيس")}</h1>
      <p className="mt-1 text-sm text-muted">
        {tx(lang, "Read-only. Counts and figures come from the field roster only. Web research is not mixed in.", "للقراءة فقط. الأرقام من السجل الميداني فقط. بحث الويب غير مدمج.")}
      </p>
      <p className="mt-3 rounded-xl bg-surface px-3 py-2 text-sm font-semibold shadow-[var(--shadow-border)]">
        {tx(lang, "Al Qadisiyah", "القادسية")} {counts.qadisiyah}
        {" · "}
        {tx(lang, "Al Shifa", "الشفا")} {counts.shifa}
        {" · "}
        {tx(lang, "Total", "المجموع")} {counts.qadisiyah + counts.shifa}
        {" · "}
        {tx(lang, "write-locked", "مقفل للكتابة")}
      </p>

      <div className="mt-3 grid grid-cols-4 gap-1.5">
        <Kpi label={tx(lang, "Pins", "دبابيس")} value={stats.total.pins} />
        <Kpi label={tx(lang, "Surveyed", "ممسوح")} value={stats.total.surveyed} />
        <Kpi label={tx(lang, "Deepdived", "متعمق")} value={stats.total.deep} tone="amber" />
        <Kpi label={tx(lang, "Pending", "معلق")} value={stats.total.pending} />
      </div>

      <div className="mt-3 grid gap-2">
        <MarketCard market="qadisiyah" stats={stats.q} lang={lang} />
        <MarketCard market="shifa" stats={stats.s} lang={lang} />
      </div>

      <section className="mt-3 rounded-2xl bg-surface p-3 shadow-[var(--shadow-border)]">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{tx(lang, "Where to go next", "الخطوة التالية")}</p>
        <p className="mt-1 text-sm leading-relaxed text-fg">
          {tx(
            lang,
            `${stats.total.pending} showrooms still have no floor survey. ${stats.total.deep} already carry sold units plus FPR or financed volume on the field record.`,
            `${stats.total.pending} معرضاً بلا مسح أرضية. ${stats.total.deep} تحمل مبيعات شهرية مع FPR أو حجم تمويل في السجل الميداني.`,
          )}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link to="/dashboard" className="flex min-h-12 items-center justify-center rounded-xl bg-primary font-semibold text-primary-fg">{tx(lang, "Field board", "لوحة الميدان")}</Link>
          <Link to="/" className="flex min-h-12 items-center justify-center rounded-xl bg-surface font-semibold shadow-[var(--shadow-border)]">{tx(lang, "Map", "الخريطة")}</Link>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone?: "amber" }) {
  return (
    <div className={`rounded-xl px-2 py-2 ${tone === "amber" ? "bg-status-amber/15" : "bg-surface shadow-[var(--shadow-border)]"}`}>
      <p className="text-xl font-semibold tabular-nums leading-none tracking-tight">{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
    </div>
  );
}

function MarketCard({
  market,
  stats,
  lang,
}: {
  market: MarketId;
  stats: { pins: number; surveyed: number; deep: number; pending: number; deepNames: string[] };
  lang: "en" | "ar";
}) {
  const meta = MARKET_META[market];
  const surveyedPct = stats.pins ? Math.round((stats.surveyed / stats.pins) * 100) : 0;
  return (
    <section className="rounded-2xl bg-surface p-3 shadow-[var(--shadow-border)]">
      <p className="text-base font-semibold">{lang === "ar" ? meta.labelAr : meta.labelEn}</p>
      <p className="text-xs text-muted">{stats.pins} {tx(lang, "pins", "دبوس")}</p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-primary" style={{ width: `${surveyedPct}%` }} />
      </div>
      <p className="mt-1 text-xs tabular-nums text-muted">{surveyedPct}% {tx(lang, "surveyed", "ممسوح")}</p>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center">
        <Mini k={tx(lang, "Surveyed", "ممسوح")} v={stats.surveyed} />
        <Mini k={tx(lang, "Deepdived", "متعمق")} v={stats.deep} />
        <Mini k={tx(lang, "Pending", "معلق")} v={stats.pending} />
      </div>
      {stats.deepNames.length ? (
        <p className="mt-2 text-xs leading-relaxed text-muted">
          {tx(lang, "Deepdived on the field record: ", "تعمق ميداني: ")}
          {stats.deepNames.join(" · ")}
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted">{tx(lang, "No field deepdive on this market yet.", "لا تعمق ميداني في هذا السوق بعد.")}</p>
      )}
    </section>
  );
}

function Mini({ k, v }: { k: string; v: number }) {
  return (
    <div className="rounded-lg bg-surface-2 px-1 py-2">
      <p className="text-base font-semibold tabular-nums">{v}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{k}</p>
    </div>
  );
}
