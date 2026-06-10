// Minimal service worker: makes the app installable and usable offline.
// Network-first so a fresh deploy is always picked up, falling back to the
// cache (and the cached start page for navigations) when offline.

const CACHE = "pmt-cache-v1";
const BASE = self.location.pathname.replace(/\/sw\.js$/, "");
const START = BASE + "/";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  // Only handle our own origin; let cross-origin (e.g. Supabase) pass through.
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const fresh = await fetch(req);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cached = await cache.match(req);
        if (cached) return cached;
        if (req.mode === "navigate") {
          const start = await cache.match(START);
          if (start) return start;
        }
        throw new Error("offline and not cached");
      }
    })(),
  );
});
