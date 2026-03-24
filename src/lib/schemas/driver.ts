import { z } from "zod/v4";

const entityStatusEnum = z.enum(["active", "inactive"]);

export const createDriverSchema = z.object({
  carrier_id: z.uuid("Carrier is required"),
  profile_id: z.uuid().optional(),
  name: z.string().min(2, "Driver name is required").max(100),
  phone: z.string().max(20).optional(),
  email: z.email("Please enter a valid email").optional(),
  license_number: z.string().max(50).optional(),
  license_expiry: z.string().date().optional(),
  truck_id: z.uuid().optional(),
  status: entityStatusEnum.default("active"),
});

export const updateDriverSchema = createDriverSchema.partial().omit({ carrier_id: true });

export type CreateDriverInput = z.infer<typeof createDriverSchema>;
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>;
