const CACHE_NAME = 'matgary-v1.7.6-20260901-1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function isExternalService(url) {
  return url.hostname.includes('firebase') ||
         url.hostname.includes('googleapis.com') ||
         url.hostname.includes('identitytoolkit') ||
         url.hostname.includes('gstatic.com');
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (isExternalService(url)) return;

  // صفحات التنقل: الشبكة أولاً دائماً، حتى لا نعيد HTML قديم.
  if (request.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname === '/') {
    event.respondWith(
      fetch(request, {cache:'no-store'})
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(c => c.put('./index.html', copy)).catch(()=>{});
          }
          return response;
        })
        .catch(() => caches.match('./index.html').then(c => c || caches.match('./')))
    );
    return;
  }

  // باقي الملفات: كاش أولاً، ثم الشبكة.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, copy)).catch(()=>{});
          }
          return response;
        });
      })
    );
  }
});
