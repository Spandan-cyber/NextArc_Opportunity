// sw.js
// This is the Service Worker. It handles network requests.

// A simple event listener to confirm installation
self.addEventListener('install', (event) => {
  console.log('Service Worker installed.');
});

// This ensures your content is available offline on the first visit
const CACHE_NAME = 'nextarc-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/careers.json',
  // Add other crucial files like logos and auth.js here later
];

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});