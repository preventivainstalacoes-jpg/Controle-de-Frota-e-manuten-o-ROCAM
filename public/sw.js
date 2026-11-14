self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { body: event.data?.text() || "Você recebeu um alerta do Frota ROCAM." }; }
  const title = payload.title || "ATENÇÃO, ROCAM!";
  const options = {
    body: payload.body || "Você recebeu um alerta individual de cautela.",
    tag: payload.tag || "rocam-individual-alarm",
    renotify: true,
    requireInteraction: true,
    vibrate: [350, 150, 350, 150, 700],
    data: { url: payload.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clientsList) {
      if (client.url.startsWith(self.location.origin) && "focus" in client) {
        await client.focus();
        if ("navigate" in client && client.url !== target) await client.navigate(target);
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
