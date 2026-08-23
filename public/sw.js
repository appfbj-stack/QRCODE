/**
 * Kairos Igreja — Service Worker
 *
 * Estrategia: cache-first para assets estaticos, network-first para API.
 * Quando offline, retorna cache da home e do bundle para que o app abra
 * mesmo sem internet (depois de carregado pelo menos 1x online).
 */

const CACHE_NAME = "kairos-igreja-v2.7.0";
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

// Activate: limpar caches antigos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME && k.startsWith("kairos-igreja-"))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch:
//  - /api/* → network-first, fallback pro cache (se nao tiver, deixa falhar)
//  - outros (assets, paginas) → cache-first, fallback network
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // API: network-first (precisa de dados frescos)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Cachear GETs do billing/privacidade (publicos ou semi-publicos)
          if (
            res.ok &&
            (url.pathname.startsWith("/api/privacidade") ||
              url.pathname === "/api/health")
          ) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Assets / paginas: cache-first
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req)
          .then((res) => {
            // Cachear apenas sucesso + mesmo origin
            if (res.ok && res.type === "basic") {
              const copy = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => {
            // Fallback final: se pede HTML e tá offline, retorna /
            if (req.headers.get("accept")?.includes("text/html")) {
              return caches.match("/");
            }
            return new Response("Offline", { status: 503 });
          })
    )
  );
});
