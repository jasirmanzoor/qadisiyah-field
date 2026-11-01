'use client';

import { useEffect, useRef, useState } from 'react';
import { runScheduledPass, type ScheduledPassResult } from '@/lib/research-run';

// How often to look for due scheduled runs while the app is open.
const CHECK_EVERY_MS = 30 * 60 * 1000;
// Let the map/survey load first; research is never urgent.
const FIRST_CHECK_DELAY_MS = 15 * 1000;
const LOCK_NAME = 'qadisiyah-scheduled-research';

/**
 * Runs daily/weekly research tasks while the app is open. There is no
 * backend in this app, so "scheduled" means: whenever the app is open and
 * online, due runs are worked through up to the daily cap. A Web Lock keeps
 * two open tabs from running the same pass twice.
 */
export default function ResearchScheduler() {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const running = useRef(false);
  const unmounted = useRef(false);

  useEffect(() => {
    unmounted.current = false;

    const pass = async () => {
      if (running.current) return;
      running.current = true;
      try {
        const work = async (): Promise<ScheduledPassResult> =>
          runScheduledPass({
            onProgress: (done, total) => setProgress({ done, total }),
            shouldStop: () => unmounted.current,
          });
        const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
        const result = locks
          ? await locks.request(LOCK_NAME, { ifAvailable: true }, async (lock) => (lock ? work() : null))
          : await work();
        if (!result || unmounted.current) return;
        if (result.stoppedReason === 'fatal') {
          setNotice(`Scheduled research stopped: ${result.error ?? 'not configured'}`);
        } else if (result.attempted > 0) {
          setNotice(
            `Scheduled research: ${result.succeeded} done${result.failed ? `, ${result.failed} failed` : ''}` +
              (result.stoppedReason === 'cap' ? ' · daily cap reached' : '')
          );
        }
      } finally {
        running.current = false;
        if (!unmounted.current) setProgress(null);
      }
    };

    const first = setTimeout(pass, FIRST_CHECK_DELAY_MS);
    const interval = setInterval(pass, CHECK_EVERY_MS);
    const onOnline = () => pass();
    window.addEventListener('online', onOnline);
    return () => {
      unmounted.current = true;
      clearTimeout(first);
      clearInterval(interval);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 8000);
    return () => clearTimeout(t);
  }, [notice]);

  if (!progress && !notice) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex justify-center px-4">
      <div
        role="status"
        className="pointer-events-auto max-w-sm rounded-full border border-border bg-surface/95 px-3 py-1.5 text-[11px] text-foreground shadow-lg backdrop-blur"
      >
        {progress ? `Scheduled research ${progress.done}/${progress.total}…` : notice}
      </div>
    </div>
  );
}
