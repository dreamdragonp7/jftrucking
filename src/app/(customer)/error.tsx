"use client";

import { PortalError } from "@/components/shared/PortalError";

export default function CustomerError({
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
      homeUrl="/customer/orders"
      homeLabel="My Orders"
      logPrefix="CustomerError"
    />
  );
}
