"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  Truck,
  FileText,
  AlertTriangle,
  DollarSign,
  Shield,
  Send,
  CheckCheck,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils/cn";
import type { Notification, NotificationType, UserRole } from "@/types/database";
import type { ActionResult } from "@/lib/utils/action-result";

// ---------------------------------------------------------------------------
// Role-aware action loader — avoids hardcoding admin imports for all roles
// ---------------------------------------------------------------------------

type NotificationActions = {
  getNotifications: () => Promise<ActionResult<{ notifications: Notification[]; unreadCount: number }> | ActionResult<{ data: Notification[]; count: number }>>;
  markNotificationRead: (id: string) => Promise<ActionResult<void>>;
  markAllNotificationsRead: () => Promise<ActionResult<void>>;
};

async function loadActions(role: UserRole): Promise<NotificationActions> {
  switch (role) {
    case "customer": {
      const mod = await import("@/app/(customer)/_actions/customer.actions");
      return {
        getNotifications: async () => {
          const result = await mod.getMyNotifications();
          if (result.success) {
            const notifications = result.data.data;
            const unreadCount = notifications.filter((n: Notification) => !n.read).length;
            return { success: true, data: { notifications, unreadCount } } as ActionResult<{ notifications: Notification[]; unreadCount: number }>;
          }
          return result as unknown as ActionResult<{ notifications: Notification[]; unreadCount: number }>;
        },
        markNotificationRead: mod.markNotificationRead,
        markAllNotificationsRead: mod.markAllNotificationsRead,
      };
    }
    case "carrier": {
      const mod = await import("@/app/(subcontractor)/_actions/subcontractor.actions");
      return {
        getNotifications: async () => {
          const result = await mod.getMyNotifications();
          if (result.success) {
            const notifications = result.data.data;
            const unreadCount = notifications.filter((n: Notification) => !n.read).length;
            return { success: true, data: { notifications, unreadCount } } as ActionResult<{ notifications: Notification[]; unreadCount: number }>;
          }
          return result as unknown as ActionResult<{ notifications: Notification[]; unreadCount: number }>;
        },
        markNotificationRead: mod.markNotificationRead,
        markAllNotificationsRead: mod.markAllNotificationsRead,
      };
    }
    default: {
      // admin + driver (driver falls back to admin actions)
      const mod = await import("@/app/(admin)/_actions/notification.actions");
      return {
        getNotifications: mod.getNotifications,
        markNotificationRead: mod.markNotificationRead,
        markAllNotificationsRead: mod.markAllNotificationsRead,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Icon mapping
// ---------------------------------------------------------------------------

const TYPE_ICONS: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  delivery_confirmed: Truck,
  delivery_disputed: AlertTriangle,
  invoice_sent: FileText,
  payment_received: DollarSign,
  po_threshold: FileText,
  insurance_expiry: Shield,
  dispatch_assigned: Send,
  escalation: AlertTriangle,
  settlement_created: DollarSign,
};

const TYPE_COLORS: Record<NotificationType, string> = {
  delivery_confirmed: "text-emerald-600",
  delivery_disputed: "text-red-600",
  invoice_sent: "text-sky-600",
  payment_received: "text-emerald-600",
  po_threshold: "text-amber-600",
  insurance_expiry: "text-orange-600",
  dispatch_assigned: "text-sky-600",
  escalation: "text-red-600",
  settlement_created: "text-emerald-600",
};

// ---------------------------------------------------------------------------
// Role-aware link mapping
// ---------------------------------------------------------------------------

const ROLE_ROUTE_MAP: Record<UserRole, Record<string, string>> = {
  admin: {
    deliveries: "/admin/deliveries",
    invoices: "/admin/invoices",
    payments: "/admin/payments",
    purchase_orders: "/admin/purchase-orders",
    carriers: "/admin/carriers",
    dispatch: "/admin/dispatch",
    disputes: "/admin/disputes",
    dashboard: "/admin/dashboard",
    settlements: "/admin/settlements",
  },
  carrier: {
    deliveries: "/subcontractor/deliveries",
    invoices: "/subcontractor/settlements",
    payments: "/subcontractor/settlements",
    purchase_orders: "/subcontractor/dispatches",
    carriers: "/subcontractor/dashboard",
    dispatch: "/subcontractor/dispatches",
    disputes: "/subcontractor/dispatches",
    dashboard: "/subcontractor/dashboard",
    settlements: "/subcontractor/settlements",
  },
  driver: {
    deliveries: "/trucker/history",
    invoices: "/trucker/history",
    payments: "/trucker/history",
    purchase_orders: "/trucker/loads",
    carriers: "/trucker/loads",
    dispatch: "/trucker/loads",
    disputes: "/trucker/history",
    dashboard: "/trucker/loads",
    settlements: "/trucker/history",
  },
  customer: {
    deliveries: "/customer/deliveries",
    invoices: "/customer/invoices",
    payments: "/customer/payments",
    purchase_orders: "/customer/orders",
    carriers: "/customer/deliveries",
    dispatch: "/customer/deliveries",
    disputes: "/customer/deliveries",
    dashboard: "/customer/deliveries",
    settlements: "/customer/invoices",
  },
};

function getNotificationHref(notification: Notification, role: UserRole): string {
  const data = notification.data as Record<string, unknown> | null;
  const routes = ROLE_ROUTE_MAP[role] ?? ROLE_ROUTE_MAP.admin;

  switch (notification.type) {
    case "delivery_confirmed":
    case "delivery_disputed":
      return routes.deliveries;
    case "invoice_sent":
      // Admin gets deep link if available
      if (role === "admin" && data?.invoice_id) {
        return `/admin/invoices/${data.invoice_id}`;
      }
      if (role === "customer" && data?.invoice_id) {
        return `/customer/invoices/${data.invoice_id}`;
      }
      return routes.invoices;
    case "payment_received":
      return routes.payments;
    case "po_threshold":
      return routes.purchase_orders;
    case "insurance_expiry":
      return routes.carriers;
    case "dispatch_assigned":
      return routes.dispatch;
    case "escalation":
      if (data?.delivery_id) return routes.disputes;
      return routes.dashboard;
    case "settlement_created":
      return routes.settlements;
    default:
      return routes.dashboard;
  }
}

// ---------------------------------------------------------------------------
// Relative time
// ---------------------------------------------------------------------------

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(dateStr).toLocaleDateString();
}

// ---------------------------------------------------------------------------
// NotificationFeed
// ---------------------------------------------------------------------------

interface NotificationFeedProps {
  userRole?: UserRole;
}

export function NotificationFeed({ userRole = "admin" }: NotificationFeedProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [actions, setActions] = useState<NotificationActions | null>(null);

  // Load role-specific actions on mount
  useEffect(() => {
    loadActions(userRole).then(setActions);
  }, [userRole]);

  const loadNotifications = useCallback(() => {
    if (!actions) return;
    startTransition(async () => {
      const result = await actions.getNotifications();
      if (result.success) {
        const data = result.data as { notifications: Notification[]; unreadCount: number };
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
        setLoaded(true);
      }
    });
  }, [actions]);

  // Load on open
  useEffect(() => {
    if (open) {
      loadNotifications();
    }
  }, [open, loadNotifications]);

  // Initial load for badge count
  useEffect(() => {
    loadNotifications();
    // Refresh every 60 seconds
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const handleMarkRead = useCallback((id: string) => {
    if (!actions) return;
    startTransition(async () => {
      await actions.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    });
  }, [actions]);

  const handleMarkAllRead = useCallback(() => {
    if (!actions) return;
    startTransition(async () => {
      await actions.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    });
  }, [actions]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className={cn(
                "absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center",
                "bg-brand-gold text-[var(--color-text-on-gold)] text-[10px] font-bold font-mono",
                "px-1 border-2 border-[var(--color-surface)]"
              )}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[380px] p-0 bg-[var(--color-surface)] border border-[var(--color-border)]"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={isPending}
              className="text-xs h-7"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification list */}
        <ScrollArea className="max-h-[400px]">
          {!loaded && isPending ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--color-text-muted)]" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-8 w-8 text-[var(--color-text-muted)] mb-2" />
              <p className="text-sm text-[var(--color-text-muted)]">No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border-subtle)]">
              {notifications.map((notification) => {
                const Icon = TYPE_ICONS[notification.type] ?? Bell;
                const color = TYPE_COLORS[notification.type] ?? "text-[var(--color-text-muted)]";
                const href = getNotificationHref(notification, userRole);

                return (
                  <Link
                    key={notification.id}
                    href={href}
                    onClick={() => {
                      if (!notification.read) handleMarkRead(notification.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex gap-3 px-4 py-3 hover:bg-surface-hover transition-colors",
                      !notification.read && "bg-brand-gold/5"
                    )}
                  >
                    {/* Unread dot */}
                    <div className="flex-shrink-0 pt-1">
                      <div className={cn("flex items-center justify-center w-8 h-8 rounded-lg", color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-sm leading-tight",
                          notification.read
                            ? "text-[var(--color-text-secondary)]"
                            : "text-[var(--color-text-primary)] font-medium"
                        )}>
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full bg-brand-gold flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
                        {relativeTime(notification.created_at)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
