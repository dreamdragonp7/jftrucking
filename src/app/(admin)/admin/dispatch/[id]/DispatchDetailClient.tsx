"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  MessageSquare,
  Loader2,
  Truck,
  MapPin,
  User,
  Calendar,
  FileText,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  StatusTimeline,
  type TimelineStep,
} from "@/components/admin/StatusTimeline";
import { DeleteDialog } from "@/components/admin/DeleteDialog";
import {
  sendDispatchNotification,
  cancelDispatch,
} from "../_actions/dispatch.actions";
import type {
  DispatchWithRelations,
  DeliveryWithRelations,
} from "@/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DispatchDetailClientProps {
  dispatch: DispatchWithRelations;
  delivery: DeliveryWithRelations | null;
}

// ---------------------------------------------------------------------------
// Build timeline steps from dispatch data
// ---------------------------------------------------------------------------

function buildTimelineSteps(
  dispatch: DispatchWithRelations
): TimelineStep[] {
  return [
    {
      status: "scheduled",
      label: "Scheduled",
      timestamp: dispatch.created_at,
      actor: "Admin",
    },
    {
      status: "dispatched",
      label: "Dispatched (SMS Sent)",
      timestamp: dispatch.dispatched_at,
    },
    {
      status: "acknowledged",
      label: "Acknowledged by Driver",
      timestamp: dispatch.acknowledged_at,
    },
    {
      status: "in_progress",
      label: "In Progress",
      timestamp: null,
    },
    {
      status: "delivered",
      label: "Delivered",
      timestamp: null,
    },
    {
      status: "confirmed",
      label: "Confirmed",
      timestamp: null,
    },
  ];
}

// ---------------------------------------------------------------------------
// Detail sections
// ---------------------------------------------------------------------------

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Truck;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] flex-shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
        <p className="text-sm text-[var(--color-text-primary)] font-medium">
          {value}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DispatchDetailClient
// ---------------------------------------------------------------------------

