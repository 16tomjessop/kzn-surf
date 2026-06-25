/* Local-dev cache reset. The app now unregisters service workers on localhost/127.0.0.1.
   This file also self-removes any previously installed local worker and deletes old caches. */
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .then(clients => clients.forEach(client => client.navigate(client.url)))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request));
});
