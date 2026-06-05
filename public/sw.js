/* LabRep Service Worker — offline-first para dados de campo (RN-12) */

const CACHE = 'labrep-v1';
const STATIC = [
  '/',
  '/assets/css/design-system.css',
  '/assets/css/components.css',
  '/assets/css/layout.css',
  '/assets/css/mobile.css',
  '/assets/js/router.js',
  '/assets/js/api.js',
  '/assets/js/auth.js',
  '/assets/js/state.js',
  '/assets/js/toast.js',
  '/manifest.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { url, method } = e.request;

  // Mutações e downloads: sempre rede (nunca cache)
  if (method !== 'GET') return;
  if (url.includes('/api/v1/exportar')) return;

  // API de leitura: Network-First com fallback para cache
  if (url.includes('/api/v1/')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Assets estáticos: Cache-First
  e.respondWith(
    caches.match(e.request).then(cached => cached ?? fetch(e.request))
  );
});
