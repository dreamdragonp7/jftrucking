"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createPurchaseOrderSchema,
  type CreatePurchaseOrderInput,
} from "@/lib/schemas/purchase-order";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
import { Loader2 } from "lucide-react";
import type { Customer, Material, Site, PurchaseOrderWithRelations } from "@/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PurchaseOrderFormProps {
  initialData?: PurchaseOrderWithRelations | null;
  customers: Customer[];
  materials: Material[];
  sites: Site[];
  existingPOs?: PurchaseOrderWithRelations[];
  onSubmit: (data: CreatePurchaseOrderInput) => Promise<void>;
  isSubmitting?: boolean;
}

// ---------------------------------------------------------------------------
// PurchaseOrderForm
// ---------------------------------------------------------------------------

export function PurchaseOrderForm({
  initialData,
  customers,
  materials,
  sites,
  existingPOs = [],
  onSubmit,
  isSubmitting = false,
}: PurchaseOrderFormProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<CreatePurchaseOrderInput>({
    resolver: zodResolver(createPurchaseOrderSchema) as any,
    defaultValues: {
      customer_id: initialData?.customer_id ?? "",
      po_number: initialData?.po_number ?? "",
      material_id: initialData?.material_id ?? "",
      delivery_site_id: initialData?.delivery_site_id ?? "",
      quantity_ordered: initialData?.quantity_ordered ?? 0,
      unit: initialData?.unit ?? "ton",
      po_type: initialData?.po_type ?? "corporate",
      parent_po_id: initialData?.parent_po_id ?? undefined,
      cost_code: initialData?.cost_code ?? "",
      notes: initialData?.notes ?? "",
    },
  });

  const selectedCustomerId = form.watch("customer_id");
  const selectedMaterialId = form.watch("material_id");
  const selectedPoType = form.watch("po_type");

  // Filter sites to show only jobsites belonging to selected customer
  const filteredSites = sites.filter(
    (s) =>
      s.type === "jobsite" &&
      s.status === "active" &&
      (!selectedCustomerId || s.customer_id === selectedCustomerId)
  );

  // Auto-set unit from selected material
  useEffect(() => {
    if (selectedMaterialId) {
      const material = materials.find((m) => m.id === selectedMaterialId);
      if (material) {
        form.setValue("unit", material.unit_of_measure);
      }
    }
  }, [selectedMaterialId, materials, form]);

  // Reset delivery site when customer changes
  useEffect(() => {
    if (selectedCustomerId && !initialData) {
      form.setValue("delivery_site_id", "");
    }
  }, [selectedCustomerId, form, initialData]);

  const activeCustomers = customers.filter((c) => c.status === "active");
  const activeMaterials = materials.filter((m) => m.status === "active");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Customer */}
        <FormField
          control={form.control}
          name="customer_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {activeCustomers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* PO Number */}
        <FormField
          control={form.control}
          name="po_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>PO Number</FormLabel>
              <FormControl>
                <Input placeholder="e.g. PO-4521" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* PO Type + Cost Code */}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="po_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PO Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="corporate">Corporate</SelectItem>
                    <SelectItem value="field_direction">Field Direction</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cost_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cost Code</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. 40023.06" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Parent PO — shown only for Field Direction POs */}
        {selectedPoType === "field_direction" && existingPOs.length > 0 && (
          <FormField
            control={form.control}
            name="parent_po_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Parent PO (Corporate)</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value ?? undefined}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Link to a corporate PO" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {existingPOs
                      .filter((po) => po.po_type === "corporate" && po.status === "active")
                      .map((po) => (
                        <SelectItem key={po.id} value={po.id}>
                          {po.po_number} — {po.customer?.name ?? "Customer"}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Link this field direction PO to the parent corporate PO
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Material */}
        <FormField
          control={form.control}
          name="material_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Material</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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

        {/* Delivery Site (filtered by customer) */}
        <FormField
          control={form.control}
          name="delivery_site_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Delivery Site</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={!selectedCustomerId}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        selectedCustomerId
                          ? "Select delivery site"
                          : "Select a customer first"
                      }
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {filteredSites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                      {s.city ? ` (${s.city})` : ""}
                    </SelectItem>
                  ))}
                  {filteredSites.length === 0 && selectedCustomerId && (
                    <SelectItem value="__none" disabled>
                      No sites for this customer
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Quantity + Unit row */}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="quantity_ordered"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity Ordered</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0.5}
                    step={0.5}
                    placeholder="e.g. 50"
                    className="font-mono"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ton">Tons</SelectItem>
                    <SelectItem value="load">Loads</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Additional details..."
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit */}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Update PO" : "Create PO"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
