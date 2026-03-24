/**
 * Supabase Database Types for JFT Transportation Management System
 *
 * These types mirror the SQL schema in supabase/migrations/001_initial_schema.sql.
 * When the schema is deployed, you can regenerate these with:
 *   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
 *
 * For now, these are manually maintained to match the migration.
 *
 */

// ============================================================================
// ENUM TYPES
// ============================================================================

export type UserRole = "admin" | "driver" | "customer" | "carrier";
export type ProfileStatus = "active" | "inactive" | "pending" | "suspended" | "deactivated" | "rejected";
export type PaymentTerms = "net_15" | "net_30" | "net_45" | "net_60";
export type SiteType = "quarry" | "plant" | "jobsite";
export type UnitOfMeasure = "ton" | "load";
export type PurchaseOrderStatus = "active" | "fulfilled" | "cancelled" | "on_hold";
export type RateEntityType = "customer" | "carrier";
export type RateType = "per_ton" | "per_load";
export type OrderStatus = "pending" | "approved" | "in_progress" | "completed" | "cancelled";
export type DispatchStatus =
  | "scheduled"
  | "dispatched"
  | "acknowledged"
  | "in_progress"
  | "delivered"
  | "confirmed"
  | "disputed"
  | "cancelled";
export type ConfirmationStatus = "pending" | "confirmed" | "disputed" | "auto_confirmed" | "admin_override";
export type InvoiceStatus = "draft" | "sent" | "viewed" | "paid" | "overdue" | "cancelled" | "partially_paid";
export type PaymentMethod = "ach" | "check" | "wire" | "other";
export type PaymentStatus = "pending" | "processing" | "completed" | "failed" | "returned";
export type SettlementStatus = "draft" | "approved" | "paid";
export type DocumentEntityType = "carrier" | "customer" | "driver" | "truck";
export type DocumentType = "insurance_cert" | "w9" | "po_document" | "rate_agreement" | "other";
export type NotificationType =
  | "delivery_confirmed"
  | "delivery_disputed"
  | "invoice_sent"
  | "payment_received"
  | "po_threshold"
  | "insurance_expiry"
  | "dispatch_assigned"
  | "escalation"
  | "settlement_created";
export type NotificationChannel = "in_app" | "email" | "sms";
export type QbSyncAction = "create" | "update" | "delete";
export type QbSyncStatus = "pending" | "success" | "failed";
export type AuditAction = "insert" | "update" | "delete";
export type EntityStatus = "active" | "inactive";
export type QbEnvironment = "sandbox" | "production";
export type CarrierPaymentTerms = "net_7" | "net_14" | "net_30";
export type TaxFormType = "w9" | "1099_nec";

export interface AppSetting {
  key: string;
  value: string;
  updated_at: string;
}
export type TruckStatus = "active" | "maintenance" | "inactive";

// ============================================================================
// TABLE ROW TYPES (what you get from SELECT)
// ============================================================================

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  company_name: string | null;
  carrier_id: string | null;
  customer_id: string | null;
  status: ProfileStatus;
  status_reason: string | null;
  status_changed_at: string | null;
  status_changed_by: string | null;
  created_at: string;
  updated_at: string;
}

export type BillingCycle = "biweekly" | "monthly" | "as_needed";

export interface Customer {
  id: string;
  name: string;
  billing_address: string | null;
  billing_email: string | null;
  phone: string | null;
  payment_terms: PaymentTerms;
  qb_customer_id: string | null;
  qb_environment: QbEnvironment | null;
  credit_limit: number;
  credit_limit_enabled: boolean;
  billing_cycle: BillingCycle;
  contact_name: string | null;
  vendor_number: string | null;
  vendor_portal_url: string | null;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
}

