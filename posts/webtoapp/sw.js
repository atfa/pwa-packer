const CACHE_NAME = 'html-loader-pwa-v6'; // 升级版本号
const ASSETS = [
    './',
    './index.html'
];
const NETWORK_TIMEOUT = 3000; // 设置 3秒 超时时间

// 安装阶段
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

// 激活阶段
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) return caches.delete(key);
                })
            );
        })
    );
    self.clients.claim();
});

// 辅助函数：创建一个会在 ms 毫秒后 reject 的 Promise
function timeout(ms) {
    return new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Network timeout')), ms);
    });
}

// 拦截请求：网络优先 + 超时控制
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    // 网络请求逻辑
    const fetchRequest = fetch(event.request)
        .then((response) => {
            // 检查响应是否有效
            if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
            }
            // 更新缓存
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
            });
            return response;
        });

    event.respondWith(
        // 让 网络请求 和 超时计时器 赛跑
        Promise.race([fetchRequest, timeout(NETWORK_TIMEOUT)])
            .catch(() => {
                // 网络失败 或 超时，读取缓存
                return caches.match(event.request);
            })
    );
});