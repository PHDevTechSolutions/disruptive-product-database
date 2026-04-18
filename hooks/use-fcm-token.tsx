"use client";

import { useEffect, useState, useCallback } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported, deleteToken } from 'firebase/messaging';
import { supabase } from '@/utils/supabase';

// ESPIRON Firebase config - uses Public Key from env
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY_ESPIRON || "",
  authDomain: "espiron-1e202.firebaseapp.com",
  projectId: "espiron-1e202",
  storageBucket: "espiron-1e202.appspot.com",
  messagingSenderId: "944237041937",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID_ESPIRON || "",
};

interface FCMTokenState {
  token: string | null;
  permission: NotificationPermission;
  isSupported: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook para sa Firebase Cloud Messaging token management
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
    error: null
  });

  /**
   * Request notification permission from browser
   */
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof window === 'undefined') return 'default';

    try {
      // Check if browser supports notifications
      if (!('Notification' in window)) {
        setState(prev => ({ ...prev, error: 'Notifications not supported' }));
        return 'denied';
      }

      // Check current permission
      const currentPermission = Notification.permission;
      
      if (currentPermission === 'granted') {
        setState(prev => ({ ...prev, permission: 'granted' }));
        return 'granted';
      }

      if (currentPermission === 'denied') {
        setState(prev => ({ 
          ...prev, 
          permission: 'denied',
          error: 'Notification permission was denied. Please enable in browser settings.'
        }));
        return 'denied';
      }

      // Request permission
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));
      
      if (permission === 'granted') {
        // Initialize FCM after permission granted
        await initializeFCM();
      }

      return permission;
    } catch (err: any) {
      console.error('Error requesting permission:', err);
      setState(prev => ({ ...prev, error: err.message }));
      return 'denied';
    }
  }, []);

  /**
   * Initialize Firebase Messaging at kunin ang FCM token
   */
  const initializeFCM = useCallback(async () => {
    if (!userId || typeof window === 'undefined') return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Check if messaging is supported
      const supported = await isSupported();
      if (!supported) {
        setState(prev => ({ 
          ...prev, 
          isSupported: false, 
          isLoading: false,
          error: 'Firebase Messaging not supported on this browser'
        }));
        return;
      }

      // Initialize Firebase app (kung hindi pa na-initialize)
      const app = !getApps().length 
        ? initializeApp(firebaseConfig, 'espiron') 
        : getApp('espiron');

      const messaging = getMessaging(app);

      // Get VAPID key from env
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_PUBLIC_KEY_ESPIRON;
      
      if (!vapidKey) {
        throw new Error('VAPID key not configured');
      }

      // Get FCM token
      const currentToken = await getToken(messaging, { vapidKey });

      if (currentToken) {
        console.log('FCM Token obtained:', currentToken.substring(0, 20) + '...');
        
        // Save to database
        await saveTokenToDatabase(userId, currentToken);

        setState(prev => ({ 
          ...prev, 
          token: currentToken, 
          isLoading: false 
        }));

        // Listen for foreground messages
        onMessage(messaging, (payload) => {
          console.log('Foreground message received:', payload);
          
          // Show notification even when app is in foreground
          if (payload.notification && 'Notification' in window) {
            const { title, body } = payload.notification;
            const icon = '/disruptive-logo.png';
            
            // Play notification sound
            try {
              const audio = new Audio('/musics/notif-sound.mp3');
              audio.play().catch(() => {});
            } catch (e) {
              // Ignore audio errors
            }

            // Show browser notification
            new Notification(title || 'New Notification', {
              body: body || '',
              icon,
              data: payload.data,
              requireInteraction: true
            });
          }
        });

      } else {
        console.log('No FCM token available');
        setState(prev => ({ 
          ...prev, 
          error: 'No registration token available. Request permission to generate one.',
          isLoading: false 
        }));
      }

    } catch (err: any) {
      console.error('FCM initialization error:', err);
      setState(prev => ({ 
        ...prev, 
        error: err.message || 'Failed to initialize notifications',
        isLoading: false 
      }));
    }
  }, [userId]);

  /**
   * Save FCM token to Supabase database
   */
  const saveTokenToDatabase = async (uid: string, token: string) => {
    try {
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
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }

      console.log('FCM token saved to database');
    } catch (err) {
      console.error('Error saving FCM token:', err);
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

    // Check initial permission
    if ('Notification' in window) {
      setState(prev => ({ ...prev, permission: Notification.permission }));
    }

    // If already granted, initialize FCM
    if (Notification.permission === 'granted' && userId) {
      initializeFCM();
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [userId, initializeFCM]);

  return {
    ...state,
    requestPermission,
    deleteToken: deleteTokenFromDatabase,
    refreshToken: initializeFCM
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
