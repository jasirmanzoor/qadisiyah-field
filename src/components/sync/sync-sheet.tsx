import { useEffect, useState } from "react";
import { listQueue, type QueueItem } from "@/lib/offline";
import { useField } from "@/stores/field";
import { Button } from "@/components/ui/button";

export function SyncSheet({ onClose }: { onClose: () => void }) {
  const flush = useField((s) => s.flush);
  const pending = useField((s) => s.pending);
  const lastError = useField((s) => s.lastError);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [last, setLast] = useState<string>(localStorage.getItem("qads-last-sync") ?? "Never");

  async function refresh() {
    setItems(await listQueue());
  }
  useEffect(() => { void refresh(); }, [pending]);

  async function syncNow() {
    await flush();
    if ((await listQueue()).length === 0) {
      const stamp = new Date().toISOString();
      localStorage.setItem("qads-last-sync", stamp);
      setLast(stamp);
    }
    await refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-fg/40" onClick={onClose}>
      <div className="max-h-[80vh] w-full overflow-auto rounded-t-2xl bg-bg p-4" onClick={(e) => e.stopPropagation()}>
        <p className="text-base font-semibold">Pending sync · {items.length}</p>
        <p className="mt-1 text-xs text-muted">Last sync {last}</p>
        {lastError ? <p className="mt-2 text-xs text-status-amber">{lastError}</p> : null}
        <ul className="mt-3 flex flex-col gap-2">
          {items.slice(0, 40).map((item) => (
            <li key={item.id} className="rounded-xl bg-surface-2 px-3 py-2 text-xs">
              <span className="font-semibold">{item.op}</span>
              <span className="text-muted"> · waiting</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button onClick={() => void syncNow()}>Sync now</Button>
        </div>
      </div>
    </div>
  );
}
