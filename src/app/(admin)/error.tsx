"use client";

import { PortalError } from "@/components/shared/PortalError";

export default function AdminError({
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
      homeUrl="/admin/dashboard"
      homeLabel="Dashboard"
      logPrefix="AdminError"
    />
  );
}
