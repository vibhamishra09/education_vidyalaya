// Service Worker for Push Notifications
/* eslint-disable no-restricted-globals */

self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  if (!event.data) {
    console.log('Push event but no data');
    return;
  }

  const data = event.data.json();
  console.log('Push data:', data);

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/badge-72x72.png',
    vibrate: [200, 100, 200],
    tag: data.data?.notificationId || 'default',
    requireInteraction: data.data?.actionType?.includes('URGENT'),
    data: data.data,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification);
  event.notification.close();

  const notificationData = event.notification.data || {};

  // Determine URL based on notification type
  // This mapping matches the implementation in notification-dropdown.tsx
  let urlToOpen = '/dashboard';

  if (notificationData.actionType) {
    switch (notificationData.actionType) {
      // Peer Session Notifications - Navigate to session detail page
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

      // Peer Session Review Notifications - Navigate to review form
      case 'SESSION_COMPLETE_REVIEW':
      case 'SESSION_ENDED_REVIEW':
        if (notificationData.peerSessionId) {
          urlToOpen = `/submit-review/${notificationData.peerSessionId}?type=peerSession`;
        } else if (notificationData.sessionId && notificationData.sessionType === 'peerSession') {
          urlToOpen = `/submit-review/${notificationData.sessionId}?type=peerSession`;
        }
        break;

      // Study Room Notifications - Navigate to study room detail page
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

      // Study Room Review Notifications - Navigate to review form
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
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then((client) => {
            // Navigate to the URL
            return client.navigate(urlToOpen);
          });
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('Push subscription changed');
  event.waitUntil(
    fetch('/api/notifications/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event.newSubscription.toJSON()),
    })
  );
});
