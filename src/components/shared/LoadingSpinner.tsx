import { cn } from "@/lib/utils/cn";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: "h-4 w-4 border-2",
  md: "h-5 w-5 border-2",
  lg: "h-8 w-8 border-[3px]",
} as const;

/**
 * Gold-themed loading spinner.
 * Uses CSS animation for performance.
 * Matches the JFT brand gold color.
 */
export function LoadingSpinner({
  className,
  size = "md",
}: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        "animate-spin rounded-full border-brand-gold/30 border-t-brand-gold",
        SIZES[size],
        className
      )}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
