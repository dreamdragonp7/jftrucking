"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Truck,
  Package,
  FileText,
  DollarSign,
  Users,
  Building2,
  MapPin,
  Calculator,
  BarChart3,
  AlertTriangle,
  Settings,
  BookOpen,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { cn } from "@/lib/utils/cn";
import { useState, type ReactNode } from "react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Dispatch", href: "/admin/dispatch", icon: Truck },
  { label: "Deliveries", href: "/admin/deliveries", icon: Package },
  { label: "Invoices", href: "/admin/invoices", icon: FileText },
  { label: "Payments", href: "/admin/payments", icon: DollarSign },
  { label: "Carriers", href: "/admin/carriers", icon: Truck },
  { label: "Customers", href: "/admin/customers", icon: Building2 },
  { label: "Sites", href: "/admin/sites", icon: MapPin },
  { label: "Rates", href: "/admin/rates", icon: Calculator },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
  { label: "Disputes", href: "/admin/disputes", icon: AlertTriangle },
  { label: "QuickBooks", href: "/admin/quickbooks", icon: BookOpen },
  { label: "Settings", href: "/admin/settings", icon: Settings },
] as const;

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-dvh flex bg-surface-deep">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-overlay bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-sheet w-64 flex flex-col bg-surface border-r border-[var(--color-border)] transition-transform duration-300 lg:relative lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-[var(--color-border)]">
          <Logo size="sm" showText />
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden touch-target flex items-center justify-center rounded-lg hover:bg-surface-hover"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors touch-target",
                  isActive
                    ? "bg-brand-gold/10 text-gold-300 border border-[var(--color-border-strong)]"
                    : "text-[var(--color-text-secondary)] hover:bg-surface-hover hover:text-[var(--color-text-primary)]"
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[var(--color-border)] p-3">
          <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:bg-surface-hover hover:text-danger transition-colors touch-target">
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center h-16 px-4 border-b border-[var(--color-border)] bg-surface lg:bg-transparent">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden touch-target flex items-center justify-center rounded-lg hover:bg-surface-hover mr-3"
            aria-label="Open sidebar"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="lg:hidden">
            <Logo size="sm" />
          </div>
          <Users className="hidden lg:block w-5 h-5 text-[var(--color-text-muted)]" />
          <span className="hidden lg:block ml-2 text-sm text-[var(--color-text-secondary)]">
            Admin Portal
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
