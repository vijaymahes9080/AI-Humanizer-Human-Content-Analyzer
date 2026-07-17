/**
 * AI Humanizer Pro - Service Worker
 * Enables offline loading of assets (HTML, CSS, JavaScript) using a Cache-First strategy.
 */

const CACHE_NAME = 'ai-humanizer-pro-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/engine/analyzer.js',
  './js/engine/rewrite.js',
  './js/ui/dashboard.js',
  './js/ui/app.js'
];

// Install Event
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Cache-First Fallback to Network
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).then((networkResponse) => {
        // Cache new resource dynamically if needed
        return networkResponse;
      });
    }).catch(() => {
      // Fallback if network and cache fail
      if (e.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});
