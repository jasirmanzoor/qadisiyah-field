'use client';

import { useEffect, useState } from 'react';
import { flushSyncQueue, getSyncQueueCount } from '@/lib/db';
import { useSettings } from '@/lib/settings-context';

export default function OnlineStatusBadge() {
  const { remoteEndpoint } = useSettings();
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const onOnline = async () => {
      setOnline(true);
      if (remoteEndpoint) {
        await flushSyncQueue();
        setPending(await getSyncQueueCount());
      }
    };
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [remoteEndpoint]);

  useEffect(() => {
    if (!remoteEndpoint) return;
    const interval = setInterval(async () => {
      setPending(await getSyncQueueCount());
    }, 4000);
    return () => clearInterval(interval);
  }, [remoteEndpoint]);

  if (!remoteEndpoint) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        Saved on device
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        online
          ? pending > 0
            ? 'bg-amber-500/15 text-amber-500'
            : 'bg-emerald-500/15 text-emerald-500'
          : 'bg-red-500/15 text-red-500'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          online ? (pending > 0 ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-red-500'
        }`}
      />
      {online ? (pending > 0 ? `Syncing ${pending}…` : 'Synced') : `Offline${pending > 0 ? ` · ${pending} pending` : ''}`}
    </span>
  );
}