export interface Carrier {
  id: string;
  name: string;
  dba: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  dispatch_fee_weekly: number;
  ein: string | null;
  mc_number: string | null;
  dot_number: string | null;
  qb_vendor_id: string | null;
  qb_environment: QbEnvironment | null;
  insurance_expiry: string | null;
  w9_url: string | null;
  bank_routing_encrypted: string | null;
  bank_account_encrypted: string | null;
  bank_name: string | null;
  insurance_cert_url: string | null;
  agreement_url: string | null;
  agreement_signed_at: string | null;
  payment_terms: CarrierPaymentTerms;
  is_1099_tracked: boolean;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  carrier_id: string;
  profile_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  license_number: string | null;
  license_expiry: string | null;
  truck_id: string | null;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
}

export interface Truck {
  id: string;
  carrier_id: string;
  number: string;
  license_plate: string | null;
  type: string | null;
  capacity_tons: number | null;
  vin: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  insurance_policy: string | null;
  insurance_expiry: string | null;
  status: TruckStatus;
  created_at: string;
  updated_at: string;
}

export interface Site {
  id: string;
  name: string;
  type: SiteType;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  latitude: number | null;
  longitude: number | null;
  contact_name: string | null;
  contact_phone: string | null;
  gate_code: string | null;
  operating_hours: string | null;
  special_instructions: string | null;
  customer_id: string | null;
  subdivision_name: string | null;
  project_number: string | null;
  geofence_radius_meters: number;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
}

export interface Material {
  id: string;
  name: string;
  unit_of_measure: UnitOfMeasure;
  description: string | null;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
}

export type PurchaseOrderType = "corporate" | "field_direction";

