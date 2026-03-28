import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8082';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
  }

  connect(token) {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket.id);
      this.connected = true;
      this.reconnectAttempts = 0;
      this._emit('connection:status', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      this.connected = false;
      this._emit('connection:status', { connected: false, reason });
    });

    this.socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
      this.reconnectAttempts++;
      this._emit('connection:error', { message: err.message, attempts: this.reconnectAttempts });
    });

    // ─── MESSAGE EVENTS ─────────────────────────
    this.socket.on('message:new', (message) => {
      this._emit('message:new', message);
    });

    this.socket.on('message:status', ({ messageId, status, userId }) => {
      this._emit('message:status', { messageId, status, userId });
    });

    this.socket.on('message:deleted', ({ messageId, conversationId }) => {
      this._emit('message:deleted', { messageId, conversationId });
    });

    // ─── TYPING EVENTS ─────────────────────────
    this.socket.on('typing:update', ({ userId, conversationId, isTyping }) => {
      this._emit('typing:update', { userId, conversationId, isTyping });
    });

    // ─── PRESENCE EVENTS ────────────────────────
    this.socket.on('presence:update', ({ userId, online }) => {
      this._emit('presence:update', { userId, online });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  // ─── SEND METHODS ──────────────────────────────
  sendMessage(data) {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) return reject(new Error('Not connected'));
      this.socket.emit('message:send', data, (response) => {
        if (response.success) resolve(response.data);
        else reject(new Error(response.error));
      });
    });
  }

  sendDeliveryReceipt(messageId, conversationId) {
    this.socket?.emit('message:delivered', { messageId, conversationId });
  }

  sendReadReceipt(messageId, conversationId) {
    this.socket?.emit('message:read', { messageId, conversationId });
  }

  startTyping(conversationId) {
    this.socket?.emit('typing:start', { conversationId });
  }

  stopTyping(conversationId) {
    this.socket?.emit('typing:stop', { conversationId });
  }

  checkPresence(targetUserId) {
    return new Promise((resolve) => {
      if (!this.socket?.connected) return resolve({ online: false });
      this.socket.emit('presence:check', { targetUserId }, resolve);
    });
  }

  deleteMessage(messageId, conversationId) {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) return reject(new Error('Not connected'));
      this.socket.emit('message:delete', { messageId, conversationId }, (response) => {
        if (response.success) resolve(response);
        else reject(new Error(response.error));
      });
    });
  }

  // ─── EVENT LISTENER MANAGEMENT ─────────────────
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
  }

  _emit(event, data) {
    this.listeners.get(event)?.forEach(cb => {
      try { cb(data); } catch (e) { console.error('[Socket] Listener error:', e); }
    });
  }

  isConnected() {
    return this.connected;
  }
}

export const socketService = new SocketService();
export default socketService;
