import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { PHOTO_LIMITS, validatePhotoBatch } from "../../../scripts/ai-survey-rules.mjs";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { acceptAllHighConfidence, applyAiRun, decideProposal, getAiRun, startAiSurvey } from "@/lib/ai/api";
import { COPY } from "@/lib/i18n";
import { compressForAi, compressImage } from "@/lib/image";
import type { AiDecision, AiProposal, AiProposalValue, AiRunBundle, Dealership } from "@/lib/types";
import { uid } from "@/lib/utils";
import { useField } from "@/stores/field";
import { usePrefs } from "@/stores/prefs";

type Phase = "photos" | "gps" | "running" | "review" | "done";

type Shot = { id: string; ai: string; store: string };

/** Human label for the persisted run stage — never a fake percentage. */
function stageLabel(stage: string, t: (typeof COPY)["en"]): string {
  switch (stage) {
    case "extracting_text":
      return t.aiSurveyStageExtract;
    case "detecting_vehicles":
      return t.aiSurveyStageVehicles;
    case "aggregating_evidence":
      return t.aiSurveyStageAggregate;
    case "researching":
      return t.aiSurveyStageResearch;
    case "generating_results":
      return t.aiSurveyStageResults;
    default:
      return t.aiSurveyRunning;
  }
}

function displayValue(v: AiProposalValue): string {
  if (v == null || v === "") return "—";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "number") return v.toLocaleString("en-SA");
  return String(v);
}

