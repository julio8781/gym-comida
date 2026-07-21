// Service worker mínimo: necesario para que la PWA sea instalable.
// Sin caché a propósito: así cada push a Cloudflare llega al instante.
self.addEventListener("install", e => self.skipWaiting());
self.addEventListener("activate", e => self.clients.claim());
self.addEventListener("fetch", e => {});
