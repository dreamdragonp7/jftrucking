import { z } from "zod/v4";

const confirmationStatusEnum = z.enum([
  "pending",
  "confirmed",
  "disputed",
  "auto_confirmed",
  "admin_override",
]);

/**
 * Schema for a driver submitting a delivery (proof of delivery).
 * GPS is optional — drivers just see the address and can open it in Maps.
 * Ticket photo is optional backup evidence for disputes.
 * The digital entry (ticket number + weight) is the PRIMARY data.
 */
export const createDeliverySchema = z.object({
  dispatch_id: z.uuid("Dispatch is required"),
  driver_id: z.uuid("Driver is required"),
  truck_id: z.uuid("Truck is required"),
  material_id: z.uuid("Material is required"),
  delivery_site_id: z.uuid("Delivery site is required"),
  delivery_address: z.string().max(500).optional(),
  ticket_number: z.string().max(50).optional(),
  ticket_photo_url: z.string().url("Valid photo URL required").optional(),
  gross_weight: z.number().positive("Gross weight must be positive").optional(),
  tare_weight: z.number().positive("Tare weight must be positive").optional(),
  net_weight: z.number().positive("Net weight must be positive").optional(),
  gps_latitude: z.number().min(-90).max(90).optional(),
  gps_longitude: z.number().min(-180).max(180).optional(),
  gps_accuracy_meters: z.number().min(0).optional(),
  geofence_verified: z.boolean().default(false),
  delivered_at: z.string().datetime().optional(),
  synced_offline: z.boolean().default(false),
  notes: z.string().max(1000).optional(),
});

/**
 * Schema for customer confirming a delivery.
 */
export const confirmDeliverySchema = z.object({
  delivery_id: z.uuid("Delivery ID is required"),
  confirmation_status: z.enum(["confirmed", "disputed"]),
  dispute_reason: z.string().max(1000).optional(),
});

/**
 * Schema for admin overriding a delivery dispute.
 */
export const resolveDisputeSchema = z.object({
  delivery_id: z.uuid("Delivery ID is required"),
  confirmation_status: z.enum(["confirmed", "disputed"]),
  dispute_resolution: z.string().min(1, "Resolution reason is required").max(1000),
});

/**
 * Schema for updating delivery details (admin).
 */
export const updateDeliverySchema = z.object({
  ticket_number: z.string().max(50).optional(),
  ticket_photo_url: z.string().url().optional(),
  gross_weight: z.number().positive().optional(),
  tare_weight: z.number().positive().optional(),
  net_weight: z.number().positive().optional(),
  confirmation_status: confirmationStatusEnum.optional(),
  dispute_reason: z.string().max(1000).optional(),
  dispute_resolution: z.string().max(1000).optional(),
});

export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>;
export type ConfirmDeliveryInput = z.infer<typeof confirmDeliverySchema>;
export type ResolveDisputeInput = z.infer<typeof resolveDisputeSchema>;
export type UpdateDeliveryInput = z.infer<typeof updateDeliverySchema>;
