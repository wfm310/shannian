// 闪念 Pro Service Worker
// 策略：
//   1. 预缓存应用外壳（静态资源 + 首页），实现离线可访问。
//   2. 运行时：导航请求走 network-first（保证内容最新），失败回退到缓存外壳；
//      其他静态资源走 stale-while-revalidate。
//   3. 业务数据全部存于 IndexedDB（Dexie），不受 SW 缓存影响，离线照常可读写。

const CACHE = "flashpro-v1"
const SHELL = ["/", "/manifest.webmanifest", "/icon-192.svg", "/icon-512.svg"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  // 只处理同源 GET（第三方资源与 POST 等直接放行）
  if (request.method !== "GET") return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // 导航请求：network-first，失败回退外壳
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(request, copy))
          return res
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("/")))
    )
    return
  }

  // 其他静态资源：stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(request, copy))
          return res
        })
        .catch(() => cached)
      return cached || network
    })
  )
})
