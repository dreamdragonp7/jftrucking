import { cn } from "@/lib/utils/cn";

interface DividerProps {
  className?: string;
}

/**
 * Horizontal divider styled to match the JFT brand.
 * A thin gold line for visual section separation.
 */
export function Divider({ className }: DividerProps) {
  return (
    <div
      className={cn(
        "w-full h-px bg-gradient-to-r from-transparent via-brand-gold/30 to-transparent my-6",
        className
      )}
      role="separator"
    />
  );
}
