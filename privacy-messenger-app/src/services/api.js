const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8082/api';

class ApiService {
  constructor() {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  setTokens(access, refresh) {
    this.accessToken = access;
    this.refreshToken = refresh;
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {}),
      ...options.headers,
    };

    let res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

    // Auto-refresh on 401
    if (res.status === 401 && this.refreshToken) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        headers.Authorization = `Bearer ${this.accessToken}`;
        res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
      } else {
        this.clearTokens();
        window.location.reload();
        throw { status: 401, code: 'SESSION_EXPIRED', message: 'Please log in again' };
      }
    }

    const data = await res.json();
    if (!res.ok) throw { status: res.status, ...data.error };
    return data;
  }

  async refreshAccessToken() {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      this.accessToken = data.data.accessToken;
      localStorage.setItem('accessToken', this.accessToken);
      return true;
    } catch {
      return false;
    }
  }

  // ─── AUTH ─────────────────────────────────────
  async register({ passphrase, displayName, publicKey }) {
    const deviceInfo = this.getDeviceInfo();
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ passphrase, displayName, publicKey, deviceInfo }),
    });
    this.setTokens(data.data.accessToken, data.data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.data.user));
    return data.data;
  }

  async login({ uniqueId, passphrase }) {
    const deviceInfo = this.getDeviceInfo();
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ uniqueId, passphrase, deviceInfo }),
    });
    this.setTokens(data.data.accessToken, data.data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.data.user));
    return data.data;
  }

  async recover({ uniqueId, passphrase, newPublicKey }) {
    const newDeviceInfo = this.getDeviceInfo();
    const data = await this.request('/auth/recover', {
      method: 'POST',
      body: JSON.stringify({ uniqueId, passphrase, newPublicKey, newDeviceInfo }),
    });
    this.setTokens(data.data.accessToken, data.data.refreshToken);
    return data.data;
  }

  async logout() {
    try {
      await this.request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });
    } catch {}
    this.clearTokens();
  }

  // ─── USERS ────────────────────────────────────
  async getProfile() {
    return (await this.request('/users/me')).data;
  }

  async updateProfile({ displayName }) {
    return (await this.request('/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ displayName }),
    })).data;
  }

  async lookupUser(uniqueId) {
    return (await this.request(`/users/lookup/${uniqueId}`)).data;
  }

  async blockUser(uniqueId) {
    return (await this.request(`/users/block/${uniqueId}`, { method: 'POST' })).data;
  }

  async unblockUser(uniqueId) {
    return (await this.request(`/users/block/${uniqueId}`, { method: 'DELETE' })).data;
  }

  // ─── CONVERSATIONS ───────────────────────────
  async getConversations() {
    return (await this.request('/conversations')).data;
  }

  async createConversation(targetUniqueId) {
    return (await this.request('/conversations', {
      method: 'POST',
      body: JSON.stringify({ targetUniqueId }),
    })).data;
  }

  async getMessages(conversationId, { limit = 50, before = null } = {}) {
    let url = `/conversations/${conversationId}/messages?limit=${limit}`;
    if (before) url += `&before=${before}`;
    return (await this.request(url)).data;
  }

  async sendMessage(conversationId, { encryptedBody, messageType = 'text', replyToId, expiresAt }) {
    return (await this.request(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ encryptedBody, messageType, replyToId, expiresAt }),
    })).data;
  }

  async deleteMessage(conversationId, messageId) {
    return (await this.request(`/conversations/${conversationId}/messages/${messageId}`, {
      method: 'DELETE',
    })).data;
  }

  // ─── DEVICE INFO ─────────────────────────────
  getDeviceInfo() {
    return {
      platform: navigator.platform || 'unknown',
      userAgent: navigator.userAgent || 'unknown',
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
      language: navigator.language || 'en',
    };
  }

  // ─── PERSISTENCE ─────────────────────────────
  getSavedUser() {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  }

  isLoggedIn() {
    return !!this.accessToken && !!this.getSavedUser();
  }
}

export const api = new ApiService();
export default api;
