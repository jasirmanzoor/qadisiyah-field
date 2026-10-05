import { Link } from "@tanstack/react-router";
import { FactList } from "@/components/intel/fact-list";
import { Button } from "@/components/ui/button";
import { displaySurvey } from "@/components/map/map-notes";
import { COPY } from "@/lib/i18n";
import { fingerprint, tx, type PhotoCategory } from "@/lib/intel";
import { searchIntel } from "@/lib/intel-search";
import { dealerMarket, MARKET_META } from "@/lib/markets";
import { isDeepDived, isSurveyedShowroom } from "@/lib/survey-schema";
import { formatNumber, formatSarCompact, mapsLink, waLink } from "@/lib/utils";
import { compressImage } from "@/lib/image";
import { useField, surveyFor } from "@/stores/field";
import { useIntel } from "@/stores/intel";
import { usePrefs } from "@/stores/prefs";
import { Camera, ChevronLeft, Compass, FlaskConical, Images, Search } from "lucide-react";
import { useMemo, useRef, useState } from "react";

const CATS: { id: PhotoCategory; en: string; ar: string }[] = [
  { id: "facade", en: "Facade", ar: "واجهة" },
  { id: "inventory", en: "Inventory", ar: "المخزون" },
  { id: "inside", en: "Inside", ar: "الداخل" },
  { id: "outside", en: "Outside", ar: "الخارج" },
  { id: "document", en: "Document", ar: "مستند" },
  { id: "other", en: "Other", ar: "أخرى" },
];

