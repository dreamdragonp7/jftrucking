"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/supabase/auth";
import * as notificationsData from "@/lib/data/notifications.data";
import { ok, fail, type ActionResult } from "@/lib/utils/action-result";
import type { Notification } from "@/types/database";

/**
 * Get recent notifications for the current admin user.
 */
export async function getNotifications(): Promise<ActionResult<{ notifications: Notification[]; unreadCount: number }>> {
  try {
    const auth = await requireRole("admin");
    const [result, unreadCount] = await Promise.all([
      notificationsData.getAll(auth.user.id, { limit: 20 }),
      notificationsData.getUnreadCount(auth.user.id),
    ]);
    return ok({ notifications: result.data, unreadCount });
  } catch (e) {
    return fail(e);
  }
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(notificationId: string): Promise<ActionResult<void>> {
  try {
    await requireRole("admin");
    await notificationsData.markRead(notificationId);
    revalidatePath("/admin");
    return ok(undefined);
  } catch (e) {
    return fail(e);
  }
}

/**
 * Mark all notifications as read.
 */
export async function markAllNotificationsRead(): Promise<ActionResult<void>> {
  try {
    const auth = await requireRole("admin");
    await notificationsData.markAllRead(auth.user.id);
    revalidatePath("/admin");
    return ok(undefined);
  } catch (e) {
    return fail(e);
  }
}
