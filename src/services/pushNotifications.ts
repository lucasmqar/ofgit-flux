import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { LocalNotifications } from '@capacitor/local-notifications';
import { supabase } from '@/integrations/supabase/client';

export class PushNotificationService {
  private static instance: PushNotificationService;
  private isInitialized = false;
  private currentToken: string | null = null;
  private currentUserId: string | null = null;
  private listenersSetup = false;
  private anonymousInitialized = false;
  private channelConfigured = false;

  private constructor() {}

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  async initialize(userId: string): Promise<void> {
    console.log('[FLUX Push] Initializing for user:', userId);
    
    // Only works on native platforms
    if (!Capacitor.isNativePlatform()) {
      console.log('[FLUX Push] Not a native platform, skipping');
      return;
    }

    // If already initialized for this user, just check token
    if (this.isInitialized && this.currentUserId === userId) {
      console.log('[FLUX Push] Already initialized for this user');
      await this.checkExistingToken(userId);
      return;
    }

    this.currentUserId = userId;

    try {
      // Check existing token from database first
      await this.checkExistingToken(userId);

      // If we have a locally stored token captured before login, persist it now.
      await this.flushPendingTokenToDatabase(userId);

      // Check permission status
      const permStatus = await PushNotifications.checkPermissions();
      console.log('[FLUX Push] Current permission:', permStatus.receive);
      
      if (permStatus.receive !== 'granted') {
        console.log('[FLUX Push] Requesting permissions...');
        const requestResult = await PushNotifications.requestPermissions();
        
        if (requestResult.receive !== 'granted') {
          console.log('[FLUX Push] Permission denied by user');
          return;
        }
      }

      console.log('[FLUX Push] Permission granted, registering...');

      // Ensure Android notification channel exists with HIGH importance (heads-up/banner)
      await this.ensureAndroidChannel();
      
      // Setup listeners before registering (only once)
      if (!this.listenersSetup) {
        this.setupListeners();
        this.listenersSetup = true;
      }
      
      // Register with Apple / Google to receive push via APNS/FCM
      await PushNotifications.register();
      
      this.isInitialized = true;
      console.log('[FLUX Push] Initialization complete');
    } catch (error) {
      console.error('[FLUX Push] Error initializing:', error);
    }
  }

  /**
   * Ask notification permission as soon as the app opens (native only), even before login.
   * This is required for the "fresh install → open app → permission prompt" UX.
   *
   * Note: without an authenticated Supabase session we cannot write tokens to DB (RLS),
   * so we store the token locally and flush it after login.
   */
  async initializeAnonymous(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    if (this.anonymousInitialized) return;
    this.anonymousInitialized = true;

    try {
      const permStatus = await PushNotifications.checkPermissions();
      console.log('[FLUX Push] (anonymous) Current permission:', permStatus.receive);

      if (permStatus.receive !== 'granted') {
        console.log('[FLUX Push] (anonymous) Requesting permissions...');
        const requestResult = await PushNotifications.requestPermissions();
        if (requestResult.receive !== 'granted') {
          console.log('[FLUX Push] (anonymous) Permission denied by user');
          return;
        }
      }

      // Setup listeners only once
      if (!this.listenersSetup) {
        this.setupListeners();
        this.listenersSetup = true;
      }

      // Ensure Android notification channel exists with HIGH importance (heads-up/banner)
      await this.ensureAndroidChannel();

      console.log('[FLUX Push] (anonymous) Permission granted, registering...');
      await PushNotifications.register();
    } catch (error) {
      console.error('[FLUX Push] (anonymous) Error initializing:', error);
    }
  }

  private async checkExistingToken(userId: string): Promise<void> {
    try {
      const { data } = await supabase
        .from('user_push_tokens')
        .select('token')
        .eq('user_id', userId)
        .eq('platform', 'android')
        .maybeSingle();
      
      if (data?.token) {
        this.currentToken = data.token;
        console.log('[FLUX Push] Existing token found in database');
      }
    } catch (error) {
      console.error('[FLUX Push] Error checking existing token:', error);
    }
  }