export interface PurchaseOrder {
  id: string;
  customer_id: string;
  po_number: string;
  material_id: string;
  delivery_site_id: string;
  quantity_ordered: number;
  quantity_delivered: number;
  unit: UnitOfMeasure;
  status: PurchaseOrderStatus;
  cost_code: string | null;
  po_type: PurchaseOrderType;
  parent_po_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Rate {
  id: string;
  type: RateEntityType;
  customer_id: string | null;
  carrier_id: string | null;
  material_id: string;
  pickup_site_id: string | null;
  delivery_site_id: string | null;
  delivery_city: string | null;
  rate_per_unit: number;
  rate_type: RateType;
  effective_date: string;
  expiration_date: string | null;
  created_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  customer_id: string;
  purchase_order_id: string;
  material_id: string;
  pickup_site_id: string;
  delivery_site_id: string;
  delivery_address: string | null;
  requested_loads: number;
  scheduled_date: string;
  status: OrderStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Dispatch {
  id: string;
  order_id: string | null;
  carrier_id: string;
  driver_id: string;
  truck_id: string;
  material_id: string;
  pickup_site_id: string;
  delivery_site_id: string;
  delivery_address: string | null;
  purchase_order_id: string | null;
  scheduled_date: string;
  status: DispatchStatus;
  dispatched_at: string | null;
  acknowledged_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Delivery {
  id: string;
  dispatch_id: string;
  driver_id: string;
  truck_id: string;
  material_id: string;
  delivery_site_id: string;
  delivery_address: string | null;
  ticket_number: string | null;
  ticket_photo_url: string | null;
  gross_weight: number | null;
  tare_weight: number | null;
  net_weight: number | null;
  gps_latitude: number | null;
  gps_longitude: number | null;
  gps_accuracy_meters: number | null;
  geofence_verified: boolean;
  delivered_at: string;
  confirmation_status: ConfirmationStatus;
  confirmed_at: string | null;
  confirmed_by: string | null;
  dispute_reason: string | null;
  dispute_resolved_at: string | null;
  dispute_resolved_by: string | null;
  dispute_resolution: string | null;
  synced_offline: boolean;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  customer_id: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  status: InvoiceStatus;
  due_date: string;
  sent_at: string | null;
  paid_at: string | null;
  qb_invoice_id: string | null;
  qb_environment: QbEnvironment | null;
  qb_payment_link: string | null;
  pdf_url: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  delivery_id: string | null;
  purchase_order_id: string | null;
  description: string;
  quantity: number;
  unit: string | null;
  rate: number;
  amount: number;
  material_id: string | null;
  cost_code: string | null;
  delivery_date: string | null;
  delivery_address: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  customer_id: string;
  amount: number;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  qb_payment_id: string | null;
  qb_environment: QbEnvironment | null;
  ach_transaction_id: string | null;
  failure_reason: string | null;
  paid_at: string | null;
  recorded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CarrierSettlement {
  id: string;
  carrier_id: string;
  settlement_number: string;
  period_start: string;
  period_end: string;
  hauling_amount: number;
  dispatch_fee: number;
  deductions: number;
  total_amount: number;
  status: SettlementStatus;
  qb_bill_id: string | null;
  qb_environment: QbEnvironment | null;
  approved_by: string | null;
  approved_at: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CarrierSettlementLine {
  id: string;
  settlement_id: string;
  delivery_id: string;
  rate_applied: number;
  amount: number;
  created_at: string;
}

export interface TaxForm {
  id: string;
  carrier_id: string;
  form_type: TaxFormType;
  tax_year: number;
  total_paid: number;
  filed_at: string | null;
  form_url: string | null;
  qbo_synced: boolean;
  created_at: string;
  updated_at: string;
}

// Documents table defined but unused in current UI. Carrier files stored as direct URLs on carrier record.
export interface Document {
  id: string;
  entity_type: DocumentEntityType;
  entity_id: string;
  document_type: DocumentType;
  name: string;
  file_url: string;
  file_size: number | null;
  expiry_date: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  channel: NotificationChannel;
  read: boolean;
  read_at: string | null;
  data: Record<string, unknown> | null;
  created_at: string;
}

export interface QbSyncLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: QbSyncAction;
  qb_entity_type: string | null;
  qb_entity_id: string | null;
  qb_environment: QbEnvironment | null;
  status: QbSyncStatus;
  error_message: string | null;
  synced_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: AuditAction;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_by: string | null;
  created_at: string;
}

// ============================================================================
// QB ENVIRONMENT ISOLATION TABLES
// ============================================================================

export interface QbEnvironmentState {
  id: number;
  current_environment: QbEnvironment;
  switched_at: string;
  switched_by: string | null;
  previous_environment: QbEnvironment | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface QbEnvironmentSwitchLog {
  id: string;
  from_environment: QbEnvironment;
  to_environment: QbEnvironment;
  switched_by: string | null;
  sandbox_records_cleared: boolean;
  production_records_backed_up: boolean;
  notes: string | null;
  created_at: string;
}

// ============================================================================
// NEW BUSINESS TABLES
// ============================================================================

export interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface SupplierRate {
  id: string;
  supplier_id: string;
  material_id: string;
  delivery_city: string;
  rate_per_load: number;
  effective_date: string;
  created_at: string;
  updated_at: string;
}

export interface MaterialAlias {
  id: string;
  material_id: string;
  alias_name: string;
  used_by_customer_id: string | null;
  created_at: string;
}

export interface SiteContact {
  id: string;
  site_id: string;
  name: string;
  phone: string | null;
  role: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerAddress {
  id: string;
  customer_id: string;
  label: string | null;
  address: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  site_id: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// INSERT TYPES (what you need for INSERT — omit auto-generated fields)
// ============================================================================

export type ProfileInsert = Omit<Profile, "created_at" | "updated_at" | "customer_id"> & {
  created_at?: string;
  updated_at?: string;
  customer_id?: string | null;
};

export type CustomerInsert = Omit<Customer, "id" | "created_at" | "updated_at" | "billing_cycle" | "contact_name" | "vendor_number" | "vendor_portal_url" | "qb_environment"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
  billing_cycle?: BillingCycle;
  contact_name?: string | null;
  vendor_number?: string | null;
  vendor_portal_url?: string | null;
  qb_environment?: QbEnvironment | null;
};

export type CarrierInsert = Omit<Carrier, "id" | "created_at" | "updated_at" | "qb_environment"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
  qb_environment?: QbEnvironment | null;
};

export type DriverInsert = Omit<Driver, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type TruckInsert = Omit<Truck, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type SiteInsert = Omit<Site, "id" | "created_at" | "updated_at" | "subdivision_name" | "project_number"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
  subdivision_name?: string | null;
  project_number?: string | null;
};

export type MaterialInsert = Omit<Material, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type PurchaseOrderInsert = Omit<PurchaseOrder, "id" | "quantity_delivered" | "created_at" | "updated_at" | "cost_code" | "po_type" | "parent_po_id"> & {
  id?: string;
  quantity_delivered?: number;
  created_at?: string;
  updated_at?: string;
  cost_code?: string | null;
  po_type?: PurchaseOrderType;
  parent_po_id?: string | null;
};

export type RateInsert = Omit<Rate, "id" | "created_at" | "updated_at" | "delivery_city"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
  delivery_city?: string | null;
};

export type OrderInsert = Omit<Order, "id" | "created_at" | "updated_at" | "delivery_address"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
  delivery_address?: string | null;
};

export type DispatchInsert = Omit<Dispatch, "id" | "created_at" | "updated_at" | "delivery_address"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
  delivery_address?: string | null;
};

export type DeliveryInsert = Omit<Delivery, "id" | "created_at" | "updated_at" | "delivery_address"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
  delivery_address?: string | null;
};

