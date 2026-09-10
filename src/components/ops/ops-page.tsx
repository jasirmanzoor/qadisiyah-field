import { Button } from "@/components/ui/button";
import { Input, StatusBadge } from "@/components/ui/field";
import { COPY, trainingCopy } from "@/lib/i18n";
import { haversineM, MARKET_CENTER } from "@/lib/geo";
import { PIPELINE_STAGES, type PipelineStage, type TeamInfo } from "@/lib/types";
import { cn, formatJoinCode, inviteUrl, todayISO, uid } from "@/lib/utils";
import { pilotScore } from "@/lib/scoring";
import { useField, surveyFor } from "@/stores/field";
import { usePrefs } from "@/stores/prefs";
import { useMemo, useState } from "react";
import { TrainingBadge } from "@/components/ui/field";

const STAGE_LABEL: Record<PipelineStage, string> = {
  surveyed: "Surveyed",
  contacted: "Contacted",
  pitched: "Pitched",
  pilot_agreed: "Pilot agreed",
  onboarded: "Onboarded",
};

export function OpsPage() {
  const { lang } = usePrefs();
  const t = COPY[lang];
  const snapshot = useField((s) => s.snapshot);
  const gps = useField((s) => s.gps) ?? MARKET_CENTER;
  const upsertFollowup = useField((s) => s.upsertFollowup);
  const setStage = useField((s) => s.setStage);
  const joinTeam = useField((s) => s.joinTeam);
  const rotateCode = useField((s) => s.rotateCode);
  const [title, setTitle] = useState("");
  const [dealerId, setDealerId] = useState(snapshot.dealerships[0]?.id ?? "");
  const [due, setDue] = useState(todayISO());
  const [joinInput, setJoinInput] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const ranked = useMemo(
    () =>
      [...snapshot.dealerships]
        .map((d) => ({ d, score: pilotScore(d, surveyFor(snapshot, d.id)?.payload) }))
        .sort((a, b) => b.score - a.score),
    [snapshot],
  );

  function stageOf(id: string): PipelineStage {
    return snapshot.pipeline.find((p) => p.dealershipId === id)?.stage ?? "surveyed";
  }

  const duplicates = useMemo(() => {
    const pairs: { a: string; b: string; meters: number }[] = [];
    const list = snapshot.dealerships;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const m = haversineM(list[i], list[j]);
        const nameClose =
          list[i].nameEn.replace(/\s+/g, "").toLowerCase().slice(0, 8) ===
          list[j].nameEn.replace(/\s+/g, "").toLowerCase().slice(0, 8);
        if (m < 55 || (m < 120 && nameClose)) {
          pairs.push({ a: list[i].nameEn, b: list[j].nameEn, meters: Math.round(m) });
        }
      }
    }
    return pairs.slice(0, 12);
  }, [snapshot.dealerships]);

  return (
    <div className="flex flex-col gap-4 overflow-auto px-4 py-4">
      <h1 className="text-xl font-semibold tracking-tight">{t.ops}</h1>

      <TeamCard
        t={t}
        team={snapshot.team}
        joinInput={joinInput}
        joinError={joinError}
        copied={copied}
        onJoinInput={setJoinInput}
        onCopy={() => {
          const code = snapshot.team?.joinCode;
          if (!code) return;
          void navigator.clipboard?.writeText(formatJoinCode(code));
          setCopied("code");
          window.setTimeout(() => setCopied(null), 1600);
        }}
        onCopyLink={() => {
          const code = snapshot.team?.joinCode;
          if (!code) return;
          void navigator.clipboard?.writeText(inviteUrl(code));
          setCopied("link");
          window.setTimeout(() => setCopied(null), 1600);
        }}
        onShare={() => {
          const code = snapshot.team?.joinCode;
          if (!code) return;
          const link = inviteUrl(code);
          const text = `Join my Qadisiyah Field roster:\n${link}\n\nOr sign up and enter team code ${formatJoinCode(code)}.`;
          window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noreferrer");
        }}
        onJoin={() => {
          setJoinError(null);
          void joinTeam(joinInput).then((res) => {
            if (!res.ok) setJoinError(res.error ?? "Join failed");
            else setJoinInput("");
          });
        }}
        onRotate={() => void rotateCode()}
      />

      <section className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <p className="mb-3 text-sm font-medium">{t.induction}</p>
        {(["trained", "hold", "scheduled", "declined", "unavailable"] as const).map((stage) => {
          const rows = ranked.filter(({ d }) => d.flags.trainingStage === stage);
          if (!rows.length) return null;
          return (
            <div key={stage} className="mb-3">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
                {trainingCopy(lang, { trainingStage: stage }) ?? stage} · {rows.length}
              </p>
              {rows.map(({ d, score }) => (
                <div key={d.id} className="mb-1 flex items-center gap-2">
                  <span className="w-8 text-xs tabular-nums text-muted">{score}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{d.nameEn}</span>
                  <TrainingBadge
                    stage={d.flags.trainingStage}
                    priority={d.flags.trainingPriority}
                    label={trainingCopy(lang, d.flags) ?? t.induction}
                  />
                </div>
              ))}
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <p className="mb-3 text-sm font-medium">{t.followups}</p>
        <div className="flex flex-col gap-2">
          <select
            className="min-h-12 rounded-xl bg-surface-2 px-3 text-sm"
            value={dealerId}
            onChange={(e) => setDealerId(e.target.value)}
          >
            {snapshot.dealerships.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nameEn}
              </option>
            ))}
          </select>
          <Input placeholder="Owner absent — return Thursday" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          <Button
            variant="secondary"
            disabled={!title.trim() || !dealerId}
            onClick={() => {
              void upsertFollowup({
                id: uid(),
                dealershipId: dealerId,
                title: title.trim(),
                dueDate: due,
                done: false,
                createdAt: new Date().toISOString(),
              });
              setTitle("");
            }}
          >
            {t.addFollow}
          </Button>
        </div>
        <ul className="mt-3 flex flex-col gap-2">
          {snapshot.followups.length === 0 ? <p className="text-sm text-muted">{t.emptyFollow}</p> : null}
          {snapshot.followups.map((f) => {
            const d = snapshot.dealerships.find((x) => x.id === f.dealershipId);
            return (
              <li key={f.id} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
                <button
                  type="button"
                  className={cn(
                    "size-5 rounded border",
                    f.done ? "border-primary bg-primary" : "border-border-strong",
                  )}
                  onClick={() => void upsertFollowup({ ...f, done: !f.done })}
                />
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate text-sm", f.done && "text-muted line-through")}>{f.title}</p>
                  <p className="text-[11px] text-muted">
                    {d?.nameEn} · {f.dueDate}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <p className="mb-3 text-sm font-medium">Pipeline</p>
        {PIPELINE_STAGES.map((stage) => {
          const rows = ranked.filter(({ d }) => stageOf(d.id) === stage && d.status !== "competitor");
          return (
            <div key={stage} className="mb-3">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
                {STAGE_LABEL[stage]} · {rows.length}
              </p>
              {rows.slice(0, 6).map(({ d, score }) => (
                <div key={d.id} className="mb-1 flex items-center gap-2">
                  <span className="w-8 text-xs tabular-nums text-muted">{score}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{d.nameEn}</span>
                  <select
                    className="h-9 rounded-lg bg-surface-2 px-2 text-xs"
                    value={stage}
                    onChange={(e) => void setStage(d.id, e.target.value as PipelineStage)}
                  >
                    {PIPELINE_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {STAGE_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <p className="mb-2 text-sm font-medium">{t.duplicates}</p>
        <p className="mb-3 text-xs text-muted">Flagged for you to resolve — never merged automatically.</p>
        {duplicates.length === 0 ? <p className="text-sm text-muted">No close pairs right now.</p> : null}
        <ul className="flex flex-col gap-2 text-sm">
          {duplicates.map((p) => (
            <li key={`${p.a}-${p.b}`} className="rounded-xl bg-surface-2 px-3 py-2">
              {p.a} ↔ {p.b}
              <span className="ms-2 text-xs text-muted">{p.meters} m</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <p className="mb-2 text-sm font-medium">Nearest now</p>
        <ul>
          {[...snapshot.dealerships]
            .sort((a, b) => haversineM(gps, a) - haversineM(gps, b))
            .slice(0, 6)
            .map((d) => (
              <li key={d.id} className="flex items-center gap-2 py-1">
                <StatusBadge status={d.status} />
                <span className="min-w-0 flex-1 truncate text-sm">{d.nameEn}</span>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}

function TeamCard({
  t,
  team,
  joinInput,
  joinError,
  copied,
  onJoinInput,
  onCopy,
  onCopyLink,
  onShare,
  onJoin,
  onRotate,
}: {
  t: (typeof COPY)["en"];
  team?: TeamInfo;
  joinInput: string;
  joinError: string | null;
  copied: "code" | "link" | null;
  onJoinInput: (v: string) => void;
  onCopy: () => void;
  onCopyLink: () => void;
  onShare: () => void;
  onJoin: () => void;
  onRotate: () => void;
}) {
  const code = team?.joinCode ? formatJoinCode(team.joinCode) : "————";
  const link = team?.joinCode ? inviteUrl(team.joinCode) : "";
  return (
    <section className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
      <p className="text-sm font-medium">{t.team}</p>
      <p className="mt-1 text-xs text-muted">{t.teamBlurb}</p>
      <p className="mt-3 text-center font-semibold tracking-[0.28em] text-3xl tabular-nums">{code}</p>
      {link ? (
        <p className="mt-2 break-all text-center text-[11px] text-muted" dir="ltr">
          {link}
        </p>
      ) : null}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={onCopy}>
          {copied === "code" ? t.copied : t.copyCode}
        </Button>
        <Button variant="secondary" onClick={onCopyLink}>
          {copied === "link" ? t.copied : t.copyLink}
        </Button>
      </div>
      <Button variant="secondary" className="mt-2 w-full" onClick={onShare}>
        {t.shareCode}
      </Button>
      {team?.role === "owner" ? (
        <button type="button" className="mt-2 w-full min-h-10 text-xs font-medium text-muted" onClick={onRotate}>
          {t.rotateCode}
        </button>
      ) : null}
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted">{t.teamMembers}</p>
      <ul className="mt-1 flex flex-col gap-1">
        {(team?.members ?? []).map((m) => (
          <li key={m.userId} className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 truncate">
              {m.name}
              {m.you ? <span className="ms-1 text-xs text-muted">({t.you})</span> : null}
            </span>
            <span className="shrink-0 text-xs text-muted">{m.role === "owner" ? t.owner : t.member}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs font-medium">{t.joinTeam}</p>
      <p className="text-xs text-muted">{t.joinTeamHint}</p>
      <div className="mt-2 flex gap-2">
        <Input
          value={joinInput}
          onChange={(e) => onJoinInput(e.target.value.toUpperCase())}
          placeholder={t.teamCodePlaceholder}
          className="flex-1"
        />
        <Button variant="secondary" disabled={joinInput.replace(/[^A-Z0-9]/g, "").length < 6} onClick={onJoin}>
          {t.join}
        </Button>
      </div>
      {joinError ? <p className="mt-2 text-sm text-danger">{joinError}</p> : null}
    </section>
  );
}
