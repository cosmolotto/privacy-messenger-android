// Firebase messaging service worker for background push notifications
// This runs even when the app is closed

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  // REPLACE with your Firebase config
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  const { senderName, conversationId } = payload.data || {};

  self.registration.showNotification(title || senderName || 'New Message', {
    body: body || 'You have a new encrypted message',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: conversationId || 'default',
    renotify: true,
    data: { conversationId },
    actions: [
      { action: 'reply', title: 'Reply' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            conversationId: event.notification.data?.conversationId,
          });
          return;
        }
      }
      return clients.openWindow('/');
    })
  );
});
