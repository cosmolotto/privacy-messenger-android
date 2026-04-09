/**
 * End-to-End Encryption Service
 * 
 * Uses Web Crypto API for:
 * - ECDH key exchange (P-256)
 * - AES-GCM message encryption (256-bit)
 * - HKDF key derivation
 * 
 * Flow:
 * 1. On registration, generate an ECDH key pair
 * 2. Public key is stored on server
 * 3. When starting a conversation, perform ECDH with recipient's public key
 * 4. Derive shared AES key using HKDF
 * 5. Encrypt/decrypt messages with AES-GCM
 */

const ALGO = { name: 'ECDH', namedCurve: 'P-256' };
const AES_ALGO = { name: 'AES-GCM', length: 256 };
const KEY_STORE = 'privmsg_keys';
const SESSION_STORE = 'privmsg_sessions';

class EncryptionService {
  constructor() {
    this.keyPair = null;
    this.sessionKeys = new Map(); // conversationId -> AES key
  }

  // ─── KEY GENERATION ────────────────────────────
  async generateKeyPair() {
    this.keyPair = await crypto.subtle.generateKey(ALGO, true, ['deriveKey', 'deriveBits']);
    await this._saveKeyPair();
    return await this.exportPublicKey();
  }

  async exportPublicKey() {
    if (!this.keyPair) await this._loadKeyPair();
    const raw = await crypto.subtle.exportKey('jwk', this.keyPair.publicKey);
    return JSON.stringify(raw);
  }

  async importPublicKey(jwkString) {
    const jwk = typeof jwkString === 'string' ? JSON.parse(jwkString) : jwkString;
    return await crypto.subtle.importKey('jwk', jwk, ALGO, true, []);
  }

  // ─── KEY EXCHANGE (ECDH) ──────────────────────
  async deriveSessionKey(conversationId, recipientPublicKeyJwk) {
    if (this.sessionKeys.has(conversationId)) {
      return this.sessionKeys.get(conversationId);
    }

    if (!this.keyPair) await this._loadKeyPair();
    const recipientKey = await this.importPublicKey(recipientPublicKeyJwk);

    // ECDH shared secret
    const sharedBits = await crypto.subtle.deriveBits(
      { name: 'ECDH', public: recipientKey },
      this.keyPair.privateKey,
      256
    );

    // HKDF to derive AES key
    const hkdfKey = await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveKey']);
    const aesKey = await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: new TextEncoder().encode(`privmsg-${conversationId}`),
        info: new TextEncoder().encode('message-encryption'),
      },
      hkdfKey,
      AES_ALGO,
      false,
      ['encrypt', 'decrypt']
    );

    this.sessionKeys.set(conversationId, aesKey);
    this._saveSessionKeys();
    return aesKey;
  }

  // ─── MESSAGE ENCRYPTION ───────────────────────
  async encryptMessage(conversationId, plaintext, recipientPublicKeyJwk) {
    let aesKey = this.sessionKeys.get(conversationId);
    if (!aesKey) {
      aesKey = await this.deriveSessionKey(conversationId, recipientPublicKeyJwk);
    }

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      encoded
    );

    // Combine IV + ciphertext and base64 encode
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return this._arrayBufferToBase64(combined.buffer);
  }

  async decryptMessage(conversationId, encryptedBase64, senderPublicKeyJwk) {
    let aesKey = this.sessionKeys.get(conversationId);
    if (!aesKey) {
      aesKey = await this.deriveSessionKey(conversationId, senderPublicKeyJwk);
    }

    try {
      const combined = this._base64ToArrayBuffer(encryptedBase64);
      const iv = combined.slice(0, 12);
      const ciphertext = combined.slice(12);

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) },
        aesKey,
        ciphertext
      );

      return new TextDecoder().decode(decrypted);
    } catch (err) {
      console.error('[E2E] Decryption failed:', err);
      return '[Unable to decrypt message]';
    }
  }

  // ─── KEY PERSISTENCE ──────────────────────────
  async _saveKeyPair() {
    try {
      const exported = {
        publicKey: await crypto.subtle.exportKey('jwk', this.keyPair.publicKey),
        privateKey: await crypto.subtle.exportKey('jwk', this.keyPair.privateKey),
      };
      localStorage.setItem(KEY_STORE, JSON.stringify(exported));
    } catch (e) {
      console.error('[E2E] Failed to save key pair:', e);
    }
  }

  async _loadKeyPair() {
    try {
      const stored = localStorage.getItem(KEY_STORE);
      if (!stored) {
        await this.generateKeyPair();
        return;
      }
      const { publicKey, privateKey } = JSON.parse(stored);
      this.keyPair = {
        publicKey: await crypto.subtle.importKey('jwk', publicKey, ALGO, true, []),
        privateKey: await crypto.subtle.importKey('jwk', privateKey, ALGO, true, ['deriveKey', 'deriveBits']),
      };
    } catch (e) {
      console.error('[E2E] Failed to load key pair, generating new one:', e);
      await this.generateKeyPair();
    }
  }

  _saveSessionKeys() {
    // Session keys are derived, not stored — they regenerate from ECDH
  }

  clearAllKeys() {
    localStorage.removeItem(KEY_STORE);
    localStorage.removeItem(SESSION_STORE);
    this.keyPair = null;
    this.sessionKeys.clear();
  }

  // ─── HELPERS ──────────────────────────────────
  _arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  _base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  hasKeys() {
    return !!localStorage.getItem(KEY_STORE);
  }
}

export const encryption = new EncryptionService();
export default encryption;
