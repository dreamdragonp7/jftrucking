import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";
import type {
  Notification,
  NotificationInsert,
  NotificationFilters,
} from "@/types/database";

export async function getAll(userId: string, filters?: NotificationFilters) {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_NOTIFICATIONS } = await import("@/lib/demo/data");
      let data = DEMO_NOTIFICATIONS.filter((n) => n.user_id === userId);
      if (filters?.unread_only) data = data.filter((n) => !n.read);
      if (filters?.type) data = data.filter((n) => n.type === filters.type);
      return { data, count: data.length };
    }
    return { data: [], count: 0 };
  }

  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 25;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("notifications")
    .select("*", { count: "exact" })
    .eq("user_id", userId);

  if (filters?.unread_only) query = query.eq("read", false);
  if (filters?.type) query = query.eq("type", filters.type);

  query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to fetch notifications: ${error.message}`);

  return { data: data as Notification[], count: count ?? 0 };
}

export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = await createClient();
  if (!supabase) {
    if (isDemoMode()) {
      const { DEMO_NOTIFICATIONS } = await import("@/lib/demo/data");
      return DEMO_NOTIFICATIONS.filter((n) => n.user_id === userId && !n.read).length;
    }
    return 0;
  }

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) throw new Error(`Failed to count notifications: ${error.message}`);

  return count ?? 0;
}

export async function create(input: NotificationInsert) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("notifications")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(`Failed to create notification: ${error.message}`);

  return data as Notification;
}

/**
 * Create notifications for multiple users at once.
 */
export async function createBulk(inputs: NotificationInsert[]) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { data, error } = await supabase
    .from("notifications")
    .insert(inputs)
    .select();

  if (error) throw new Error(`Failed to create notifications: ${error.message}`);

  return data as Notification[];
}

/**
 * Mark a single notification as read.
 */
export async function markRead(id: string) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { error } = await supabase
    .from("notifications")
    .update({ read: true, read_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(`Failed to mark notification as read: ${error.message}`);
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllRead(userId: string) {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured");

  const { error } = await supabase
    .from("notifications")
    .update({ read: true, read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) throw new Error(`Failed to mark all notifications as read: ${error.message}`);
}
