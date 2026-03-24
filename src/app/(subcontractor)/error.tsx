"use client";

import { PortalError } from "@/components/shared/PortalError";

export default function SubcontractorError({
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
      homeUrl="/subcontractor/dashboard"
      homeLabel="Dashboard"
      logPrefix="SubcontractorError"
    />
  );
}
