"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PortalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  homeUrl: string;
  homeLabel?: string;
  logPrefix?: string;
}

/**
 * Shared error boundary component used by all portal error pages.
 * Displays a friendly error message with retry and home navigation.
 */
export function PortalError({
  error,
  reset,
  homeUrl,
  homeLabel = "Go Home",
  logPrefix = "Error",
}: PortalErrorProps) {
  useEffect(() => {
    console.error(`[${logPrefix}]`, error);
  }, [error, logPrefix]);

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 text-red-600 mb-6">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-[var(--color-text-secondary)] mb-8 text-center max-w-md">
        An unexpected error occurred. Please try again or navigate back. If this
        persists, contact support.
      </p>
      <div className="flex items-center gap-3">
        <Button onClick={reset} variant="default" size="sm">
          <RotateCcw className="h-4 w-4" />
          Try Again
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={homeUrl}>
            <Home className="h-4 w-4" />
            {homeLabel}
          </Link>
        </Button>
      </div>
      {error.digest && (
        <p className="mt-6 text-xs text-[var(--color-text-muted)] font-mono">
          Error ID: {error.digest}
        </p>
      )}
    </div>
  );
}
