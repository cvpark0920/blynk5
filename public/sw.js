/* global self */
self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (error) {
      payload = { title: 'Qoodle Shop', body: event.data.text() };
    }
  }

  const title = payload.title || 'Qoodle Shop';
  const body = payload.body || '새 알림이 도착했습니다.';
  const url = payload.url || '/shop';
  const icon = payload.icon || '/shop-icon.svg';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      data: { url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/shop';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
