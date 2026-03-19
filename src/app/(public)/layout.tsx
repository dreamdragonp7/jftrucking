import type { ReactNode } from "react";

/**
 * Public layout — used for home page and auth pages.
 * Centered card layout with no navigation chrome.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-surface-deep safe-all">
      {children}
    </div>
  );
}
