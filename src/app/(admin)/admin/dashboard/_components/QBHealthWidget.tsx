"use client";

import { motion } from "framer-motion";
import {
  Cloud,
  CloudOff,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { useState, useTransition } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QBHealthData {
  connected: boolean;
  lastSyncAt: string | null;
  failedSyncsCount: number;
  totalSyncsToday: number;
}

interface QBHealthWidgetProps {
  data: QBHealthData;
  index?: number;
}

// ---------------------------------------------------------------------------
// QBHealthWidget
// ---------------------------------------------------------------------------

export function QBHealthWidget({ data, index = 6 }: QBHealthWidgetProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  const formatTimeSince = (timestamp: string | null): string => {
    if (!timestamp) return "Never";
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    // Placeholder for retry logic — the actual retry would call a server action
    // to re-sync failed items
    setTimeout(() => setIsRetrying(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.08,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 lg:p-5"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">
            QuickBooks
          </p>

          {/* Connection Status */}
          <div className="mt-2 flex items-center gap-2">
            {data.connected ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
                <span className="text-sm font-semibold text-[var(--color-success)]">
                  Connected
                </span>
              </>
            ) : (
              <>
                <CloudOff className="h-4 w-4 text-[var(--color-text-muted)]" />
                <span className="text-sm font-semibold text-[var(--color-text-muted)]">
                  Not Connected
                </span>
              </>
            )}
          </div>

          {/* Sync info */}
          <div className="mt-1 flex items-center gap-3">
            <span className="text-xs text-[var(--color-text-muted)]">
              Last sync: {formatTimeSince(data.lastSyncAt)}
            </span>
            {data.failedSyncsCount > 0 && (
              <span className="text-xs font-medium text-[var(--color-danger)] flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {data.failedSyncsCount} failed
              </span>
            )}
          </div>

          {/* Retry button */}
          {data.failedSyncsCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-7 text-xs"
              onClick={handleRetry}
              disabled={isRetrying}
            >
              {isRetrying ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              Retry Failed
            </Button>
          )}
        </div>

        <div
          className={cn(
            "flex items-center justify-center h-10 w-10 rounded-lg flex-shrink-0 ml-3",
            data.connected
              ? "bg-emerald-100 text-emerald-700"
              : "bg-zinc-100 text-zinc-500"
          )}
        >
          {data.connected ? (
            <Cloud className="h-5 w-5" />
          ) : (
            <CloudOff className="h-5 w-5" />
          )}
        </div>
      </div>
    </motion.div>
  );
}
