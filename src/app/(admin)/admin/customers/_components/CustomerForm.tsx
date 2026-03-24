"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createCustomerSchema,
  type CreateCustomerInput,
} from "@/lib/schemas/customer";
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
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import type { Customer } from "@/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CustomerFormProps {
  initialData?: Customer | null;
  onSubmit: (data: CreateCustomerInput) => Promise<void>;
  isSubmitting?: boolean;
}

// ---------------------------------------------------------------------------
// CustomerForm
// ---------------------------------------------------------------------------

export function CustomerForm({
  initialData,
  onSubmit,
  isSubmitting = false,
}: CustomerFormProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<CreateCustomerInput>({
    resolver: zodResolver(createCustomerSchema) as any,
    defaultValues: {
      name: initialData?.name ?? "",
      billing_address: initialData?.billing_address ?? "",
      billing_email: initialData?.billing_email ?? "",
      phone: initialData?.phone ?? "",
      payment_terms: initialData?.payment_terms ?? "net_30",
      credit_limit: initialData?.credit_limit ?? 0,
      credit_limit_enabled: initialData?.credit_limit_enabled ?? false,
      billing_cycle: initialData?.billing_cycle ?? "biweekly",
      contact_name: initialData?.contact_name ?? "",
      vendor_number: initialData?.vendor_number ?? "",
      vendor_portal_url: initialData?.vendor_portal_url ?? "",
      status: initialData?.status ?? "active",
    },
  });

  const status = form.watch("status");
  const creditLimitEnabled = form.watch("credit_limit_enabled");

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
                <Input placeholder="e.g. Horton Construction" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Billing Email */}
        <FormField
          control={form.control}
          name="billing_email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Billing Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="billing@example.com"
                  {...field}
                />
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

        {/* Billing Address */}
        <FormField
          control={form.control}
          name="billing_address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Billing Address</FormLabel>
              <FormControl>
                <Input placeholder="123 Main St, Austin, TX 78701" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Payment Terms */}
        <FormField
          control={form.control}
          name="payment_terms"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Terms</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select terms" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="net_15">Net 15</SelectItem>
                  <SelectItem value="net_30">Net 30</SelectItem>
                  <SelectItem value="net_45">Net 45</SelectItem>
                  <SelectItem value="net_60">Net 60</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Billing Cycle */}
        <FormField
          control={form.control}
          name="billing_cycle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Billing Cycle</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select billing cycle" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="biweekly">Biweekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="as_needed">As-Needed</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Billing Contact */}
        <FormField
          control={form.control}
          name="contact_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Billing Contact</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Cindy Corcoran" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Vendor Number & Portal */}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="vendor_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vendor Number</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. (DFWE)-1173061" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="vendor_portal_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vendor Portal URL</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. cplogin.drhorton.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Credit Limit Toggle */}
        <FormField
          control={form.control}
          name="credit_limit_enabled"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border border-[var(--color-border)] p-3">
              <div>
                <FormLabel className="text-sm font-medium">Credit Limit</FormLabel>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Enable to set a maximum outstanding balance
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Credit Limit Amount */}
        {creditLimitEnabled && (
          <FormField
            control={form.control}
            name="credit_limit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Credit Limit Amount ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="10000"
                    value={field.value}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Admin will see a warning when outstanding balance reaches this amount
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Status */}
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border border-[var(--color-border)] p-3">
              <div>
                <FormLabel className="text-sm font-medium">Active</FormLabel>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Inactive customers cannot place orders
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

        {/* Submit */}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Update Customer" : "Create Customer"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
