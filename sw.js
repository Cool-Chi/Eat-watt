const CACHE_NAME = 'eat-watt-cache-v1.4';

// 確認路徑對應到 v1.3 拆分後的新模組架構
const urlsToCache = [
    '/',
    '/index.html',
    '/css/base.css',
    '/css/layout.css',
    '/css/components.css',
    '/css/list.css',
    '/css/games.css',
    '/js/main.js',
    '/js/store.js',
    '/js/games.js',
    '/js/ui/index.js',
    '/js/ui/core.js',
    '/js/ui/picker.js',
    '/js/ui/gestures.js',
    '/js/ui/render.js',
    '/js/ui/actions.js',
    '/js/ui/modals.js',
    '/icon-192.png',
    '/icon-512.png',
    '/manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // 清除舊版本的快取
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});