import { Link } from "@tanstack/react-router";
import { displaySurvey } from "@/components/map/map-notes";
import { tx } from "@/lib/intel";
import { dealersInMarket } from "@/lib/markets";
import { isDeepDived, isSurveyedShowroom } from "@/lib/survey-schema";
import { useField, surveyFor } from "@/stores/field";
import { deepdiveFor, useIntel } from "@/stores/intel";
import { usePrefs } from "@/stores/prefs";
import { useEffect, useMemo, useState } from "react";
import type { DeepdiveDraft } from "@/lib/intel";

const FIELDS: { key: keyof Omit<DeepdiveDraft, "dealershipId" | "updatedAt">; en: string; ar: string }[] = [
  { key: "fpr", en: "FPR", ar: "FPR" },
  { key: "monthlySold", en: "Monthly sold units", ar: "الوحدات المباعة شهرياً" },
  { key: "financialSales", en: "Financial sales", ar: "مبيعات التمويل" },
  { key: "cashSales", en: "Cash sales", ar: "مبيعات الكاش" },
  { key: "financeSales", en: "Finance sales", ar: "مبيعات الأقساط" },
  { key: "listingsNote", en: "Current listings", ar: "العروض الحالية" },
  { key: "contacts", en: "Contacts", ar: "جهات الاتصال" },
  { key: "pocName", en: "POC", ar: "مسؤول التواصل" },
  { key: "pocTitle", en: "POC title", ar: "صفة المسؤول" },
  { key: "competitors", en: "Competitors", ar: "المنافسون" },
  { key: "observations", en: "Market observations", ar: "ملاحظات السوق" },
];

export function DeepdivePage({ initialId }: { initialId?: string }) {
  const { lang, market } = usePrefs();
  const snapshot = useField((s) => s.snapshot);
  const roster = useMemo(() => dealersInMarket(snapshot.dealerships, market), [snapshot.dealerships, market]);
  const saveDeepdive = useIntel((s) => s.saveDeepdive);
  const [q, setQ] = useState("");
  const [id, setId] = useState(initialId || "");
  const dealer = roster.find((d) => d.id === id) ?? snapshot.dealerships.find((d) => d.id === id);
  const [draft, setDraft] = useState<DeepdiveDraft | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (initialId) setId(initialId);
  }, [initialId]);

  useEffect(() => {
    if (!id) {
      setDraft(null);
      return;
    }
    setDraft(deepdiveFor(id, useIntel.getState().deepdives));
    setSaved(false);
  }, [id]);

  const hits = useMemo(() => {
    const query = q.trim().toLowerCase();
    return roster
      .filter((d) => !query || `${d.nameEn} ${d.nameAr} ${d.flags.sdId ?? ""}`.toLowerCase().includes(query))
      .slice(0, 20);
  }, [q, roster]);

  function update(key: keyof DeepdiveDraft, value: string) {
    if (!draft) return;
    const next = { ...draft, [key]: value };
    setDraft(next);
    saveDeepdive(next);
    setSaved(true);
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col overflow-auto px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-status-amber">{tx(lang, "Separate workspace", "مساحة منفصلة")}</p>
      <h1 className="text-2xl font-semibold tracking-tight">{tx(lang, "Deepdive", "التعمق")}</h1>
      <p className="mt-1 text-sm text-muted">
        {tx(lang, "Notes here never replace field-survey values, photos, or pins.", "الملاحظات هنا لا تستبدل قيم المسح أو الصور أو الدبابيس.")}
      </p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={tx(lang, "Find a showroom", "ابحث عن معرض")}
        className="mt-3 min-h-12 rounded-xl bg-surface px-3 text-base shadow-[var(--shadow-border)] outline-none"
      />
      {!dealer ? (
        <ul className="mt-2 flex flex-col gap-1">
          {hits.map((d) => {
            const survey = displaySurvey(d, surveyFor(snapshot, d.id)?.payload);
            const deep = isDeepDived(survey);
            const surveyed = isSurveyedShowroom(d.status, survey);
            return (
              <li key={d.id}>
                <button type="button" onClick={() => setId(d.id)} className="flex min-h-14 w-full items-center justify-between gap-2 rounded-xl bg-surface px-3 text-start shadow-[var(--shadow-border)]">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{d.nameEn}</span>
                    <span className="block truncate text-xs text-muted" dir="rtl">{d.nameAr}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-muted">{deep ? tx(lang, "Field deepdive", "تعمق ميداني") : surveyed ? tx(lang, "Surveyed", "ممسوح") : tx(lang, "Pending", "معلق")}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : draft ? (
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-lg font-semibold">{dealer.nameEn}</p>
              <p className="text-sm text-muted" dir="rtl">{dealer.nameAr}</p>
            </div>
            <button type="button" className="min-h-10 text-xs font-semibold text-primary" onClick={() => setId("")}>{tx(lang, "Change", "تغيير")}</button>
          </div>
          <p className="text-xs font-medium text-muted">
            {saved ? tx(lang, `Draft saved ${draft.updatedAt.slice(11, 16)} · not on the field record`, `حُفظت المسودة ${draft.updatedAt.slice(11, 16)} · ليست على السجل الميداني`) : tx(lang, "Edits save on this phone only, apart from the roster.", "التعديلات تُحفظ على هذا الجهاز فقط، بمعزل عن السجل.")}
          </p>
          {FIELDS.map((field) => (
            <label key={field.key} className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{tx(lang, field.en, field.ar)}</span>
              <textarea
                value={draft[field.key]}
                onChange={(e) => update(field.key, e.target.value)}
                rows={field.key === "observations" || field.key === "listingsNote" ? 4 : 2}
                className="w-full rounded-xl bg-surface px-3 py-3 text-base text-fg shadow-[var(--shadow-border)] outline-none"
              />
            </label>
          ))}
          <Link to="/dossier/$id" params={{ id: dealer.id }} className="mb-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-4 font-semibold text-primary-fg">
            {tx(lang, "Open showroom dossier", "افتح ملف المعرض")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
