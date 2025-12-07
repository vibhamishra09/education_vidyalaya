// Service Worker for Webyalaya PWA
// Handles push notifications and offline caching

const CACHE_NAME = 'webyalaya-v1';
const OFFLINE_URL = '/offline';

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/webyalaya-main-logo.svg',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((error) => {
        console.log('[ServiceWorker] Some assets failed to cache:', error);
        // Continue even if some assets fail
        return Promise.resolve();
      });
    })
  );
  
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[ServiceWorker] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - Network first, then cache strategy for navigation
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip API requests - always fetch from network
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // For navigation requests (HTML pages) - Network first, fallback to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache the response
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return offline page as fallback
            return caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  // For static assets - Cache first, then network
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|ico|woff|woff2|ttf|eot)$/) ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/fonts/')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version, but update cache in background
          fetch(request).then((response) => {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, response);
            });
          });
          return cachedResponse;
        }
        // Fetch from network and cache
        return fetch(request).then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        });
      })
    );
    return;
  }
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('🔔 [ServiceWorker] Push notification received:', event);

  if (!event.data) {
    console.log('⚠️  [ServiceWorker] Push event but no data');
    return;
  }

  const data = event.data.json();
  console.log('📨 [ServiceWorker] Push data:', data);

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.svg',
    badge: '/icons/icon-72x72.svg',
    vibrate: [200, 100, 200],
    tag: data.data?.notificationId || 'default',
    requireInteraction: data.data?.actionType?.includes('URGENT'),
    data: data.data,
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    Promise.all([
      // Show browser notification
      self.registration.showNotification(data.title, options),
      // Send message to all open clients for in-app toast
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        console.log(`📤 [ServiceWorker] Sending to ${clients.length} client(s)`);
        clients.forEach((client) => {
          client.postMessage({
            type: 'PUSH_NOTIFICATION',
            notification: {
              title: data.title,
              body: data.body,
              icon: data.icon,
              data: data.data,
            },
          });
        });
      }),
    ])
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Notification clicked:', event.notification);
  event.notification.close();

  const notificationData = event.notification.data || {};
  let urlToOpen = '/dashboard';

  // Handle action buttons
  if (event.action === 'dismiss') {
    return;
  }

  // Determine URL based on notification type
  if (notificationData.actionType) {
    switch (notificationData.actionType) {
      // Peer Session Notifications
      case 'SESSION_REQUEST':
      case 'SESSION_ACCEPTED':
      case 'SESSION_CANCELLED':
      case 'SESSION_REMINDER_24H':
      case 'SESSION_REMINDER_1H':
      case 'SESSION_REMINDER_5M':
        if (notificationData.peerSessionId) {
          urlToOpen = `/sessions/${notificationData.peerSessionId}`;
        } else if (notificationData.sessionId && notificationData.sessionType === 'peerSession') {
          urlToOpen = `/sessions/${notificationData.sessionId}`;
        }
        break;

      // Peer Session Review Notifications
      case 'SESSION_COMPLETE_REVIEW':
      case 'SESSION_ENDED_REVIEW':
        if (notificationData.peerSessionId) {
          urlToOpen = `/submit-review/${notificationData.peerSessionId}?type=peerSession`;
        } else if (notificationData.sessionId && notificationData.sessionType === 'peerSession') {
          urlToOpen = `/submit-review/${notificationData.sessionId}?type=peerSession`;
        }
        break;

      // Study Room Notifications
      case 'STUDYROOM_JOINED':
      case 'STUDYROOM_REMINDER_24H':
      case 'STUDYROOM_REMINDER_1H':
      case 'STUDYROOM_REMINDER_5M':
        if (notificationData.studyRoomId) {
          urlToOpen = `/studyroom/${notificationData.studyRoomId}`;
        } else if (notificationData.sessionId && notificationData.sessionType === 'studyRoom') {
          urlToOpen = `/studyroom/${notificationData.sessionId}`;
        }
        break;

      // Study Room Review Notifications
      case 'STUDYROOM_ENDED_REVIEW':
        if (notificationData.studyRoomId) {
          urlToOpen = `/submit-review/${notificationData.studyRoomId}?type=studyRoom`;
        } else if (notificationData.sessionId && notificationData.sessionType === 'studyRoom') {
          urlToOpen = `/submit-review/${notificationData.sessionId}?type=studyRoom`;
        }
        break;

      // Review Notifications
      case 'REVIEW_RECEIVED':
        urlToOpen = '/profile?tab=reviews';
        break;

      case 'REVIEW_REMINDER':
        if (notificationData.sessionId && notificationData.sessionType) {
          urlToOpen = `/submit-review/${notificationData.sessionId}?type=${notificationData.sessionType}`;
        } else if (notificationData.peerSessionId) {
          urlToOpen = `/submit-review/${notificationData.peerSessionId}?type=peerSession`;
        } else if (notificationData.studyRoomId) {
          urlToOpen = `/submit-review/${notificationData.studyRoomId}?type=studyRoom`;
        }
        break;

      // Payment Notifications
      case 'PAYMENT_RELEASED':
        urlToOpen = '/profile?tab=earnings';
        break;

      default:
        urlToOpen = '/dashboard';
    }
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus existing window
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then((focusedClient) => {
            return focusedClient.navigate(urlToOpen);
          });
        }
      }
      // Open new window if none exists
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Push subscription change event
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[ServiceWorker] Push subscription changed');
  event.waitUntil(
    fetch('/api/notifications/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event.newSubscription?.toJSON()),
    })
  );
});

// Background sync event (for offline actions)
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Sync event:', event.tag);
  
  if (event.tag === 'sync-pending-actions') {
    event.waitUntil(syncPendingActions());
  }
});

// Helper function for syncing pending actions
async function syncPendingActions() {
  // This can be extended to handle offline form submissions
  console.log('[ServiceWorker] Syncing pending actions...');
}

// Message event handler
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
