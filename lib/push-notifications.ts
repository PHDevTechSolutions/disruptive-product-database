/**
 * Push Notification Service
 * Sends push notifications via Firebase Cloud Messaging (FCM)
 * - Handles server-side push notification sending
 * - Integrates with Supabase fcm_tokens table
 * - Supports targeted notifications by user
 */

import { supabase } from '@/utils/supabase';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: {
    type?: 'product' | 'supplier' | 'request' | 'chat' | 'general';
    url?: string;
    [key: string]: any;
  };
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export interface NotificationTarget {
  userId?: string;
  role?: string;
  all?: boolean;
}

/**
 * Send push notification to specific users
 */
export async function sendPushNotification(
  target: NotificationTarget,
  payload: PushNotificationPayload
): Promise<{ success: boolean; sent: number; errors: string[] }> {
  const errors: string[] = [];
  let sent = 0;

  try {
    // Get target FCM tokens
    const tokens = await getTargetTokens(target);
    
    if (tokens.length === 0) {
      return { success: false, sent: 0, errors: ['No target tokens found'] };
    }

    // Send notification via API route (server-side Firebase Admin)
    const results = await Promise.allSettled(
      tokens.map(token => sendToToken(token, payload))
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        sent++;
      } else {
        errors.push(`Token ${index}: ${result.reason}`);
        // Deactivate invalid tokens
        deactivateToken(tokens[index]);
      }
    });

    return { 
      success: sent > 0, 
      sent, 
      errors 
    };

  } catch (err: any) {
    return { 
      success: false, 
      sent, 
      errors: [err.message || 'Unknown error'] 
    };
  }
}

/**
 * Send notification to a single FCM token
 */
async function sendToToken(
  token: string, 
  payload: PushNotificationPayload
): Promise<void> {
  const response = await fetch('/api/send-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      notification: {
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/disruptive-logo.png',
        badge: payload.badge || '/disruptive-logo.png',
      },
      data: payload.data || {},
      webpush: {
        notification: {
          requireInteraction: payload.requireInteraction ?? true,
          tag: payload.tag || 'espiron',
          renotify: true,
          actions: payload.actions || [
            { action: 'view', title: 'View' },
            { action: 'dismiss', title: 'Dismiss' }
          ]
        }
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }
}

/**
 * Get FCM tokens for notification target
 */
async function getTargetTokens(target: NotificationTarget): Promise<string[]> {
  let query = supabase
    .from('fcm_tokens')
    .select('token')
    .eq('active', true);

  if (target.userId) {
    query = query.eq('user_id', target.userId);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching FCM tokens:', error);
    return [];
  }

  return (data || []).map((row: { token: string }) => row.token);
}

/**
 * Deactivate invalid token
 */
async function deactivateToken(token: string): Promise<void> {
  try {
    await supabase
      .from('fcm_tokens')
      .update({ active: false })
      .eq('token', token);
  } catch (err) {
    console.error('Error deactivating token:', err);
  }
}

/**
 * Send product added notification
 */
export async function notifyProductAdded(
  productName: string,
  addedBy: string,
  targetUsers?: NotificationTarget
): Promise<void> {
  await sendPushNotification(
    targetUsers || { all: true },
    {
      title: 'New Product Added',
      body: `${productName} was added by ${addedBy}`,
      icon: '/disruptive-logo.png',
      tag: 'product-added',
      data: {
        type: 'product',
        url: '/products',
        notificationType: 'product'
      }
    }
  );
}

/**
 * Send supplier added notification
 */
export async function notifySupplierAdded(
  supplierName: string,
  addedBy: string,
  targetUsers?: NotificationTarget
): Promise<void> {
  await sendPushNotification(
    targetUsers || { all: true },
    {
      title: 'New Supplier Added',
      body: `${supplierName} was added by ${addedBy}`,
      icon: '/disruptive-logo.png',
      tag: 'supplier-added',
      data: {
        type: 'supplier',
        url: '/suppliers',
        notificationType: 'supplier'
      }
    }
  );
}

/**
 * Send request status change notification
 */
export async function notifyRequestStatusChange(
  spfNumber: string,
  status: string,
  updatedBy: string,
  targetUsers?: NotificationTarget
): Promise<void> {
  await sendPushNotification(
    targetUsers || { all: true },
    {
      title: 'Request Status Updated',
      body: `SPF ${spfNumber} is now ${status} (updated by ${updatedBy})`,
      icon: '/disruptive-logo.png',
      tag: `request-${spfNumber}`,
      data: {
        type: 'request',
        url: '/requests',
        spfNumber,
        status,
        notificationType: 'request'
      }
    }
  );
}

/**
 * Send chat message notification
 */
export async function notifyChatMessage(
  requestId: string,
  senderName: string,
  message: string,
  targetUsers?: NotificationTarget
): Promise<void> {
  // Truncate message if too long
  const truncated = message.length > 50 ? message.substring(0, 50) + '...' : message;
  
  await sendPushNotification(
    targetUsers || { all: true },
    {
      title: `New message from ${senderName}`,
      body: truncated,
      icon: '/disruptive-logo.png',
      tag: `chat-${requestId}`,
      data: {
        type: 'chat',
        url: `/requests?chat=${requestId}`,
        requestId,
        notificationType: 'chat'
      }
    }
  );
}

/**
 * Send broadcast notification to all users
 */
export async function sendBroadcastNotification(
  title: string,
  body: string,
  options?: Partial<PushNotificationPayload>
): Promise<void> {
  await sendPushNotification(
    { all: true },
    {
      title,
      body,
      icon: '/disruptive-logo.png',
      tag: options?.tag || 'broadcast',
      ...options,
      data: {
        type: 'general',
        ...options?.data
      }
    }
  );
}
