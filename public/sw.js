const CACHE = 'temples-v13';
const STATIC = ['/','/index.html','/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

// Cache-First for hashed assets (JS/CSS), Network-First for HTML/APIs
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Never cache Supabase API or Unsplash — always live
  if (url.hostname.includes('supabase') || url.hostname.includes('unsplash')) return;

  const isAsset = url.pathname.startsWith('/assets/');
  const isHtml = url.pathname === '/' || url.pathname === '/index.html' || url.pathname.endsWith('.html');

  if (isAsset) {
    // Cache-First: serve instantly if available, then refresh cache in background
    e.respondWith(
      caches.match(e.request).then(cached => {
        const fetchAndCache = fetch(e.request).then(r => {
          if (r && r.status === 200) {
            const clone = r.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return r;
        }).catch(() => cached);
        return cached || fetchAndCache;
      })
    );
  } else if (isHtml) {
    // Network-First for HTML so updates propagate
    e.respondWith(
      fetch(e.request).then(r => {
        if (r && r.status === 200) {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return r;
      }).catch(() => caches.match(e.request))
    );
  } else {
    // Default: Network with cache fallback
    e.respondWith(
      fetch(e.request).then(r => {
        if (r && r.status === 200) {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return r;
      }).catch(() => caches.match(e.request))
    );
  }
});
