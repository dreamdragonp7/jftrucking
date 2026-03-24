"use client";

import { useState, useTransition } from "react";
import {
  Check,
  X,
  AlertTriangle,
  Package,
  Image as ImageIcon,
  MapPin,
  User,
  FileText,
  CheckCircle,
} from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Modal } from "@/components/shared/Modal";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import {
  confirmDelivery,
  disputeDelivery,
  getConfirmedDeliveries,
} from "@/app/(customer)/_actions/customer.actions";
import { cn } from "@/lib/utils/cn";
import type { DeliveryWithRelations } from "@/types/database";

const DISPUTE_REASONS = [
  "Never received",
  "Wrong material",
  "Short weight",
  "Damaged",
  "Other",
] as const;

interface DeliveriesClientProps {
  pendingDeliveries: DeliveryWithRelations[];
  confirmedDeliveries: DeliveryWithRelations[];
  confirmedCount: number;
}

export function DeliveriesClient({
  pendingDeliveries: initialPending,
  confirmedDeliveries: initialConfirmed,
  confirmedCount: initialCount,
}: DeliveriesClientProps) {
  const [pending, setPending] = useState(initialPending);
  const [confirmed, setConfirmed] = useState(initialConfirmed);
  const [totalConfirmed, setTotalConfirmed] = useState(initialCount);
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Dispute dialog state
  const [disputeTarget, setDisputeTarget] = useState<DeliveryWithRelations | null>(null);
  const [disputeReason, setDisputeReason] = useState<string>("");
  const [disputeNotes, setDisputeNotes] = useState<string>("");
  const [disputeError, setDisputeError] = useState<string | null>(null);

  // Photo lightbox state
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  function handleConfirm(delivery: DeliveryWithRelations) {
    setActioningId(delivery.id);
    startTransition(async () => {
      const result = await confirmDelivery(delivery.id);
      if (result.success) {
        setPending((prev) => prev.filter((d) => d.id !== delivery.id));
        setConfirmed((prev) => [
          { ...delivery, confirmation_status: "confirmed" } as DeliveryWithRelations,
          ...prev,
        ]);
        setTotalConfirmed((c) => c + 1);
      }
      setActioningId(null);
    });
  }

  function openDispute(delivery: DeliveryWithRelations) {
    setDisputeTarget(delivery);
    setDisputeReason("");
    setDisputeNotes("");
    setDisputeError(null);
  }

  function handleDisputeSubmit() {
    if (!disputeTarget) return;
    if (!disputeReason) {
      setDisputeError("Please select a reason");
      return;
    }

    setActioningId(disputeTarget.id);
    startTransition(async () => {
      const result = await disputeDelivery(
        disputeTarget.id,
        disputeReason,
        disputeNotes || undefined
      );
      if (result.success) {
        setPending((prev) => prev.filter((d) => d.id !== disputeTarget.id));
        setConfirmed((prev) => [
          { ...disputeTarget, confirmation_status: "disputed" } as DeliveryWithRelations,
          ...prev,
        ]);
        setTotalConfirmed((c) => c + 1);
        setDisputeTarget(null);
      } else {
        setDisputeError(result.error);
      }
      setActioningId(null);
    });
  }

  function handleLoadMore() {
    const nextPage = page + 1;
    startTransition(async () => {
      const result = await getConfirmedDeliveries(nextPage, 20);
      if (result.success) {
        setConfirmed((prev) => [...prev, ...result.data.data]);
        setTotalConfirmed(result.data.count);
        setPage(nextPage);
      }
    });
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const confirmationIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />;
      case "disputed":
        return <AlertTriangle className="w-3.5 h-3.5 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="animate-slide-up-fade">
      <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">
        Deliveries
      </h1>

      {/* ── PENDING CONFIRMATIONS ─────────────────────────────── */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            Needs Your Confirmation
          </h2>
          {pending.length > 0 && (
            <span className="min-w-[22px] h-[22px] rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center px-1.5">
              {pending.length}
            </span>
          )}
        </div>

        {pending.length === 0 ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-emerald-700">
              All caught up!
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              No deliveries to confirm.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {pending.map((delivery) => {
              const dispatch = delivery.dispatch as DeliveryWithRelations["dispatch"] & {
                material?: { name: string };
                delivery_site?: { name: string };
                purchase_order?: { po_number: string };
              };
              const isActioning = actioningId === delivery.id;

              return (
                <div
                  key={delivery.id}
                  className={cn(
                    "rounded-xl border-2 border-amber-500/30 bg-surface p-4 transition-all",
                    isActioning && "opacity-60 pointer-events-none"
                  )}
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-bold text-[var(--color-text-primary)] font-mono">
                        {delivery.ticket_number
                          ? `#${delivery.ticket_number}`
                          : `D-${delivery.id.slice(0, 6)}`}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)] font-mono mt-0.5">
                        {formatDate(delivery.delivered_at)},{" "}
                        {formatTime(delivery.delivered_at)}
                      </p>
                    </div>
                    <StatusBadge status="pending" label="Pending" />
                  </div>

                  {/* Details */}
                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="w-3.5 h-3.5 text-[var(--color-text-muted)] flex-shrink-0" />
                      <span className="text-[var(--color-text-secondary)]">
                        {dispatch?.material?.name ??
                          delivery.material?.name ??
                          "Material"}
                      </span>
                      {delivery.net_weight != null && (
                        <span className="text-[var(--color-text-primary)] font-mono font-semibold ml-auto">
                          {delivery.net_weight.toFixed(1)} tons
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-3.5 h-3.5 text-[var(--color-text-muted)] flex-shrink-0" />
                      <span className="text-[var(--color-text-secondary)]">
                        {dispatch?.delivery_site?.name ??
                          delivery.delivery_site?.name ??
                          "Delivery site"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-3.5 h-3.5 text-[var(--color-text-muted)] flex-shrink-0" />
                      <span className="text-[var(--color-text-secondary)]">
                        {delivery.driver?.name ?? "Driver"}
                      </span>
                    </div>

                    {dispatch?.purchase_order?.po_number && (
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="w-3.5 h-3.5 text-[var(--color-text-muted)] flex-shrink-0" />
                        <span className="text-[var(--color-text-secondary)] font-mono">
                          PO #{dispatch.purchase_order.po_number}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Ticket Photo */}
                  {delivery.ticket_photo_url && (
                    <button
                      onClick={() => setPhotoUrl(delivery.ticket_photo_url)}
                      className="flex items-center gap-2 text-sm text-brand-brown hover:text-brown-400 transition-colors mb-3"
                    >
                      <ImageIcon className="w-4 h-4" />
                      View Ticket Photo
                    </button>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleConfirm(delivery)}
                      disabled={isActioning}
                      className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-lg bg-brand-gold px-4 text-base font-semibold text-[var(--color-text-on-gold)] hover:bg-gold-400 transition-colors disabled:opacity-50"
                    >
                      {isActioning ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <Check className="w-5 h-5" />
                      )}
                      Confirm Delivery
                    </button>
                    <button
                      onClick={() => openDispute(delivery)}
                      disabled={isActioning}
                      className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-lg border-2 border-red-300 bg-transparent px-4 text-sm font-semibold text-red-600 hover:bg-red-50 hover:border-red-400 transition-colors disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      Dispute
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── CONFIRMED / PAST DELIVERIES ───────────────────────── */}
      <section>
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-3">
          Past Deliveries
          {totalConfirmed > 0 && (
            <span className="text-xs text-[var(--color-text-muted)] font-normal ml-2">
              ({totalConfirmed})
            </span>
          )}
        </h2>

        {confirmed.length === 0 ? (
          <div className="rounded-xl border border-[var(--color-border)] bg-surface p-6 text-center">
            <Package className="w-10 h-10 text-[var(--color-text-muted)] mx-auto mb-2" />
            <p className="text-sm text-[var(--color-text-muted)]">
              No deliveries yet.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-2">
              {confirmed.map((delivery) => {
                const dispatch = delivery.dispatch as DeliveryWithRelations["dispatch"] & {
                  material?: { name: string };
                };

                return (
                  <div
                    key={delivery.id}
                    className="rounded-lg border border-[var(--color-border)] bg-surface px-4 py-3 flex items-center gap-3"
                  >
                    {confirmationIcon(delivery.confirmation_status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[var(--color-text-primary)] truncate">
                          {dispatch?.material?.name ??
                            delivery.material?.name ??
                            "Material"}
                        </span>
                        {delivery.net_weight != null && (
                          <span className="text-xs font-mono text-[var(--color-text-muted)]">
                            {delivery.net_weight.toFixed(1)}t
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)] font-mono">
                        {formatDate(delivery.delivered_at)}
                      </p>
                    </div>
                    <StatusBadge status={delivery.confirmation_status} />
                  </div>
                );
              })}
            </div>

            {/* Load More */}
            {confirmed.length < totalConfirmed && (
              <div className="mt-4 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={isPending}
                  className="text-sm text-brand-brown hover:text-brown-400 font-medium transition-colors disabled:opacity-50"
                >
                  {isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <LoadingSpinner size="sm" />
                      Loading...
                    </span>
                  ) : (
                    `Load more (${totalConfirmed - confirmed.length} remaining)`
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── DISPUTE DIALOG ─────────────────────────────────────── */}
      <Modal
        isOpen={!!disputeTarget}
        onClose={() => setDisputeTarget(null)}
        title="Dispute Delivery"
        description={`Disputing ${
          disputeTarget?.ticket_number
            ? `#${disputeTarget.ticket_number}`
            : `delivery D-${disputeTarget?.id.slice(0, 6) ?? ""}`
        }`}
        size="sm"
        footer={
          <>
            <button
              onClick={() => setDisputeTarget(null)}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-surface-hover transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDisputeSubmit}
              disabled={isPending || !disputeReason}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isPending ? (
                <>
                  <LoadingSpinner size="sm" />
                  Submitting...
                </>
              ) : (
                "Submit Dispute"
              )}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {disputeError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
              {disputeError}
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              Reason *
            </label>
            <div className="space-y-2">
              {DISPUTE_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors",
                    disputeReason === reason
                      ? "border-red-300 bg-red-50"
                      : "border-[var(--color-border)] hover:bg-surface-hover"
                  )}
                >
                  <input
                    type="radio"
                    name="dispute_reason"
                    value={reason}
                    checked={disputeReason === reason}
                    onChange={() => setDisputeReason(reason)}
                    className="accent-red-500"
                  />
                  <span className="text-sm text-[var(--color-text-primary)]">
                    {reason}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
              Additional Notes (optional)
            </label>
            <textarea
              value={disputeNotes}
              onChange={(e) => setDisputeNotes(e.target.value)}
              rows={3}
              placeholder="Describe the issue..."
              className="w-full rounded-lg border border-[var(--color-border)] bg-surface-deep px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* ── PHOTO LIGHTBOX ─────────────────────────────────────── */}
      <Modal
        isOpen={!!photoUrl}
        onClose={() => setPhotoUrl(null)}
        title="Ticket Photo"
        size="lg"
      >
        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt="Delivery ticket"
            className="w-full rounded-lg"
          />
        )}
      </Modal>
    </div>
  );
}
