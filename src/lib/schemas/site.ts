import { z } from "zod/v4";

const siteTypeEnum = z.enum(["quarry", "plant", "jobsite"]);
const entityStatusEnum = z.enum(["active", "inactive"]);

export const createSiteSchema = z.object({
  name: z.string().min(2, "Site name is required").max(200),
  type: siteTypeEnum,
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(2).default("TX"),
  zip: z
    .string()
    .max(10)
    .regex(/^(\d{5}(-\d{4})?)?$/, "Invalid ZIP code")
    .optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  contact_name: z.string().max(100).optional(),
  contact_phone: z.string().max(20).optional(),
  gate_code: z.string().max(50).optional(),
  operating_hours: z.string().max(200).optional(),
  special_instructions: z.string().max(1000).optional(),
  customer_id: z.uuid().optional(),
  subdivision_name: z.string().max(200).optional(),
  project_number: z.string().max(50).optional(),
  geofence_radius_meters: z.number().int().min(50).max(5000).default(500),
  status: entityStatusEnum.default("active"),
});

export const updateSiteSchema = createSiteSchema.partial();

export type CreateSiteInput = z.infer<typeof createSiteSchema>;
export type UpdateSiteInput = z.infer<typeof updateSiteSchema>;
