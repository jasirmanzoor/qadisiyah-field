import { Link } from "@tanstack/react-router";
import { FactList } from "@/components/intel/fact-list";
import { Button } from "@/components/ui/button";
import { displaySurvey } from "@/components/map/map-notes";
import { tx } from "@/lib/intel";
import { searchIntel } from "@/lib/intel-search";
import { dealersInMarket, MARKET_META } from "@/lib/markets";
import { isDeepDived, isSurveyedShowroom } from "@/lib/survey-schema";
import { useField, surveyFor } from "@/stores/field";
import { useIntel } from "@/stores/intel";
import { usePrefs } from "@/stores/prefs";
import { useMemo, useState } from "react";

const TOPICS = [
  { id: "news", en: "Riyadh automotive news", ar: "أخبار السيارات في الرياض" },
  { id: "used", en: "Used-car trends", ar: "اتجاهات المستعمل" },
  { id: "price", en: "Pricing and demand", ar: "الأسعار والطلب" },
  { id: "models", en: "Popular models", ar: "الموديلات الرائجة" },
  { id: "finance", en: "Financing trends", ar: "اتجاهات التمويل" },
  { id: "dealers", en: "Dealership activity", ar: "حركة المعارض" },
  { id: "market", en: "Market developments", ar: "مستجدات السوق" },
];

export function IntelPage() {
  const { lang, market } = usePrefs();
  const snapshot = useField((s) => s.snapshot);
  const roster = useMemo(() => dealersInMarket(snapshot.dealerships, market), [snapshot.dealerships, market]);
  const [tab, setTab] = useState<"showroom" | "market">("showroom");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const briefs = useIntel((s) => s.briefs);
  const saveBrief = useIntel((s) => s.saveBrief);
  const research = useIntel((s) => s.research);

  const hits = useMemo(() => {
    const query = q.trim().toLowerCase();
    const rows = roster.filter((d) => {
      if (!query) return true;
      const brands = (displaySurvey(d, surveyFor(snapshot, d.id)?.payload)?.mainBrands ?? []).join(" ");
      return `${d.nameEn} ${d.nameAr} ${d.listedPhone} ${d.flags.sdId ?? ""} ${brands}`.toLowerCase().includes(query);
    });
    return rows.slice(0, 40);
  }, [q, roster, snapshot]);

  async function runTopic(topic: string) {
    setBusy(topic);
    setError(null);
    const res = await searchIntel({ data: { mode: "market", topic } });
    setBusy(null);
    if (!res.ok) {
      saveBrief(topic, "", [], res.error);
      setError(res.error);
      return;
    }
    saveBrief(topic, res.summary, res.facts);
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col overflow-auto px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{tx(lang, "Showroom intelligence", "استخبارات المعارض")}</p>
      <h1 className="text-2xl font-semibold tracking-tight">{tx(lang, "Research", "البحث")}</h1>
      <p className="mt-1 text-sm text-muted">
        {tx(lang, "Public sources only. Nothing here is written onto the field survey.", "مصادر عامة فقط. لا يُكتب شيء من هنا على المسح الميداني.")}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
        <button type="button" onClick={() => setTab("showroom")} className={`min-h-11 rounded-lg text-sm font-semibold ${tab === "showroom" ? "bg-surface text-fg shadow-[var(--shadow-border)]" : "text-muted"}`}>
          {tx(lang, "Showroom", "المعرض")}
        </button>
        <button type="button" onClick={() => setTab("market")} className={`min-h-11 rounded-lg text-sm font-semibold ${tab === "market" ? "bg-surface text-fg shadow-[var(--shadow-border)]" : "text-muted"}`}>
          {tx(lang, "Market", "السوق")}
        </button>
      </div>

      {tab === "showroom" ? (
        <div className="mt-3 flex flex-col gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tx(lang, "Search Arabic or English", "ابحث بالعربية أو الإنجليزية")}
            className="min-h-12 rounded-xl bg-surface px-3 text-base text-fg shadow-[var(--shadow-border)] outline-none"
          />
          <p className="text-xs text-muted">
            {lang === "ar" ? MARKET_META[market].labelAr : MARKET_META[market].labelEn}
            {" · "}
            {tx(lang, `${hits.length} shown`, `${hits.length} معروض`)}
          </p>
          {hits.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border-strong px-3 py-8 text-center text-sm text-muted">{tx(lang, "No showroom matches.", "لا معارض مطابقة.")}</p>
          ) : hits.map((d) => {
            const survey = displaySurvey(d, surveyFor(snapshot, d.id)?.payload);
            const deep = isDeepDived(survey);
            const surveyed = isSurveyedShowroom(d.status, survey);
            const snap = research[d.id];
            return (
              <Link key={d.id} to="/dossier/$id" params={{ id: d.id }} className="rounded-2xl bg-surface p-3 shadow-[var(--shadow-border)]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold">{d.nameEn}</p>
                    {d.nameAr ? <p className="truncate text-sm text-muted" dir="rtl">{d.nameAr}</p> : null}
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${deep ? "bg-status-amber/15 text-status-amber" : surveyed ? "bg-primary/10 text-primary" : "bg-surface-2 text-muted"}`}>
                    {deep ? tx(lang, "Deepdived", "متعمق") : surveyed ? tx(lang, "Surveyed", "ممسوح") : tx(lang, "Pending", "معلق")}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {d.flags.sdId}
                  {snap ? ` · ${tx(lang, "Research", "بحث")} ${snap.researchedAt.slice(0, 10)} · ${snap.facts.length}` : ` · ${tx(lang, "No web snapshot", "لا لقطة ويب")}`}
                </p>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-sm text-muted">{tx(lang, "Separate from the showroom dataset. Each run is a new dated snapshot.", "منفصل عن بيانات المعارض. كل تشغيل لقطة جديدة مؤرخة.")}</p>
          {error ? <p className="rounded-xl bg-status-red/10 px-3 py-2 text-sm text-status-red">{error}</p> : null}
          <div className="flex flex-col gap-2">
            {TOPICS.map((topic) => (
              <div key={topic.id} className="flex items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2 shadow-[var(--shadow-border)]">
                <p className="text-sm font-semibold">{tx(lang, topic.en, topic.ar)}</p>
                <Button size="sm" disabled={busy !== null} onClick={() => void runTopic(tx(lang, topic.en, topic.ar))}>
                  {busy === tx(lang, topic.en, topic.ar) ? tx(lang, "Searching…", "جاري البحث…") : tx(lang, "Refresh", "تحديث")}
                </Button>
              </div>
            ))}
          </div>
          {briefs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border-strong px-3 py-8 text-center text-sm text-muted">{tx(lang, "No market snapshot yet.", "لا لقطة سوق بعد.")}</p>
          ) : briefs.map((brief) => (
            <article key={brief.id} className="rounded-2xl bg-surface p-3 shadow-[var(--shadow-border)]">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{brief.topic}</p>
              <p className="text-xs text-muted">{brief.researchedAt.slice(0, 16).replace("T", " ")}</p>
              {brief.error ? <p className="mt-2 text-sm text-status-red">{brief.error}</p> : null}
              {brief.summary ? <p className="mt-2 text-sm leading-relaxed">{brief.summary}</p> : null}
              <div className="mt-2"><FactList facts={brief.facts} /></div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