export function DispatchDetailClient({
  dispatch,
  delivery,
}: DispatchDetailClientProps) {
  const router = useRouter();
  const [isSending, setIsSending] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const canDispatch = dispatch.status === "scheduled";
  const canCancel = ["scheduled", "dispatched"].includes(dispatch.status);
  const isDisputed = dispatch.status === "disputed";

  const handleSendSMS = useCallback(async () => {
    setIsSending(true);
    try {
      const result = await sendDispatchNotification(dispatch.id);
      if (result.success) {
        if (result.data.smsStatus === "skipped_no_config") {
          toast.success(
            "Status updated to dispatched (SMS skipped — Twilio not configured)"
          );
        } else {
          toast.success("SMS sent to driver");
        }
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } finally {
      setIsSending(false);
    }
  }, [dispatch.id, router]);

  const handleCancel = useCallback(async () => {
    const result = await cancelDispatch(dispatch.id);
    if (result.success) {
      toast.success("Dispatch cancelled");
      router.push("/admin/dispatch");
    } else {
      toast.error(result.error);
    }
  }, [dispatch.id, router]);

  const timelineSteps = buildTimelineSteps(dispatch);

  return (
    <div className="animate-slide-up-fade max-w-4xl">
      {/* Back link */}
      <Link
        href="/admin/dispatch"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dispatch Board
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
              Dispatch Detail
            </h1>
            <StatusBadge status={dispatch.status} />
          </div>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Scheduled for{" "}
            <span className="font-mono">
              {new Date(dispatch.scheduled_date).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canDispatch && (
            <Button onClick={handleSendSMS} disabled={isSending} size="sm">
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageSquare className="h-4 w-4" />
              )}
              Dispatch SMS
            </Button>
          )}
          {canCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelOpen(true)}
              className="text-red-600 border-red-500/30 hover:bg-red-50"
            >
              <XCircle className="h-4 w-4" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Dispatch info card */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
              Load Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <InfoRow
                icon={FileText}
                label="Material"
                value={dispatch.material?.name ?? "--"}
              />
              <InfoRow
                icon={Truck}
                label="Truck"
                value={
                  dispatch.truck
                    ? `#${dispatch.truck.number}${dispatch.truck.capacity_tons ? ` (${dispatch.truck.capacity_tons}T)` : ""}`
                    : "--"
                }
              />
              <InfoRow
                icon={User}
                label="Driver"
                value={
                  dispatch.driver ? (
                    <span>
                      {dispatch.driver.name}
                      {dispatch.driver.phone && (
                        <span className="text-[var(--color-text-muted)] font-mono text-xs ml-2">
                          {dispatch.driver.phone}
                        </span>
                      )}
                    </span>
                  ) : (
                    "--"
                  )
                }
              />
              <InfoRow
                icon={User}
                label="Carrier"
                value={dispatch.carrier?.name ?? "--"}
              />
            </div>
          </div>

          {/* Route card */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
              Route
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <InfoRow
                  icon={MapPin}
                  label="Pickup"
                  value={
                    <span>
                      {dispatch.pickup_site?.name ?? "--"}
                      {dispatch.pickup_site?.address && (
                        <span className="block text-xs text-[var(--color-text-muted)] font-normal">
                          {dispatch.pickup_site.address}
                        </span>
                      )}
                    </span>
                  }
                />
              </div>
              <ArrowRight className="h-5 w-5 text-[var(--color-text-muted)] flex-shrink-0" />
              <div className="flex-1">
                <InfoRow
                  icon={MapPin}
                  label="Delivery"
                  value={
                    <span>
                      {dispatch.delivery_site?.name ?? "--"}
                      {dispatch.delivery_site?.address && (
                        <span className="block text-xs text-[var(--color-text-muted)] font-normal">
                          {dispatch.delivery_site.address}
                        </span>
                      )}
                      {dispatch.delivery_site?.contact_name && (
                        <span className="block text-xs text-[var(--color-text-muted)] font-normal mt-1">
                          Contact: {dispatch.delivery_site.contact_name}
                          {dispatch.delivery_site.contact_phone &&
                            ` (${dispatch.delivery_site.contact_phone})`}
                        </span>
                      )}
                    </span>
                  }
                />
              </div>
            </div>
          </div>

          {/* PO Reference */}
          {dispatch.purchase_order && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
                Purchase Order
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    PO Number
                  </p>
                  <p className="text-sm font-mono font-semibold text-[var(--color-brand-gold)]">
                    {dispatch.purchase_order.po_number}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Delivered / Ordered
                  </p>
                  <p className="text-sm font-mono text-[var(--color-text-primary)]">
                    {dispatch.purchase_order.quantity_delivered} /{" "}
                    {dispatch.purchase_order.quantity_ordered}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Status
                  </p>
                  <StatusBadge status={dispatch.purchase_order.status} />
                </div>
              </div>
            </div>
          )}

          {/* Delivery Proof (if delivered) */}
          {delivery && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
                Delivery Proof
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Ticket #
                  </p>
                  <p className="text-sm font-mono text-[var(--color-text-primary)]">
                    {delivery.ticket_number ?? "--"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Net Weight
                  </p>
                  <p className="text-sm font-mono text-[var(--color-text-primary)]">
                    {delivery.net_weight
                      ? `${delivery.net_weight}T`
                      : "--"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    GPS Verified
                  </p>
                  <StatusBadge
                    status={delivery.geofence_verified ? "yes" : "no"}
                    label={delivery.geofence_verified ? "Yes" : "No"}
                  />
                </div>
                <div>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Delivered At
                  </p>
                  <p className="text-xs font-mono text-[var(--color-text-secondary)]">
                    {new Date(delivery.delivered_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </p>
                </div>
              </div>

              {/* Dispute info */}
              {delivery.confirmation_status === "disputed" && (
                <div className="mt-4 p-3 rounded-lg border border-red-500/30 bg-red-50">
                  <p className="text-sm font-medium text-red-600">
                    Disputed
                  </p>
                  <p className="text-xs text-red-600/80 mt-1">
                    {delivery.dispute_reason ?? "No reason provided"}
                  </p>
                  {delivery.dispute_resolution && (
                    <p className="text-xs text-[var(--color-text-secondary)] mt-2">
                      Resolution: {delivery.dispute_resolution}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {dispatch.notes && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
                Notes
              </h2>
              <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap">
                {dispatch.notes}
              </p>
            </div>
          )}
        </div>

        {/* Right column: Status Timeline */}
        <div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sticky top-6">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">
              Status Timeline
            </h2>
            <StatusTimeline
              steps={timelineSteps}
              currentStatus={dispatch.status}
            />
          </div>
        </div>
      </div>

      {/* Cancel dialog */}
      <DeleteDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel Dispatch"
        entityName={`dispatch for ${dispatch.driver?.name ?? "driver"}`}
        onConfirm={handleCancel}
        description="This will cancel the dispatch. The driver will not be notified automatically."
      />
    </div>
  );
}
