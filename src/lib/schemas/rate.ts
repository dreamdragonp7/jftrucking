import { z } from "zod/v4";

const rateEntityTypeEnum = z.enum(["customer", "carrier"]);
const rateTypeEnum = z.enum(["per_ton", "per_load"]);

export const createRateSchema = z
  .object({
    type: rateEntityTypeEnum,
    customer_id: z.uuid().optional(),
    carrier_id: z.uuid().optional(),
    material_id: z.uuid("Material is required"),
    pickup_site_id: z.uuid().optional(),
    delivery_site_id: z.uuid().optional(),
    delivery_city: z.string().max(100).optional(),
    rate_per_unit: z.number().positive("Rate must be positive"),
    rate_type: rateTypeEnum.default("per_ton"),
    effective_date: z.string().date("Valid effective date required"),
    expiration_date: z.string().date().optional(),
    notes: z.string().max(1000).optional(),
  })
  .refine(
    (data) => {
      if (data.type === "customer") return !!data.customer_id;
      if (data.type === "carrier") return !!data.carrier_id;
      return false;
    },
    {
      message: "Customer rate requires customer_id, carrier rate requires carrier_id",
    }
  );

export const updateRateSchema = z.object({
  rate_per_unit: z.number().positive("Rate must be positive").optional(),
  rate_type: rateTypeEnum.optional(),
  effective_date: z.string().date().optional(),
  expiration_date: z.string().date().optional(),
  pickup_site_id: z.uuid().optional(),
  delivery_site_id: z.uuid().optional(),
  delivery_city: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
});

export type CreateRateInput = z.infer<typeof createRateSchema>;
export type UpdateRateInput = z.infer<typeof updateRateSchema>;
