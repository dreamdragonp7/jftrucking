"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, Camera, History, LogOut } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { label: "My Loads", href: "/trucker/loads", icon: Package },
  { label: "Deliver", href: "/trucker/deliver", icon: Camera },
  { label: "History", href: "/trucker/history", icon: History },
] as const;

/**
 * Trucker portal layout — bottom navigation for mobile-first UX.
 * Uses large touch targets (56px) for use with work gloves.
 */
export default function TruckerLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh flex flex-col bg-surface-deep">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 h-14 border-b border-[var(--color-border)] bg-surface safe-top">
        <Logo size="sm" showText />
        <button
          className="touch-target-large flex items-center justify-center rounded-lg hover:bg-surface-hover text-[var(--color-text-muted)]"
          aria-label="Sign out"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto p-4">{children}</main>

      {/* Bottom navigation */}
      <nav className="flex items-stretch border-t border-[var(--color-border)] bg-surface safe-bottom">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors touch-target-large",
                isActive
                  ? "text-gold-300"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
              )}
            >
              <Icon className={cn("w-6 h-6", isActive && "drop-shadow-[0_0_6px_rgba(237,188,24,0.5)]")} />
              {item.label}
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-gold-300 mt-0.5" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
