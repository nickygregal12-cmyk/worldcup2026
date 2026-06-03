// WC26 Predictor — Service Worker
const CACHE_NAME = 'wc26-v1'
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
]

// Install — cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// Activate — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch — network first, fall back to cache for navigation
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET, cross-origin, and Supabase/API requests
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/rest/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/.netlify/')
  ) {
    return
  }

  // Navigation requests: network first, fall back to cached index
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/'))
    )
    return
  }

  // Static assets: cache first
  if (
    url.pathname.match(/\.(png|jpg|svg|ico|webp|woff2?)$/) ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    )
    return
  }

  // Everything else: network first
  event.respondWith(fetch(request).catch(() => caches.match(request)))
})
