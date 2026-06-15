const CACHE_NAME = 'eat-watt-cache-v2'; // 升級版本號以觸發更新

// 這裡列出你希望離線時也能讀取的所有檔案
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  
  // 拆分後的 CSS 模組檔案
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/list.css',
  './css/games.css',
  
  // 拆分後的 JS ES6 模組檔案
  './js/main.js',
  './js/store.js',
  './js/ui.js',
  './js/games.js',
  
  // 外部依賴庫 (SortableJS)，加入快取以確保完全離線可用
  'https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js'
];

// 安裝 Service Worker 時，將檔案加入快取
self.addEventListener('install', event => {
  // 強制立即接管控制權，不等待舊版 SW 停止
  self.skipWaiting(); 
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('快取已開啟，正在下載新版檔案');
        return cache.addAll(urlsToCache);
      })
  );
});

// 攔截網頁請求：如果快取裡有，就從快取拿（離線可用）；沒有才連網去抓
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 快取命中，直接回傳
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// 啟動時清除舊的快取 (因為 CACHE_NAME 更新為 v2，v1 的快取會被清掉)
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('刪除舊版快取:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // 確保更新後立即控制所有的客戶端 (網頁)
      return self.clients.claim();
    })
  );
});