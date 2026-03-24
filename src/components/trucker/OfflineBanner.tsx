"use client";

import { useEffect, useState, useCallback } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { getUnsyncedCount } from "@/lib/offline/sync";

/**
 * Offline status banner for the trucker portal.
 *
 * Shows at the top of the screen when:
 * - The device is offline ("You're offline — deliveries will sync when connected")
 * - There are pending deliveries to sync ("Syncing X pending deliveries...")
 *
 * Uses `navigator.onLine` and `online`/`offline` events for detection.
 */
export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const checkPending = useCallback(async () => {
    try {
      const count = await getUnsyncedCount();
      setPendingCount(count);
    } catch {
      // IndexedDB may not be available in some contexts
    }
  }, []);

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);
    checkPending();

    const handleOnline = () => {
      setIsOnline(true);
      checkPending();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Periodically check pending count
    const interval = setInterval(checkPending, 10000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [checkPending]);

  // Nothing to show
  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-2 px-4 py-2 text-sm font-medium",
        !isOnline
          ? "bg-[var(--color-warning-muted)] text-[var(--color-warning)]"
          : "bg-[var(--color-info-muted)] text-[var(--color-info)]"
      )}
    >
      {!isOnline ? (
        <>
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          <span>
            You&apos;re offline
            {pendingCount > 0
              ? ` — ${pendingCount} delivery${pendingCount > 1 ? "s" : ""} will sync when connected`
              : " — deliveries will be saved locally"}
          </span>
        </>
      ) : (
        <>
          <RefreshCw className="w-4 h-4 flex-shrink-0 animate-spin" />
          <span>
            {pendingCount} pending delivery{pendingCount > 1 ? "s" : ""} to
            sync...
          </span>
        </>
      )}
    </div>
  );
}
