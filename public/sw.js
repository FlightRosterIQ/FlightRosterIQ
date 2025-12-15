// Service Worker for FlightRosterIQ PWA Push Notifications

const CACHE_NAME = 'flightrosteriq-v4';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install service worker and cache assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate service worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch handler for offline support
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Push notification handler - receives push from backend
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  let notificationData = {
    title: 'FlightRosterIQ',
    body: 'New flight update available',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    tag: 'flight-notification',
    requireInteraction: true,
    vibrate: [200, 100, 200],
    actions: [
      { action: 'view', title: 'View', icon: '/icons/icon-96x96.png' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  // Parse push data if provided
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        ...notificationData,
        title: data.title || notificationData.title,
        body: data.message || data.body || notificationData.body,
        data: data
      };
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'view') {
    // Open the app when user clicks "View"
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification
    return;
  } else {
    // Default click action - open the app
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // If app is already open, focus it
          for (let client of clientList) {
            if (client.url === '/' && 'focus' in client) {
              return client.focus();
            }
          }
          // Otherwise open new window
          if (clients.openWindow) {
            return clients.openWindow('/');
          }
        })
    );
  }
});

// Background sync for offline notifications
self.addEventListener('sync', (event) => {
  console.log('Background sync:', event.tag);
  
  if (event.tag === 'sync-notifications') {
    event.waitUntil(
      // Fetch pending notifications from backend
      fetch('/api/notifications')
        .then(response => response.json())
        .then(data => {
          if (data.success && data.notifications) {
            // Show notifications that were queued while offline
            data.notifications.forEach(notif => {
              self.registration.showNotification('Flight Update', {
                body: notif.message,
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-96x96.png',
                tag: 'flight-notification',
                vibrate: [200, 100, 200]
              });
            });
          }
        })
        .catch(err => console.error('Background sync failed:', err))
    );
  }
});

// Periodic background sync (requires permission)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-flight-updates') {
    event.waitUntil(
      fetch('/api/notifications')
        .then(response => response.json())
        .then(data => {
          if (data.success && data.notifications && data.notifications.length > 0) {
            // Show notification for new updates
            self.registration.showNotification('New Flight Updates', {
              body: `You have ${data.notifications.length} new notification(s)`,
              icon: '/icons/icon-192x192.png',
              badge: '/icons/icon-96x96.png',
              tag: 'flight-update-check',
              vibrate: [200, 100, 200],
              requireInteraction: true
            });
          }
        })
        .catch(err => console.error('Periodic sync failed:', err))
    );
  }
});
