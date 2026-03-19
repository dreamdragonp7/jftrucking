"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingCart,
  Package,
  FileText,
  CreditCard,
  LogOut,
} from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { label: "Orders", href: "/customer/orders", icon: ShoppingCart },
  { label: "Deliveries", href: "/customer/deliveries", icon: Package },
  { label: "Invoices", href: "/customer/invoices", icon: FileText },
  { label: "Payments", href: "/customer/payments", icon: CreditCard },
] as const;

/**
 * Customer portal layout — horizontal tab navigation.
 * Scrollable tab bar on mobile, fixed tabs on desktop.
 */
export default function CustomerLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh flex flex-col bg-surface-deep">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-surface safe-top">
        <div className="flex items-center justify-between px-4 h-14">
          <Logo size="sm" showText />
          <button
            className="touch-target flex items-center justify-center rounded-lg hover:bg-surface-hover text-[var(--color-text-muted)]"
            aria-label="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex overflow-x-auto scrollbar-hide px-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors touch-target",
                  isActive
                    ? "border-brand-gold text-gold-300"
                    : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:border-[var(--color-border)]"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-6 safe-bottom">
        {children}
      </main>
    </div>
  );
}
