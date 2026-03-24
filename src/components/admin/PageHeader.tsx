import type { ReactNode, ComponentType } from "react";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Truck,
  BarChart3,
  AlertTriangle,
  Settings,
  FileText,
  DollarSign,
  Users,
  Calculator,
  ClipboardList,
  MapPin,
  Building2,
  Wallet,
  Package,
  Send,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Icon name map — allows Server Components to pass a serializable string
// ---------------------------------------------------------------------------

export type PageHeaderIconName =
  | "truck"
  | "bar-chart"
  | "alert-triangle"
  | "settings"
  | "file-text"
  | "dollar"
  | "users"
  | "calculator"
  | "clipboard-list"
  | "map-pin"
  | "building"
  | "wallet"
  | "package"
  | "send";

const ICON_MAP: Record<PageHeaderIconName, ComponentType<{ className?: string }>> = {
  truck: Truck,
  "bar-chart": BarChart3,
  "alert-triangle": AlertTriangle,
  settings: Settings,
  "file-text": FileText,
  dollar: DollarSign,
  users: Users,
  calculator: Calculator,
  "clipboard-list": ClipboardList,
  "map-pin": MapPin,
  building: Building2,
  wallet: Wallet,
  package: Package,
  send: Send,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PageHeaderProps {
  iconName: PageHeaderIconName;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActions?: ReactNode;
}

// ---------------------------------------------------------------------------
// PageHeader — Consistent page header with optional action button
// ---------------------------------------------------------------------------

export function PageHeader({
  iconName,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActions,
}: PageHeaderProps) {
  const Icon = ICON_MAP[iconName] ?? Package;
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 animate-slide-up-fade">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brown-700 text-[var(--color-text-on-brown)] flex-shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
            {title}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {description}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {secondaryActions}
        {actionLabel && onAction && (
          <Button onClick={onAction} size="sm">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{actionLabel}</span>
            <span className="sm:hidden">Add</span>
          </Button>
        )}
      </div>
    </div>
  );
}
