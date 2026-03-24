"use client";

import { useState, useTransition, useCallback } from "react";
import {
  Truck,
  MapPin,
  User,
  Package,
  Calendar,
  Plus,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { FormDialog } from "@/components/admin/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getCarrierDispatches,
  createDispatch,
} from "@/app/(subcontractor)/_actions/subcontractor.actions";
import type {
  DispatchWithRelations,
  PurchaseOrderWithRelations,
  Driver,
  Truck as TruckType,
} from "@/types/database";

interface DispatchesClientProps {
  dispatches: DispatchWithRelations[];
  totalCount: number;
  purchaseOrders: PurchaseOrderWithRelations[];
  drivers: Driver[];
  trucks: TruckType[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DispatchesClient({
  dispatches: initialDispatches,
  totalCount: initialCount,
  purchaseOrders,
  drivers,
  trucks,
}: DispatchesClientProps) {
  const [dispatches, setDispatches] = useState(initialDispatches);
  const [totalCount, setTotalCount] = useState(initialCount);
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPO, setSelectedPO] = useState("");
  const [selectedDriver, setSelectedDriver] = useState("");
  const [selectedTruck, setSelectedTruck] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [isCreating, startCreateTransition] = useTransition();

  function handleLoadMore() {
    const nextPage = page + 1;
    startTransition(async () => {
      const result = await getCarrierDispatches({ page: nextPage, limit: 25 });
      if (result.success) {
        setDispatches((prev) => [...prev, ...result.data.data]);
        setTotalCount(result.data.count);
        setPage(nextPage);
      }
    });
  }

  const resetForm = useCallback(() => {
    setSelectedPO("");
    setSelectedDriver("");
    setSelectedTruck("");
    setScheduledDate("");
    setDeliveryAddress("");
    setNotes("");
  }, []);

  function handleCreate() {
    if (!selectedPO || !selectedDriver || !selectedTruck || !scheduledDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    const po = purchaseOrders.find((p) => p.id === selectedPO);
    if (!po) {
      toast.error("Selected PO not found");
      return;
    }

    startCreateTransition(async () => {
      const result = await createDispatch({
        driver_id: selectedDriver,
        truck_id: selectedTruck,
        material_id: po.material_id,
        pickup_site_id: po.delivery_site_id, // Will be resolved — PO has delivery site; pickup comes from rate lookup
        delivery_site_id: po.delivery_site_id,
        scheduled_date: scheduledDate,
        purchase_order_id: po.id,
        delivery_address: deliveryAddress || null,
        notes: notes || null,
      });

      if (result.success) {
        toast.success("Dispatch created");
        setDispatches((prev) => [result.data, ...prev]);
        setTotalCount((prev) => prev + 1);
        setShowCreate(false);
        resetForm();
      } else {
        toast.error(result.error ?? "Failed to create dispatch");
      }
    });
  }

  // Default tomorrow for the date picker
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  return (
    <div className="animate-slide-up-fade">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
          Dispatches
        </h1>
        <Button
          size="sm"
          onClick={() => {
            if (!scheduledDate) setScheduledDate(tomorrowStr);
            setShowCreate(true);
          }}
          className="bg-brand-gold text-[var(--color-text-on-gold)] hover:bg-gold-400"
        >
          <Plus className="w-4 h-4" />
          Create Dispatch
        </Button>
      </div>

      {/* Create Dispatch Dialog */}
      <FormDialog
        open={showCreate}
        onOpenChange={(open) => {
          setShowCreate(open);
          if (!open) resetForm();
        }}
        title="Create Dispatch"
        description="Dispatch a driver and truck to a job"
      >
        <div className="space-y-4 py-2">
          {/* PO Selection */}
          <div>
            <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-1">
              Purchase Order *
            </label>
            <Select value={selectedPO} onValueChange={setSelectedPO}>
              <SelectTrigger>
                <SelectValue placeholder="Select a PO" />
              </SelectTrigger>
              <SelectContent>
                {purchaseOrders.map((po) => (
                  <SelectItem key={po.id} value={po.id}>
                    {po.po_number} — {po.customer?.name ?? "Customer"} ({po.material?.name ?? "Material"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {purchaseOrders.length === 0 && (
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                No active purchase orders available
              </p>
            )}
          </div>

          {/* Driver */}
          <div>
            <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-1">
              Driver *
            </label>
            <Select value={selectedDriver} onValueChange={setSelectedDriver}>
              <SelectTrigger>
                <SelectValue placeholder="Select a driver" />
              </SelectTrigger>
              <SelectContent>
                {drivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Truck */}
          <div>
            <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-1">
              Truck *
            </label>
            <Select value={selectedTruck} onValueChange={setSelectedTruck}>
              <SelectTrigger>
                <SelectValue placeholder="Select a truck" />
              </SelectTrigger>
              <SelectContent>
                {trucks.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    Truck #{t.number}{t.make ? ` (${t.make} ${t.model ?? ""})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Scheduled Date */}
          <div>
            <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-1">
              Scheduled Date *
            </label>
            <Input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={tomorrowStr}
            />
          </div>

          {/* Delivery Address (optional) */}
          <div>
            <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-1">
              Delivery Address
            </label>
            <Input
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Optional — override PO delivery site"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-[var(--color-text-primary)] block mb-1">
              Notes
            </label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowCreate(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-brand-gold text-[var(--color-text-on-gold)] hover:bg-gold-400"
              onClick={handleCreate}
              disabled={isCreating || !selectedPO || !selectedDriver || !selectedTruck || !scheduledDate}
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {isCreating ? "Creating..." : "Create"}
            </Button>
          </div>
        </div>
      </FormDialog>

      {dispatches.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-6 text-center">
          <Truck className="w-10 h-10 text-[var(--color-text-muted)] mx-auto mb-2" />
          <p className="text-sm text-[var(--color-text-muted)]">
            No dispatches found.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3">
            {dispatches.map((dispatch) => (
              <div
                key={dispatch.id}
                className="rounded-xl border border-[var(--color-border)] bg-surface p-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-[var(--color-text-primary)] font-mono">
                      D-{dispatch.id.slice(0, 8)}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3 h-3 text-[var(--color-text-muted)]" />
                      <p className="text-xs text-[var(--color-text-muted)] font-mono">
                        {formatDate(dispatch.scheduled_date)}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={dispatch.status} />
                </div>

                {/* Details */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-3.5 h-3.5 text-[var(--color-text-muted)] flex-shrink-0" />
                    <span className="text-[var(--color-text-secondary)]">
                      {dispatch.driver?.name ?? "Unassigned"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-3.5 h-3.5 text-[var(--color-text-muted)] flex-shrink-0" />
                    <span className="text-[var(--color-text-secondary)] truncate">
                      {dispatch.pickup_site?.name ?? "Pickup"} &rarr;{" "}
                      {dispatch.delivery_site?.name ?? "Delivery"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Package className="w-3.5 h-3.5 text-[var(--color-text-muted)] flex-shrink-0" />
                    <span className="text-[var(--color-text-secondary)]">
                      {dispatch.material?.name ?? "Material"}
                    </span>
                  </div>

                  {dispatch.truck && (
                    <div className="flex items-center gap-2 text-sm">
                      <Truck className="w-3.5 h-3.5 text-[var(--color-text-muted)] flex-shrink-0" />
                      <span className="text-[var(--color-text-secondary)]">
                        Truck #{dispatch.truck.number}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Load More */}
          {dispatches.length < totalCount && (
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
                  `Load more (${totalCount - dispatches.length} remaining)`
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
