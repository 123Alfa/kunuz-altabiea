const CACHE_NAME = 'matgary-v1.5.51-20260825';

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
      .then(cache => cache.addAll(APP_SHELL))
      .catch(err => console.warn('App shell cache warning:', err))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys
        .filter(key => key !== CACHE_NAME)
        .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

function isFirebaseRequest(url) {
  return url.hostname.includes('firebase') ||
         url.hostname.includes('googleapis.com') ||
         url.hostname.includes('identitytoolkit') ||
         url.hostname.includes('gstatic.com');
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (isFirebaseRequest(url)) return;

  if (
    request.mode === 'navigate' ||
    url.pathname.endsWith('/index.html') ||
    url.pathname === '/'
  ) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put('./index.html', copy))
              .catch(() => {});
          }
          return response;
        })
        .catch(() =>
          caches.match('./index.html')
            .then(cached => cached || caches.match('./'))
        )
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;

        return fetch(request).then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, copy))
              .catch(() => {});
          }
          return response;
        });
      })
    );
  }
});
