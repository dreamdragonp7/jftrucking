import { z } from "zod/v4";

const purchaseOrderStatusEnum = z.enum(["active", "fulfilled", "cancelled", "on_hold"]);
const unitOfMeasureEnum = z.enum(["ton", "load"]);
const poTypeEnum = z.enum(["corporate", "field_direction"]);

export const createPurchaseOrderSchema = z.object({
  customer_id: z.uuid("Customer is required"),
  po_number: z.string().min(1, "PO number is required").max(50),
  material_id: z.uuid("Material is required"),
  delivery_site_id: z.uuid("Delivery site is required"),
  quantity_ordered: z.number().positive("Quantity must be positive"),
  unit: unitOfMeasureEnum.default("ton"),
  cost_code: z.string().max(50).optional(),
  po_type: poTypeEnum.default("corporate"),
  parent_po_id: z.uuid().optional(),
  notes: z.string().max(1000).optional(),
});

export const updatePurchaseOrderSchema = z.object({
  po_number: z.string().min(1).max(50).optional(),
  material_id: z.uuid().optional(),
  delivery_site_id: z.uuid().optional(),
  quantity_ordered: z.number().positive().optional(),
  unit: unitOfMeasureEnum.optional(),
  status: purchaseOrderStatusEnum.optional(),
  cost_code: z.string().max(50).optional(),
  po_type: poTypeEnum.optional(),
  parent_po_id: z.uuid().optional(),
  notes: z.string().max(1000).optional(),
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderSchema>;
