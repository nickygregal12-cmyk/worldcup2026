// WC26 Predictor — Service Worker
const VERSION = 'wc26-v3'
const APP_CACHE = `${VERSION}-app`
const ASSET_CACHE = `${VERSION}-assets`
const PAGE_CACHE = `${VERSION}-pages`
const CORE_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/offline.html',
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(APP_CACHE).then((cache) => cache.addAll(CORE_ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  const currentCaches = new Set([APP_CACHE, ASSET_CACHE, PAGE_CACHE])
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => !currentCaches.has(key)).map((key) => caches.delete(key))
    ))
  )
  self.clients.claim()
})

async function networkFirst(request, cacheName, fallback) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(request)
    if (response?.ok) cache.put(request, response.clone())
    return response
  } catch {
    return (await cache.match(request)) || (fallback ? caches.match(fallback) : Response.error())
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(ASSET_CACHE)
  const cached = await cache.match(request)
  const network = fetch(request).then((response) => {
    if (response?.ok) cache.put(request, response.clone())
    return response
  }).catch(() => null)
  return cached || network || Response.error()
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  if (
    url.pathname.startsWith('/rest/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/.netlify/')
  ) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, PAGE_CACHE, '/offline.html'))
    return
  }

  if (
    url.pathname.startsWith('/assets/') ||
    /\.(?:js|css|png|jpe?g|svg|ico|webp|woff2?)$/.test(url.pathname) ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(staleWhileRevalidate(request))
    return
  }

  event.respondWith(networkFirst(request, APP_CACHE))
})
