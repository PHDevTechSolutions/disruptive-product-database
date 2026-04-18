# Mobile Native App Features & Push Notifications Setup

## Overview
This document describes the mobile native app features implemented for the Espiron Product Database system, including push notifications that work even when the app is closed or the phone screen is off.

## Features Implemented

### 1. Progressive Web App (PWA) Support
- **Web App Manifest** (`public/manifest.json`)
  - Enables "Add to Home Screen" functionality
  - Standalone app experience (no browser UI)
  - App icons for all sizes
  - Splash screens for iOS
  - Shortcuts for quick actions

### 2. Service Worker for Background Notifications
- **Firebase Cloud Messaging Service Worker** (`public/firebase-messaging-sw.js`)
  - Handles push notifications in the background
  - Works even when phone screen is off
  - Caches essential assets for offline use
  - Handles notification clicks and navigation

### 3. PWA Install Prompts
- **Component**: `components/PWAPrompt.tsx`
  - Prompts users to install the app on Android/Chrome
  - iOS-specific instructions ("Add to Home Screen")
  - Notification permission request
  - Auto-dismisses if already installed

### 4. Service Worker Registration
- **Component**: `components/ServiceWorkerRegistration.tsx`
  - Registers the FCM service worker
  - Handles updates
  - Communicates between app and service worker

### 5. Mobile-Optimized FCM Hook
- **Updated**: `hooks/use-fcm-token.tsx`
  - Mobile device detection
  - iOS Safari specific handling
  - Wake lock support (prevents screen sleep during critical operations)
  - Visibility API integration (refreshes token when app comes to foreground)
  - Mobile-specific notification options (vibration, badge, etc.)

### 6. Push Notification API
- **API Route**: `pages/api/send-push-notification.ts`
  - Server-side push notification sending
  - Supports multiple devices per user
  - Priority levels (normal/high)
  - Automatic cleanup of invalid tokens

## Required Environment Variables

Your `.env.local` stays as is. The code now supports both naming conventions:

```env
# Firebase Configuration (main app - already exists)
NEXT_PUBLIC_FIREBASE_API_KEY=xxxxxxxxxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxxxxxxxx
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxxxxxxxxxxxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxxxxxxxxxxxxx
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxxxxxxxxxxxxxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxxxxxxxxxxxxxx
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=xxxxxxxxxxxxxxx

# Espiron Push Notifications
# The VAPID key is needed client-side for browser push (use either name):
NEXT_PUBLIC_FIREBASE_PUBLIC_KEY_ESPIRON=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# OR if you prefer to keep it private:
# FIREBASE_PUBLIC_KEY_ESPIRON=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Server key for sending push notifications (server-side only):
FIREBASE_PRIVATE_KEY_ESPIRON=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Note:** The VAPID public key is used in the browser to generate push subscriptions. The code checks for both `NEXT_PUBLIC_FIREBASE_PUBLIC_KEY_ESPIRON` (client-accessible) and `FIREBASE_PUBLIC_KEY_ESPIRON` (server-only) for flexibility.

## Database Schema

Ensure your Supabase `fcm_tokens` table has these columns:

```sql
CREATE TABLE IF NOT EXISTS fcm_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  active BOOLEAN DEFAULT true,
  platform TEXT, -- 'ios', 'android', 'web'
  is_mobile BOOLEAN DEFAULT false,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_active ON fcm_tokens(active);
