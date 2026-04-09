import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import socketService from '../services/socket';
import encryption from '../services/encryption';
import pushService from '../services/pushNotifications';
import nativeBridge from '../services/nativeBridge';

// ─── AUTH HOOK ──────────────────────────────────
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    if (api.isLoggedIn()) {
      const saved = api.getSavedUser();
      if (saved) {
        setUser(saved);
        // Connect socket with existing token
        socketService.connect(localStorage.getItem('accessToken'));
        // Init native features
        nativeBridge.initialize();
        // Request push permission
        pushService.requestPermission().then(token => {
          if (token) pushService.registerTokenWithServer(localStorage.getItem('accessToken'));
        });
      }
    }
    setLoading(false);
  }, []);

  const register = useCallback(async ({ passphrase, displayName }) => {
    const publicKey = await encryption.generateKeyPair();
    const result = await api.register({ passphrase, displayName, publicKey });
    setUser(result.user);
    socketService.connect(result.accessToken);
    nativeBridge.initialize();
    pushService.requestPermission().then(t => t && pushService.registerTokenWithServer(result.accessToken));
    return result;
  }, []);

  const login = useCallback(async ({ uniqueId, passphrase }) => {
    const result = await api.login({ uniqueId, passphrase });
    setUser(result.user);
    socketService.connect(result.accessToken);
    nativeBridge.initialize();
    if (!encryption.hasKeys()) await encryption.generateKeyPair();
    pushService.requestPermission().then(t => t && pushService.registerTokenWithServer(result.accessToken));
    return result;
  }, []);

  const recover = useCallback(async ({ uniqueId, passphrase }) => {
    const newPublicKey = await encryption.generateKeyPair();
    const result = await api.recover({ uniqueId, passphrase, newPublicKey });
    socketService.connect(result.accessToken);
    return result;
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    socketService.disconnect();
    encryption.clearAllKeys();
    setUser(null);
  }, []);

  return { user, setUser, loading, register, login, recover, logout };
}

// ─── CONVERSATIONS HOOK ─────────────────────────
export function useConversations() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getConversations();
      setConversations(data);
    } catch (err) {
      console.error('[Conversations] Fetch error:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConversations();

    // Update conversation list when new message arrives
    const unsub = socketService.on('message:new', () => {
      fetchConversations();
    });

    return unsub;
  }, [fetchConversations]);

  const createConversation = useCallback(async (targetUniqueId) => {
    const result = await api.createConversation(targetUniqueId);
    await fetchConversations();
    return result;
  }, [fetchConversations]);

  return { conversations, loading, fetchConversations, createConversation };
}

// ─── MESSAGES HOOK ──────────────────────────────
export function useMessages(conversationId, recipientPublicKey) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const data = await api.getMessages(conversationId);
      // Decrypt messages if we have recipient's public key
      if (recipientPublicKey) {
        const decrypted = await Promise.all(
          data.map(async (msg) => {
            try {
              const body = await encryption.decryptMessage(
                conversationId,
                msg.encrypted_body,
                recipientPublicKey
              );
              return { ...msg, decrypted_body: body };
            } catch {
              return { ...msg, decrypted_body: msg.encrypted_body };
            }
          })
        );
        setMessages(decrypted);
      } else {
        setMessages(data.map(m => ({ ...m, decrypted_body: m.encrypted_body })));
      }
    } catch (err) {
      console.error('[Messages] Fetch error:', err);
    }
    setLoading(false);
  }, [conversationId, recipientPublicKey]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Listen for new messages
  useEffect(() => {
    if (!conversationId) return;

    const unsub = socketService.on('message:new', async (msg) => {
      if (msg.conversation_id !== conversationId) {
        // Show notification for messages in other conversations
        pushService.showLocalNotification('New Message', 'You have a new encrypted message', {
          conversationId: msg.conversation_id,
        });
        return;
      }

      // Decrypt and add message
      let decryptedBody = msg.encrypted_body || msg.encryptedBody;
      if (recipientPublicKey) {
        try {
          decryptedBody = await encryption.decryptMessage(
            conversationId,
            msg.encrypted_body || msg.encryptedBody,
            recipientPublicKey
          );
        } catch {}
      }

      setMessages(prev => [...prev, { ...msg, decrypted_body: decryptedBody }]);

      // Send delivery receipt
      if (msg.sender_id !== api.getSavedUser()?.id) {
        socketService.sendDeliveryReceipt(msg.id, conversationId);
      }
    });

    return unsub;
  }, [conversationId, recipientPublicKey]);

  // Listen for message status updates
  useEffect(() => {
    const unsub = socketService.on('message:status', ({ messageId, status }) => {
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, status } : m
      ));
    });
    return unsub;
  }, []);

  // Listen for typing indicators
  useEffect(() => {
    if (!conversationId) return;

    const unsub = socketService.on('typing:update', ({ conversationId: cId, isTyping: typing }) => {
      if (cId === conversationId) setIsTyping(typing);
    });
    return unsub;
  }, [conversationId]);

  // Send message
  const sendMessage = useCallback(async (text) => {
    if (!conversationId || !text.trim()) return;

    let encryptedBody = text;
    if (recipientPublicKey) {
      try {
        encryptedBody = await encryption.encryptMessage(conversationId, text, recipientPublicKey);
      } catch (err) {
        console.error('[Messages] Encryption failed, sending plain:', err);
      }
    }

    try {
      const msg = await socketService.sendMessage({
        conversationId,
        encryptedBody,
        messageType: 'text',
      });
      // Message will arrive via socket event
      return msg;
    } catch (err) {
      // Fallback to HTTP
      const msg = await api.sendMessage(conversationId, { encryptedBody });
      setMessages(prev => [...prev, { ...msg, decrypted_body: text }]);
      return msg;
    }
  }, [conversationId, recipientPublicKey]);

  // Typing indicator
  const sendTyping = useCallback((isTyping) => {
    if (!conversationId) return;
    if (isTyping) {
      socketService.startTyping(conversationId);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketService.stopTyping(conversationId);
      }, 3000);
    } else {
      socketService.stopTyping(conversationId);
      clearTimeout(typingTimeoutRef.current);
    }
  }, [conversationId]);

  // Mark messages as read
  const markAsRead = useCallback((messageId) => {
    socketService.sendReadReceipt(messageId, conversationId);
  }, [conversationId]);

  return {
    messages, loading, isTyping,
    sendMessage, sendTyping, markAsRead, fetchMessages,
  };
}

// ─── CONNECTION STATUS HOOK ─────────────────────
export function useConnectionStatus() {
  const [connected, setConnected] = useState(socketService.isConnected());

  useEffect(() => {
    const unsub = socketService.on('connection:status', ({ connected: c }) => {
      setConnected(c);
    });
    return unsub;
  }, []);

  return connected;
}

// ─── PRESENCE HOOK ──────────────────────────────
export function usePresence() {
  const [onlineUsers, setOnlineUsers] = useState(new Map());

  useEffect(() => {
    const unsub = socketService.on('presence:update', ({ userId, online }) => {
      setOnlineUsers(prev => {
        const next = new Map(prev);
        next.set(userId, online);
        return next;
      });
    });
    return unsub;
  }, []);

  const isOnline = useCallback((userId) => {
    return onlineUsers.get(userId) || false;
  }, [onlineUsers]);

  return { onlineUsers, isOnline };
}
