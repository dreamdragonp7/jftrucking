"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, CheckCircle, ClipboardCheck, LogOut, User, Phone } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { NotificationFeed } from "@/components/shared/NotificationFeed";
import { OfflineBanner } from "@/components/trucker/OfflineBanner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { JFT_COMPANY } from "@/lib/constants/company";
import { cn } from "@/lib/utils/cn";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { label: "My Loads", href: "/trucker/loads", icon: ClipboardList },
  { label: "Deliver", href: "/trucker/deliver", icon: CheckCircle },
  { label: "History", href: "/trucker/history", icon: ClipboardCheck },
] as const;

export function TruckerShell({
  children,
  signOutAction,
}: {
  children: ReactNode;
  signOutAction: () => Promise<void>;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[var(--color-surface-deep)] relative overflow-hidden">

      {/* Top bar */}
      <header className="flex items-center justify-between px-5 h-16 border-b border-[var(--color-border)] bg-[var(--color-surface)] safe-top z-sticky relative">
        <Logo size="sm" showText={false} />

        {/* Right: Call Dispatch + Notifications + Account menu */}
        <div className="flex items-center gap-2">
          {/* Call Dispatch button */}
          <a
            href={`tel:${JFT_COMPANY.phone}`}
            className="flex items-center gap-1.5 h-9 px-4 rounded-full bg-brand-gold/10 text-brand-gold text-xs font-semibold hover:bg-brand-gold/20 active:scale-95 transition-all touch-target border border-brand-gold/30"
          >
            <Phone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dispatch</span>
          </a>

          {/* Notification Feed */}
          <NotificationFeed userRole="driver" />

          {/* Account dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full w-9 h-9"
                aria-label="Account menu"
              >
                <div className="w-8 h-8 rounded-full bg-brand-gold/15 flex items-center justify-center">
                  <User className="w-4 h-4 text-brand-gold" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <a href={`tel:${JFT_COMPANY.phone}`} className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Call Dispatch
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOutAction()}
                variant="destructive"
                className="flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Offline status banner */}
      <OfflineBanner />

      {/* Page content */}
      <main className="flex-1 overflow-y-auto p-4 pb-28 safe-left safe-right relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Bottom navigation */}
      <nav
        role="navigation"
        aria-label="Trucker portal"
        className="fixed bottom-0 left-0 right-0 flex items-stretch border-t border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-lg safe-bottom z-sticky"
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
                "relative flex-1 flex flex-col items-center justify-center gap-1.5 py-4 text-[10px] font-semibold tracking-wider uppercase transition-all touch-target-large",
                isActive
                  ? "text-brand-gold"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
              )}
            >
              <motion.div
                animate={{ scale: isActive ? 1.1 : 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Icon className="w-6 h-6 transition-all duration-300" />
              </motion.div>
              {item.label}

              {/* Active Indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeTabGlow"
                  className="absolute bottom-0 w-12 h-1 bg-brand-gold rounded-t-full shadow-[0_0_10px_rgba(237,188,24,0.5)]"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
