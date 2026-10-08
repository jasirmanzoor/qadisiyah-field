import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { FLOOR_WATCH_ID, FLOOR_WATCH_INSTRUCTION } from "@/lib/floor-watch";
import { COPY } from "@/lib/i18n";
import type { Dealership } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useField } from "@/stores/field";
import { usePrefs } from "@/stores/prefs";
import { useEffect, useMemo, useState } from "react";

const DAY = 24 * 60 * 60 * 1000;

function pinned(dealers: Dealership[]) {
  return dealers.filter((d) => !d.flags.hidden && !d.flags.unplaced && d.lat !== 0 && d.lng !== 0);
}

export function ResearchPage() {
  const { lang } = usePrefs();
  const t = COPY[lang];
  const snapshot = useField((s) => s.snapshot);
  const setFinding = useField((s) => s.setFinding);
  const markRead = useField((s) => s.markRead);
  const setCap = useField((s) => s.setCap);
  const [watching, setWatching] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const doors = useMemo(() => pinned(snapshot.dealerships), [snapshot.dealerships]);
  const lastCheck = useMemo(() => {
    const map = new Map<string, number>();
    for (const finding of snapshot.findings) {
      const at = new Date(finding.retrievedAt).getTime();
      if (!Number.isFinite(at)) continue;
      map.set(finding.dealershipId, Math.max(map.get(finding.dealershipId) ?? 0, at));
    }
    return map;
  }, [snapshot.findings]);
  const queue = useMemo(
    () => doors.filter((d) => Date.now() - (lastCheck.get(d.id) ?? 0) > DAY),
    [doors, lastCheck],
  );
  const review = snapshot.findings.filter((f) => f.fieldKey !== "watch_checked");
  const remaining = Math.max(0, snapshot.settings.dailyCap - snapshot.settings.runsToday);

  useEffect(() => {
    if (!watching) return;
    let cancel = false;
    void (async () => {
      while (!cancel) {
        const snap = useField.getState().snapshot;
        const left = Math.max(0, snap.settings.dailyCap - snap.settings.runsToday);
        if (left <= 0) {
          setWatching(false);
          setMsg(`Daily cap reached (${snap.settings.runsToday}/${snap.settings.dailyCap}). It continues tomorrow.`);
          return;
        }
        const seen = new Map<string, number>();
        for (const finding of snap.findings) {
          const at = new Date(finding.retrievedAt).getTime();
          if (Number.isFinite(at)) seen.set(finding.dealershipId, Math.max(seen.get(finding.dealershipId) ?? 0, at));
        }
        const next = pinned(snap.dealerships).find((d) => Date.now() - (seen.get(d.id) ?? 0) > DAY);
        if (!next) {
          setWatching(false);
          setMsg("Every pinned showroom was checked in the last day.");
          return;
        }
        setMsg(`${next.nameEn || next.nameAr}`);
        const res = await useField.getState().runAgent([next.id], [FLOOR_WATCH_ID]);
        if (cancel) return;
        if (!res.ok) {
          setWatching(false);
          setMsg(res.error ?? "The watch stopped.");
          return;
        }
      }
    })();
    return () => {
      cancel = true;
    };
  }, [watching]);

  return (
    <div className="flex flex-col gap-4 overflow-auto px-4 py-4">
      <h1 className="text-xl font-semibold tracking-tight">{t.research}</h1>
      <section className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <p className="text-sm font-medium">{t.floorWatch}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{FLOOR_WATCH_INSTRUCTION}</p>
        <p className="mt-3 text-2xl font-semibold tabular-nums">{queue.length}<span className="text-base font-medium text-muted"> / {doors.length} pins waiting</span></p>
        <p className="mt-1 text-xs text-muted">{snapshot.settings.runsToday}/{snapshot.settings.dailyCap} used today · {review.length} new facts for review · nothing is written onto a showroom</p>
        <div className="mt-3 flex items-center gap-2">
          <Input type="number" className="max-w-28 bg-surface-2" value={snapshot.settings.dailyCap} onChange={(e) => void setCap(Number(e.target.value) || 20)} />
          <span className="text-xs text-muted">{remaining} left today</span>
        </div>
        <Button className="mt-3 w-full" onClick={() => { setMsg(null); setWatching((v) => !v); }}>
          {watching ? t.pauseWatch : t.startWatch}
        </Button>
        {msg ? <p className="mt-2 text-xs text-muted">{msg}</p> : null}
      </section>

      <section className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <p className="mb-2 text-sm font-medium">{t.agentLayer}</p>
        <p className="mb-3 text-xs text-muted">Review only. Keep or discard. The map record stays as you filed it.</p>
        <ul className="flex flex-col gap-3">
          {review.slice(0, 40).map((f) => {
            const dealer = snapshot.dealerships.find((d) => d.id === f.dealershipId);
            return (
              <li key={f.id} className="rounded-xl bg-surface-2 p-3">
                <p className="text-xs text-muted">{dealer?.nameEn || dealer?.nameAr || "Showroom"} · {f.fieldKey} · {f.confidence}</p>
                <p className="mt-1 text-sm">{f.value}</p>
                {f.sourceUrl ? <a href={f.sourceUrl} className="mt-1 block truncate text-xs text-primary" target="_blank" rel="noreferrer">{f.sourceUrl}</a> : null}
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant={f.accepted === false ? "primary" : "secondary"} onClick={() => void setFinding(f.id, false)}>{t.keepField}</Button>
                  <Button size="sm" variant={f.accepted === true ? "primary" : "secondary"} onClick={() => void setFinding(f.id, true)}>{t.keepAgent}</Button>
                </div>
              </li>
            );
          })}
          {review.length === 0 ? <p className="text-sm text-muted">No new public facts yet.</p> : null}
        </ul>
      </section>

      <section className="rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)]">
        <p className="mb-2 text-sm font-medium">{t.notifications}</p>
        <ul className="flex flex-col gap-2">
          {snapshot.notifications.map((n) => (
            <li key={n.id}>
              <button type="button" className={cn("w-full rounded-xl px-3 py-2 text-left", n.read ? "opacity-60" : "bg-surface-2")} onClick={() => void markRead(n.id)}>
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
