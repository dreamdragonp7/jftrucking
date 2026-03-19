import Image from "next/image";
import { cn } from "@/lib/utils/cn";

const SIZES = {
  sm: { width: 32, height: 32 },
  md: { width: 48, height: 48 },
  lg: { width: 80, height: 80 },
  xl: { width: 120, height: 120 },
} as const;

interface LogoProps {
  size?: keyof typeof SIZES;
  className?: string;
  showText?: boolean;
}

/**
 * JFT Logo component.
 * Renders the SVG logo at the specified size.
 * Optionally shows the company name text.
 */
export function Logo({ size = "md", className, showText = false }: LogoProps) {
  const dimensions = SIZES[size];

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Image
        src="/jftlogo.svg"
        alt="J Fudge Trucking"
        width={dimensions.width}
        height={dimensions.height}
        priority
        className="flex-shrink-0"
      />
      {showText && (
        <div className="flex flex-col">
          <span className="text-lg font-bold text-gold-300 leading-tight">
            J Fudge Trucking
          </span>
          <span className="text-xs text-[var(--color-text-muted)] leading-tight">
            Aggregate Hauling
          </span>
        </div>
      )}
    </div>
  );
}
