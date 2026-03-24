import { z } from "zod/v4";

const truckStatusEnum = z.enum(["active", "maintenance", "inactive"]);

export const createTruckSchema = z.object({
  carrier_id: z.uuid("Carrier is required"),
  number: z.string().min(1, "Truck number is required").max(50),
  license_plate: z.string().max(20).optional(),
  type: z.string().max(50).optional(),
  capacity_tons: z.number().positive("Capacity must be positive").optional(),
  vin: z.string().max(17).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  make: z.string().max(50).optional(),
  model: z.string().max(50).optional(),
  insurance_policy: z.string().max(100).optional(),
  insurance_expiry: z.string().date().optional(),
  status: truckStatusEnum.default("active"),
});

export const updateTruckSchema = createTruckSchema.partial().omit({ carrier_id: true });

export type CreateTruckInput = z.infer<typeof createTruckSchema>;
export type UpdateTruckInput = z.infer<typeof updateTruckSchema>;
