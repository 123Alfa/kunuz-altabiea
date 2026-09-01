const CACHE_NAME = 'matgary-shell-v1.7.3';
const OFFLINE_URL = './index.html';
const APP_SHELL = ['./', './index.html', './manifest.json', './version.json'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL).catch(()=>{})));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k.startsWith('matgary-shell-') && k !== CACHE_NAME).map(k => caches.delete(k))
  )).then(() => self.clients.claim())));
});

self.addEventListener('message', event => {
  if(event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if(url.origin !== location.origin) return;

  // HTML/navigation: network first so new releases appear immediately; offline fallback remains available.
  if(req.mode === 'navigate' || req.destination === 'document'){
    event.respondWith((async()=>{
      try{
        const fresh = await fetch(req, {cache:'no-store'});
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      }catch(e){
        return (await caches.match(req)) || (await caches.match(OFFLINE_URL));
      }
    })());
    return;
  }

  // version.json must never be served stale.
  if(url.pathname.endsWith('/version.json')){
    event.respondWith(fetch(req,{cache:'no-store'}));
    return;
  }

  // Other same-origin resources: cache first, refresh in background when possible.
  event.respondWith((async()=>{
    const cached = await caches.match(req);
    const network = fetch(req).then(res=>{
      if(res.ok) caches.open(CACHE_NAME).then(c=>c.put(req,res.clone()));
      return res;
    }).catch(()=>null);
    return cached || await network || new Response('',{status:504});
  })());
});
