"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createDriverSchema,
  type CreateDriverInput,
} from "@/lib/schemas/driver";
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
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Driver, Truck } from "@/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DriverFormProps {
  carrierId: string;
  initialData?: Driver | null;
  trucks?: Truck[];
  onSubmit: (data: CreateDriverInput) => Promise<void>;
  isSubmitting?: boolean;
}

// ---------------------------------------------------------------------------
// DriverForm
// ---------------------------------------------------------------------------

export function DriverForm({
  carrierId,
  initialData,
  trucks = [],
  onSubmit,
  isSubmitting = false,
}: DriverFormProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<CreateDriverInput>({
    resolver: zodResolver(createDriverSchema) as any,
    defaultValues: {
      carrier_id: carrierId,
      name: initialData?.name ?? "",
      phone: initialData?.phone ?? "",
      email: initialData?.email ?? "",
      license_number: initialData?.license_number ?? "",
      license_expiry: initialData?.license_expiry ?? "",
      truck_id: initialData?.truck_id ?? undefined,
      status: initialData?.status ?? "active",
    },
  });

  const status = form.watch("status");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Driver Name</FormLabel>
              <FormControl>
                <Input placeholder="Full name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Phone */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input placeholder="(512) 555-0100" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Truck Assignment */}
        {trucks.length > 0 && (
          <FormField
            control={form.control}
            name="truck_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assigned Truck</FormLabel>
                <Select
                  onValueChange={(val) => field.onChange(val === "__none__" ? undefined : val)}
                  defaultValue={field.value ?? "__none__"}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a truck" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">No truck assigned</SelectItem>
                    {trucks.map((truck) => (
                      <SelectItem key={truck.id} value={truck.id}>
                        #{truck.number}{truck.make ? ` - ${truck.year ?? ""} ${truck.make} ${truck.model ?? ""}`.trim() : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border border-[var(--color-border)] p-3">
              <div>
                <FormLabel className="text-sm font-medium">Active</FormLabel>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Inactive drivers can&apos;t be dispatched
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={status === "active"}
                  onCheckedChange={(checked) =>
                    field.onChange(checked ? "active" : "inactive")
                  }
                />
              </FormControl>
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="driver@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="license_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>License Number</FormLabel>
                    <FormControl>
                      <Input placeholder="CDL number" className="font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="license_expiry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>License Expiry</FormLabel>
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
            {initialData ? "Update Driver" : "Add Driver"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
