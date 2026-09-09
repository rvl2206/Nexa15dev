// Self-purging Service Worker for NEXA15
// Unregisters any previously installed service worker and deletes all stale caches

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    })
    .then(() => self.registration.unregister())
    .then(() => self.clients.claim())
    .then(() => {
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          try {
            client.navigate(client.url);
          } catch (e) {}
        });
      });
    })
  );
});

// Always pass through directly to network, no offline cache trapping
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
