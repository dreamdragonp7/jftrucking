"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  ChevronRight,
  Package,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";

import type { DispatchWithRelations } from "@/types/database";
import { PhotoCapture } from "@/components/trucker/PhotoCapture";
import {
  submitDelivery,
  uploadTicketPhoto,
} from "@/app/(trucker)/_actions/trucker.actions";
import { savePendingDelivery } from "@/lib/offline/sync";
import { cn } from "@/lib/utils/cn";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface DeliverClientProps {
  initialLoads: DispatchWithRelations[];
}

export function DeliverClient({ initialLoads }: DeliverClientProps) {
  const router = useRouter();
  const [loads, setLoads] = useState(initialLoads);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedLoad = loads.find((l) => l.id === selectedId) ?? null;

  return (
    <div className="animate-slide-up-fade">
      <h1 className="text-lg font-bold text-[var(--color-text-primary)] mb-1">
        Confirm Delivery
      </h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-4">
        Select a load to mark as delivered
      </p>

      {loads.length === 0 ? (
        /* Empty state */
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-[var(--color-border)] bg-surface p-8 text-center"
        >
          <CheckCircle className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3" />
          <p className="text-base font-medium text-[var(--color-text-secondary)] mb-1">
            No active deliveries
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            Loads ready to deliver will appear here after dispatch sends them.
          </p>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-3">
          {loads.map((load, index) => (
            <motion.div
              key={load.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06, duration: 0.3 }}
            >
              {selectedId === load.id ? (
                /* Expanded: delivery form */
                <DeliveryForm
                  load={load}
                  onCancel={() => setSelectedId(null)}
                  onSuccess={() => {
                    setLoads((prev) => prev.filter((l) => l.id !== load.id));
                    setSelectedId(null);
                    toast.success("Delivery recorded!");
                    router.refresh();
                  }}
                />
              ) : (
                /* Collapsed: selectable card */
                <button
                  type="button"
                  onClick={() => setSelectedId(load.id)}
                  className="w-full text-left rounded-xl border border-[var(--color-border)] bg-surface p-4 hover:bg-surface-hover transition-colors touch-target-large"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="w-4 h-4 text-brand-brown flex-shrink-0" />
                        <span className="text-base font-semibold text-[var(--color-text-primary)] line-clamp-2">
                          {load.material?.name ?? "Material"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="line-clamp-2">
                          {load.delivery_site?.name ?? "Delivery Site"}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[var(--color-text-muted)] flex-shrink-0" />
                  </div>
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DeliveryForm — expanded card for entering delivery details
// ---------------------------------------------------------------------------

interface DeliveryFormProps {
  load: DispatchWithRelations;
  onCancel: () => void;
  onSuccess: () => void;
}

function DeliveryForm({ load, onCancel, onSuccess }: DeliveryFormProps) {
  const [ticketNumber, setTicketNumber] = useState("");
  const [netWeight, setNetWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      startTransition(async () => {
        try {
          // Check if we're online
          const isOnline = navigator.onLine;

          if (!isOnline) {
            // Save offline with photo blob
            await savePendingDelivery({
              dispatch_id: load.id,
              ticket_number: ticketNumber,
              net_weight: netWeight ? parseFloat(netWeight) : null,
              photo_blob: photo,
              notes,
            });
            toast.success("Saved offline — will sync when connected");
            onSuccess();
            return;
          }

          // Upload photo first if present
          let photoUrl: string | null = null;
          if (photo) {
            const formData = new FormData();
            formData.append("photo", photo);
            const photoResult = await uploadTicketPhoto(formData);
            if (photoResult.success) {
              photoUrl = photoResult.data;
            }
            // Don't fail if photo upload fails — it's optional
          }

          // Submit delivery
          const result = await submitDelivery({
            dispatch_id: load.id,
            ticket_number: ticketNumber,
            net_weight: netWeight ? parseFloat(netWeight) : null,
            notes,
            photo_url: photoUrl,
          });

          if (result.success) {
            onSuccess();
          } else {
            toast.error(result.error);
          }
        } catch (error) {
          // If submission fails, try to save offline
          try {
            await savePendingDelivery({
              dispatch_id: load.id,
              ticket_number: ticketNumber,
              net_weight: netWeight ? parseFloat(netWeight) : null,
              photo_blob: photo,
              notes,
            });
            toast.success("Saved offline — will sync when connected");
            onSuccess();
          } catch (offlineErr) {
            console.error("[Deliver] Failed to save delivery offline:", offlineErr instanceof Error ? offlineErr.message : offlineErr);
            toast.error("Failed to save delivery. Please try again.");
          }
        }
      });
    },
    [load.id, ticketNumber, netWeight, notes, photo, onSuccess]
  );

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-xl border-2 border-gold-300/30 bg-surface overflow-hidden"
      >
        <form onSubmit={handleSubmit} className="p-4">
          {/* Header */}
          <div className="mb-4">
            <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
              Completing Delivery
            </p>
            <p className="text-lg font-bold text-[var(--color-text-primary)]">
              {load.material?.name ?? "Material"}
            </p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {load.delivery_site?.name ?? "Delivery Site"}
            </p>
          </div>

          {/* Ticket Number */}
          <div className="mb-4">
            <label
              htmlFor={`ticket-${load.id}`}
              className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5"
            >
              Ticket Number
            </label>
            <input
              id={`ticket-${load.id}`}
              type="text"
              value={ticketNumber}
              onChange={(e) => setTicketNumber(e.target.value)}
              placeholder="Enter ticket #"
              disabled={isPending}
              autoComplete="off"
              className={cn(
                "w-full h-14 px-4 rounded-xl border border-[var(--color-border)] bg-surface-deep",
                "text-lg font-mono text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
                "focus:border-gold-300 focus:ring-2 focus:ring-gold-300/30 outline-none transition-all",
                "disabled:opacity-50"
              )}
            />
          </div>

          {/* Net Weight */}
          <div className="mb-4">
            <label
              htmlFor={`weight-${load.id}`}
              className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5"
            >
              Net Weight (tons)
            </label>
            <div className="relative">
              <input
                id={`weight-${load.id}`}
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={netWeight}
                onChange={(e) => setNetWeight(e.target.value)}
                placeholder="0.00"
                disabled={isPending}
                autoComplete="off"
                className={cn(
                  "w-full h-14 px-4 pr-16 rounded-xl border border-[var(--color-border)] bg-surface-deep",
                  "text-lg font-mono text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
                  "focus:border-gold-300 focus:ring-2 focus:ring-gold-300/30 outline-none transition-all",
                  "disabled:opacity-50"
                )}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-muted)] font-medium">
                tons
              </span>
            </div>
          </div>

          {/* Photo capture (optional) */}
          <div className="mb-4">
            <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
              Photo of Scale Ticket{" "}
              <span className="text-[var(--color-text-muted)] font-normal">
                (optional)
              </span>
            </p>
            <PhotoCapture onPhotoChange={setPhoto} disabled={isPending} />
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label
              htmlFor={`notes-${load.id}`}
              className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5"
            >
              Notes{" "}
              <span className="text-[var(--color-text-muted)] font-normal">
                (optional)
              </span>
            </label>
            <textarea
              id={`notes-${load.id}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this delivery..."
              disabled={isPending}
              rows={2}
              className={cn(
                "w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-surface-deep",
                "text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
                "focus:border-gold-300 focus:ring-2 focus:ring-gold-300/30 outline-none transition-all resize-none",
                "disabled:opacity-50"
              )}
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            {/* Submit button — BIG golden */}
            <button
              type="submit"
              disabled={isPending}
              className={cn(
                "w-full h-14 rounded-xl text-base font-bold transition-all touch-target-large",
                "bg-brand-gold text-[var(--color-text-on-gold)] hover:bg-gold-400",
                "active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100",
                "flex items-center justify-center gap-2"
              )}
            >
              {isPending ? (
                <>
                  <div className="w-5 h-5 border-2 border-[var(--color-text-on-gold)]/30 border-t-[var(--color-text-on-gold)] rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Mark Delivered
                </>
              )}
            </button>

            {/* Cancel */}
            <button
              type="button"
              onClick={onCancel}
              disabled={isPending}
              className="w-full h-12 rounded-xl text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-surface-hover transition-colors touch-target"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </AnimatePresence>
  );
}
