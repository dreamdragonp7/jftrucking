"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Send,
  FileText,
  DollarSign,
  Wallet,
  Users,
  Building2,
  MapPin,
  BarChart3,
  AlertTriangle,
  Settings,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  CreditCard,
  Package,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils/cn";
import type { LucideIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Nav item definitions
// ---------------------------------------------------------------------------

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const PRIMARY_NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Dispatch", href: "/admin/dispatch", icon: Send },
  { label: "Invoices", href: "/admin/invoices", icon: FileText },
  { label: "Settlements", href: "/admin/settlements", icon: Wallet },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

const MORE_NAV: NavItem[] = [
  { label: "Purchase Orders", href: "/admin/purchase-orders", icon: ClipboardList },
  { label: "Deliveries", href: "/admin/deliveries", icon: Package },
  { label: "Carriers", href: "/admin/carriers", icon: Building2 },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { label: "Sites", href: "/admin/sites", icon: MapPin },
  { label: "Rates", href: "/admin/rates", icon: DollarSign },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
  { label: "Disputes", href: "/admin/disputes", icon: AlertTriangle },
  { label: "Payments", href: "/admin/payments", icon: CreditCard },
  { label: "QuickBooks", href: "/admin/quickbooks", icon: RefreshCw },
];

// ---------------------------------------------------------------------------
// NavLink sub-component
// ---------------------------------------------------------------------------

function NavLink({
  item,
  isActive,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
        "touch-target",
        collapsed && "justify-center px-0",
        isActive
          ? "bg-brand-gold/10 text-brand-gold font-semibold"
          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
      )}
    >
      {/* Active indicator bar */}
      {isActive && (
        <motion.div
          layoutId="sidebar-active-indicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-brand-gold"
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        />
      )}
      <Icon className="h-5 w-5 flex-shrink-0" />
      <AnimatePresence mode="wait">
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.15 }}
            className="truncate"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={12}>
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

// ---------------------------------------------------------------------------
// AdminSidebar
// ---------------------------------------------------------------------------

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  userName?: string;
  userInitials?: string;
}

export function AdminSidebar({
  collapsed,
  onToggle,
  onNavigate,
  userName = "Admin",
  userInitials = "A",
}: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/admin/dashboard") return pathname === href;
    return pathname.startsWith(href);
  };

  // Auto-open "More" section when a child route is active
  const moreChildActive = MORE_NAV.some((item) => isActive(item.href));
  const [moreOpen, setMoreOpen] = useState(moreChildActive);

  useEffect(() => {
    if (moreChildActive) setMoreOpen(true);
  }, [moreChildActive]);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="flex flex-col h-full bg-[var(--color-surface)] border-r border-[var(--color-border)] overflow-hidden"
    >
      {/* Logo Section */}
      <div
        className={cn(
          "flex items-center h-16 border-b border-[var(--color-border)] flex-shrink-0",
          collapsed ? "justify-center px-2" : "px-4"
        )}
      >
        <Link href="/admin/dashboard" onClick={onNavigate} className="flex items-center gap-3 min-w-0">
          <Logo size="sm" showText={!collapsed} />
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="flex flex-col p-2">
          {/* Primary Nav */}
          <div className="flex flex-col gap-1">
            {PRIMARY_NAV.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                isActive={isActive(item.href)}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            ))}
          </div>

          {/* Separator */}
          <Separator className="my-3" />

          {/* "More" collapsible section */}
          {collapsed ? (
            <div className="flex flex-col gap-1">
              {MORE_NAV.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  isActive={isActive(item.href)}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => setMoreOpen((prev) => !prev)}
                className="flex items-center gap-2 w-full px-3 py-2 text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
              >
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform duration-200",
                    !moreOpen && "-rotate-90"
                  )}
                />
                <span>More</span>
                {moreChildActive && !moreOpen && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-gold" />
                )}
              </button>
              <AnimatePresence initial={false}>
                {moreOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col gap-1">
                      {MORE_NAV.map((item) => (
                        <NavLink
                          key={item.href}
                          item={item}
                          isActive={isActive(item.href)}
                          collapsed={collapsed}
                          onNavigate={onNavigate}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </nav>
      </ScrollArea>

      {/* Footer: User + Collapse Toggle */}
      <div className="flex-shrink-0 border-t border-[var(--color-border)]">
        {/* Sign Out Button */}
        <button
          type="button"
          onClick={() => {
            import("@/app/(admin)/_actions/admin.actions").then(
              ({ signOutAction }) => signOutAction()
            );
          }}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-red-50 hover:text-red-600 transition-colors touch-target",
            collapsed && "justify-center px-0"
          )}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="truncate"
              >
                Sign Out
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* User Info */}
        <div
          className={cn(
            "flex items-center gap-3 px-3 py-2 border-t border-[var(--color-border)]",
            collapsed && "justify-center px-0"
          )}
        >
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-brand-gold/15 text-brand-gold text-xs font-bold flex-shrink-0">
            {userInitials}
          </div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="text-sm font-medium text-[var(--color-text-primary)] truncate"
              >
                {userName}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Collapse Toggle (desktop only) */}
        <button
          onClick={onToggle}
          className="hidden lg:flex items-center justify-center w-full h-10 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors border-t border-[var(--color-border)]"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <ChevronsLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </motion.aside>
  );
}
