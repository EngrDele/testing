// Site Life service worker: makes the games load with no network after one visit (ROADMAP 5).
// - Pages (HTML): network first, so updates arrive; the cached copy is used when offline or slow.
// - Icons, manifest and the three.js CDN files: cache first. Other same-origin files: stale-while-revalidate.
// - Never touches /api/ (results), /hse (dashboard) or /cert/ (certificates), or any non-GET request.
// Bump VERSION when you change this file or the cached file list; old caches are deleted on activate.
const VERSION = 'site-life-v2';
const PAGES = ['index.html', 'kids.html', 'little.html', 'lite.html', 'builder.html'];
const STATIC = ['manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
const CDN = [
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/objects/Sky.js',
];
const NETWORK_TIMEOUT_MS = 4000; // weak networks: fall back to the cached page after this long

const isCdn = url => CDN.includes(url) || url.startsWith('https://cdn.jsdelivr.net/npm/three@0.128.0/') || url.startsWith('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/');
const neverCache = url => { const u = new URL(url); return u.origin === self.location.origin && /\/(api|hse|cert)(\/|$|\?)/.test(u.pathname); };

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    // one at a time and failure-tolerant: a missing page (e.g. builder.html) or a blocked CDN must not stop the install
    await Promise.all([
      ...PAGES.concat(STATIC).map(p => c.add(p).catch(() => {})),
      ...CDN.map(u => fetch(new Request(u, { mode: 'no-cors' })).then(r => (r.ok || r.type === 'opaque') && c.put(u, r)).catch(() => {})),
    ]);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('site-life-') && k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function networkFirst(req) {
  const c = await caches.open(VERSION);
  const net = fetch(req).then(r => { if (r.ok && r.type === 'basic') c.put(req, r.clone()).catch(() => {}); return r; });
  net.catch(() => {});
  const cached = () => c.match(req, { ignoreSearch: true }).then(r => r || (req.mode === 'navigate' ? c.match('index.html') : undefined));
  try {
    return await Promise.race([net, new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), NETWORK_TIMEOUT_MS))]);
  } catch (e) {
    const r = await cached();
    if (r) return r;
    return net; // nothing cached: wait for the network after all (or fail like a normal page load)
  }
}

async function staleWhileRevalidate(req) { // other same-origin files: fast from cache, refreshed in the background
  const c = await caches.open(VERSION);
  const hit = await c.match(req);
  const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()).catch(() => {}); return r; });
  if (hit) { net.catch(() => {}); return hit; }
  return net;
}

async function cacheFirst(req) {
  const c = await caches.open(VERSION);
  const hit = await c.match(req, { ignoreVary: true });
  if (hit) return hit;
  const r = await fetch(req);
  if (r.ok || r.type === 'opaque') c.put(req, r.clone()).catch(() => {});
  return r;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = req.url;
  if (neverCache(url)) return;
  const sameOrigin = new URL(url).origin === self.location.origin;
  if (req.mode === 'navigate' || (sameOrigin && /\.html?$|\/$/.test(new URL(url).pathname))) { e.respondWith(networkFirst(req)); return; }
  if (isCdn(url) || STATIC.some(p => url.endsWith('/' + p))) { e.respondWith(cacheFirst(req)); return; }
  if (sameOrigin) e.respondWith(staleWhileRevalidate(req));
});
