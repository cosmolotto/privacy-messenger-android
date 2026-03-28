/**
 * Push Notification Service
 * 
 * Uses Firebase Cloud Messaging (FCM) for:
 * - Web push notifications (Service Worker)
 * - Android notifications (via Capacitor)
 * 
 * Setup required:
 * 1. Create Firebase project at console.firebase.google.com
 * 2. Add web app to get config
 * 3. Replace FIREBASE_CONFIG below with your config
 * 4. Add firebase-messaging-sw.js to public/
 */

const FIREBASE_CONFIG = {
  // REPLACE with your Firebase config from console.firebase.google.com
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

class PushNotificationService {
  constructor() {
    this.messaging = null;
    this.token = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Dynamically import Firebase (tree-shakeable)
      const { initializeApp } = await import('https://esm.sh/firebase@10.8.0/app');
      const { getMessaging, getToken, onMessage } = await import('https://esm.sh/firebase@10.8.0/messaging');

      const app = initializeApp(FIREBASE_CONFIG);
      this.messaging = getMessaging(app);
      this.initialized = true;

      // Listen for foreground messages
      onMessage(this.messaging, (payload) => {
        this._showNotification(payload);
      });
    } catch (err) {
      console.warn('[Push] Firebase not configured:', err.message);
    }
  }

  async requestPermission() {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('[Push] Permission denied');
        return null;
      }

      if (!this.initialized) await this.initialize();
      if (!this.messaging) return null;

      const { getToken } = await import('https://esm.sh/firebase@10.8.0/messaging');
      this.token = await getToken(this.messaging, {
        vapidKey: 'YOUR_VAPID_KEY', // Generate in Firebase Console > Cloud Messaging
      });

      console.log('[Push] Token:', this.token);
      return this.token;
    } catch (err) {
      console.error('[Push] Error getting token:', err);
      return null;
    }
  }

  async registerTokenWithServer(apiToken) {
    if (!this.token) return;

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8082/api';
      await fetch(`${API_URL}/push/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({ fcmToken: this.token }),
      });
    } catch (err) {
      console.error('[Push] Failed to register token:', err);
    }
  }

  _showNotification(payload) {
    const { title, body } = payload.notification || {};
    const { conversationId, senderName } = payload.data || {};

    // Don't show if user is on the same conversation
    if (document.hasFocus() && window.__activeConversationId === conversationId) {
      return;
    }

    if (Notification.permission === 'granted') {
      const notif = new Notification(title || senderName || 'New Message', {
        body: body || 'You have a new encrypted message',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: conversationId || 'default',
        renotify: true,
        data: { conversationId },
      });

      notif.onclick = () => {
        window.focus();
        if (conversationId) {
          window.__openConversation?.(conversationId);
        }
        notif.close();
      };
    }
  }

  /**
   * Local notification fallback (no Firebase needed)
   * Works for basic web push without server-side FCM
   */
  showLocalNotification(title, body, data = {}) {
    if (Notification.permission !== 'granted') return;
    if (document.hasFocus()) return; // Don't show if app is focused

    const notif = new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.conversationId || 'default',
      renotify: true,
      data,
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
    };
  }

  async checkPermission() {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  }
}

export const pushService = new PushNotificationService();
export default pushService;
