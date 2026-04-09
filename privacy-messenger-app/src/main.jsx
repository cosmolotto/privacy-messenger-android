import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Register service worker for push notifications
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/firebase-messaging-sw.js')
    .then((reg) => console.log('[SW] Registered:', reg.scope))
    .catch((err) => console.warn('[SW] Registration failed:', err));
}

// Handle notification clicks from service worker
navigator.serviceWorker?.addEventListener('message', (event) => {
  if (event.data?.type === 'NOTIFICATION_CLICK') {
    window.__openConversation?.(event.data.conversationId);
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
