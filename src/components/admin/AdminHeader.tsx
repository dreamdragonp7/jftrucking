"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { NotificationFeed } from "@/components/shared/NotificationFeed";

// ---------------------------------------------------------------------------
// Route-to-title mapping
// ---------------------------------------------------------------------------

const PAGE_TITLES: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/dispatch": "Dispatch",
  "/admin/deliveries": "Deliveries",
  "/admin/invoices": "Invoices",
  "/admin/payments": "Payments",
  "/admin/carriers": "Carriers",
  "/admin/customers": "Customers",
  "/admin/sites": "Sites",
  "/admin/rates": "Rates",
  "/admin/reports": "Reports",
  "/admin/disputes": "Disputes",
  "/admin/settings": "Settings",
  "/admin/quickbooks": "QuickBooks",
  "/admin/reports/tax-prep": "Tax Prep",
  "/admin/settlements": "Settlements",
  "/admin/purchase-orders": "Purchase Orders",
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const base = Object.keys(PAGE_TITLES).find((key) =>
    pathname.startsWith(key)
  );
  return base ? PAGE_TITLES[base] : "Admin";
}

function getBreadcrumbs(pathname: string): { label: string; href?: string }[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href?: string }[] = [];

  if (segments.length >= 2) {
    const sectionPath = `/${segments[0]}/${segments[1]}`;
    const sectionTitle = PAGE_TITLES[sectionPath] || segments[1];

    if (segments.length > 2) {
      crumbs.push({ label: sectionTitle, href: sectionPath });
      const fullPath = `/${segments.join("/")}`;
      const subTitle = PAGE_TITLES[fullPath];
      crumbs.push({ label: subTitle || segments.slice(2).join("/") });
    } else {
      crumbs.push({ label: sectionTitle });
    }
  }

  return crumbs;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AdminHeaderProps {
  onMenuClick: () => void;
  userName?: string;
  userInitials?: string;
}

// ---------------------------------------------------------------------------
// AdminHeader
// ---------------------------------------------------------------------------

export function AdminHeader({
  onMenuClick,
  userName = "Admin",
  userInitials = "A",
}: AdminHeaderProps) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <header className="flex items-center h-16 px-4 lg:px-6 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex-shrink-0">
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        className="lg:hidden mr-3 text-[var(--color-text-secondary)]"
        aria-label="Open sidebar"
      >
        <Menu className="h-6 w-6" />
      </Button>

      {/* Page Title + Breadcrumbs */}
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-bold text-[var(--color-text-primary)] truncate">
          {pageTitle}
        </h1>
        {breadcrumbs.length > 1 && (
          <Breadcrumb className="hidden sm:block">
            <BreadcrumbList>
              {breadcrumbs.map((crumb, i) => (
                <BreadcrumbItem key={i}>
                  {i > 0 && <BreadcrumbSeparator />}
                  {crumb.href ? (
                    <BreadcrumbLink asChild>
                      <Link href={crumb.href}>{crumb.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        )}
      </div>

      {/* Right side: Notifications + User dropdown */}
      <div className="flex items-center gap-2">
        {/* Notification Feed */}
        <NotificationFeed />

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              aria-label="User menu"
            >
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-brand-gold/15 text-brand-gold text-xs font-bold">
                {userInitials}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <span className="block text-sm font-medium">{userName}</span>
              <span className="block text-xs text-muted-foreground">
                Administrator
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin/settings" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                import("@/app/(admin)/_actions/admin.actions").then(
                  ({ signOutAction }) => signOutAction()
                );
              }}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
