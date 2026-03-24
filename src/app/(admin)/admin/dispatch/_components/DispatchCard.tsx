"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import {
  MessageSquare,
  Pencil,
  XCircle,
  Copy,
  Loader2,
  ArrowRight,
} from "lucide-react";
import type { DispatchWithRelations } from "@/types/database";

// ---------------------------------------------------------------------------
// Status dot colors
// ---------------------------------------------------------------------------

const STATUS_DOT_COLORS: Record<string, string> = {
  scheduled: "bg-zinc-400",
  dispatched: "bg-[var(--color-brand-gold)]",
  acknowledged: "bg-sky-400",
  in_progress: "bg-amber-400",
  delivered: "bg-sky-400",
  confirmed: "bg-emerald-400",
  disputed: "bg-red-400",
  cancelled: "bg-zinc-600",
  // Deprecated SQL values kept as fallbacks for old data
  in_transit: "bg-amber-400",
  at_pickup: "bg-orange-400",
  loaded: "bg-indigo-400",
  delivering: "bg-blue-400",
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  dispatched: "Dispatched",
  acknowledged: "Acknowledged",
  in_progress: "In Progress",
  delivered: "Delivered",
  confirmed: "Confirmed",
  disputed: "Disputed",
  cancelled: "Cancelled",
  // Deprecated SQL values kept as fallbacks for old data
  in_transit: "In Transit",
  at_pickup: "At Pickup",
  loaded: "Loaded",
  delivering: "Delivering",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DispatchCardProps {
  dispatch: DispatchWithRelations;
  dispatchNumber: number;
  onSendSMS: (id: string) => Promise<void>;
  onCancel: (d: DispatchWithRelations) => void;
  onClone: (d: DispatchWithRelations) => void;
  onEdit: (d: DispatchWithRelations) => void;
}

// ---------------------------------------------------------------------------
// DispatchCard
// ---------------------------------------------------------------------------

export function DispatchCard({
  dispatch,
  dispatchNumber,
  onSendSMS,
  onCancel,
  onClone,
  onEdit,
}: DispatchCardProps) {
  const [isSending, setIsSending] = useState(false);

  const handleSendSMS = async () => {
    setIsSending(true);
    try {
      await onSendSMS(dispatch.id);
    } finally {
      setIsSending(false);
    }
  };

  const canDispatch = dispatch.status === "scheduled";
  const canCancel = ["scheduled", "dispatched"].includes(dispatch.status);
  const canEdit = dispatch.status === "scheduled";
  const canClone = !["cancelled"].includes(dispatch.status);

  const poInfo = dispatch.purchase_order;

  return (
    <Link
      href={`/admin/dispatch/${dispatch.id}`}
      className="block"
    >
      <div
        className={cn(
          "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4",
          "hover:border-[var(--color-brand-gold)]/30 hover:bg-[var(--color-surface-elevated)]",
          "transition-all duration-150 cursor-pointer",
          dispatch.status === "disputed" && "border-red-500/30"
        )}
      >
        {/* Header: dispatch number + status */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-[var(--color-text-primary)] font-mono">
            #D-{String(dispatchNumber).padStart(4, "0")}
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                STATUS_DOT_COLORS[dispatch.status] ?? "bg-zinc-400"
              )}
            />
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">
              {STATUS_LABELS[dispatch.status] ?? dispatch.status}
            </span>
          </div>
        </div>

        {/* Material + weight */}
        <p className="text-sm text-[var(--color-text-primary)] font-medium">
          {dispatch.material?.name ?? "Material"}
          {dispatch.truck?.capacity_tons && (
            <span className="text-[var(--color-text-muted)] font-mono ml-1">
              — {dispatch.truck.capacity_tons}T
            </span>
          )}
        </p>

        {/* Route */}
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] mt-1">
          <span>{dispatch.pickup_site?.name ?? "Pickup"}</span>
          <ArrowRight className="h-3 w-3 text-[var(--color-text-muted)]" />
          <span>{dispatch.delivery_site?.name ?? "Delivery"}</span>
        </div>

        {/* Driver */}
        <p className="text-xs text-[var(--color-text-muted)] mt-1.5">
          Driver: {dispatch.driver?.name ?? "Unassigned"}
          {dispatch.carrier?.name && (
            <span className="text-[var(--color-text-muted)]">
              {" "}
              ({dispatch.carrier.name})
            </span>
          )}
        </p>

        {/* PO reference */}
        {poInfo && (
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5 font-mono">
            PO #{poInfo.po_number} ({poInfo.quantity_delivered}/
            {poInfo.quantity_ordered})
          </p>
        )}

        {/* Actions */}
        <div
          className="flex items-center gap-1.5 mt-3 pt-3 border-t border-[var(--color-border)]"
          onClick={(e) => e.preventDefault()}
        >
          {canDispatch && (
            <Button
              size="xs"
              variant="default"
              onClick={handleSendSMS}
              disabled={isSending}
            >
              {isSending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <MessageSquare className="h-3 w-3" />
              )}
              Dispatch SMS
            </Button>
          )}

          {canEdit && (
            <Button
              size="xs"
              variant="outline"
              onClick={() => onEdit(dispatch)}
            >
              <Pencil className="h-3 w-3" />
              Edit
            </Button>
          )}

          {canClone && (
            <Button
              size="xs"
              variant="ghost"
              onClick={() => onClone(dispatch)}
            >
              <Copy className="h-3 w-3" />
              Clone
            </Button>
          )}

          {canCancel && (
            <Button
              size="xs"
              variant="ghost"
              className="text-red-600 hover:text-red-300"
              onClick={() => onCancel(dispatch)}
            >
              <XCircle className="h-3 w-3" />
              Cancel
            </Button>
          )}
        </div>
      </div>
    </Link>
  );
}
