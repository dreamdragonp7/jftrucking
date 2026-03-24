"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createRateSchema, type CreateRateInput } from "@/lib/schemas/rate";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { Rate, Customer, Carrier, Material, Site } from "@/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RateFormProps {
  initialData?: Rate | null;
  customers: Pick<Customer, "id" | "name">[];
  carriers: Pick<Carrier, "id" | "name">[];
  materials: Pick<Material, "id" | "name">[];
  sites: Pick<Site, "id" | "name">[];
  onSubmit: (data: CreateRateInput) => Promise<void>;
  isSubmitting?: boolean;
}

// ---------------------------------------------------------------------------
// RateForm
// ---------------------------------------------------------------------------

export function RateForm({
  initialData,
  customers,
  carriers,
  materials,
  sites,
  onSubmit,
  isSubmitting = false,
}: RateFormProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<CreateRateInput>({
    resolver: zodResolver(createRateSchema) as any,
    defaultValues: {
      type: initialData?.type ?? "customer",
      customer_id: initialData?.customer_id ?? undefined,
      carrier_id: initialData?.carrier_id ?? undefined,
      material_id: initialData?.material_id ?? "",
      delivery_city: initialData?.delivery_city ?? "",
      rate_per_unit: initialData?.rate_per_unit ?? 0,
      rate_type: initialData?.rate_type ?? "per_ton",
      pickup_site_id: initialData?.pickup_site_id ?? undefined,
      delivery_site_id: initialData?.delivery_site_id ?? undefined,
      effective_date:
        initialData?.effective_date ??
        new Date().toISOString().split("T")[0],
      expiration_date: initialData?.expiration_date ?? undefined,
      notes: initialData?.notes ?? "",
    },
  });

  const rateType = form.watch("type");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Rate Entity Type */}
        {!initialData && (
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rate For</FormLabel>
                <Select
                  onValueChange={(val) => {
                    field.onChange(val);
                    // Clear the other entity ID
                    if (val === "customer") form.setValue("carrier_id", undefined);
                    else form.setValue("customer_id", undefined);
                  }}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="customer">Customer Rate</SelectItem>
                    <SelectItem value="carrier">Carrier Rate</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Customer / Carrier select */}
        {rateType === "customer" ? (
          <FormField
            control={form.control}
            name="customer_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value ?? undefined}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {customers.map((c) => (
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
        ) : (
          <FormField
            control={form.control}
            name="carrier_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Carrier</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value ?? undefined}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select carrier" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {carriers.map((c) => (
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
        )}

        {/* Material */}
        <FormField
          control={form.control}
          name="material_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Material</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select material" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {materials.map((m) => (
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

        {/* Delivery City */}
        <FormField
          control={form.control}
          name="delivery_city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Delivery City</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Kaufman, Forney, Mesquite" {...field} />
              </FormControl>
              <p className="text-xs text-[var(--color-text-muted)]">
                Leave blank for a default rate, or specify a city for city-specific pricing (e.g., Kaufman rates vary by city)
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Rate + Rate Type */}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="rate_per_unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rate</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] font-mono text-sm">
                      $
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="pl-7 font-mono"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="rate_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rate Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="per_ton">Per Ton</SelectItem>
                    <SelectItem value="per_load">Per Load</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* ── Advanced Options ── */}
        <details className="mt-6 border-t border-[var(--color-border)] pt-4">
          <summary className="cursor-pointer text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]">
            Advanced Options
          </summary>
          <div className="mt-4 space-y-4">
            {/* Sites */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="pickup_site_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pickup Site</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value ?? undefined}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sites.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="delivery_site_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Site</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value ?? undefined}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sites.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="effective_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Effective Date</FormLabel>
                    <FormControl>
                      <Input type="date" className="font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expiration_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiration Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="font-mono"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
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
                    <Textarea placeholder="Optional notes..." rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </details>

        {/* Submit */}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Update Rate" : "Create Rate"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
