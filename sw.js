const CACHE_NAME = 'matgary-v1.8.0-20260901';
const APP_SHELL = ['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL).catch(()=>{})).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('message', event => { if(event.data?.type==='SKIP_WAITING') self.skipWaiting(); });
function external(url){return /firebase|googleapis\.com|identitytoolkit|gstatic\.com/.test(url.hostname);}
self.addEventListener('fetch', event => {
  const r=event.request;if(r.method!=='GET')return;
  const u=new URL(r.url);if(external(u))return;
  if(r.mode==='navigate'||u.pathname.endsWith('/index.html')||u.pathname==='/'){
    event.respondWith(fetch(r,{cache:'no-store'}).then(resp=>{if(resp?.ok)caches.open(CACHE_NAME).then(c=>c.put('./index.html',resp.clone())).catch(()=>{});return resp;}).catch(()=>caches.match('./index.html').then(c=>c||caches.match('./'))));
    return;
  }
  if(u.origin===self.location.origin){
    event.respondWith(caches.match(r).then(c=>c||fetch(r).then(resp=>{if(resp?.ok)caches.open(CACHE_NAME).then(cache=>cache.put(r,resp.clone())).catch(()=>{});return resp;})));
  }
});
