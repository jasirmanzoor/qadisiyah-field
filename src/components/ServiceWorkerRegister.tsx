'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Offline caching is a progressive enhancement; ignore failures
        // (e.g. unsupported browser, dev environment restrictions).
      });
    }
  }, []);
  return null;
}
