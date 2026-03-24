import { z } from "zod/v4";

const paymentTermsEnum = z.enum(["net_15", "net_30", "net_45", "net_60"]);
const entityStatusEnum = z.enum(["active", "inactive"]);
const billingCycleEnum = z.enum(["biweekly", "monthly", "as_needed"]);

export const createCustomerSchema = z.object({
  name: z.string().min(2, "Company name is required").max(200),
  billing_address: z.string().max(500).optional(),
  billing_email: z.email("Please enter a valid email").optional(),
  phone: z.string().max(20).optional(),
  payment_terms: paymentTermsEnum.default("net_30"),
  qb_customer_id: z.string().max(50).optional(),
  credit_limit: z.number().min(0).default(0),
  credit_limit_enabled: z.boolean().default(false),
  billing_cycle: billingCycleEnum.default("biweekly"),
  contact_name: z.string().max(200).optional(),
  vendor_number: z.string().max(100).optional(),
  vendor_portal_url: z.string().url("Please enter a valid URL").optional(),
  status: entityStatusEnum.default("active"),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
