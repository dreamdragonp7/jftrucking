import { z } from "zod/v4";

export const materialTypeSchema = z.enum(["mason_sand", "cushion_sand", "other"]);

export const deliveryConfirmationSchema = z.object({
  deliveryId: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  photoUrl: z.url("Photo URL is required"),
  notes: z.string().max(500).optional(),
  tonnageDelivered: z.number().positive("Tonnage must be positive"),
  signatureDataUrl: z.string().optional(),
});

export const createOrderSchema = z.object({
  customerId: z.string().uuid(),
  siteId: z.string().uuid(),
  materialType: materialTypeSchema,
  tonnageRequested: z.number().positive("Tonnage must be positive"),
  requestedDate: z.string().date(),
  notes: z.string().max(1000).optional(),
  poNumber: z.string().max(50).optional(),
});

export type MaterialType = z.infer<typeof materialTypeSchema>;
export type DeliveryConfirmationInput = z.infer<typeof deliveryConfirmationSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
