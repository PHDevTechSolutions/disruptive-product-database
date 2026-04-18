/**
 * Push Notification Utility
 * 
 * Sends push notifications to users when supplier/product changes occur.
 * Broadcasts to all users with relevant roles.
 */

import { createClient } from "@supabase/supabase-js";

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

interface PushNotificationPayload {
  title: string;
  body: string;
  priority?: "normal" | "high";
  url?: string;
  data?: Record<string, any>;
  image?: string;
}

interface UserWithRole {
  id: string;
  email: string;
  role: string;
}

/**
 * Send push notification to specific users
 */
export async function sendPushNotificationToUsers(
  userIds: string[],
  notification: PushNotificationPayload
): Promise<{ success: boolean; sent: number; failed: number }> {
  if (!supabaseAdmin) {
    console.error("[PushNotification] Supabase admin not initialized");
    return { success: false, sent: 0, failed: 0 };
  }

  try {
    const results = await Promise.allSettled(
      userIds.map(async (userId) => {
        const response = await fetch("/api/send-push-notification", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            ...notification,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to send: ${response.statusText}`);
        }

        return response.json();
      })
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return { success: failed === 0, sent: successful, failed };
  } catch (error) {
    console.error("[PushNotification] Error sending notifications:", error);
    return { success: false, sent: 0, failed: userIds.length };
  }
}

/**
 * Get users by roles for broadcasting
 */
export async function getUsersByRoles(roles: string[]): Promise<UserWithRole[]> {
  if (!supabaseAdmin) {
    console.error("[PushNotification] Supabase admin not initialized");
    return [];
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id, email, role")
      .in("role", roles);

    if (error) {
      console.error("[PushNotification] Error fetching users:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[PushNotification] Error:", error);
    return [];
  }
}

/**
 * Broadcast push notification to users with specific roles
 */
export async function broadcastToRoles(
  roles: string[],
  notification: PushNotificationPayload
): Promise<{ success: boolean; sent: number; failed: number }> {
  const users = await getUsersByRoles(roles);
  
  if (users.length === 0) {
    console.log("[PushNotification] No users found for roles:", roles);
    return { success: true, sent: 0, failed: 0 };
  }

  const userIds = users.map((u) => u.id);
  return sendPushNotificationToUsers(userIds, notification);
}

// ==========================================
// SUPPLIER NOTIFICATIONS
// ==========================================

/**
 * Notify when supplier is added
 */
export async function notifySupplierAdded(params: {
  company: string;
  supplierBrand?: string;
  addedBy?: string;
  supplierId?: string;
}): Promise<void> {
  const { company, supplierBrand, addedBy } = params;
  
  await broadcastToRoles(
    ["admin", "superadmin", "procurement", "manager"],
    {
      title: "New Supplier Added",
      body: `${company}${supplierBrand ? ` (${supplierBrand})` : ""} has been added${addedBy ? ` by ${addedBy}` : ""}.`,
      priority: "normal",
      url: "/suppliers",
      data: {
        type: "supplier_added",
        company,
        supplierBrand,
      },
    }
  );
}

/**
 * Notify when supplier is edited
 */
export async function notifySupplierEdited(params: {
  company: string;
  supplierBrand?: string;
  editedBy?: string;
  supplierId?: string;
}): Promise<void> {
  const { company, supplierBrand, editedBy } = params;
  
  await broadcastToRoles(
    ["admin", "superadmin", "procurement", "manager"],
    {
      title: "Supplier Updated",
      body: `${company}${supplierBrand ? ` (${supplierBrand})` : ""} has been updated${editedBy ? ` by ${editedBy}` : ""}.`,
      priority: "normal",
      url: "/suppliers",
      data: {
        type: "supplier_edited",
        company,
        supplierBrand,
      },
    }
  );
}

/**
 * Notify when supplier is deleted
 */
export async function notifySupplierDeleted(params: {
  company: string;
  deletedBy?: string;
}): Promise<void> {
  const { company, deletedBy } = params;
  
  await broadcastToRoles(
    ["admin", "superadmin", "procurement", "manager"],
    {
      title: "Supplier Deleted",
      body: `${company} has been removed${deletedBy ? ` by ${deletedBy}` : ""}.`,
      priority: "high",
      url: "/suppliers",
      data: {
        type: "supplier_deleted",
        company,
      },
    }
  );
}

/**
 * Notify when supplier needs approval
 */
export async function notifySupplierForApproval(params: {
  company: string;
  actionType: "add" | "edit" | "delete";
  requestedBy: string;
}): Promise<void> {
  const { company, actionType, requestedBy } = params;
  
  const actionText = {
    add: "add",
    edit: "edit",
    delete: "delete",
  }[actionType];
  
  await broadcastToRoles(
    ["admin", "superadmin", "approver"],
    {
      title: "Approval Required: Supplier",
      body: `${requestedBy} requested to ${actionText} supplier: ${company}`,
      priority: "high",
      url: "/for-approval",
      data: {
        type: "supplier_approval",
        company,
        actionType,
      },
    }
  );
}

// ==========================================
// PRODUCT NOTIFICATIONS
// ==========================================

/**
 * Notify when product is added
 */
export async function notifyProductAdded(params: {
  productReferenceID?: string;
  productClass?: string;
  supplierCompany?: string;
  addedBy?: string;
}): Promise<void> {
  const { productReferenceID, productClass, supplierCompany, addedBy } = params;
  
  await broadcastToRoles(
    ["admin", "superadmin", "procurement", "sales", "tsm"],
    {
      title: "New Product Added",
      body: `${productReferenceID || "New product"}${productClass ? ` (${productClass})` : ""}${supplierCompany ? ` from ${supplierCompany}` : ""}${addedBy ? ` by ${addedBy}` : ""}.`,
      priority: "normal",
      url: "/products",
      data: {
        type: "product_added",
        productReferenceID,
        productClass,
      },
    }
  );
}

/**
 * Notify when product is edited
 */
export async function notifyProductEdited(params: {
  productReferenceID?: string;
  productClass?: string;
  editedBy?: string;
}): Promise<void> {
  const { productReferenceID, productClass, editedBy } = params;
  
  await broadcastToRoles(
    ["admin", "superadmin", "procurement", "sales", "tsm"],
    {
      title: "Product Updated",
      body: `${productReferenceID || "Product"}${productClass ? ` (${productClass})` : ""} has been updated${editedBy ? ` by ${editedBy}` : ""}.`,
      priority: "normal",
      url: "/products",
      data: {
        type: "product_edited",
        productReferenceID,
        productClass,
      },
    }
  );
}

/**
 * Notify when product is deleted
 */
export async function notifyProductDeleted(params: {
  productReferenceID?: string;
  deletedBy?: string;
}): Promise<void> {
  const { productReferenceID, deletedBy } = params;
  
  await broadcastToRoles(
    ["admin", "superadmin", "procurement", "sales", "tsm"],
    {
      title: "Product Deleted",
      body: `${productReferenceID || "A product"} has been removed${deletedBy ? ` by ${deletedBy}` : ""}.`,
      priority: "high",
      url: "/products",
      data: {
        type: "product_deleted",
        productReferenceID,
      },
    }
  );
}

/**
 * Notify when product needs approval
 */
export async function notifyProductForApproval(params: {
  productId?: string;
  actionType: "add" | "edit" | "delete" | "upload";
  requestedBy: string;
}): Promise<void> {
  const { productId, actionType, requestedBy } = params;
  
  const actionText = {
    add: "add",
    edit: "edit",
    delete: "delete",
    upload: "bulk upload",
  }[actionType];
  
  await broadcastToRoles(
    ["admin", "superadmin", "approver"],
    {
      title: "Approval Required: Product",
      body: `${requestedBy} requested to ${actionText} product${productId ? `: ${productId}` : ""}`,
      priority: "high",
      url: "/for-approval",
      data: {
        type: "product_approval",
        productId,
        actionType,
      },
    }
  );
}