  private setupListeners(): void {
    console.log('[FLUX Push] Setting up listeners');
    
    // On success, we should be able to receive notifications
    PushNotifications.addListener('registration', async (token: Token) => {
      console.log('[FLUX Push] ✅ Registration success!');
      console.log('[FLUX Push] Token:', token.value.substring(0, 20) + '...');
      
      // Save token locally
      this.currentToken = token.value;

      // Save token to database if user is logged in, otherwise keep it locally for later.
      if (this.currentUserId) {
        const saved = await this.saveTokenToDatabase(this.currentUserId, token.value);
        if (saved) {
          console.log('[FLUX Push] ✅ Token saved to database');
        }
      } else {
        await this.storePendingToken(token.value);
        console.log('[FLUX Push] Stored token locally (pending login)');
      }
    });

    // Some issue with our setup and push will not work
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('[FLUX Push] ❌ Registration error:', JSON.stringify(error));
    });

    // Show us the notification payload if the app is open on our device
    PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('[FLUX Push] 📨 Notification received:', notification.title);
        console.log('[FLUX Push] Body:', notification.body);
        console.log('[FLUX Push] Data:', JSON.stringify(notification.data));
        
        // When the app is in foreground, Android often won't show a system banner for remote pushes.
        // Trigger a Local Notification to force a heads-up/banner.
        this.showLocalNotification(notification);
      }
    );

    // Method called when tapping on a notification
    PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (notification: ActionPerformed) => {
        console.log('[FLUX Push] 👆 Notification tapped');
        console.log('[FLUX Push] Action:', JSON.stringify(notification));
        
        // Navigate to specific screen based on notification data
        this.handleNotificationAction(notification);
      }
    );
  }

  private getPlatform(): 'android' | 'ios' | 'web' {
    const p = Capacitor.getPlatform();
    if (p === 'android' || p === 'ios') return p;
    return 'web';
  }

  private pendingTokenKey(): string {
    return `flux_pending_push_token_${this.getPlatform()}`;
  }

  private async storePendingToken(token: string): Promise<void> {
    try {
      await Preferences.set({ key: this.pendingTokenKey(), value: token });
    } catch (e) {
      console.warn('[FLUX Push] Failed to store pending token:', e);
    }
  }

  private async flushPendingTokenToDatabase(userId: string): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: this.pendingTokenKey() });
      if (!value) return;

      // Avoid redundant writes
      if (this.currentToken === value) {
        await Preferences.remove({ key: this.pendingTokenKey() });
        return;
      }

      const saved = await this.saveTokenToDatabase(userId, value);
      if (saved) {
        this.currentToken = value;
        await Preferences.remove({ key: this.pendingTokenKey() });
        console.log('[FLUX Push] ✅ Flushed pending token to database');
      }
    } catch (e) {
      console.warn('[FLUX Push] Failed to flush pending token:', e);
    }
  }

  private async saveTokenToDatabase(userId: string, token: string): Promise<boolean> {
    try {
      console.log('[FLUX Push] Saving token to database...');
      
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert({
          user_id: userId,
          token: token,
          platform: 'android',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,platform'
        });

      if (error) {
        console.error('[FLUX Push] ❌ Error saving token:', error);
        return false;
      }
      
      console.log('[FLUX Push] ✅ Token saved successfully');
      return true;
    } catch (error) {
      console.error('[FLUX Push] ❌ Exception saving token:', error);
      return false;
    }
  }

  private showLocalNotification(notification: PushNotificationSchema): void {
    if (!Capacitor.isNativePlatform()) return;

    (async () => {
      try {
        await this.ensureAndroidChannel();

        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') {
          const req = await LocalNotifications.requestPermissions();
          if (req.display !== 'granted') return;
        }

        const id = Math.floor(Math.random() * 2_000_000_000);
        await LocalNotifications.schedule({
          notifications: [
            {
              id,
              title: notification.title ?? 'FLUX',
              body: notification.body ?? '',
              extra: notification.data ?? {},
              channelId: 'orders',
              sound: 'default',
              schedule: { at: new Date(Date.now() + 250) },
            },
          ],
        });
      } catch (e) {
        console.warn('[FLUX Push] Failed to show local notification:', e);
      }
    })();
  }

  private async ensureAndroidChannel(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    if (Capacitor.getPlatform() !== 'android') return;
    if (this.channelConfigured) return;
    this.channelConfigured = true;

    try {
      // importance: 5 = HIGH (heads-up)
      await PushNotifications.createChannel({
        id: 'orders',
        name: 'Pedidos',
        description: 'Notificações de pedidos e atualizações',
        importance: 5,
        visibility: 1,
        sound: 'default',
        vibration: true,
        lights: true,
      });
      console.log('[FLUX Push] Android channel "orders" configured');
    } catch (e) {
      // createChannel may throw if it already exists on some devices/versions
      console.log('[FLUX Push] Android channel setup skipped:', e);
    }
  }

  private handleNotificationAction(notification: ActionPerformed): void {
    const data = notification.notification.data;
    
    // Navigate based on notification type
    if (data.type === 'new_order') {
      window.location.href = '/pedidos-disponiveis';
    } else if (data.type === 'order_accepted') {
      window.location.href = '/meus-pedidos';
    } else if (data.type === 'order_completed') {
      window.location.href = `/pedido/${data.order_id}`;
    }
  }

  async removeToken(userId: string): Promise<void> {
    try {
      console.log('[FLUX Push] Removing token for user:', userId);
      
      // Remove token from database on logout
      await supabase
        .from('user_push_tokens')
        .delete()
        .eq('user_id', userId);

      // Don't remove listeners as they might be needed for next login
      // Just reset state
      this.currentToken = null;
      this.currentUserId = null;
      this.isInitialized = false;
      
      console.log('[FLUX Push] Token removed successfully');
    } catch (error) {
      console.error('[FLUX Push] Error removing token:', error);
    }
  }

  getToken(): string | null {
    return this.currentToken;
  }

  async getDeliveryChannels(): Promise<string[]> {
    const channels = await PushNotifications.listChannels();
    return channels.channels.map(channel => channel.id);
  }
}

export const pushNotificationService = PushNotificationService.getInstance();
