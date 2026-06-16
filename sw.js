const CACHE_NAME = 'eat-watt-cache-v1.4.1';

// 精確列出 v1.4 所有最新拆分的模組與靜態資源
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  
  // CSS
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/list.css',
  './css/games.css',
  
  // JS Core
  './js/main.js',
  './js/store.js',
  './js/games.js',
  
  // JS UI Modules (v1.3/v1.4 拆分模組)
  './js/ui/index.js',
  './js/ui/core.js',
  './js/ui/picker.js',
  './js/ui/gestures.js',
  './js/ui/render.js',
  './js/ui/actions.js',
  './js/ui/modals.js',
  
  // 外部依賴
  'https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js'
];

// 1. 安裝階段：下載資源並強制跳過等待
self.addEventListener('install', event => {
  self.skipWaiting(); // 強制立刻進入 activate 階段，不需等待舊版網頁全數關閉
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] 快取已開啟，正在下載新版 v1.4 檔案');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. 啟動階段：清理舊快取並強制接管現有分頁
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] 刪除舊版快取:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // 確保更新後立刻接管所有的客戶端 (網頁)
      return self.clients.claim();
    })
  );
});

// 3. 攔截請求階段：混合策略 (網路優先 vs 快取優先)
self.addEventListener('fetch', event => {
  // 針對網頁主結構 (HTML導向)：採用 Network-First (網路優先)
  if (event.request.mode === 'navigate' || 
     (event.request.method === 'GET' && event.request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // 如果連網成功，把最新的 HTML 更新到快取裡
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => {
          // 如果斷網，才降級讀取快取中的舊 HTML
          return caches.match(event.request);
        })
    );
  } 
  // 針對靜態資源 (CSS, JS, 圖片)：沿用 Cache-First (快取優先，提升載入速度)
  else {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response; // 命中快取，直接回傳
          }
          return fetch(event.request).then(networkResponse => {
            // 對於未在白名單卻被請求的資源，動態加入快取
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
            }
            return networkResponse;
          });
        })
    );
  }
});