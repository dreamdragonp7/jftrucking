import { z } from "zod/v4";

const invoiceStatusEnum = z.enum([
  "draft",
  "sent",
  "viewed",
  "paid",
  "overdue",
  "cancelled",
  "partially_paid",
]);

export const createInvoiceSchema = z.object({
  customer_id: z.uuid("Customer is required"),
  invoice_number: z.string().min(1, "Invoice number is required").max(50),
  period_start: z.string().date("Valid start date required"),
  period_end: z.string().date("Valid end date required"),
  due_date: z.string().date("Valid due date required"),
  tax_amount: z.number().min(0, "Tax amount must be non-negative").default(0),
  notes: z.string().max(1000).optional(),
});

export const updateInvoiceSchema = z.object({
  status: invoiceStatusEnum.optional(),
  due_date: z.string().date().optional(),
  tax_amount: z.number().min(0).optional(),
  sent_at: z.string().datetime().optional(),
  paid_at: z.string().datetime().optional(),
  qb_invoice_id: z.string().max(50).optional(),
  qb_payment_link: z.string().url().optional(),
  pdf_url: z.string().url().optional(),
  notes: z.string().max(1000).optional(),
});

export const createLineItemSchema = z.object({
  invoice_id: z.uuid("Invoice is required"),
  delivery_id: z.uuid().optional(),
  purchase_order_id: z.uuid().optional(),
  description: z.string().min(1, "Description is required").max(500),
  quantity: z.number().positive("Quantity must be positive"),
  unit: z.string().max(20).optional(),
  rate: z.number().min(0, "Rate must be non-negative"),
  amount: z.number().min(0, "Amount must be non-negative"),
  material_id: z.uuid().optional(),
  cost_code: z.string().max(50).optional(),
  delivery_date: z.string().date().optional(),
  delivery_address: z.string().max(500).optional(),
});

export const generateInvoiceSchema = z.object({
  customer_id: z.uuid("Customer is required"),
  period_start: z.string().date("Valid start date required"),
  period_end: z.string().date("Valid end date required"),
  include_delivery_ids: z.array(z.uuid()).optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type CreateLineItemInput = z.infer<typeof createLineItemSchema>;
export type GenerateInvoiceInput = z.infer<typeof generateInvoiceSchema>;
