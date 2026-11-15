/* Service worker на админ панела: показва известията, които идват от базата
   (нова поръчка, заявка за абонамент, запитване), и отваря панела при докосване.
   Не кешира нищо и не пипа страниците на сайта. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Умаревска Ябълка', {
    body: d.body || '',
    icon: 'img/app-192.png',
    badge: 'img/app-badge.png',
    tag: d.tag || undefined,
    renotify: !!d.tag,
    data: { url: d.url || 'admin.html' }
  }));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = new URL((e.notification.data && e.notification.data.url) || 'admin.html', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      if (/\/admin(\.html)?(#|\?|$)/.test(list[i].url)) {
        return list[i].focus().then(function (c) { return c.navigate ? c.navigate(url) : c; });
      }
    }
    return self.clients.openWindow(url);
  }));
});