export type InvoiceInsert = Omit<Invoice, "id" | "created_at" | "updated_at" | "qb_environment"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
  qb_environment?: QbEnvironment | null;
};

export type InvoiceLineItemInsert = Omit<InvoiceLineItem, "id" | "created_at" | "cost_code" | "delivery_date" | "delivery_address"> & {
  id?: string;
  created_at?: string;
  cost_code?: string | null;
  delivery_date?: string | null;
  delivery_address?: string | null;
};

export type PaymentInsert = Omit<Payment, "id" | "created_at" | "updated_at" | "qb_environment"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
  qb_environment?: QbEnvironment | null;
};

export type CarrierSettlementInsert = Omit<CarrierSettlement, "id" | "created_at" | "updated_at" | "qb_environment"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
  qb_environment?: QbEnvironment | null;
};

export type CarrierSettlementLineInsert = Omit<CarrierSettlementLine, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type TaxFormInsert = Omit<TaxForm, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type DocumentInsert = Omit<Document, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type NotificationInsert = Omit<Notification, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type QbSyncLogInsert = Omit<QbSyncLog, "id" | "created_at" | "qb_environment"> & {
  id?: string;
  created_at?: string;
  qb_environment?: QbEnvironment | null;
};

export type AuditLogInsert = Omit<AuditLog, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type SupplierInsert = Omit<Supplier, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type SupplierRateInsert = Omit<SupplierRate, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type MaterialAliasInsert = Omit<MaterialAlias, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type SiteContactInsert = Omit<SiteContact, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type CustomerAddressInsert = Omit<CustomerAddress, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

// ============================================================================
// UPDATE TYPES (partial — only the fields you can update)
// ============================================================================

