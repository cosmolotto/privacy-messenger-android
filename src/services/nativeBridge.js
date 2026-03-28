/**
 * Native bridge for Capacitor (Android/iOS)
 * Handles platform-specific features:
 * - Push notifications
 * - Status bar
 * - Splash screen  
 * - Keyboard handling
 * - Haptic feedback
 * - App lifecycle
 */

class NativeBridge {
  constructor() {
    this.isNative = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform();
    this.platform = window.Capacitor?.getPlatform() || 'web';
  }

  async initialize() {
    if (!this.isNative) return;

    try {
      await this._setupStatusBar();
      await this._setupSplashScreen();
      await this._setupKeyboard();
      await this._setupPushNotifications();
      await this._setupAppLifecycle();
      console.log('[Native] Initialized on', this.platform);
    } catch (err) {
      console.error('[Native] Init error:', err);
    }
  }

  async _setupStatusBar() {
    try {
      const { StatusBar, Style } = await import('@capacitor/status-bar');
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#0A0A0A' });
    } catch {}
  }

  async _setupSplashScreen() {
    try {
      const { SplashScreen } = await import('@capacitor/splash-screen');
      await SplashScreen.hide();
    } catch {}
  }

  async _setupKeyboard() {
    try {
      const { Keyboard } = await import('@capacitor/keyboard');
      Keyboard.addListener('keyboardWillShow', (info) => {
        document.body.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
      });
      Keyboard.addListener('keyboardWillHide', () => {
        document.body.style.setProperty('--keyboard-height', '0px');
      });
    } catch {}
  }

  async _setupPushNotifications() {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');

      const permResult = await PushNotifications.requestPermissions();
      if (permResult.receive !== 'granted') return;

      await PushNotifications.register();

      PushNotifications.addListener('registration', (token) => {
        console.log('[Native] Push token:', token.value);
        this._onPushToken?.(token.value);
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[Native] Push received:', notification);
        this._onPushReceived?.(notification);
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        console.log('[Native] Push action:', action);
        const convId = action.notification.data?.conversationId;
        if (convId) window.__openConversation?.(convId);
      });
    } catch {}
  }

  async _setupAppLifecycle() {
    try {
      const { App } = await import('@capacitor/app');

      App.addListener('appStateChange', ({ isActive }) => {
        this._onAppStateChange?.(isActive);
      });

      App.addListener('backButton', () => {
        this._onBackButton?.();
      });
    } catch {}
  }

  async hapticFeedback(type = 'light') {
    if (!this.isNative) return;
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      const styles = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
      await Haptics.impact({ style: styles[type] || ImpactStyle.Light });
    } catch {}
  }

  // Callback setters
  onPushToken(cb) { this._onPushToken = cb; }
  onPushReceived(cb) { this._onPushReceived = cb; }
  onAppStateChange(cb) { this._onAppStateChange = cb; }
  onBackButton(cb) { this._onBackButton = cb; }
}

export const nativeBridge = new NativeBridge();
export default nativeBridge;
