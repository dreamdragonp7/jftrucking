import { z } from "zod/v4";

const orderStatusEnum = z.enum(["pending", "approved", "in_progress", "completed", "cancelled"]);

export const createOrderSchema = z.object({
  customer_id: z.uuid("Customer is required"),
  purchase_order_id: z.uuid("Purchase order is required"),
  material_id: z.uuid("Material is required"),
  pickup_site_id: z.uuid("Pickup site is required"),
  delivery_site_id: z.uuid("Delivery site is required"),
  delivery_address: z.string().max(500).optional(),
  requested_loads: z.number().positive("At least 1 load required").max(999),
  scheduled_date: z.string().date("Valid date is required"),
  notes: z.string().max(1000).optional(),
});

export const updateOrderSchema = z.object({
  status: orderStatusEnum.optional(),
  requested_loads: z.number().positive().max(999).optional(),
  scheduled_date: z.string().date().optional(),
  delivery_address: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  pickup_site_id: z.uuid().optional(),
  delivery_site_id: z.uuid().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
