"use client";

import { PortalError } from "@/components/shared/PortalError";

export default function TruckerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PortalError
      error={error}
      reset={reset}
      homeUrl="/trucker/loads"
      homeLabel="My Loads"
      logPrefix="TruckerError"
    />
  );
}
