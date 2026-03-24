import { z } from "zod/v4";

const entityStatusEnum = z.enum(["active", "inactive"]);
const carrierPaymentTermsEnum = z.enum(["net_7", "net_14", "net_30"]);

export const createCarrierSchema = z.object({
  name: z.string().min(2, "Carrier name is required").max(200),
  dba: z.string().max(200).optional(),
  contact_name: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  email: z.email("Please enter a valid email").optional(),
  address: z.string().max(500).optional(),
  dispatch_fee_weekly: z.number().min(0, "Dispatch fee must be non-negative").default(0),
  ein: z
    .string()
    .max(20)
    .regex(/^(\d{2}-?\d{7})?$/, "EIN must be in format XX-XXXXXXX")
    .optional(),
  mc_number: z.string().max(20).optional(),
  dot_number: z.string().max(20).optional(),
  qb_vendor_id: z.string().max(50).optional(),
  insurance_expiry: z.string().date().optional(),
  w9_url: z.string().url().optional(),
  payment_terms: carrierPaymentTermsEnum.default("net_14"),
  is_1099_tracked: z.boolean().default(true),
  status: entityStatusEnum.default("active"),
});

export const updateCarrierSchema = createCarrierSchema.partial();

export type CreateCarrierInput = z.infer<typeof createCarrierSchema>;
export type UpdateCarrierInput = z.infer<typeof updateCarrierSchema>;
