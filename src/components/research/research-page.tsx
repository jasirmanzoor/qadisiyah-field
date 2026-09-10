import { BulkSearchPanel } from "@/components/research/bulk-search";
import { Button } from "@/components/ui/button";
import { Choice, Input, Textarea } from "@/components/ui/field";
import { COPY } from "@/lib/i18n";
import { dealersInMarket } from "@/lib/markets";
import { MarketSwitch } from "@/components/market-switch";
import { RESEARCH_SOURCE_OPTIONS } from "@/lib/seed";
import { surveyCompleteness } from "@/lib/survey-schema";
import type { ResearchTask } from "@/lib/types";
import { cn, uid } from "@/lib/utils";
import { useField, surveyFor } from "@/stores/field";
import { usePrefs } from "@/stores/prefs";
import { useMemo, useState } from "react";

type RosterFilter = "all" | "unvisited" | "missing_cr" | "no_phone" | "no_findings";

export function ResearchPage() {
  const { lang, market } = usePrefs();
  const t = COPY[lang];
  const snapshot = useField((s) => s.snapshot);
  const roster = useMemo(() => dealersInMarket(snapshot.dealerships, market), [snapshot.dealerships, market]);
  const upsertTask = useField((s) => s.upsertTask);
  const runAgent = useField((s) => s.runAgent);
  const setFinding = useField((s) => s.setFinding);
  const markRead = useField((s) => s.markRead);
  const setCap = useField((s) => s.setCap);

  const [selectedDealers, setSelectedDealers] = useState<string[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [dealerQuery, setDealerQuery] = useState("");
  const [rosterFilter, setRosterFilter] = useState<RosterFilter>("all");
  const [draft, setDraft] = useState({
    name: "",
    instruction: "",
    targetField: "notes",
    sources: ["google"] as string[],
    schedule: "on_demand" as ResearchTask["schedule"],
  });

  const remaining = Math.max(0, snapshot.settings.dailyCap - snapshot.settings.runsToday);

  const visibleDealers = useMemo(() => {
    const q = dealerQuery.trim().toLowerCase();
    return roster.filter((d) => {
      if (q) {
        const blob = `${d.nameEn} ${d.nameAr} ${d.listedPhone}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      if (rosterFilter === "unvisited") return d.status === "not_visited";
      if (rosterFilter === "no_phone") return !d.listedPhone.trim();
      if (rosterFilter === "missing_cr") {
        return surveyCompleteness(surveyFor(snapshot, d.id)?.payload ?? {}).missingCr;
      }
      if (rosterFilter === "no_findings") {
        return !snapshot.findings.some((f) => f.dealershipId === d.id);
      }
      return true;
    });
  }, [snapshot, dealerQuery, rosterFilter, roster]);

  const est = selectedDealers.length * selectedTasks.length;

  async function run() {
    if (!est) return;
    setBusy(true);
    setMsg(null);
    const res = await runAgent(selectedDealers, selectedTasks);
    setBusy(false);
    setMsg(res.ok ? `Ran ${est} searches.` : res.error ?? "Failed");
  }

  function applyFilter(next: RosterFilter) {
    setRosterFilter(next);
    const q = dealerQuery.trim().toLowerCase();
    const ids = roster
      .filter((d) => {
        if (q) {
          const blob = `${d.nameEn} ${d.nameAr} ${d.listedPhone}`.toLowerCase();
          if (!blob.includes(q)) return false;
        }
        if (next === "unvisited") return d.status === "not_visited";
        if (next === "no_phone") return !d.listedPhone.trim();
        if (next === "missing_cr") {
          return surveyCompleteness(surveyFor(snapshot, d.id)?.payload ?? {}).missingCr;
        }
        if (next === "no_findings") {
          return !snapshot.findings.some((f) => f.dealershipId === d.id);
        }
        return true;
      })
      .map((d) => d.id);
    if (next !== "all") setSelectedDealers(ids);
  }

  const chips: { id: RosterFilter; label: string }[] = [
    { id: "unvisited", label: t.selectUnvisited },
    { id: "missing_cr", label: t.selectMissingCr },
    { id: "no_phone", label: t.selectNoPhone },
    { id: "no_findings", label: t.selectNoFindings },
  ];

  return (
    <div className="flex flex-col gap-4 overflow-auto px-4 py-4">
      <h1 className="text-xl font-semibold tracking-tight">{t.research}</h1>
      <MarketSwitch />
      <section className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <p className="text-sm font-medium">{t.dailyCap}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">
          {snapshot.settings.runsToday}/{snapshot.settings.dailyCap}
        </p>
        <p className="mt-1 text-xs text-muted">{t.estCost}</p>
        <div className="mt-2 flex items-center gap-2">
          <Input
            type="number"
            className="max-w-28"
            value={snapshot.settings.dailyCap}
            onChange={(e) => void setCap(Number(e.target.value) || 20)}
          />
          <span className="text-xs text-muted">{remaining} left today</span>
        </div>
      </section>

      <BulkSearchPanel
        onSelectDealers={(ids) => {
          setSelectedDealers((prev) => Array.from(new Set([...prev, ...ids])));
        }}
      />

      <section className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <p className="mb-2 text-sm font-medium">Tasks</p>
        <ul className="mb-3 flex flex-col gap-2">
          {snapshot.tasks.map((task) => {
            const on = selectedTasks.includes(task.id);
            return (
              <button
                key={task.id}
                type="button"
                onClick={() =>
                  setSelectedTasks((prev) =>
                    on ? prev.filter((id) => id !== task.id) : [...prev, task.id],
                  )
                }
                className={cn(
                  "rounded-xl px-3 py-2 text-left",
                  on ? "bg-primary text-primary-fg" : "bg-surface text-fg shadow-[var(--shadow-border)]",
                )}
              >
                <p className="text-sm font-medium">{task.name}</p>
                <p className={cn("line-clamp-2 text-xs", on ? "text-primary-fg/80" : "text-muted")}>
                  {task.instruction}
                </p>
                <p className={cn("mt-1 text-[11px]", on ? "text-primary-fg/70" : "text-faint")}>
                  → {task.targetField} · {task.schedule}
                </p>
              </button>
            );
          })}
        </ul>
        <details className="rounded-xl bg-surface-2 p-3">
          <summary className="cursor-pointer text-sm font-medium">{t.newTask}</summary>
          <div className="mt-3 flex flex-col gap-2">
            <Input
              placeholder="Name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            <Textarea
              placeholder="Natural-language instruction"
              value={draft.instruction}
              onChange={(e) => setDraft({ ...draft, instruction: e.target.value })}
            />
            <Input
              placeholder="Field it writes to"
              value={draft.targetField}
              onChange={(e) => setDraft({ ...draft, targetField: e.target.value })}
            />
            <Choice
              value={draft.schedule}
              onChange={(id) => setDraft({ ...draft, schedule: id as ResearchTask["schedule"] })}
              options={[
                { id: "on_demand", label: "On demand" },
                { id: "daily", label: "Daily" },
                { id: "weekly", label: "Weekly" },
              ]}
            />
            <div className="flex flex-wrap gap-1">
              {RESEARCH_SOURCE_OPTIONS.map((s) => {
                const on = draft.sources.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        sources: on ? draft.sources.filter((x) => x !== s) : [...draft.sources, s],
                      })
                    }
                    className={cn(
                      "min-h-9 rounded-full px-3 text-xs",
                      on ? "bg-primary text-primary-fg" : "bg-surface text-muted",
                    )}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            <Button
              variant="secondary"
              disabled={!draft.name.trim() || !draft.instruction.trim()}
              onClick={() => {
                void upsertTask({
                  id: uid(),
                  name: draft.name.trim(),
                  instruction: draft.instruction.trim(),
                  targetField: draft.targetField.trim() || "notes",
                  sources: draft.sources,
                  schedule: draft.schedule,
                  enabled: true,
                });
                setDraft({
                  name: "",
                  instruction: "",
                  targetField: "notes",
                  sources: ["google"],
                  schedule: "on_demand",
                });
              }}
            >
              Save task
            </Button>
          </div>
        </details>
      </section>

      <section className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium">Dealerships</p>
          <button
            type="button"
            className="text-xs text-muted"
            onClick={() =>
              setSelectedDealers(
                selectedDealers.length === visibleDealers.length && visibleDealers.length > 0
                  ? []
                  : visibleDealers.map((d) => d.id),
              )
            }
          >
            {selectedDealers.length === visibleDealers.length && visibleDealers.length > 0
              ? t.clearRoute
              : t.selectVisible}
          </button>
        </div>
        <Input
          className="mb-2"
          value={dealerQuery}
          onChange={(e) => setDealerQuery(e.target.value)}
          placeholder={t.filterDealers}
        />
        <div className="mb-2 flex flex-wrap gap-1">
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => applyFilter(rosterFilter === c.id ? "all" : c.id)}
              className={cn(
                "min-h-9 rounded-full px-3 text-xs font-medium",
                rosterFilter === c.id ? "bg-primary text-primary-fg" : "bg-surface-2 text-muted",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="max-h-56 overflow-auto">
          {visibleDealers.map((d) => {
            const on = selectedDealers.includes(d.id);
            return (
              <button
                key={d.id}
                type="button"
                onClick={() =>
                  setSelectedDealers((prev) =>
                    on ? prev.filter((id) => id !== d.id) : [...prev, d.id],
                  )
                }
                className="flex w-full items-center gap-2 rounded-lg px-1 py-2 text-left text-sm"
              >
                <span
                  className={cn(
                    "grid size-5 place-items-center rounded border",
                    on ? "border-primary bg-primary" : "border-border-strong",
                  )}
                />
                <span className="min-w-0 truncate">{d.nameEn}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted">
          {selectedDealers.length} selected · Estimated: {est} run{est === 1 ? "" : "s"} · {remaining} remaining today
        </p>
        <Button className="mt-3 w-full" disabled={busy || !est || est > remaining} onClick={() => void run()}>
          {busy ? "Running…" : selectedDealers.length > 1 ? t.runAll : t.runResearch}
        </Button>
        {msg ? <p className="mt-2 text-xs text-muted">{msg}</p> : null}
      </section>

      <section className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <p className="mb-2 text-sm font-medium">{t.agentLayer}</p>
        <p className="mb-3 text-xs text-muted">Never overwrites field data. Choose which to keep when they conflict.</p>
        <ul className="flex flex-col gap-3">
          {snapshot.findings.slice(0, 40).map((f) => {
            const dealer = snapshot.dealerships.find((d) => d.id === f.dealershipId);
            const survey = snapshot.surveys.find((s) => s.dealershipId === f.dealershipId);
            const fieldVal = survey ? (survey.payload as Record<string, unknown>)[f.fieldKey] : undefined;
            const fieldText = fieldVal == null || fieldVal === "" ? null : String(fieldVal);
            return (
              <li key={f.id} className="rounded-xl bg-surface-2 p-3">
                <p className="text-xs text-muted">
                  {dealer?.nameEn} · {f.fieldKey} · {f.confidence} · {new Date(f.retrievedAt).toLocaleString()}
                </p>
                <p className="mt-1 text-sm">{f.value}</p>
                {f.sourceUrl ? (
                  <a href={f.sourceUrl} className="mt-1 block truncate text-xs text-primary" target="_blank" rel="noreferrer">
                    {f.sourceUrl}
                  </a>
                ) : null}
                {fieldText ? (
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-surface p-2">
                      <p className="font-medium">{t.fieldLayer}</p>
                      <p className="mt-1 text-muted">{fieldText}</p>
                    </div>
                    <div className="rounded-lg bg-surface p-2">
                      <p className="font-medium">{t.agentLayer}</p>
                      <p className="mt-1 text-muted">{f.value}</p>
                    </div>
                  </div>
                ) : null}
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant={f.accepted === false ? "primary" : "secondary"} onClick={() => void setFinding(f.id, false)}>
                    {t.keepField}
                  </Button>
                  <Button size="sm" variant={f.accepted === true ? "primary" : "secondary"} onClick={() => void setFinding(f.id, true)}>
                    {t.keepAgent}
                  </Button>
                </div>
              </li>
            );
          })}
          {snapshot.findings.length === 0 ? <p className="text-sm text-muted">No agent findings yet.</p> : null}
        </ul>
      </section>

      <section className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <p className="mb-2 text-sm font-medium">{t.notifications}</p>
        <ul className="flex flex-col gap-2">
          {snapshot.notifications.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                className={cn("w-full rounded-xl px-3 py-2 text-left", n.read ? "opacity-60" : "bg-surface-2")}
                onClick={() => void markRead(n.id)}
              >
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-muted">{n.body}</p>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
