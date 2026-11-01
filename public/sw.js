// Minimal offline-first service worker.
// Strategy: cache-first for static assets & map tiles (so anything the
// surveyor has already loaded stays available with zero signal), network-
// first with cache fallback for navigations, so the app shell always opens.

const APP_CACHE = 'qadisiyah-app-v1';
const TILE_CACHE = 'qadisiyah-tiles-v1';
const OFFLINE_URL = '/offline';

const PRECACHE_URLS = ['/', OFFLINE_URL, '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== APP_CACHE && k !== TILE_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

function isTileRequest(url) {
  return (
    url.hostname.includes('tile.openstreetmap.org') ||
    url.hostname.includes('arcgisonline.com') ||
    url.hostname.includes('basemaps.cartocdn.com')
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Map tiles: cache-first, long-lived, so previously-viewed areas render offline.
  if (isTileRequest(url)) {
    event.respondWith(
      caches.open(TILE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const res = await fetch(request);
          if (res.ok) cache.put(request, res.clone());
          return res;
        } catch {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Navigations: network-first, fall back to cached shell, then offline page.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          caches.open(APP_CACHE).then((cache) => cache.put(request, res.clone()));
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(APP_CACHE);
          return (await cache.match(request)) || (await cache.match(OFFLINE_URL));
        })
    );
    return;
  }

  // Static assets (Next.js build chunks, images, fonts): cache-first.
  if (url.pathname.startsWith('/_next/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.open(APP_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const res = await fetch(request);
          if (res.ok) cache.put(request, res.clone());
          return res;
        } catch {
          return cached || Response.error();
        }
      })
    );
  }
});
