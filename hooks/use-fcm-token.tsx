"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported, deleteToken } from 'firebase/messaging';
import { supabase } from '@/utils/supabase';

// ESPIRON Firebase config - uses env variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: "espiron-1e202.firebaseapp.com",
  projectId: "espiron-1e202",
  storageBucket: "espiron-1e202.appspot.com",
  messagingSenderId: "944237041937",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

interface FCMTokenState {
  token: string | null;
  permission: NotificationPermission;
  isSupported: boolean;
  isLoading: boolean;
  error: string | null;
  isMobile: boolean;
  serviceWorkerRegistered: boolean;
}

// Extended notification options for mobile support
interface ExtendedNotificationOptions extends NotificationOptions {
  image?: string;
  badge?: string;
  tag?: string;
  renotify?: boolean;
  vibrate?: number[];
  requireInteraction?: boolean;
  silent?: boolean;
}

// Mobile detection utility
const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent.toLowerCase();
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);
};

// iOS detection utility
const isIOSDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
};

/**
 * Hook para sa Firebase Cloud Messaging token management
 * Optimized for mobile devices with background notification support
 * 
 * Usage:
 * const { token, permission, requestPermission, isSupported } = useFCMToken(userId);
 */
export function useFCMToken(userId: string | null | undefined) {
  const [state, setState] = useState<FCMTokenState>({
    token: null,
    permission: 'default',
    isSupported: true,
    isLoading: true,
    error: null,
    isMobile: false,
    serviceWorkerRegistered: false
  });

  const messagingRef = useRef<any>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  /**
   * Request notification permission from browser
   * Mobile-optimized with wake lock to ensure the process completes
   */
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof window === 'undefined') return 'default';

    // Request wake lock on mobile to prevent screen sleep during permission request
    const isMobile = isMobileDevice();
    
    try {
      if (isMobile && 'wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch (wakeLockErr) {
      // Wake lock not critical, continue
    }

    try {
      // Check if browser supports notifications
      if (!('Notification' in window)) {
        setState(prev => ({ ...prev, error: 'Notifications not supported', isMobile }));
        return 'denied';
      }

      // iOS Safari specific handling
      if (isIOSDevice()) {
        // On iOS, notifications only work in standalone PWA mode
        const isStandalone = (window.navigator as any).standalone === true;
        if (!isStandalone) {
          console.log('[FCM] iOS: App not in standalone mode, notifications may be limited');
        }
      }

      // Check current permission
      const currentPermission = Notification.permission;
      
      if (currentPermission === 'granted') {
        setState(prev => ({ ...prev, permission: 'granted', isMobile }));
        return 'granted';
      }

      if (currentPermission === 'denied') {
        setState(prev => ({ 
          ...prev, 
          permission: 'denied',
          error: 'Notification permission was denied. Please enable in browser settings.',
          isMobile
        }));
        return 'denied';
      }

      // Request permission
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission, isMobile }));
      
      if (permission === 'granted') {
        // Initialize FCM after permission granted
        await initializeFCM();
      }

      return permission;
    } catch (err: any) {
      console.error('Error requesting permission:', err);
      setState(prev => ({ ...prev, error: err.message, isMobile }));
      return 'denied';
    } finally {
      // Release wake lock
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    }
  }, []);

  /**
   * Initialize Firebase Messaging at kunin ang FCM token
   * Mobile-optimized with service worker integration
   */
  const initializeFCM = useCallback(async () => {
    if (!userId || typeof window === 'undefined') return;

    const isMobile = isMobileDevice();

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null, isMobile }));

      // Check if messaging is supported
      const supported = await isSupported();
      if (!supported) {
        setState(prev => ({ 
          ...prev, 
          isSupported: false, 
          isLoading: false,
          error: 'Firebase Messaging not supported on this browser',
          isMobile
        }));
        return;
      }

      // Check service worker registration (critical for mobile background notifications)
      let swRegistration: ServiceWorkerRegistration | undefined;
      if ('serviceWorker' in navigator) {
        try {
          swRegistration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
          if (!swRegistration) {
            // Try to register service worker
            swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
              scope: '/'
            });
            console.log('[FCM] Service Worker registered:', swRegistration);
          } else {
            console.log('[FCM] Service Worker already registered');
          }
          setState(prev => ({ ...prev, serviceWorkerRegistered: true }));
        } catch (swError) {
          console.warn('[FCM] Service worker registration failed:', swError);
          setState(prev => ({ ...prev, serviceWorkerRegistered: false }));
        }
      }

      // Initialize Firebase app (kung hindi pa na-initialize)
      const app = !getApps().length 
        ? initializeApp(firebaseConfig, 'espiron') 
        : getApp('espiron');

      const messaging = getMessaging(app);
      messagingRef.current = messaging;

      // Get VAPID key from env (supports both with and without NEXT_PUBLIC_ prefix)
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_PUBLIC_KEY_ESPIRON || process.env.FIREBASE_PUBLIC_KEY_ESPIRON;
      
      if (!vapidKey) {
        throw new Error('VAPID key not configured. Add NEXT_PUBLIC_FIREBASE_PUBLIC_KEY_ESPIRON or FIREBASE_PUBLIC_KEY_ESPIRON to your .env.local');
      }

      // Get FCM token with service worker registration
      const currentToken = await getToken(messaging, { 
        vapidKey,
        serviceWorkerRegistration: swRegistration
      });

      if (currentToken) {
        console.log('[FCM] Token obtained:', currentToken.substring(0, 20) + '...');
        
        // Save to database
        await saveTokenToDatabase(userId, currentToken, isMobile);

        setState(prev => ({ 
          ...prev, 
          token: currentToken, 
          isLoading: false,
          isMobile
        }));

        // Unsubscribe previous listener if exists
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
        }

        // Listen for foreground messages with mobile-optimized handling
        unsubscribeRef.current = onMessage(messaging, (payload) => {
          console.log('[FCM] Foreground message received:', payload);
          
          // Mobile: Vibrate device
          if (isMobile && navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
          }
          
          // Show notification even when app is in foreground
          if (payload.notification && 'Notification' in window) {
            const { title, body, image } = payload.notification;
            const icon = '/disruptive-logo.png';
            
            // Play notification sound
            try {
              const audio = new Audio('/musics/notif-sound.mp3');
              audio.volume = 0.5; // Lower volume for mobile
              audio.play().catch(() => {});
            } catch (e) {
              // Ignore audio errors
            }

            // Show browser notification with mobile-optimized options
            const notificationOptions: ExtendedNotificationOptions = {
              body: body || '',
              icon,
              badge: '/disruptive-logo.png', // For mobile Android
              image: image || undefined,
              data: {
                ...payload.data,
                click_action: payload.data?.click_action || '/',
                timestamp: Date.now()
              },
              requireInteraction: !isMobile, // On mobile, let it auto-dismiss
              silent: false,
              vibrate: isMobile ? [200, 100, 200] : undefined,
              tag: payload.data?.tag || 'default', // Prevent notification stacking
              renotify: true, // Vibrate/sound for updates to same tag
            };

            const notification = new Notification(title || 'New Notification', notificationOptions);

            // Auto-close notification on mobile after 5 seconds
            if (isMobile) {
              setTimeout(() => notification.close(), 5000);
            }

            // Handle click
            notification.onclick = (event) => {
              event.preventDefault();
              const clickAction = payload.data?.click_action || '/';
              window.focus();
              window.location.href = clickAction;
              notification.close();
            };
          }
        });

      } else {
        console.log('[FCM] No token available');
        setState(prev => ({ 
          ...prev, 
          error: 'No registration token available. Request permission to generate one.',
          isLoading: false,
          isMobile
        }));
      }

    } catch (err: any) {
      console.error('[FCM] Initialization error:', err);
      setState(prev => ({ 
        ...prev, 
        error: err.message || 'Failed to initialize notifications',
        isLoading: false,
        isMobile
      }));
    }
  }, [userId]);

  /**
   * Save FCM token to Supabase database
   * Includes device type for targeting specific platforms
   */
  const saveTokenToDatabase = async (uid: string, token: string, isMobile: boolean = false) => {
    try {
      // Detect platform
      const userAgent = navigator.userAgent;
      const platform = /iPhone|iPad|iPod/.test(userAgent) ? 'ios' : 
                       /Android/.test(userAgent) ? 'android' : 
                       'web';

      // Check if token already exists
      const { data: existing } = await supabase
        .from('fcm_tokens')
        .select('id')
        .eq('token', token)
        .maybeSingle();

      if (existing) {
        // Update existing token
        await supabase
          .from('fcm_tokens')
          .update({ 
            user_id: uid,
            active: true,
            platform,
            is_mobile: isMobile,
            user_agent: userAgent.slice(0, 255), // Limit length
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        // Insert new token
        await supabase
          .from('fcm_tokens')
          .insert({
            user_id: uid,
            token: token,
            active: true,
            platform,
            is_mobile: isMobile,
            user_agent: userAgent.slice(0, 255),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }

      console.log('[FCM] Token saved to database:', { platform, isMobile });
    } catch (err) {
      console.error('[FCM] Error saving token:', err);
    }
  };

  /**
   * Delete FCM token (for logout/unsubscribe)
   */
  const deleteTokenFromDatabase = useCallback(async () => {
    if (!state.token) return;

    try {
      await supabase
        .from('fcm_tokens')
        .update({ active: false })
        .eq('token', state.token);

      // Also delete from Firebase
      const app = getApp('espiron');
      const messaging = getMessaging(app);
      await deleteToken(messaging);

      setState(prev => ({ ...prev, token: null }));
      console.log('FCM token deleted');
    } catch (err) {
      console.error('Error deleting FCM token:', err);
    }
  }, [state.token]);

  // Initialize on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isMobile = isMobileDevice();

    // Check initial permission
    if ('Notification' in window) {
      setState(prev => ({ 
        ...prev, 
        permission: Notification.permission,
        isMobile
      }));
    }

    // If already granted, initialize FCM
    if (Notification.permission === 'granted' && userId) {
      initializeFCM();
    } else {
      setState(prev => ({ ...prev, isLoading: false, isMobile }));
    }

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [userId, initializeFCM]);

  // Handle visibility change for mobile (re-initialize when app comes to foreground)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && state.token && userId) {
        console.log('[FCM] App visible, refreshing token...');
        // Refresh token periodically to ensure it's valid
        refreshToken();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state.token, userId]);

  // Refresh token function
  const refreshToken = useCallback(async () => {
    if (!userId || !messagingRef.current) return;
    
    try {
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_PUBLIC_KEY_ESPIRON || process.env.FIREBASE_PUBLIC_KEY_ESPIRON;
      if (!vapidKey) return;

      // Check if service worker is still active
      let swRegistration: ServiceWorkerRegistration | undefined;
      if ('serviceWorker' in navigator) {
        swRegistration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
      }

      const newToken = await getToken(messagingRef.current, { 
        vapidKey,
        serviceWorkerRegistration: swRegistration
      });

      if (newToken && newToken !== state.token) {
        console.log('[FCM] Token refreshed');
        setState(prev => ({ ...prev, token: newToken }));
        await saveTokenToDatabase(userId, newToken, isMobileDevice());
      }
    } catch (err) {
      console.error('[FCM] Error refreshing token:', err);
    }
  }, [userId, state.token]);

  return {
    ...state,
    requestPermission,
    deleteToken: deleteTokenFromDatabase,
    refreshToken,
    isMobile: isMobileDevice()
  };
}

/**
 * Component para sa notification permission banner
 * Usage: <NotificationBanner userId={userId} />
 */
export function NotificationBanner({ userId }: { userId: string | null | undefined }) {
  const { permission, requestPermission, error, isSupported } = useFCMToken(userId);

  if (!isSupported) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 text-sm rounded-md">
        Your browser doesn't support push notifications.
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-2 text-sm rounded-md flex items-center justify-between">
        <span>🔕 Notifications are blocked. Enable in browser settings to receive updates.</span>
      </div>
    );
  }

  if (permission === 'default') {
    return (
      <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 text-sm rounded-md flex items-center justify-between">
        <span>🔔 Enable notifications to get alerts for new products, suppliers, and SPF updates.</span>
        <button 
          onClick={requestPermission}
          className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700 transition-colors"
        >
          Enable
        </button>
      </div>
    );
  }

  if (error && permission === 'granted') {
    return (
      <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-2 text-sm rounded-md">
        ⚠️ {error}
      </div>
    );
  }

  // Permission granted - no banner needed
  return null;
}
