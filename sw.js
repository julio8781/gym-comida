// Service worker: PWA instalable + notificaciones push.
// Sin caché a propósito: cada push llega al instante.
self.addEventListener("install", e => self.skipWaiting());
self.addEventListener("activate", e => self.clients.claim());
self.addEventListener("fetch", e => {});

// ===== NOTIFICACIONES PUSH =====
self.addEventListener("push", e => {
  let datos = { titulo: "Pastanaga 🥕", cuerpo: "Tienes un recordatorio" };
  try { if (e.data) datos = { ...datos, ...e.data.json() }; } catch (x) {}

  const opciones = {
    body: datos.cuerpo,
    icon: "https://gym.alvarezjulio.com/icon-192.png",
    badge: "https://gym.alvarezjulio.com/icon-192.png",
    vibrate: [300, 120, 300, 120, 300],
    tag: datos.tag || "pastanaga",
    renotify: true,
    requireInteraction: true,   // se queda hasta que la tocas, no se va sola
    silent: false,
    data: { url: datos.url || "https://gym.alvarezjulio.com/" },
  };

  e.waitUntil(self.registration.showNotification(datos.titulo, opciones));
});

// Al tocar la notificación → abrir o enfocar la app
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const destino = (e.notification.data && e.notification.data.url) || "https://gym.alvarezjulio.com/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientes => {
      for (const c of clientes) {
        if ("focus" in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(destino);
    })
  );
});