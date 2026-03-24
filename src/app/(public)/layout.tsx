import type { ReactNode } from "react";

/**
 * Public layout — used for home page and auth pages.
 * Full viewport height, vertically and horizontally centered.
 * Warm brown background with responsive padding.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-[var(--color-surface-deep)] px-4 py-8 safe-all">
      <div className="w-full max-w-6xl flex flex-col items-center">
        {children}
      </div>
    </div>
  );
}
