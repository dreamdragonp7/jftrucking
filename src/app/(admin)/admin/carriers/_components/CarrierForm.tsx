"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCarrierSchema } from "@/lib/schemas/carrier";
import type { CreateCarrierInput } from "@/lib/schemas/carrier";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { Carrier } from "@/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CarrierFormProps {
  initialData?: Carrier | null;
  onSubmit: (data: CreateCarrierInput) => Promise<void>;
  isSubmitting?: boolean;
}

// ---------------------------------------------------------------------------
// CarrierForm
// ---------------------------------------------------------------------------

export function CarrierForm({
  initialData,
  onSubmit,
  isSubmitting = false,
}: CarrierFormProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<CreateCarrierInput>({
    resolver: zodResolver(createCarrierSchema) as any,
    defaultValues: {
      name: initialData?.name ?? "",
      dba: initialData?.dba ?? "",
      contact_name: initialData?.contact_name ?? "",
      phone: initialData?.phone ?? "",
      email: initialData?.email ?? "",
      address: initialData?.address ?? "",
      dispatch_fee_weekly: initialData?.dispatch_fee_weekly ?? 0,
      ein: initialData?.ein ?? "",
      mc_number: initialData?.mc_number ?? "",
      dot_number: initialData?.dot_number ?? "",
      insurance_expiry: initialData?.insurance_expiry ?? "",
      payment_terms: initialData?.payment_terms ?? "net_14",
      is_1099_tracked: initialData?.is_1099_tracked ?? true,
      status: initialData?.status ?? "active",
    },
  });

  const status = form.watch("status");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Company Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. CD Hopkins Trucking" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Contact Name */}
        <FormField
          control={form.control}
          name="contact_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Name</FormLabel>
              <FormControl>
                <Input placeholder="Primary contact" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Phone + Email */}
        <div className="grid grid-cols-2 gap-3">
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
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="dispatch@carrier.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Dispatch Fee + Payment Terms */}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="dispatch_fee_weekly"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dispatch Fee ($/week)</FormLabel>
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
            name="payment_terms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Terms</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select payment terms" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="net_7">Net 7</SelectItem>
                    <SelectItem value="net_14">Net 14</SelectItem>
                    <SelectItem value="net_30">Net 30</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Status */}
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border border-[var(--color-border)] p-3">
              <div>
                <FormLabel className="text-sm font-medium">Active</FormLabel>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Inactive carriers won&apos;t receive dispatches
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
            {/* DBA */}
            <FormField
              control={form.control}
              name="dba"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>DBA (Doing Business As)</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional trade name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Full address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* MC Number + DOT Number */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="mc_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MC Number</FormLabel>
                    <FormControl>
                      <Input placeholder="MC-123456" className="font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dot_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>DOT Number</FormLabel>
                    <FormControl>
                      <Input placeholder="1234567" className="font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* EIN */}
            <FormField
              control={form.control}
              name="ein"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>EIN (for 1099)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="XX-XXXXXXX"
                      className="font-mono"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Insurance Expiry */}
            <FormField
              control={form.control}
              name="insurance_expiry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Insurance Expiry</FormLabel>
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

            {/* 1099 Tracked */}
            <FormField
              control={form.control}
              name="is_1099_tracked"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] p-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="flex-1">
                    <FormLabel className="text-sm font-medium">1099 Tracked</FormLabel>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Track payments for 1099-NEC filing
                    </p>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </details>

        {/* Submit */}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Update Carrier" : "Create Carrier"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
