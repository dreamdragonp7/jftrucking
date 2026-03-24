"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createSiteSchema, type CreateSiteInput } from "@/lib/schemas/site";
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
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import type { Site, Customer } from "@/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SiteFormProps {
  initialData?: Site | null;
  customers: Pick<Customer, "id" | "name">[];
  onSubmit: (data: CreateSiteInput) => Promise<void>;
  isSubmitting?: boolean;
}

// ---------------------------------------------------------------------------
// SiteForm — Reused for both create and edit
// ---------------------------------------------------------------------------

export function SiteForm({
  initialData,
  customers,
  onSubmit,
  isSubmitting = false,
}: SiteFormProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<CreateSiteInput>({
    resolver: zodResolver(createSiteSchema) as any,
    defaultValues: {
      name: initialData?.name ?? "",
      type: initialData?.type ?? "jobsite",
      subdivision_name: initialData?.subdivision_name ?? "",
      project_number: initialData?.project_number ?? "",
      address: initialData?.address ?? "",
      city: initialData?.city ?? "",
      state: initialData?.state ?? "TX",
      zip: initialData?.zip ?? "",
      latitude: initialData?.latitude ?? undefined,
      longitude: initialData?.longitude ?? undefined,
      contact_name: initialData?.contact_name ?? "",
      contact_phone: initialData?.contact_phone ?? "",
      gate_code: initialData?.gate_code ?? "",
      operating_hours: initialData?.operating_hours ?? "",
      special_instructions: initialData?.special_instructions ?? "",
      customer_id: initialData?.customer_id ?? undefined,
      geofence_radius_meters: initialData?.geofence_radius_meters ?? 500,
      status: initialData?.status ?? "active",
    },
  });

  const siteType = form.watch("type");
  const status = form.watch("status");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Site Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Martin Marietta - Georgetown" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Type */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="quarry">Quarry</SelectItem>
                  <SelectItem value="plant">Plant</SelectItem>
                  <SelectItem value="jobsite">Job Site</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Subdivision & Project Number — important for DR Horton jobs */}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="subdivision_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subdivision Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Union Park 70s" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="project_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Number</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. 25378" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Address fields */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Input placeholder="Street address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input placeholder="City" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State</FormLabel>
                  <FormControl>
                    <Input placeholder="TX" maxLength={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="zip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ZIP</FormLabel>
                  <FormControl>
                    <Input placeholder="78626" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Contact */}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="contact_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Smith" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contact_phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Phone</FormLabel>
                <FormControl>
                  <Input placeholder="(512) 555-0100" {...field} />
                </FormControl>
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
            {/* Coordinates */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="30.6328"
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
                name="longitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="-97.6773"
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

            {/* Geofence Radius */}
            <FormField
              control={form.control}
              name="geofence_radius_meters"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Geofence Radius (meters)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      className="font-mono"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Operational details */}
            <FormField
              control={form.control}
              name="gate_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gate Code</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="operating_hours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Operating Hours</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Mon-Fri 6AM-6PM" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="special_instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Instructions</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any special notes for drivers..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Customer (for jobsite — moved to advanced since it's contextual) */}
            {siteType === "jobsite" && (
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
                      Inactive sites won&apos;t appear in dispatch
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
          </div>
        </details>

        {/* Submit */}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Update Site" : "Create Site"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
