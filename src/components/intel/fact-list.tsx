import type { AnnotatedFact, Confidence, Freshness } from "@/lib/intel";
import { isEmail, phoneTail, tx } from "@/lib/intel";
import { waLink } from "@/lib/utils";
import { usePrefs } from "@/stores/prefs";
import { ExternalLink } from "lucide-react";

const CONF: Record<Confidence, { en: string; ar: string; dot: string }> = {
  verified: { en: "Verified", ar: "موثّق", dot: "bg-status-green" },
  likely: { en: "Likely", ar: "مرجّح", dot: "bg-primary" },
  unverified: { en: "Unverified", ar: "غير مؤكد", dot: "bg-status-amber" },
  stale: { en: "Stale", ar: "قديم", dot: "bg-status-red" },
};

const FRESH: Record<Freshness, { en: string; ar: string }> = {
  fresh: { en: "Within 30 days", ar: "خلال 30 يوم" },
  aging: { en: "31–90 days", ar: "31–90 يوم" },
  stale: { en: "Older than 90 days", ar: "أقدم من 90 يوم" },
  unknown: { en: "No source date", ar: "بدون تاريخ مصدر" },
};

function ageLabel(fact: AnnotatedFact, lang: "en" | "ar") {
  if (fact.ageDays == null) return tx(lang, "Date not on source", "التاريخ غير مذكور");
  if (fact.ageDays === 0) return tx(lang, "Published today", "نُشر اليوم");
  return tx(lang, `${fact.ageDays} days old`, `عمرها ${fact.ageDays} يوم`);
}

export function FactList({ facts, fieldPhone }: { facts: AnnotatedFact[]; fieldPhone?: string }) {
  const lang = usePrefs((s) => s.lang);
  const fieldTail = phoneTail(fieldPhone ?? "");
  if (!facts.length) {
    return (
      <p className="rounded-xl border border-dashed border-border-strong px-3 py-6 text-center text-sm text-muted">
        {tx(lang, "No sourced public facts yet. Refresh research to look again. Nothing here is guessed.", "لا توجد وقائع عامة بمصدر بعد. حدّث البحث. لا نخمّن.")}
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {facts.map((fact) => {
        const conf = CONF[fact.confidence];
        const tail = phoneTail(fact.value);
        const wa = tail ? waLink(fact.value) : null;
        const mail = isEmail(fact.value) ? fact.value.trim() : null;
        const conflict = Boolean(fieldTail && tail && tail !== fieldTail);
        return (
          <li key={fact.id} className="rounded-xl bg-surface-2 px-3 py-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{fact.label}</p>
              <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold">
                <span className={`size-2 rounded-full ${conf.dot}`} />
                {tx(lang, conf.en, conf.ar)}
              </span>
            </div>
            <p className="mt-1 text-base font-semibold tracking-tight text-fg">{fact.value}</p>
            <p className="mt-1 text-xs text-muted">
              {tx(lang, "Web research", "بحث ويب")}
              {" · "}
              {tx(lang, FRESH[fact.freshness].en, FRESH[fact.freshness].ar)}
              {" · "}
              {ageLabel(fact, lang)}
            </p>
            <p className="mt-1 text-xs text-muted">
              {fact.sourceName || fact.sourceUrl}
              {fact.publishedAt ? ` · ${fact.publishedAt}` : ""}
              {` · ${tx(lang, "researched", "بُحث")} ${fact.researchedAt.slice(0, 10)}`}
            </p>
            {conflict ? (
              <p className="mt-2 rounded-lg bg-status-amber/15 px-2 py-1.5 text-xs font-medium text-status-amber">
                {tx(lang, "Conflict with the field-survey phone. The field value was not changed.", "يختلف عن هاتف المسح الميداني. لم تُغيّر القيمة الميدانية.")}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              <a href={fact.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-surface px-3 text-xs font-semibold text-primary">
                <ExternalLink className="size-3.5" />
                {tx(lang, "Open source", "افتح المصدر")}
              </a>
              {wa ? (
                <a href={wa} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-lg bg-surface px-3 text-xs font-semibold text-fg">
                  {tx(lang, "WhatsApp", "واتساب")}
                </a>
              ) : null}
              {mail ? (
                <a href={`mailto:${mail}`} className="inline-flex min-h-10 items-center rounded-lg bg-surface px-3 text-xs font-semibold text-fg">
                  {tx(lang, "Email", "البريد")}
                </a>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