```

## How It Works

### Background Notifications Flow

1. **User installs PWA** (Add to Home Screen)
   - On Android: "Add to Home Screen" prompt appears
   - On iOS: User taps Share → "Add to Home Screen"

2. **Service Worker Registration**
   - App registers `/firebase-messaging-sw.js`
   - Service worker runs independently of the app

3. **FCM Token Generation**
   - User grants notification permission
   - Token is generated and saved to Supabase
   - Device info (platform, mobile status) is stored

4. **Receiving Push Notifications**
   - Server sends notification via FCM API
   - If app is **open**: Foreground message handler shows in-app notification
   - If app is **closed/background**: Service worker receives and displays notification
   - **Phone screen off**: Still works because service worker runs independently

5. **Notification Click**
   - Opens the app to the relevant page
   - Brings app to foreground if minimized

### Key Mobile Features

#### Android
- High priority notifications wake device from sleep
- Vibration patterns
- Notification badges
- Custom notification sounds

#### iOS
- Requires PWA mode (Add to Home Screen)
- Uses APNS for push delivery
- Supports notification badges
- Shows notifications even when Safari is closed

## Usage Examples

### Sending Push Notification from Server

```typescript
// From any API route or server action
const response = await fetch('/api/send-push-notification', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
  },
  body: JSON.stringify({
    userId: 'user-uuid',
    title: 'New SPF Request',
    body: 'You have a new SPF request from Sales Team',
    priority: 'high',
    url: '/spf-requests/123',
    data: {
      spf_number: 'SPF-001',
      request_id: '123',
      type: 'spf_request'
    }
  })
});
```

### Using the FCM Hook in Components

```typescript
import { useFCMToken, NotificationBanner } from '@/hooks/use-fcm-token';

function MyComponent() {
  const userId = 'current-user-id';
  const { 
    token, 
    permission, 
    requestPermission, 
    isMobile,
    serviceWorkerRegistered 
  } = useFCMToken(userId);

  return (
    <div>
      {/* Shows banner to enable notifications */}
      <NotificationBanner userId={userId} />
      
      {/* Your component content */}
    </div>
  );
}
```

## Testing Push Notifications

### 1. Local Testing
```bash
npm run dev
# Open http://localhost:3000
```

### 2. Enable Notifications
- Look for the notification prompt or bell icon
- Click "Enable Notifications"
- Check browser console for FCM token

### 3. Send Test Notification
Use the test API:
```bash
curl -X POST http://localhost:3000/api/send-push-notification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "userId": "your-user-id",
    "title": "Test Notification",
    "body": "This is a test push notification!",
    "priority": "high"
  }'
```

### 4. Test Background Notifications
- Close the browser/app completely
- Send a push notification
- You should see it appear even when app is closed
- On mobile: screen can be off and you'll still receive it

## Troubleshooting

### Notifications Not Working on iOS
- Must be in PWA mode (added to Home Screen)
- Open the app from the home screen icon, not Safari
- iOS 16.4+ required for push notifications

### Service Worker Not Registering
- Check browser console for errors
- Ensure `/firebase-messaging-sw.js` is accessible at root
- Verify HTTPS is enabled (required for service workers)

### FCM Token Not Generated
- Check that VAPID key is set in env
- Verify notification permission is granted
- Check browser console for Firebase errors

### Background Notifications Not Working
- Verify service worker is registered (check Application tab in DevTools)
- Ensure app is installed as PWA on mobile
- Check that server key is correct

## Security Considerations

1. **Never expose Firebase private key** in client-side code
2. **Always validate JWT tokens** in API routes
3. **Clean up inactive tokens** automatically
4. **Rate limit** notification endpoints
5. **Encrypt sensitive data** in notification payloads

## Files Modified/Created

### New Files
- `public/manifest.json` - PWA manifest
- `public/firebase-messaging-sw.js` - Service worker
- `components/PWAPrompt.tsx` - Install prompts
- `components/ServiceWorkerRegistration.tsx` - SW registration
- `pages/api/send-push-notification.ts` - Push API

### Modified Files
- `app/layout.tsx` - Added PWA meta tags and components
- `next.config.ts` - PWA headers and rewrites
- `hooks/use-fcm-token.tsx` - Mobile optimizations

## Next Steps

1. **Deploy to HTTPS** - Service workers require HTTPS (or localhost for dev)
2. **Test on real devices** - iOS Simulator doesn't support push notifications
3. **Set up Firebase Console** - Configure your FCM settings
4. **Add notification sounds** - Customize sounds in `/public/musics/`
5. **Create notification settings UI** - Let users customize notification preferences

## Support

For issues with push notifications:
1. Check browser console for errors
2. Verify all env variables are set
3. Ensure database schema is correct
4. Test on HTTPS (not localhost) for production
