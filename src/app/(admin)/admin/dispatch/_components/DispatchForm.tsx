"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createDispatchSchema,
  type CreateDispatchInput,
} from "@/lib/schemas/dispatch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type {
  PurchaseOrderWithRelations,
  DriverWithCarrier,
  TruckWithCarrier,
  Material,
  Site,
} from "@/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DispatchFormProps {
  purchaseOrders: PurchaseOrderWithRelations[];
  drivers: DriverWithCarrier[];
  trucks: TruckWithCarrier[];
  materials: Material[];
  sites: Site[];
  onSubmit: (data: CreateDispatchInput) => Promise<void>;
  isSubmitting?: boolean;
}

// ---------------------------------------------------------------------------
// DispatchForm
// ---------------------------------------------------------------------------

export function DispatchForm({
  purchaseOrders,
  drivers,
  trucks,
  materials,
  sites,
  onSubmit,
  isSubmitting = false,
}: DispatchFormProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<CreateDispatchInput>({
    resolver: zodResolver(createDispatchSchema) as any,
    defaultValues: {
      purchase_order_id: "",
      carrier_id: "",
      driver_id: "",
      truck_id: "",
      material_id: "",
      pickup_site_id: "",
      delivery_site_id: "",
      delivery_address: "",
      scheduled_date: new Date().toISOString().split("T")[0],
      notes: "",
    },
  });

  const selectedPOId = form.watch("purchase_order_id");
  const selectedDriverId = form.watch("driver_id");
  const [showTruckOverride, setShowTruckOverride] = useState(false);

  // When a PO is selected, auto-populate material and delivery site
  const selectedPO = purchaseOrders.find((po) => po.id === selectedPOId);
  useEffect(() => {
    if (selectedPO) {
      form.setValue("material_id", selectedPO.material_id);
      form.setValue("delivery_site_id", selectedPO.delivery_site_id);
    }
  }, [selectedPO, form]);

  // When a driver is selected, auto-set carrier and truck
  const selectedDriver = drivers.find((d) => d.id === selectedDriverId);
  useEffect(() => {
    if (selectedDriver) {
      form.setValue("carrier_id", selectedDriver.carrier_id);
      // Auto-set truck from driver's default assignment
      if (selectedDriver.truck_id) {
        form.setValue("truck_id", selectedDriver.truck_id);
        setShowTruckOverride(false);
      } else {
        setShowTruckOverride(true);
      }
    }
  }, [selectedDriver, form]);

  // Filter trucks by selected driver's carrier
  const filteredTrucks = selectedDriver
    ? trucks.filter(
        (t) =>
          t.carrier_id === selectedDriver.carrier_id &&
          t.status === "active"
      )
    : trucks.filter((t) => t.status === "active");

  // Find the auto-assigned truck name for display
  const autoTruck = selectedDriver?.truck_id
    ? trucks.find((t) => t.id === selectedDriver.truck_id)
    : null;

  // PO threshold data
  const poPercentage = selectedPO
    ? Math.round(
        (selectedPO.quantity_delivered / selectedPO.quantity_ordered) * 100
      )
    : 0;
  const poRemaining = selectedPO
    ? selectedPO.quantity_ordered - selectedPO.quantity_delivered
    : 0;
  const poOverdelivered = poPercentage >= 100;
  const poNearThreshold = poPercentage >= 80 && poPercentage < 100;

  // Filter pickup sites (quarries and plants)
  const pickupSites = sites.filter(
    (s) => (s.type === "quarry" || s.type === "plant") && s.status === "active"
  );

  const activeDrivers = drivers.filter((d) => d.status === "active");
  const activeMaterials = materials.filter((m) => m.status === "active");
  const activePOs = purchaseOrders.filter((po) => po.status === "active");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Purchase Order */}
        <FormField
          control={form.control}
          name="purchase_order_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Purchase Order</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a PO" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {activePOs.map((po) => {
                    const remaining =
                      po.quantity_ordered - po.quantity_delivered;
                    return (
                      <SelectItem key={po.id} value={po.id}>
                        {po.po_number} — {po.material?.name ?? "Material"} (
                        {remaining} remaining)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedPO && (
                <FormDescription>
                  <span
                    className={cn(
                      "font-mono",
                      poOverdelivered && "text-red-600",
                      poNearThreshold && "text-amber-600"
                    )}
                  >
                    {selectedPO.quantity_delivered}/{selectedPO.quantity_ordered}{" "}
                    delivered ({poPercentage}%)
                    {poRemaining > 0 && ` — ${poRemaining} remaining`}
                  </span>
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* PO Threshold Alerts */}
        {selectedPO && poOverdelivered && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-50 p-3">
            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-600">
                PO is fully consumed
              </p>
              <p className="text-xs text-red-600/80 mt-0.5">
                This PO has reached or exceeded 100% delivery. Creating
                additional dispatches may cause over-delivery and billing
                disputes.
              </p>
            </div>
          </div>
        )}

        {selectedPO && poNearThreshold && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-50 p-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-600">
                PO nearing completion ({poPercentage}%)
              </p>
              <p className="text-xs text-amber-600/80 mt-0.5">
                Only {poRemaining} {selectedPO.unit}(s) remaining on this PO.
              </p>
            </div>
          </div>
        )}

        {/* Driver */}
        <FormField
          control={form.control}
          name="driver_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Driver</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select driver" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {activeDrivers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name} ({d.carrier?.name ?? "No carrier"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Truck — auto-filled from driver's default, with override option */}
        {selectedDriver && autoTruck && !showTruckOverride ? (
          <div className="rounded-lg border border-[var(--color-border)] p-3">
            <p className="text-sm text-[var(--color-text-secondary)]">
              <span className="text-xs text-[var(--color-text-muted)] mr-1">Truck:</span>
              #{autoTruck.number}
              {autoTruck.type ? ` (${autoTruck.type})` : ""}
              {autoTruck.capacity_tons ? ` — ${autoTruck.capacity_tons}T` : ""}
              <button
                type="button"
                onClick={() => setShowTruckOverride(true)}
                className="ml-2 text-xs text-[var(--color-brand-gold)] hover:underline"
              >
                change
              </button>
            </p>
          </div>
        ) : (
          <FormField
            control={form.control}
            name="truck_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Truck</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={!selectedDriverId}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          selectedDriverId
                            ? "Select truck"
                            : "Select a driver first"
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {filteredTrucks.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        #{t.number}
                        {t.type ? ` (${t.type})` : ""}
                        {t.capacity_tons
                          ? ` — ${t.capacity_tons}T`
                          : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Pickup Site */}
        <FormField
          control={form.control}
          name="pickup_site_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pickup Site</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select pickup location" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {pickupSites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                      {s.city ? ` (${s.city})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Auto-filled fields from PO — collapsed when PO is selected */}
        {selectedPO ? (
          <details className="rounded-lg border border-[var(--color-border)] p-3">
            <summary className="cursor-pointer text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]">
              Auto-filled from PO: {selectedPO.material?.name ?? "Material"} → {sites.find((s) => s.id === selectedPO.delivery_site_id)?.name ?? "Delivery Site"}
            </summary>
            <div className="mt-3 space-y-4">
              {/* Material (auto-filled from PO, editable) */}
              <FormField
                control={form.control}
                name="material_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Material</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select material" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeMaterials.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Delivery Site (auto-filled from PO) */}
              <FormField
                control={form.control}
                name="delivery_site_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Site</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select delivery site" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sites
                          .filter((s) => s.status === "active")
                          .map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                              {s.city ? ` (${s.city})` : ""}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </details>
        ) : (
          <>
            {/* Material (manual selection when no PO) */}
            <FormField
              control={form.control}
              name="material_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Material</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select material" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeMaterials.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Delivery Site (manual selection when no PO) */}
            <FormField
              control={form.control}
              name="delivery_site_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Site</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select delivery site" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sites
                        .filter((s) => s.status === "active")
                        .map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                            {s.city ? ` (${s.city})` : ""}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {/* Delivery Address */}
        <FormField
          control={form.control}
          name="delivery_address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Delivery Address</FormLabel>
              <FormControl>
                <Input placeholder="e.g. 10406 Echo Brook" {...field} />
              </FormControl>
              <p className="text-xs text-[var(--color-text-muted)]">
                Specific house or lot address for the delivery
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Scheduled Date */}
        <FormField
          control={form.control}
          name="scheduled_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Scheduled Date</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  className="font-mono"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Additional instructions..."
                  rows={2}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit */}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={isSubmitting || poOverdelivered}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Dispatch
          </Button>
        </div>
      </form>
    </Form>
  );
}
