"use client";

import { useState, useTransition } from "react";
import { ShoppingCart, Plus, MapPin, Calendar } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { POProgressBar } from "@/components/shared/POProgressBar";
import { FormDialog } from "@/components/admin/FormDialog";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { createOrder, type CreateOrderInput } from "@/app/(customer)/_actions/customer.actions";
import { cn } from "@/lib/utils/cn";
import type { OrderWithRelations, Site, Material } from "@/types/database";

type FilterTab = "all" | "active" | "completed";

interface OrdersClientProps {
  orders: OrderWithRelations[];
  sites: Site[];
  materials: Material[];
}

export function OrdersClient({ orders, sites, materials }: OrdersClientProps) {
  const [filter, setFilter] = useState<FilterTab>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const filteredOrders = orders.filter((order) => {
    if (filter === "active") {
      return ["pending", "approved", "in_progress"].includes(order.status);
    }
    if (filter === "completed") {
      return ["completed", "cancelled"].includes(order.status);
    }
    return true;
  });

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: orders.length },
    {
      key: "active",
      label: "Active",
      count: orders.filter((o) =>
        ["pending", "approved", "in_progress"].includes(o.status)
      ).length,
    },
    {
      key: "completed",
      label: "Completed",
      count: orders.filter((o) =>
        ["completed", "cancelled"].includes(o.status)
      ).length,
    },
  ];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const formData = new FormData(e.currentTarget);
    const input: CreateOrderInput = {
      po_number: formData.get("po_number") as string,
      material_id: formData.get("material_id") as string,
      delivery_site_id: formData.get("delivery_site_id") as string,
      requested_loads: Number(formData.get("requested_loads")),
      scheduled_date: formData.get("scheduled_date") as string,
      notes: (formData.get("notes") as string) || undefined,
    };

    if (!input.po_number.trim()) {
      setFormError("PO number is required");
      return;
    }
    if (!input.material_id) {
      setFormError("Please select a material");
      return;
    }
    if (!input.delivery_site_id) {
      setFormError("Please select a delivery site");
      return;
    }
    if (!input.requested_loads || input.requested_loads < 1) {
      setFormError("At least 1 load is required");
      return;
    }
    if (!input.scheduled_date) {
      setFormError("Please select a scheduled date");
      return;
    }

    startTransition(async () => {
      const result = await createOrder(input);
      if (result.success) {
        setFormOpen(false);
      } else {
        setFormError(result.error);
      }
    });
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="animate-slide-up-fade">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
          Orders
        </h1>
        <button
          onClick={() => {
            setFormError(null);
            setFormOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-semibold text-[var(--color-text-on-gold)] hover:bg-gold-400 transition-colors touch-target"
        >
          <Plus className="w-4 h-4" />
          New Order
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg bg-surface border border-[var(--color-border)]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              "flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              filter === tab.key
                ? "bg-[var(--color-brand-gold)]/15 text-brand-brown"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            )}
          >
            {tab.label}
            <span className="ml-1.5 text-xs opacity-60">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Order list */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-surface p-8 text-center">
          <ShoppingCart className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3" />
          <p className="text-base font-medium text-[var(--color-text-secondary)] mb-1">
            {filter === "all"
              ? "No orders yet"
              : `No ${filter} orders`}
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            {filter === "all"
              ? "Place your first order for mason sand or cushion sand delivery."
              : "Orders matching this filter will appear here."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="rounded-xl border border-[var(--color-border)] bg-surface p-4 hover:border-[var(--color-brand-gold)]/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-bold text-[var(--color-text-primary)] font-mono">
                    PO #{order.purchase_order?.po_number ?? "—"}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <StatusBadge
                      status={order.material?.name ?? "Unknown"}
                      label={order.material?.name}
                    />
                  </div>
                </div>
                <StatusBadge status={order.status} />
              </div>

              <div className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] mb-2">
                <MapPin className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                {order.delivery_site?.name ?? "Unknown site"}
              </div>

              <div className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] mb-3">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(order.scheduled_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>

              {/* Progress */}
              <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] mb-1.5">
                <span>
                  Delivered:{" "}
                  <span className="font-mono font-medium text-[var(--color-text-secondary)]">
                    {order.purchase_order?.quantity_delivered ?? 0}
                  </span>{" "}
                  / {order.requested_loads} loads
                </span>
              </div>
              <POProgressBar
                delivered={order.purchase_order?.quantity_delivered ?? 0}
                ordered={order.requested_loads}
              />
            </div>
          ))}
        </div>
      )}

      {/* New Order Dialog */}
      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title="New Order"
        description="Request a sand delivery to your job site."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {formError}
            </div>
          )}

          {/* PO Number */}
          <div>
            <label
              htmlFor="po_number"
              className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5"
            >
              PO Number *
            </label>
            <input
              id="po_number"
              name="po_number"
              type="text"
              required
              placeholder="e.g. PO-4521"
              className="w-full rounded-lg border border-[var(--color-border)] bg-surface-deep px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-gold)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)] font-mono"
            />
          </div>

          {/* Material */}
          <div>
            <label
              htmlFor="material_id"
              className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5"
            >
              Material *
            </label>
            <select
              id="material_id"
              name="material_id"
              required
              className="w-full rounded-lg border border-[var(--color-border)] bg-surface-deep px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-gold)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)]"
            >
              <option value="">Select material</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Delivery Site */}
          <div>
            <label
              htmlFor="delivery_site_id"
              className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5"
            >
              Delivery Site *
            </label>
            <select
              id="delivery_site_id"
              name="delivery_site_id"
              required
              className="w-full rounded-lg border border-[var(--color-border)] bg-surface-deep px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-gold)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)]"
            >
              <option value="">Select site</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.address ? ` — ${s.address}` : ""}
                </option>
              ))}
            </select>
            {sites.length === 0 && (
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                No sites found. Contact J Fudge Trucking to add your job sites.
              </p>
            )}
          </div>

          {/* Number of Loads */}
          <div>
            <label
              htmlFor="requested_loads"
              className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5"
            >
              Number of Loads *
            </label>
            <input
              id="requested_loads"
              name="requested_loads"
              type="number"
              min={1}
              required
              placeholder="e.g. 10"
              className="w-full rounded-lg border border-[var(--color-border)] bg-surface-deep px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-gold)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)] font-mono"
            />
          </div>

          {/* Scheduled Date */}
          <div>
            <label
              htmlFor="scheduled_date"
              className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5"
            >
              Scheduled Date *
            </label>
            <input
              id="scheduled_date"
              name="scheduled_date"
              type="date"
              min={today}
              required
              className="w-full rounded-lg border border-[var(--color-border)] bg-surface-deep px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand-gold)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)] font-mono"
            />
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5"
            >
              Notes (optional)
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Any special instructions..."
              className="w-full rounded-lg border border-[var(--color-border)] bg-surface-deep px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand-gold)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-gold)] resize-none"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="flex-1 rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-surface-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-semibold text-[var(--color-text-on-gold)] hover:bg-gold-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <LoadingSpinner size="sm" />
                  Creating...
                </>
              ) : (
                "Create Order"
              )}
            </button>
          </div>
        </form>
      </FormDialog>
    </div>
  );
}
