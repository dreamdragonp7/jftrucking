import { z } from "zod/v4";

const dispatchStatusEnum = z.enum([
  "scheduled",
  "dispatched",
  "acknowledged",
  "in_progress",
  "delivered",
  "confirmed",
  "disputed",
  "cancelled",
]);

export const createDispatchSchema = z.object({
  order_id: z.uuid().optional(),
  carrier_id: z.uuid("Carrier is required"),
  driver_id: z.uuid("Driver is required"),
  truck_id: z.uuid("Truck is required"),
  material_id: z.uuid("Material is required"),
  pickup_site_id: z.uuid("Pickup site is required"),
  delivery_site_id: z.uuid("Delivery site is required"),
  delivery_address: z.string().max(500).optional(),
  purchase_order_id: z.uuid().optional(),
  scheduled_date: z.string().date("Valid date is required"),
  notes: z.string().max(1000).optional(),
});

export const updateDispatchSchema = z.object({
  status: dispatchStatusEnum.optional(),
  driver_id: z.uuid().optional(),
  truck_id: z.uuid().optional(),
  scheduled_date: z.string().date().optional(),
  delivery_address: z.string().max(500).optional(),
  dispatched_at: z.string().datetime().optional(),
  acknowledged_at: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
});

/** Schema for a driver acknowledging a dispatch */
export const acknowledgeDispatchSchema = z.object({
  dispatch_id: z.uuid("Dispatch ID is required"),
});

/** Schema for a driver updating dispatch status */
export const driverUpdateDispatchSchema = z.object({
  dispatch_id: z.uuid("Dispatch ID is required"),
  status: z.enum([
    "acknowledged",
    "in_progress",
  ]),
});

export type CreateDispatchInput = z.infer<typeof createDispatchSchema>;
export type UpdateDispatchInput = z.infer<typeof updateDispatchSchema>;
export type AcknowledgeDispatchInput = z.infer<typeof acknowledgeDispatchSchema>;
export type DriverUpdateDispatchInput = z.infer<typeof driverUpdateDispatchSchema>;