export type ProfileUpdate = Partial<Omit<Profile, "id" | "created_at" | "updated_at">>;
export type CustomerUpdate = Partial<Omit<Customer, "id" | "created_at" | "updated_at">>;
export type CarrierUpdate = Partial<Omit<Carrier, "id" | "created_at" | "updated_at">>;
export type DriverUpdate = Partial<Omit<Driver, "id" | "created_at" | "updated_at">>;
export type TruckUpdate = Partial<Omit<Truck, "id" | "created_at" | "updated_at">>;
export type SiteUpdate = Partial<Omit<Site, "id" | "created_at" | "updated_at">>;
export type MaterialUpdate = Partial<Omit<Material, "id" | "created_at" | "updated_at">>;
export type PurchaseOrderUpdate = Partial<Omit<PurchaseOrder, "id" | "created_at" | "updated_at">>;
export type RateUpdate = Partial<Omit<Rate, "id" | "created_at" | "updated_at">>;
export type OrderUpdate = Partial<Omit<Order, "id" | "created_at" | "updated_at">>;
export type DispatchUpdate = Partial<Omit<Dispatch, "id" | "created_at" | "updated_at">>;
export type DeliveryUpdate = Partial<Omit<Delivery, "id" | "created_at" | "updated_at">>;
export type InvoiceUpdate = Partial<Omit<Invoice, "id" | "created_at" | "updated_at">>;
export type InvoiceLineItemUpdate = Partial<Omit<InvoiceLineItem, "id" | "created_at">>;
export type PaymentUpdate = Partial<Omit<Payment, "id" | "created_at" | "updated_at">>;
export type CarrierSettlementUpdate = Partial<Omit<CarrierSettlement, "id" | "created_at" | "updated_at">>;
export type CarrierSettlementLineUpdate = Partial<Omit<CarrierSettlementLine, "id" | "created_at">>;
export type TaxFormUpdate = Partial<Omit<TaxForm, "id" | "created_at" | "updated_at">>;
export type DocumentUpdate = Partial<Omit<Document, "id" | "created_at">>;
export type NotificationUpdate = Partial<Omit<Notification, "id" | "created_at">>;
export type SupplierUpdate = Partial<Omit<Supplier, "id" | "created_at" | "updated_at">>;
export type SupplierRateUpdate = Partial<Omit<SupplierRate, "id" | "created_at" | "updated_at">>;
export type MaterialAliasUpdate = Partial<Omit<MaterialAlias, "id" | "created_at">>;
export type SiteContactUpdate = Partial<Omit<SiteContact, "id" | "created_at" | "updated_at">>;
export type CustomerAddressUpdate = Partial<Omit<CustomerAddress, "id" | "created_at" | "updated_at">>;

// ============================================================================
// RELATIONSHIP TYPES (common joins)
// ============================================================================

export interface DriverWithCarrier extends Driver {
  carrier: Carrier;
}

export interface TruckWithCarrier extends Truck {
  carrier: Carrier;
}

export interface SiteWithCustomer extends Site {
  customer: Customer | null;
}

export interface PurchaseOrderWithRelations extends PurchaseOrder {
  customer: Customer;
  material: Material;
  delivery_site: Site;
  parent_po: PurchaseOrder | null;
}

export interface OrderWithRelations extends Order {
  customer: Customer;
  purchase_order: PurchaseOrder;
  material: Material;
  pickup_site: Site;
  delivery_site: Site;
}

export interface DispatchWithRelations extends Dispatch {
  order: Order | null;
  carrier: Carrier;
  driver: Driver;
  truck: Truck;
  material: Material;
  pickup_site: Site;
  delivery_site: Site;
  purchase_order: PurchaseOrder | null;
}

export interface DeliveryWithRelations extends Delivery {
  dispatch: Dispatch;
  driver: Driver;
  truck: Truck;
  material: Material;
  delivery_site: Site;
}

export interface InvoiceWithLineItems extends Invoice {
  customer: Customer;
  line_items: InvoiceLineItem[];
}

/**
 * Extended invoice type with material/PO joins on line items.
 * Used by PDF template, email template, and invoice detail pages.
 */
export interface InvoiceWithDetails extends InvoiceWithLineItems {
  line_items: (InvoiceLineItem & {
    material?: { id: string; name: string; unit_of_measure: string } | null;
    purchase_order?: { id: string; po_number: string } | null;
  })[];
}

export interface PaymentWithRelations extends Payment {
  invoice: Invoice;
  customer: Customer;
}

