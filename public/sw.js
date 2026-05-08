// Bump this on every deploy to force iOS Safari PWA clients to drop their stale JS bundles.
const CACHE_NAME = 'oxrana-v3-2026-05-07';
const STATIC_ASSETS = ['/manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Drop every previous cache so old hashed JS chunks aren't served from disk.
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
    // Tell every open tab/PWA to reload immediately so they pick up the new bundle.
    const clientList = await self.clients.matchAll({ type: 'window' });
    for (const client of clientList) {
      client.postMessage({ type: 'SW_UPDATED' });
    }
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // Never intercept API calls or Next.js HMR/data routes.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/data/')) return;
  // Always go to network for HTML so a deploy is visible immediately; only fall back to cache if offline.
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(fetch(event.request).catch(() => caches.match('/manifest.json')));
    return;
  }
  // Other static assets: network first, no caching of new responses (Next.js serves hashed filenames).
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request) as Promise<Response>));
});

// Push notifications
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '🚨 Глаза ЧОПа';
  const options = {
    body: data.body || 'Новое уведомление',
    icon: '/logo.png',
    badge: '/logo.png',
    vibrate: [200, 100, 200, 100, 400],
    data: data,
    requireInteraction: data.urgent || false,
    actions: data.actions || [],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
