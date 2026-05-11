import { NotificationPayload } from "@/types/notifications";

export function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) {
    return Promise.reject("This browser does not support notifications");
  }

  if (Notification.permission === "granted") {
    return Promise.resolve("granted");
  }

  return Notification.requestPermission();
}

export function showBrowserNotification(payload: NotificationPayload): Notification | null {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return null;
  }

  const options: NotificationOptions = {
    body: payload.body,
    icon: payload.icon || "/favicon.ico",
    badge: payload.badge || "/favicon.ico",
    tag: payload.tag || payload.type,
    requireInteraction: payload.requireInteraction || false,
    data: payload.data || {},
  };

  const notification = new Notification(payload.title, options);

  if (options.requireInteraction === false) {
    setTimeout(() => {
      notification.close();
    }, 5000);
  }

  notification.onclick = (event: Event) => {
    event.preventDefault();
    if (payload.data?.url) {
      window.open(payload.data.url, "_blank");
    }
    notification.close();
  };

  return notification;
}

export function getNotificationPermissionStatus(): NotificationPermission {
  if (!("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
}

export function isNotificationSupported(): boolean {
  return "Notification" in window;
}

export function vibrateDevice(pattern: number | number[] = 200): void {
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

export function playNotificationSound(soundUrl: string = "/musics/notif-sound.mp3"): void {
  try {
    const audio = new Audio(soundUrl);
    audio.volume = 0.5;
    audio.play().catch((error) => {
      console.error("Failed to play notification sound:", error);
    });
  } catch (error) {
    console.error("Failed to play notification sound:", error);
  }
}

export function closeNotificationsByTag(tag: string): void {
  if (!("Notification" in window)) return;
  
  const notifications = document.getElementsByClassName(tag);
  Array.from(notifications).forEach((notification) => {
    (notification as any).close();
  });
}