export interface CarrierSettlementWithLines extends CarrierSettlement {
  carrier: Carrier;
  lines: CarrierSettlementLine[];
}

export interface NotificationWithUser extends Notification {
  user: Profile;
}

// ============================================================================
// SUPABASE DATABASE TYPE (for client generics)
// ============================================================================

// Helper: Makes specified keys optional in a type (for supabase-js compatibility)
type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [P in K]?: T[P] };

// Table type helper that supabase-js can resolve without falling to `never`
type TableDef<
  R extends { id: string; created_at: string; updated_at: string },
  I = MakeOptional<R, "id" | "created_at" | "updated_at">,
  U = Partial<R>,
> = {
  Row: R;
  Insert: I;
  Update: U;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: MakeOptional<Profile, "created_at" | "updated_at" | "customer_id">;
        Update: Partial<Profile>;
        Relationships: [];
      };
      customers: TableDef<Customer>;
      carriers: TableDef<Carrier>;
      drivers: TableDef<Driver>;
      trucks: TableDef<Truck>;
      sites: TableDef<Site>;
      materials: TableDef<Material>;
      purchase_orders: {
        Row: PurchaseOrder;
        Insert: MakeOptional<PurchaseOrder, "id" | "quantity_delivered" | "created_at" | "updated_at" | "cost_code" | "po_type" | "parent_po_id">;
        Update: Partial<PurchaseOrder>;
        Relationships: [];
      };
      rates: TableDef<Rate>;
      orders: TableDef<Order>;
      dispatches: TableDef<Dispatch>;
      deliveries: TableDef<Delivery>;
      invoices: TableDef<Invoice>;
      invoice_line_items: {
        Row: InvoiceLineItem;
        Insert: MakeOptional<InvoiceLineItem, "id" | "created_at" | "cost_code" | "delivery_date" | "delivery_address">;
        Update: Partial<InvoiceLineItem>;
        Relationships: [];
      };
      payments: TableDef<Payment>;
      carrier_settlements: TableDef<CarrierSettlement>;
      carrier_settlement_lines: {
        Row: CarrierSettlementLine;
        Insert: MakeOptional<CarrierSettlementLine, "id" | "created_at">;
        Update: Partial<CarrierSettlementLine>;
        Relationships: [];
      };
      tax_forms: TableDef<TaxForm>;
      documents: {
        Row: Document;
        Insert: MakeOptional<Document, "id" | "created_at">;
        Update: Partial<Document>;
        Relationships: [];
      };
      notifications: {
        Row: Notification;
        Insert: MakeOptional<Notification, "id" | "created_at">;
        Update: Partial<Notification>;
        Relationships: [];
      };
      qb_sync_log: {
        Row: QbSyncLog;
        Insert: MakeOptional<QbSyncLog, "id" | "created_at">;
        Update: Partial<QbSyncLog>;
        Relationships: [];
      };
      audit_log: {
        Row: AuditLog;
        Insert: MakeOptional<AuditLog, "id" | "created_at">;
        Update: Partial<AuditLog>;
        Relationships: [];
      };
      app_settings: {
        Row: AppSetting;
        Insert: AppSetting;
        Update: Partial<AppSetting>;
        Relationships: [];
      };
      suppliers: TableDef<Supplier>;
      supplier_rates: TableDef<SupplierRate>;
      material_aliases: {
        Row: MaterialAlias;
        Insert: MakeOptional<MaterialAlias, "id" | "created_at">;
        Update: Partial<MaterialAlias>;
        Relationships: [];
      };
      site_contacts: TableDef<SiteContact>;
      customer_addresses: TableDef<CustomerAddress>;
      qb_environment_state: {
        Row: QbEnvironmentState;
        Insert: MakeOptional<QbEnvironmentState, "created_at" | "updated_at" | "switched_at">;
        Update: Partial<QbEnvironmentState>;
        Relationships: [];
      };
      qb_environment_switch_log: {
        Row: QbEnvironmentSwitchLog;
        Insert: MakeOptional<QbEnvironmentSwitchLog, "id" | "created_at">;
        Update: Partial<QbEnvironmentSwitchLog>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_user_role: {
        Args: Record<string, never>;
        Returns: UserRole;
      };
      get_user_customer_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      get_user_driver_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      get_user_carrier_id: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: {
      user_role: UserRole;
      profile_status: ProfileStatus;
      payment_terms: PaymentTerms;
      site_type: SiteType;
      unit_of_measure: UnitOfMeasure;
      purchase_order_status: PurchaseOrderStatus;
      rate_entity_type: RateEntityType;
      rate_type: RateType;
      order_status: OrderStatus;
      dispatch_status: DispatchStatus;
      confirmation_status: ConfirmationStatus;
      invoice_status: InvoiceStatus;
      payment_method: PaymentMethod;
      payment_status: PaymentStatus;
      settlement_status: SettlementStatus;
      document_entity_type: DocumentEntityType;
      document_type: DocumentType;
      notification_type: NotificationType;
      notification_channel: NotificationChannel;
      qb_sync_action: QbSyncAction;
      qb_sync_status: QbSyncStatus;
      audit_action: AuditAction;
      entity_status: EntityStatus;
      truck_status: TruckStatus;
      billing_cycle: BillingCycle;
      purchase_order_type: PurchaseOrderType;
      carrier_payment_terms: CarrierPaymentTerms;
      tax_form_type: TaxFormType;
      qb_environment: QbEnvironment;
    };
  };
}

