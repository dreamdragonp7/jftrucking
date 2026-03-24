"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ChevronRight,
  ClipboardCheck,
  FileWarning,
  ShieldAlert,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";
import type { PendingAction } from "../_lib/dashboard.loader";

const ICONS: Record<PendingAction["type"], React.ComponentType<{ className?: string }>> = {
  confirmation: ClipboardCheck,
  dispute: AlertTriangle,
  po_threshold: FileWarning,
  insurance: ShieldAlert,
};

const SEVERITY_STYLES: Record<
  PendingAction["severity"],
  { border: string; bg: string; icon: string }
> = {
  info: {
    border: "border-[var(--color-info)]/30",
    bg: "bg-[var(--color-info-muted)]",
    icon: "text-[var(--color-info)]",
  },
  warning: {
    border: "border-brand-gold/30",
    bg: "bg-brand-gold/5",
    icon: "text-brand-gold",
  },
  critical: {
    border: "border-[var(--color-danger)]/30",
    bg: "bg-[var(--color-danger-muted)]",
    icon: "text-[var(--color-danger)]",
  },
};

interface PendingActionsProps {
  actions: PendingAction[];
  isLoading?: boolean;
}

export function PendingActions({ actions, isLoading }: PendingActionsProps) {
  if (isLoading) {
    return <PendingActionsSkeleton />;
  }

  if (actions.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-3">
          Pending Actions
        </h2>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[var(--color-success-muted)] text-[var(--color-success)] mb-3">
            <ClipboardCheck className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            All caught up
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            No pending actions at this time
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 lg:p-6">
      <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-3">
        Pending Actions
      </h2>
      <div className="flex flex-col gap-2">
        {actions.map((action, i) => {
          const Icon = ICONS[action.type] ?? AlertTriangle;
          const styles = SEVERITY_STYLES[action.severity];

          return (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
            >
              <Link
                href={action.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg border p-3 transition-all duration-150",
                  "hover:shadow-md hover:scale-[1.005]",
                  styles.border,
                  styles.bg
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center h-9 w-9 rounded-lg flex-shrink-0",
                    styles.icon
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                    {action.title}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] truncate">
                    {action.subtitle}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)] transition-colors flex-shrink-0" />
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function PendingActionsSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 lg:p-6">
      <Skeleton className="h-5 w-32 mb-3 bg-[var(--color-surface-hover)]" />
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] p-3"
          >
            <Skeleton className="h-9 w-9 rounded-lg bg-[var(--color-surface-hover)]" />
            <div className="flex-1">
              <Skeleton className="h-4 w-48 bg-[var(--color-surface-hover)]" />
              <Skeleton className="h-3 w-32 mt-1 bg-[var(--color-surface-hover)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
