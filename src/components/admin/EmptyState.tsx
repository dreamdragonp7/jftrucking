import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
}

// ---------------------------------------------------------------------------
// EmptyState — Reusable empty state display
// ---------------------------------------------------------------------------

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  children,
}: EmptyStateProps) {
  return (
    <div className="relative flex flex-col items-center justify-center gap-5 py-20 text-center animate-fade-in">
      {/* Watermark logo */}
      <Image
        src="/jftlogo.svg"
        alt=""
        width={160}
        height={160}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.04] pointer-events-none select-none"
        aria-hidden
      />

      {/* Icon */}
      <div className="flex items-center justify-center h-20 w-20 rounded-2xl bg-brand-gold/10 text-brand-gold">
        <Icon className="h-10 w-10" />
      </div>

      {/* Text */}
      <div className="space-y-2">
        <h3 className="text-base font-bold text-[var(--color-text-primary)]">
          {title}
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)] max-w-md leading-relaxed">
          {description}
        </p>
      </div>

      {/* CTA button */}
      {actionLabel && onAction && (
        <Button onClick={onAction} size="default" className="mt-2">
          <Plus className="h-4 w-4" />
          {actionLabel}
        </Button>
      )}
      {children}
    </div>
  );
}