// ============================================================================
// FILTER / LIST TYPES (common query parameters)
// ============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface DateRangeFilter {
  from?: string;
  to?: string;
}

export interface CustomerFilters extends PaginationParams {
  status?: EntityStatus;
  search?: string;
}

export interface CarrierFilters extends PaginationParams {
  status?: EntityStatus;
  search?: string;
}

export interface DriverFilters extends PaginationParams {
  carrier_id?: string;
  status?: EntityStatus;
  search?: string;
}

export interface TruckFilters extends PaginationParams {
  carrier_id?: string;
  status?: TruckStatus;
}

export interface SiteFilters extends PaginationParams {
  type?: SiteType;
  customer_id?: string;
  status?: EntityStatus;
  search?: string;
}

export interface OrderFilters extends PaginationParams {
  customer_id?: string;
  status?: OrderStatus;
  scheduled_date?: DateRangeFilter;
  search?: string;
}

export interface DispatchFilters extends PaginationParams {
  carrier_id?: string;
  driver_id?: string;
  status?: DispatchStatus;
  scheduled_date?: DateRangeFilter;
}

export interface DeliveryFilters extends PaginationParams {
  driver_id?: string;
  dispatch_id?: string;
  confirmation_status?: ConfirmationStatus;
  delivered_at?: DateRangeFilter;
}

export interface InvoiceFilters extends PaginationParams {
  customer_id?: string;
  status?: InvoiceStatus;
  due_date?: DateRangeFilter;
}

export interface PaymentFilters extends PaginationParams {
  customer_id?: string;
  invoice_id?: string;
  status?: PaymentStatus;
}

export interface SettlementFilters extends PaginationParams {
  carrier_id?: string;
  status?: SettlementStatus;
  period?: DateRangeFilter;
}

export interface PurchaseOrderFilters extends PaginationParams {
  customer_id?: string;
  status?: PurchaseOrderStatus;
  search?: string;
}

export interface RateFilters extends PaginationParams {
  type?: RateEntityType;
  customer_id?: string;
  carrier_id?: string;
  material_id?: string;
  active_only?: boolean;
}

export interface NotificationFilters extends PaginationParams {
  unread_only?: boolean;
  type?: NotificationType;
}
