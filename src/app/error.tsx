"use client";

import { PortalError } from "@/components/shared/PortalError";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 bg-[var(--color-surface-deep)]">
      <PortalError
        error={error}
        reset={reset}
        homeUrl="/"
        homeLabel="Go Home"
        logPrefix="GlobalError"
      />
    </div>
  );
}