export function AiSurveySheet({
  mode,
  dealershipId,
  onClose,
  onSaved,
}: {
  mode: "existing" | "new";
  dealershipId: string | null;
  onClose: () => void;
  onSaved?: (dealershipId: string) => void;
}) {
  const { lang } = usePrefs();
  const t = COPY[lang];
  const snapshot = useField((s) => s.snapshot);
  const storeGps = useField((s) => s.gps);
  const upsertDealer = useField((s) => s.upsertDealer);
  const addPhoto = useField((s) => s.addPhoto);
  const flush = useField((s) => s.flush);
  const hydrate = useField((s) => s.hydrate);

  const [phase, setPhase] = useState<Phase>("photos");
  const [shots, setShots] = useState<Shot[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [stage, setStage] = useState<string>("queued");
  const [bundle, setBundle] = useState<AiRunBundle | null>(null);
  const [newNameEn, setNewNameEn] = useState("");
  const [newNameAr, setNewNameAr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const dealer = dealershipId ? snapshot.dealerships.find((d) => d.id === dealershipId) : undefined;

  // Real backend stage, polled while the analysis request is in flight.
  useEffect(() => {
    if (phase !== "running" || !dealershipId) return;
    let alive = true;
    const timer = window.setInterval(async () => {
      try {
        const res = await getAiRun({ data: { dealershipId } });
        if (alive && res.bundle) setStage(res.bundle.run.stage);
      } catch {
        /* polling is best effort */
      }
    }, 3500);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [phase, dealershipId]);

  async function onFiles(files: FileList) {
    setError(null);
    const next: Shot[] = [];
    for (const file of Array.from(files).slice(0, PHOTO_LIMITS.maxPhotos - shots.length)) {
      try {
        const [ai, store] = await Promise.all([compressForAi(file), compressImage(file)]);
        if (ai && store) next.push({ id: uid(), ai, store });
      } catch {
        setError("One photo could not be read.");
      }
    }
    const merged = [...shots, ...next];
    const check = validatePhotoBatch({ sizes: merged.map((s) => s.ai.length) }, PHOTO_LIMITS);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setShots(merged);
  }

  async function captureGps(): Promise<{ lat: number; lng: number; accuracy?: number } | null> {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return storeGps ? { lat: storeGps.lat, lng: storeGps.lng, accuracy: storeGps.accuracy } : null;
    }
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
        () => resolve(storeGps ? { lat: storeGps.lat, lng: storeGps.lng, accuracy: storeGps.accuracy } : null),
        { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
      );
    });
  }

  async function run(atShowroom: boolean) {
    setBusy(true);
    setError(null);
    setPhase("running");
    setStage("queued");
    let device: { lat: number; lng: number; accuracy?: number } | null = null;
    if (atShowroom) {
      device = await captureGps();
      if (!device) setNotice(t.aiSurveyGpsUnresolved);
    }
    try {
      const res = await startAiSurvey({
        data: {
          dealershipId,
          mode,
          photos: shots.map((s) => s.ai),
          storePhotos: shots.map((s) => s.store),
          atShowroom,
          device,
        },
      });
      if (!res.ok || !res.bundle) {
        setError(res.ok ? "AI analysis returned no results." : res.error);
        setPhase("photos");
        return;
      }
      setBundle(res.bundle);
      const nameEn = res.bundle.proposals.find((p) => p.fieldKey === "name_en");
      const nameAr = res.bundle.proposals.find((p) => p.fieldKey === "name_ar");
      if (mode === "new") {
        setNewNameEn(typeof nameEn?.value === "string" ? nameEn.value : "");
        setNewNameAr(typeof nameAr?.value === "string" ? nameAr.value : "");
      }
      setPhase("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI survey failed.");
      setPhase("photos");
    } finally {
      setBusy(false);
    }
  }

  function patchLocal(id: string, decision: AiDecision | null, value?: AiProposalValue) {
    setBundle((b) =>
      b
        ? {
            ...b,
            proposals: b.proposals.map((p) =>
              p.id === id ? { ...p, decision, value: value !== undefined ? value : p.value } : p,
            ),
          }
        : b,
    );
  }

  async function decide(p: AiProposal, decision: AiDecision, value?: AiProposalValue) {
    patchLocal(p.id, decision, value);
    try {
      await decideProposal({ data: { id: p.id, decision, value } });
    } catch {
      setError("Could not record that decision. It will not be saved.");
    }
  }

  async function acceptAll() {
    if (!bundle) return;
    setBusy(true);
    try {
      await acceptAllHighConfidence({ data: { runId: bundle.run.id } });
      const res = await getAiRun({ data: { runId: bundle.run.id } });
      if (res.bundle) setBundle(res.bundle);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!bundle) return;
    setBusy(true);
    setError(null);
    try {
      let targetId = dealershipId;
      if (mode === "new") {
        if (!newNameEn.trim() && !newNameAr.trim()) {
          setError("Give the showroom a name before saving.");
          return;
        }
        const gps = bundle.run.gps;
        const created: Dealership = {
          id: uid(),
          nameEn: newNameEn.trim() || newNameAr.trim(),
          nameAr: newNameAr.trim(),
          lat: gps.lat ?? storeGps?.lat ?? 24.8254,
          lng: gps.lng ?? storeGps?.lng ?? 46.8202,
          listedPhone: "",
          seedNote: "Added from AI field survey",
          status: "partial",
          flags: {
            gpsSource: gps.status === "confirmed" ? "field_device_gps" : "unknown",
            gpsStatus: gps.status,
            needsGps: gps.status !== "confirmed",
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await upsertDealer(created);
        await flush();
        targetId = created.id;
        for (const shot of shots) {
          await addPhoto({
            id: uid(),
            dealershipId: created.id,
            dataUrl: shot.store,
            lat: gps.lat,
            lng: gps.lng,
            capturedAt: new Date().toISOString(),
          });
        }
        await flush();
      }
      if (!targetId) return;
      const res = await applyAiRun({ data: { runId: bundle.run.id, dealershipId: targetId } });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      await hydrate();
      setPhase("done");
      onSaved?.(targetId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the survey.");
    } finally {
      setBusy(false);
    }
  }

  const accepted = bundle?.proposals.filter((p) => p.decision === "accepted" || p.decision === "edited").length ?? 0;

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-bg">
      <div className="flex items-center gap-2 border-b border-border px-3 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {mode === "new" ? t.aiSurveyNewTitle : (dealer?.nameEn ?? t.aiSurvey)}
          </p>
          <p className="text-[11px] text-muted">{t.aiSurvey}</p>
        </div>
        <button type="button" aria-label={t.cancel} onClick={onClose} className="grid size-10 place-items-center">
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto px-4 py-4">
        {error ? <p className="mb-3 text-xs text-status-amber">{error}</p> : null}
        {notice && phase !== "photos" ? <p className="mb-3 text-xs text-muted">{notice}</p> : null}

        {phase === "photos" ? (
          <section className="flex flex-col gap-3">
            <Label hint={t.aiSurveyPhotosHint}>{t.aiSurveyPhotos}</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) void onFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              {t.aiSurveyAddPhotos}
            </Button>
            {shots.length ? (
              <div className="grid grid-cols-3 gap-2">
                {shots.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="relative overflow-hidden rounded-lg"
                    onClick={() => setShots((x) => x.filter((y) => y.id !== s.id))}
                  >
                    <img src={s.store} alt="" className="aspect-square w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
            <p className="text-[11px] text-muted">
              {shots.length}/{PHOTO_LIMITS.maxPhotos}
            </p>
            <Button disabled={!shots.length} onClick={() => setPhase("gps")}>
              {t.next}
            </Button>
          </section>
        ) : null}

        {phase === "gps" ? (
          <section className="flex flex-col gap-3">
            <Label hint={t.aiSurveyAtShowroomHint}>{t.aiSurveyAtShowroom}</Label>
            <Button disabled={busy} onClick={() => void run(true)}>
              {t.aiSurveyYes}
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => void run(false)}>
              {t.aiSurveyNo}
            </Button>
          </section>
        ) : null}

        {phase === "running" ? (
          <section className="flex flex-col gap-2 py-10 text-center">
            <p className="text-sm font-semibold">{stageLabel(stage, t)}</p>
            <p className="text-xs text-muted">{t.aiSurveyPhotos}: {shots.length}</p>
          </section>
        ) : null}

        {phase === "review" && bundle ? (
          <section className="flex flex-col gap-3">
            {bundle.run.summary ? <p className="text-xs text-muted">{bundle.run.summary}</p> : null}
            {mode === "new" ? (
              <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
                <Label>{t.nameEn}</Label>
                <Input className="bg-surface-2" value={newNameEn} onChange={(e) => setNewNameEn(e.target.value)} />
                <Label>{t.nameAr}</Label>
                <Input dir="rtl" className="bg-surface-2" value={newNameAr} onChange={(e) => setNewNameAr(e.target.value)} />
              </div>
            ) : null}

            <Button variant="secondary" disabled={busy} onClick={() => void acceptAll()}>
              {t.aiSurveyAcceptAll}
            </Button>

            {bundle.proposals.map((p) => (
              <ProposalRow key={p.id} proposal={p} onDecide={decide} />
            ))}

            {bundle.run.missingInformation.length ? (
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs font-semibold">{t.aiSurveyMissing}</p>
                <p className="text-xs text-muted">{bundle.run.missingInformation.join(" · ")}</p>
              </div>
            ) : null}
            {bundle.run.gps.status !== "confirmed" ? (
              <p className="text-xs text-status-amber">{t.aiSurveyGpsUnresolved}</p>
            ) : null}
          </section>
        ) : null}

        {phase === "done" ? (
          <section className="py-10 text-center">
            <p className="text-sm font-semibold">{t.aiSurveySaved}</p>
            <p className="text-xs text-muted">{accepted}</p>
          </section>
        ) : null}
      </div>

      {phase === "review" ? (
        <div className="flex shrink-0 gap-2 border-t border-border bg-bg px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button className="flex-1" disabled={busy || accepted === 0} onClick={() => void save()}>
            {mode === "new" ? t.aiSurveyCreate : t.aiSurveySave}
          </Button>
        </div>
      ) : null}
      {phase === "done" ? (
        <div className="shrink-0 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button className="w-full" onClick={onClose}>
            {t.aiSurveyDone}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ProposalRow({
  proposal,
  onDecide,
}: {
  proposal: AiProposal;
  onDecide: (p: AiProposal, decision: AiDecision, value?: AiProposalValue) => Promise<void>;
}) {
  const { lang } = usePrefs();
  const t = COPY[lang];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(displayValue(proposal.value));
  const conflict = proposal.existingValue != null && proposal.existingValue !== "";

  const statusLabel =
    proposal.status === "observed"
      ? t.aiSurveyObserved
      : proposal.status === "estimated"
        ? t.aiSurveyEstimated
        : proposal.status === "needs_review"
          ? t.aiSurveyNeedsReview
          : t.aiSurveyUnknown;

  function commitEdit() {
    const isList = Array.isArray(proposal.value);
    const isNumber = typeof proposal.value === "number";
    const value: AiProposalValue = isList
      ? draft
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : isNumber
        ? Number(draft.replace(/[^\d.-]/g, ""))
        : draft.trim();
    setEditing(false);
    void onDecide(proposal, "edited", value);
  }

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="mb-1 flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{proposal.label}</p>
        <span className="shrink-0 text-[11px] text-muted">
          {statusLabel} · {t.aiSurveyConfidence}: {proposal.confidence}
        </span>
      </div>

      {editing ? (
        <Input className="mb-2 bg-surface-2" value={draft} onChange={(e) => setDraft(e.target.value)} />
      ) : (
        <p className="mb-1 text-sm font-semibold">{displayValue(proposal.value)}</p>
      )}

      {conflict ? (
        <p className="mb-1 text-xs text-status-amber">
          {t.aiSurveyExisting}: {displayValue(proposal.existingValue)}
        </p>
      ) : null}
      {proposal.reasoning ? <p className="mb-2 text-[11px] text-muted">{proposal.reasoning}</p> : null}

      <div className="flex flex-wrap gap-2">
        {editing ? (
          <Button size="sm" onClick={commitEdit}>
            {t.save}
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              variant={proposal.decision === "accepted" || proposal.decision === "edited" ? "primary" : "secondary"}
              onClick={() => void onDecide(proposal, "accepted")}
            >
              {conflict ? t.aiSurveyUseAi : t.aiSurveyAccept}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setDraft(displayValue(proposal.value));
                setEditing(true);
              }}
            >
              {t.aiSurveyEdit}
            </Button>
            <Button
              size="sm"
              variant={proposal.decision === "rejected" || proposal.decision === "kept_existing" ? "primary" : "secondary"}
              onClick={() => void onDecide(proposal, conflict ? "kept_existing" : "rejected")}
            >
              {conflict ? t.aiSurveyKeepExisting : t.aiSurveyReject}
            </Button>
          </>
        )}
      </div>

      {proposal.evidence.length ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-[11px] text-muted">{t.aiSurveyEvidence}</summary>
          <ul className="mt-1 space-y-1">
            {proposal.evidence.map((e) => (
              <li key={e.id} className="text-[11px] text-muted">
                {e.sourceUrl ? (
                  <a href={e.sourceUrl} target="_blank" rel="noreferrer" className="underline">
                    {e.text}
                  </a>
                ) : (
                  e.text
                )}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
