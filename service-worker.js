const CACHE='pension-control-v5';
const ASSETS=['./','./index.html','./styles.css','./app.js','./backend.js','./config.js','./manifest.webmanifest'];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(fetch(request).then(response => {
    const copy=response.clone(); caches.open(CACHE).then(cache=>cache.put(request,copy)); return response;
  }).catch(()=>caches.match(request)));
});
