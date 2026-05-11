export type NotificationType = 
  | "product_added"
  | "product_updated"
  | "supplier_added"
  | "supplier_updated"
  | "spf_created"
  | "spf_updated"
  | "spf_approved"
  | "spf_rejected";

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export interface FCMToken {
  token: string;
  userId: string;
  deviceInfo: {
    userAgent: string;
    platform: string;
    lastActive: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationSettings {
  enabled: boolean;
  productNotifications: boolean;
  supplierNotifications: boolean;
  spfNotifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  autoClose: boolean;
  autoCloseDuration: number;
}

export interface NotificationPermissionStatus {
  default: "default";
  granted: "granted";
  denied: "denied";
}

export interface NotificationTriggerData {
  userId: string;
  productName?: string;
  productId?: string;
  supplierName?: string;
  supplierId?: string;
  spfNumber?: string;
  spfId?: string;
  reason?: string;
  url?: string;
}
