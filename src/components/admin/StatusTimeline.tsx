"use client";

import { cn } from "@/lib/utils/cn";
import { Check, Circle } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TimelineStep {
  /** Machine-readable status key */
  status: string;
  /** Human-readable label */
  label: string;
  /** ISO timestamp when this step was reached, if at all */
  timestamp?: string | null;
  /** Who triggered the transition (optional) */
  actor?: string | null;
}

interface StatusTimelineProps {
  steps: TimelineStep[];
  /** The current active status key */
  currentStatus: string;
  /** Orientation of the timeline */
  orientation?: "vertical" | "horizontal";
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  }) + " " + date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ---------------------------------------------------------------------------
// StatusTimeline — Reusable for dispatches, invoices, deliveries
// ---------------------------------------------------------------------------

export function StatusTimeline({
  steps,
  currentStatus,
  orientation = "vertical",
  className,
}: StatusTimelineProps) {
  const currentIndex = steps.findIndex((s) => s.status === currentStatus);

  if (orientation === "horizontal") {
    return (
      <div className={cn("flex items-start gap-0 w-full overflow-x-auto", className)}>
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;
          const isLast = index === steps.length - 1;

          return (
            <div
              key={step.status}
              className={cn(
                "flex items-center flex-1 min-w-0",
                isLast && "flex-none"
              )}
            >
              {/* Step dot */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex items-center justify-center rounded-full transition-colors flex-shrink-0",
                    isCompleted && "h-6 w-6 bg-emerald-100 text-emerald-600",
                    isCurrent && "h-7 w-7 bg-[var(--color-brand-gold)]/20 text-[var(--color-brand-gold)] ring-2 ring-[var(--color-brand-gold)]/30",
                    isFuture && "h-6 w-6 bg-zinc-100 text-zinc-400"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Circle className={cn("h-2.5 w-2.5", isCurrent && "fill-current")} />
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium text-center leading-tight whitespace-nowrap",
                    isCompleted && "text-emerald-600",
                    isCurrent && "text-[var(--color-brand-gold)]",
                    isFuture && "text-zinc-500"
                  )}
                >
                  {step.label}
                </span>
                {step.timestamp && (
                  <span className="text-[9px] text-[var(--color-text-muted)] font-mono">
                    {formatTimestamp(step.timestamp)}
                  </span>
                )}
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-1 mt-[-20px]",
                    isCompleted
                      ? "bg-emerald-300"
                      : "bg-zinc-200"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Vertical layout (default)
  return (
    <div className={cn("flex flex-col", className)}>
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isFuture = index > currentIndex;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.status} className="flex gap-3">
            {/* Timeline rail */}
            <div className="flex flex-col items-center">
              {/* Dot */}
              <div
                className={cn(
                  "flex items-center justify-center rounded-full transition-colors flex-shrink-0",
                  isCompleted && "h-6 w-6 bg-emerald-100 text-emerald-600",
                  isCurrent && "h-7 w-7 bg-[var(--color-brand-gold)]/20 text-[var(--color-brand-gold)] ring-2 ring-[var(--color-brand-gold)]/30",
                  isFuture && "h-6 w-6 bg-zinc-100 text-zinc-400"
                )}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Circle className={cn("h-2.5 w-2.5", isCurrent && "fill-current")} />
                )}
              </div>
              {/* Vertical connector */}
              {!isLast && (
                <div
                  className={cn(
                    "w-0.5 flex-1 min-h-6",
                    isCompleted
                      ? "bg-emerald-300"
                      : "bg-zinc-200"
                  )}
                />
              )}
            </div>

            {/* Step content */}
            <div className={cn("pb-6", isLast && "pb-0")}>
              <p
                className={cn(
                  "text-sm font-medium leading-6",
                  isCompleted && "text-emerald-600",
                  isCurrent && "text-[var(--color-brand-gold)]",
                  isFuture && "text-zinc-500"
                )}
              >
                {step.label}
              </p>
              {step.timestamp && (
                <p className="text-xs text-[var(--color-text-muted)] font-mono mt-0.5">
                  {formatTimestamp(step.timestamp)}
                </p>
              )}
              {step.actor && (
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                  by {step.actor}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
