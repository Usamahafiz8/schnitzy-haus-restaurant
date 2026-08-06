/* eslint-disable no-undef */
/**
 * Firebase Cloud Messaging service worker — handles push notifications while
 * the tab is closed or in the background. Foreground messages are handled in
 * components/customer/push-registrar.tsx instead.
 *
 * Service workers can't read Next.js env vars, so the config is fetched from
 * /api/push-config at install time. If FCM isn't configured the worker installs
 * and does nothing, which is exactly what we want.
 */
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

fetch("/api/push-config")
  .then((response) => (response.ok ? response.json() : null))
  .then((payload) => {
    const config = payload && payload.data;
    if (!config || !config.apiKey) return;

    firebase.initializeApp(config);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((message) => {
      const title = (message.notification && message.notification.title) || "Schnitzy Haus";
      const body = (message.notification && message.notification.body) || "";
      const link = (message.data && message.data.link) || "/";

      self.registration.showNotification(title, {
        body,
        icon: "/icons/icon-192.png",
        badge: "/icons/badge.png",
        data: { link },
        tag: (message.data && message.data.orderId) || undefined,
        renotify: true,
      });
    });
  })
  .catch(() => {
    /* Push simply stays off. */
  });

// Focus an existing tab if one is already open, rather than piling up windows.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(link);
            return client.focus();
          }
        }
        return self.clients.openWindow(link);
      }),
  );
});
