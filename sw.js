const APP_VERSION = '1.2.17';
const ASSET_VERSION = APP_VERSION;
const CACHE_NAME = 'hsk-flashcards-v' + ASSET_VERSION;
const FSRS_CDN_URL = 'https://cdn.jsdelivr.net/npm/ts-fsrs@5.4.1/dist/index.umd.js';
const APP_SHELL_URL = new URL('./index.html', self.registration.scope).href;
const INDEX_SHELL_URL = new URL('./index.html', self.registration.scope).href;
const ROOT_SHELL_URL = new URL('./', self.registration.scope).href;
// Dashboard assets are precached so the home screen works offline right away.
const PRECACHE_ASSET_URLS = [
  INDEX_SHELL_URL,
  ROOT_SHELL_URL,
  './assets/flashcards.css?v=' + ASSET_VERSION,
  './assets/css/level-picker.css?v=' + ASSET_VERSION,
  './assets/css/workstation.css?v=' + ASSET_VERSION,
  './assets/css/reading-analysis.css?v=' + ASSET_VERSION,
  './assets/css/study-help-modal.css?v=' + ASSET_VERSION,
  './assets/js/theme.js?v=' + ASSET_VERSION,
  './assets/js/speechService.js?v=' + ASSET_VERSION,
  './assets/js/speech.js?v=' + ASSET_VERSION,
  './assets/js/home-widgets.js?v=' + ASSET_VERSION,
  './assets/css/home-widgets.css?v=' + ASSET_VERSION,
  './assets/js/dashboard-enhancements.js?v=' + ASSET_VERSION,
  './assets/css/dashboard-enhancements.css?v=' + ASSET_VERSION,
  './assets/js/hanviet-dict.js?v=' + ASSET_VERSION,
  './assets/js/word-illustrations.js?v=' + ASSET_VERSION,
  './assets/js/word-companion.js?v=' + ASSET_VERSION,
  './assets/js/hanzi-decomposition.js?v=' + ASSET_VERSION,
  './assets/js/sidebar-tabs.js?v=' + ASSET_VERSION,
  './assets/js/study-help-modal.js?v=' + ASSET_VERSION,
  './assets/js/hsk30.js?v=' + ASSET_VERSION,
  './assets/js/levels.js?v=' + ASSET_VERSION,
  './assets/js/reading-analysis.js?v=' + ASSET_VERSION,
  './assets/css/listening-practice.css?v=' + ASSET_VERSION,
  './assets/js/listening-practice.js?v=' + ASSET_VERSION,
].map(path => (path.startsWith('http') ? path : new URL(path, self.registration.scope).href));
// Vocabulary/audio JSON lives in its own cache so app deploys don't force every level to re-download.
const DATA_CACHE_NAME = 'hsk-data-v12';
const DATA_PATH = new URL('./database/', self.registration.scope).pathname;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled([
      cache.add(APP_SHELL_URL),
      ...PRECACHE_ASSET_URLS.map(url => cache.add(url)),
      cache.add(new Request(FSRS_CDN_URL, { mode: 'cors' })),
    ]);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name =>
      (name.startsWith('hsk-flashcards-') && name !== CACHE_NAME)
      || (name.startsWith('hsk-data-') && name !== DATA_CACHE_NAME))
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.href === FSRS_CDN_URL) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.status === 200 || response.type === 'opaque') await cache.put(request, response.clone());
      return response;
    })());
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Bypass Service Worker for Range requests and media streaming (audio/video).
  // Cache Storage API cannot cache 206 Partial Content (throws TypeError), and returning
  // full 200 responses to Range requests causes MEDIA_ELEMENT_ERROR format errors in browsers.
  if (request.headers.has('range') || request.destination === 'audio' || request.destination === 'video' || url.pathname.includes('/assets/audio/')) {
    return;
  }

  // Data: serve the cached copy instantly, refresh it in the background.
  if (url.pathname.startsWith(DATA_PATH)) {
    event.respondWith((async () => {
      const cache = await caches.open(DATA_CACHE_NAME);
      const cached = await cache.match(request, { ignoreSearch: true });
      const refresh = fetch(request).then(async response => {
        if (response.status === 200) await cache.put(request, response.clone());
        return response;
      });
      if (cached) {
        event.waitUntil(refresh.catch(() => {}));
        return cached;
      }
      return refresh;
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.status === 200) await cache.put(request, response.clone());
    return response;
  })());
});