export function DossierPage({ dealershipId }: { dealershipId: string }) {
  const { lang } = usePrefs();
  const t = COPY[lang];
  const snapshot = useField((s) => s.snapshot);
  const dealer = snapshot.dealerships.find((d) => d.id === dealershipId);
  const survey = dealer ? displaySurvey(dealer, surveyFor(snapshot, dealer.id)?.payload) : undefined;
  const fieldPhotos = snapshot.photos.filter((p) => p.dealershipId === dealershipId);
  const intelPhotos = useIntel((s) => s.photos.filter((p) => p.dealershipId === dealershipId));
  const research = useIntel((s) => s.research[dealershipId]);
  const history = useIntel((s) => s.history[dealershipId] ?? []);
  const addPhoto = useIntel((s) => s.addPhoto);
  const removePhoto = useIntel((s) => s.removePhoto);
  const reorderPhotos = useIntel((s) => s.reorderPhotos);
  const setPhotoCategory = useIntel((s) => s.setPhotoCategory);
  const saveResearch = useIntel((s) => s.saveResearch);
  const photoError = useIntel((s) => s.photoError);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shot, setShot] = useState<string | null>(null);
  const [cat, setCat] = useState<PhotoCategory>("facade");
  const [showHistory, setShowHistory] = useState(false);
  const libraryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const fieldPrints = useMemo(() => fieldPhotos.map((p) => fingerprint(p.dataUrl)), [fieldPhotos]);

  if (!dealer) {
    return (
      <div className="p-6 text-sm text-muted">
        {tx(lang, "Showroom not on the roster.", "المعرض غير موجود في السجل.")}{" "}
        <Link to="/" className="font-semibold text-primary">{t.map}</Link>
      </div>
    );
  }

  const showroom = dealer;

  const market = dealerMarket(dealer);
  const deep = isDeepDived(survey);
  const surveyed = isSurveyedShowroom(dealer.status, survey);
  const pending = !surveyed;
  const maps = dealer.flags.mapsUrl || mapsLink(dealer.lat, dealer.lng, dealer.nameEn);
  const fieldWa = waLink(dealer.listedPhone);
  const meta = MARKET_META[market];

  async function refresh() {
    setBusy(true);
    setError(null);
    const res = await searchIntel({
      data: {
        mode: "showroom",
        nameEn: showroom.nameEn,
        nameAr: showroom.nameAr,
        area: lang === "ar" ? meta.labelAr : `${meta.labelEn}, Riyadh`,
        phone: showroom.listedPhone,
      },
    });
    setBusy(false);
    if (!res.ok) {
      saveResearch(showroom.id, "", [], res.error);
      setError(res.error);
      return;
    }
    saveResearch(showroom.id, res.summary, res.facts);
  }

  async function take(list: FileList | null) {
    if (!list?.length) return;
    const files = Array.from(list);
    let done = 0;
    for (const file of files) {
      done += 1;
      setProgress(tx(lang, `Adding ${done}/${files.length}`, `إضافة ${done}/${files.length}`));
      const dataUrl = await compressImage(file);
      if (dataUrl) addPhoto(showroom.id, dataUrl, cat, fieldPrints);
    }
    setProgress(null);
  }

  function move(id: string, dir: -1 | 1) {
    const ids = intelPhotos.map((p) => p.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    const next = ids.slice();
    const [item] = next.splice(i, 1);
    next.splice(j, 0, item);
    reorderPhotos(showroom.id, next);
  }

  const fieldRows = [
    survey?.inventoryInside != null ? [tx(lang, "Inside", "الداخل"), formatNumber(survey.inventoryInside)] : null,
    survey?.inventoryOutside != null ? [tx(lang, "Outside", "الخارج"), formatNumber(survey.inventoryOutside)] : null,
    survey?.inventoryUnits != null ? [tx(lang, "Inventory", "المخزون"), formatNumber(survey.inventoryUnits)] : null,
    survey?.showroomSizeSqm != null ? [tx(lang, "Size", "المساحة"), `${formatNumber(survey.showroomSizeSqm)} m²`] : null,
    survey?.avgSellingPriceSar != null ? ["ASP", formatSarCompact(survey.avgSellingPriceSar)] : null,
    survey?.fpr != null ? ["FPR", String(survey.fpr)] : null,
    survey?.monthlySoldExact != null ? [tx(lang, "Sold / mo", "مباع / شهر"), formatNumber(survey.monthlySoldExact)] : null,
    survey?.salesmenCount != null ? [tx(lang, "Sales men", "المناديب"), formatNumber(survey.salesmenCount)] : null,
  ].filter(Boolean) as [string, string][];

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col">
      <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
        <Link to="/" className="mb-2 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-muted">
          <ChevronLeft className="size-4" />
          {t.map}
        </Link>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {dealer.flags.sdId} · {lang === "ar" ? meta.labelAr : meta.labelEn}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{dealer.nameEn}</h1>
        {dealer.nameAr ? <p className="text-base text-muted" dir="rtl">{dealer.nameAr}</p> : null}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-fg px-2.5 py-1 text-xs font-semibold text-bg">{pending ? tx(lang, "Pending", "معلق") : deep ? t.deepDived : surveyed ? t.surveyedCat : dealer.status.replace("_", " ")}</span>
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted">{tx(lang, "Field record locked", "السجل الميداني مقفل")}</span>
        </div>

        <section className="mt-4 rounded-2xl bg-surface p-3 shadow-[var(--shadow-border)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{tx(lang, "Field survey data", "بيانات المسح الميداني")}</p>
          <p className="mt-1 text-sm tabular-nums text-fg">{dealer.lat.toFixed(5)}, {dealer.lng.toFixed(5)}</p>
          <p className="text-sm text-muted">{dealer.listedPhone || tx(lang, "No phone on the field record", "لا هاتف في السجل الميداني")}</p>
          {fieldWa ? (
            <a href={fieldWa} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-10 items-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-fg">
              {tx(lang, "WhatsApp · field number", "واتساب · رقم الميدان")}
            </a>
          ) : null}
          {fieldRows.length ? (
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              {fieldRows.map(([k, v]) => (
                <div key={k} className="rounded-xl bg-surface-2 px-2.5 py-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">{k}</p>
                  <p className="text-base font-semibold tabular-nums">{v}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">{tx(lang, "No floor figures stored on this pin.", "لا أرقام ميدانية محفوظة على هذا الدبوس.")}</p>
          )}
          {(survey?.mainBrands ?? []).length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {survey!.mainBrands!.map((b) => <span key={b} className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">{b}</span>)}
            </div>
          ) : null}
        </section>

        <section id="photos" className="mt-4">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
            <Images className="size-4" />
            {tx(lang, "Field photos", "صور الميدان")}
            <span className="tabular-nums">{fieldPhotos.length}</span>
          </p>
          {fieldPhotos.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border-strong px-3 py-5 text-center text-sm text-muted">{tx(lang, "No field photos on this record.", "لا صور ميدانية في هذا السجل.")}</p>
          ) : (
            <div className="grid grid-cols-4 gap-1.5">
              {fieldPhotos.map((p) => (
                <button key={p.id} type="button" onClick={() => setShot(p.dataUrl)} className="overflow-hidden rounded-xl">
                  <img src={p.dataUrl} alt="" className="aspect-square w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <p className="mt-1 text-xs text-muted">{tx(lang, "Field photos cannot be deleted or replaced.", "لا تُحذف صور الميدان ولا تُستبدل.")}</p>
        </section>

        <section className="mt-4 rounded-2xl bg-surface p-3 shadow-[var(--shadow-border)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-status-amber">{tx(lang, "New evidence · separate from the field record", "دليل جديد · منفصل عن السجل الميداني")}</p>
          <div className="mt-2 flex gap-1 overflow-x-auto">
            {CATS.map((c) => (
              <button key={c.id} type="button" onClick={() => setCat(c.id)} className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold ${cat === c.id ? "bg-primary text-primary-fg" : "bg-surface-2 text-muted"}`}>
                {tx(lang, c.en, c.ar)}
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => cameraRef.current?.click()}><Camera className="size-4" />{t.takePhoto}</Button>
            <Button variant="secondary" onClick={() => libraryRef.current?.click()}>{progress ?? t.photoLibrary}</Button>
          </div>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { void take(e.target.files); e.target.value = ""; }} />
          <input ref={libraryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { void take(e.target.files); e.target.value = ""; }} />
          {photoError === "duplicate" ? <p className="mt-2 text-xs font-medium text-status-amber">{tx(lang, "Duplicate skipped.", "تم تجاهل المكرر.")}</p> : null}
          {photoError === "limit" ? <p className="mt-2 text-xs font-medium text-status-amber">{tx(lang, "12 new photos max on this showroom.", "الحد 12 صورة جديدة لهذا المعرض.")}</p> : null}
          {photoError === "quota" ? <p className="mt-2 text-xs font-medium text-status-red">{tx(lang, "This phone is out of space for new photos.", "لا مساحة كافية للصور الجديدة.")}</p> : null}
          {intelPhotos.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{tx(lang, "No new photos yet.", "لا صور جديدة بعد.")}</p>
          ) : (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {intelPhotos.map((p, index) => (
                <div key={p.id} className="overflow-hidden rounded-xl bg-surface-2">
                  <button type="button" onClick={() => setShot(p.dataUrl)} className="block w-full">
                    <img src={p.dataUrl} alt="" className="aspect-square w-full object-cover" />
                  </button>
                  <label className="block px-1 py-1">
                    <select className="w-full bg-transparent text-xs font-semibold text-fg" value={p.category} onChange={(e) => setPhotoCategory(p.id, e.target.value as PhotoCategory)}>
                      {CATS.map((c) => <option key={c.id} value={c.id}>{tx(lang, c.en, c.ar)}</option>)}
                    </select>
                  </label>
                  <div className="grid grid-cols-3 border-t border-border">
                    <button type="button" className="min-h-11 text-xs text-muted disabled:opacity-30" disabled={index === 0} onClick={() => move(p.id, -1)}>{tx(lang, "Earlier", "قبل")}</button>
                    <button type="button" className="min-h-11 text-xs text-danger" onClick={() => removePhoto(p.id)}>{tx(lang, "Delete", "حذف")}</button>
                    <button type="button" className="min-h-11 text-xs text-muted disabled:opacity-30" disabled={index === intelPhotos.length - 1} onClick={() => move(p.id, 1)}>{tx(lang, "Later", "بعد")}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section id="research" className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{tx(lang, "Web research", "بحث الويب")}</p>
            <Button size="sm" onClick={() => void refresh()} disabled={busy}>{busy ? tx(lang, "Searching…", "جاري البحث…") : tx(lang, "Refresh research", "تحديث البحث")}</Button>
          </div>
          {error ? <p className="mb-2 rounded-xl bg-status-red/10 px-3 py-2 text-sm text-status-red">{error}</p> : null}
          {busy ? <div className="mb-2 h-16 animate-pulse rounded-xl bg-surface-2" /> : null}
          {research?.summary ? <p className="mb-2 text-sm leading-relaxed text-fg">{research.summary}</p> : null}
          {research ? <p className="mb-2 text-xs text-muted">{tx(lang, "Snapshot", "لقطة")} {research.researchedAt.slice(0, 16).replace("T", " ")}</p> : null}
          <FactList facts={research?.facts ?? []} fieldPhone={dealer.listedPhone} />
          {history.length ? (
            <button type="button" className="mt-2 min-h-10 text-xs font-semibold text-muted" onClick={() => setShowHistory((v) => !v)}>
              {showHistory ? tx(lang, "Hide earlier snapshots", "إخفاء اللقطات السابقة") : tx(lang, `Earlier snapshots (${history.length}) — not current`, `لقطات سابقة (${history.length}) — ليست الحالية`)}
            </button>
          ) : null}
          {showHistory ? history.map((h) => (
            <div key={h.id} className="mt-2 opacity-70">
              <p className="text-xs text-muted">{h.researchedAt.slice(0, 16).replace("T", " ")}</p>
              <FactList facts={h.facts} fieldPhone={dealer.listedPhone} />
            </div>
          )) : null}
        </section>
      </div>

      <div className="grid shrink-0 grid-cols-4 gap-1 border-t border-border bg-bg px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <Link to="/survey/$id" params={{ id: dealer.id }} className="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl bg-surface text-[11px] font-semibold text-fg">
          <Search className="size-4" />
          {tx(lang, "Open", "افتح")}
        </Link>
        <a href={maps} target="_blank" rel="noreferrer" className="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl bg-surface text-[11px] font-semibold text-fg">
          <Compass className="size-4" />
          {tx(lang, "Navigate", "اتجاه")}
        </a>
        <a href="#photos" className="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl bg-surface text-[11px] font-semibold text-fg">
          <Images className="size-4" />
          {tx(lang, "Photos", "صور")}
        </a>
        <Link to="/deepdive" search={{ id: dealer.id }} className="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl bg-primary text-[11px] font-semibold text-primary-fg">
          <FlaskConical className="size-4" />
          {tx(lang, "Deepdive", "تعمق")}
        </Link>
      </div>
      {shot ? (
        <button type="button" className="evidence-lightbox fixed inset-0 z-50 bg-fg/95 p-4" onClick={() => setShot(null)}>
          <img src={shot} alt="" className="mx-auto max-h-full max-w-full object-contain" />
        </button>
      ) : null}
    </div>
  );
}
