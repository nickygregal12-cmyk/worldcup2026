// Temporary retirement worker for the inherited WC26 PWA cache.
// The Stage 2 foundation does not register a service worker.
self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('wc26-')).map(key => caches.delete(key))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.claim()),
  )
})
