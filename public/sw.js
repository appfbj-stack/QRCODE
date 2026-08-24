/**
 * QRCODE Obreiros — Service Worker
 *
 * Estratégia: network-first SEMPRE (pra forçar versão nova).
 * Cache apenas pra fallback offline.
 */

const CACHE_NAME = "qrcode-obreiros-v1.0.3";
const STATIC_ASSETS = [
  "/",
  "/privacidade",
  "/logo-kairos.png",
  "/favicon.svg",
  "/manifest.json",
];

// Install: cachear assets estaticos basicos
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS).catch(() => null))
      .then(() => self.skipWaiting())
  );
});

// Activate: limpar TODOS os caches antigos (de qualquer versão)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: SEMPRE network-first (servidor manda a versão nova)
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        // Cachear respostas OK pra fallback offline
        if (res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then(
          (cached) =>
            cached ||
            (req.headers.get("accept")?.includes("text/html")
              ? caches.match("/")
              : new Response("Offline", { status: 503 }))
        )
      )
  );
});
