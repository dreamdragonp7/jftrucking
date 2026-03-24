"use client";

import { useState, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ReactNode } from "react";

export function AdminShellClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleMenuClick = useCallback(() => setSidebarOpen(true), []);
  const handleCloseMobile = useCallback(() => setSidebarOpen(false), []);
  const handleToggleCollapse = useCallback(() => setSidebarCollapsed((prev) => !prev), []);

  return (
    <div className="min-h-dvh flex bg-[var(--color-surface-deep)]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <AdminSidebar
          collapsed={sidebarCollapsed}
          onToggle={handleToggleCollapse}
        />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-[280px] p-0 bg-[var(--color-surface)] border-r border-[var(--color-border)]"
        >
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <AdminSidebar
            collapsed={false}
            onToggle={() => { }}
            onNavigate={handleCloseMobile}
          />
        </SheetContent>
      </Sheet>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader onMenuClick={handleMenuClick} />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}
