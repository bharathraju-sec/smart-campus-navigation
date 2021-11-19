/**
 * sw.js
 * Service worker - caches the app shell so the building list, search
 * and details still work offline. The map itself needs a connection.
 */

const CACHE = 'hu-campus-v4';

const APP_SHELL = [
    './',
    './index.html',
    './manifest.json',
    './img/icon.svg',
    './css/app.css',
    './js/config.js',
    './js/data.js',
    './js/geo.js',
    './js/graph.js',
    './js/db.js',
    './js/map.js',
    './js/app.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)));
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    );
    self.clients.claim();
});

// network first for our own files, fall back to the cache when offline
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (event.request.method !== 'GET' || url.origin !== location.origin) return;

    event.respondWith(
        fetch(event.request)
            .then((res) => {
                const copy = res.clone();
                caches.open(CACHE).then((cache) => cache.put(event.request, copy));
                return res;
            })
            .catch(() => caches.match(event.request))
    );
});
