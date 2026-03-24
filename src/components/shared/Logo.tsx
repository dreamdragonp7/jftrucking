import Image from "next/image";
import { cn } from "@/lib/utils/cn";

const SIZES = {
  sm: { width: 48, height: 48 },
  md: { width: 64, height: 64 },
  lg: { width: 96, height: 96 },
  xl: { width: 128, height: 128 },
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
        <span className="text-lg font-bold text-brand-gold leading-tight">
          J Fudge Trucking
        </span>
      )}
    </div>
  );
}
