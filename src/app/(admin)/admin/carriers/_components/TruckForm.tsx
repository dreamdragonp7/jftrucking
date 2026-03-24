"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createTruckSchema, type CreateTruckInput } from "@/lib/schemas/truck";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { Truck } from "@/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TruckFormProps {
  carrierId: string;
  initialData?: Truck | null;
  onSubmit: (data: CreateTruckInput) => Promise<void>;
  isSubmitting?: boolean;
}

// ---------------------------------------------------------------------------
// TruckForm
// ---------------------------------------------------------------------------

export function TruckForm({
  carrierId,
  initialData,
  onSubmit,
  isSubmitting = false,
}: TruckFormProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<CreateTruckInput>({
    resolver: zodResolver(createTruckSchema) as any,
    defaultValues: {
      carrier_id: carrierId,
      number: initialData?.number ?? "",
      license_plate: initialData?.license_plate ?? "",
      type: initialData?.type ?? "",
      capacity_tons: initialData?.capacity_tons ?? undefined,
      vin: initialData?.vin ?? "",
      year: initialData?.year ?? undefined,
      make: initialData?.make ?? "",
      model: initialData?.model ?? "",
      insurance_policy: initialData?.insurance_policy ?? "",
      insurance_expiry: initialData?.insurance_expiry ?? "",
      status: initialData?.status ?? "active",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Truck Number</FormLabel>
              <FormControl>
                <Input placeholder="e.g. T-101" className="font-mono" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Type + Capacity */}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. End Dump" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="capacity_tons"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Capacity (tons)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    className="font-mono"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ── Advanced Options ── */}
        <details className="mt-6 border-t border-[var(--color-border)] pt-4">
          <summary className="cursor-pointer text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]">
            Advanced Options
          </summary>
          <div className="mt-4 space-y-4">
            <FormField
              control={form.control}
              name="license_plate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>License Plate</FormLabel>
                  <FormControl>
                    <Input placeholder="ABC-1234" className="font-mono" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* VIN */}
            <FormField
              control={form.control}
              name="vin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>VIN</FormLabel>
                  <FormControl>
                    <Input placeholder="Vehicle Identification Number" className="font-mono" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Year / Make / Model */}
            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="2024"
                        className="font-mono"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? Number(e.target.value) : undefined
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="make"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Make</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Peterbilt" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 389" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Insurance Policy + Expiry */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="insurance_policy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Insurance Policy #</FormLabel>
                    <FormControl>
                      <Input placeholder="Policy number" className="font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="insurance_expiry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Insurance Expiry</FormLabel>
                    <FormControl>
                      <Input type="date" className="font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </details>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Update Truck" : "Add Truck"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
