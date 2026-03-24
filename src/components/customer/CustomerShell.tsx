"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingCart,
  Truck,
  FileText,
  CreditCard,
  User,
  Settings,
  LogOut,
} from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { NotificationFeed } from "@/components/shared/NotificationFeed";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { label: "Orders", href: "/customer/orders", icon: ShoppingCart },
  { label: "Deliveries", href: "/customer/deliveries", icon: Truck },
  { label: "Invoices", href: "/customer/invoices", icon: FileText },
  { label: "Payments", href: "/customer/payments", icon: CreditCard },
] as const;

interface CustomerShellProps {
  children: ReactNode;
  signOutAction: () => Promise<void>;
  userName: string;
  companyName?: string;
}

/**
 * Customer portal shell — horizontal tab navigation with header.
 * Logo top-left, notification bell + account dropdown top-right.
 * Tabs scroll horizontally on mobile.
 */
export function CustomerShell({
  children,
  signOutAction,
  userName,
  companyName,
}: CustomerShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-surface-deep)]">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] safe-top z-sticky">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Left: Logo */}
          <Logo size="sm" showText />

          {/* Right: Notification feed + Account dropdown */}
          <div className="flex items-center gap-2">
            <NotificationFeed userRole="customer" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  aria-label="Account menu"
                >
                  <div className="w-8 h-8 rounded-full bg-brand-gold/15 flex items-center justify-center">
                    <User className="w-4 h-4 text-brand-gold" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <span className="block text-sm font-medium">{userName}</span>
                  {companyName && (
                    <span className="block text-xs text-muted-foreground">
                      {companyName}
                    </span>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/customer/settings" className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => signOutAction()}
                  className="flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tab navigation — scrollable on mobile */}
        <nav
          role="navigation"
          aria-label="Customer portal"
          className="flex overflow-x-auto scrollbar-hide px-2"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors touch-target",
                  isActive
                    ? "border-brand-gold text-brand-brown"
                    : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:border-[var(--color-border)]"
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-6 safe-bottom">
        {children}
      </main>
    </div>
  );
}
