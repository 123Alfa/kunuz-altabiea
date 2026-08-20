const CACHE_NAME = 'knooz-v2';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// تثبيت النسخة الجديدة
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// حذف أي نسخ قديمة
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames =>
        Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

// التعامل مع الملفات والصفحات
self.addEventListener('fetch', event => {
  const request = event.request;

  // لا نتدخل في Firebase / Google
  if (
    request.url.includes('firebase') ||
    request.url.includes('googleapis.com') ||
    request.url.includes('accounts.google.com')
  ) {
    return;
  }

  // عند فتح صفحات البرنامج:
  // نحاول أخذ أحدث نسخة من الإنترنت أولاً
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, copy));

            return response;
          }

          return caches.match(request);
        })
        .catch(() => caches.match(request))
    );

    return;
  }

  // باقي الملفات: الكاش أولاً ثم الإنترنت
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then(response => {
            if (!response || response.status !== 200) {
              return response;
            }

            const copy = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, copy));

            return response;
          });
      })
      .catch(() => caches.match('./index.html'))
  );
});
