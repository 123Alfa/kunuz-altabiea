const CACHE_NAME = 'knooz-v1'; // تم التحديث لاسم مشروعك "كنوز الطبيعة"

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// 1. التثبيت: حفظ الملفات بشكل فردي لضمان عدم انهيار الكاش كاملاً في حال تعثر أحد روابط الـ CDN
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          fetch(url, { mode: 'cors' })
            .then((response) => {
              if (response.ok || response.type === 'opaque') {
                return cache.put(url, response);
              }
            })
            .catch((err) => console.warn('فشل تخزين العنصر محلياً:', url, err))
        )
      );
    })
  );
  self.skipWaiting();
});

// 2. التفعيل: تنظيف النسخ القديمة فوراً
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// 3. اعتراض الطلبات: إرجاع المحتوى من الكاش فوراً، وحفظ طلبات الـ CDN الخارجية
self.addEventListener('fetch', (event) => {
  // تجاهل طلبات قواعد بيانات Firebase لتركها تعمل بخاصية الـ Offline الخاصة بها
  if (
    event.request.url.includes('firestore.googleapis.com') ||
    event.request.url.includes('firebase')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // إذا كان الملف موجوداً في الكاش، ارجعه فوراً بدون انتظار الشبكة
      if (cached) {
        return cached;
      }

      // إذا لم يكن موجوداً، جلب الملف من الشبكة وتخزينه (بما في ذلك مكتبات الـ CDN)
      return fetch(event.request)
        .then((response) => {
          if (
            response.status === 200 ||
            response.type === 'opaque' ||
            event.request.url.includes('cdn') ||
            event.request.url.includes('cdnjs')
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // فتح الصفحة الرئيسية إذا كان الجهاز غير متصل بالإنترنت
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('Offline', { status: 503 });
        });
    })
  );
});
