-- ============================================================================
-- JFT - J Fudge Trucking: Initial Database Schema
-- Transportation Management System
-- ============================================================================
-- Run this in your Supabase SQL Editor to create the complete schema.
-- Ensure RLS is enabled on all tables after creation.
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE public.user_role AS ENUM ('admin', 'driver', 'customer');
CREATE TYPE public.profile_status AS ENUM ('active', 'pending', 'suspended');
CREATE TYPE public.payment_terms AS ENUM ('net_15', 'net_30', 'net_45', 'net_60');
CREATE TYPE public.site_type AS ENUM ('quarry', 'plant', 'jobsite');
CREATE TYPE public.unit_of_measure AS ENUM ('ton', 'load', 'cubic_yard');
CREATE TYPE public.purchase_order_status AS ENUM ('active', 'fulfilled', 'cancelled', 'on_hold');
CREATE TYPE public.rate_entity_type AS ENUM ('customer', 'carrier');
CREATE TYPE public.rate_type AS ENUM ('per_ton', 'per_load', 'per_hour');
CREATE TYPE public.order_status AS ENUM ('pending', 'approved', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.dispatch_status AS ENUM (
  'scheduled', 'dispatched', 'acknowledged', 'in_transit',
  'at_pickup', 'loaded', 'delivering', 'delivered',
  'confirmed', 'disputed', 'cancelled'
);
CREATE TYPE public.confirmation_status AS ENUM ('pending', 'confirmed', 'disputed', 'auto_confirmed', 'admin_override');
CREATE TYPE public.invoice_status AS ENUM ('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled', 'partially_paid');
CREATE TYPE public.payment_method AS ENUM ('ach', 'check', 'wire', 'other');
CREATE TYPE public.payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'returned');
CREATE TYPE public.settlement_status AS ENUM ('draft', 'approved', 'paid');
CREATE TYPE public.document_entity_type AS ENUM ('carrier', 'customer', 'driver', 'truck');
CREATE TYPE public.document_type AS ENUM ('insurance_cert', 'w9', 'po_document', 'rate_agreement', 'other');
CREATE TYPE public.notification_type AS ENUM (
  'delivery_confirmed', 'delivery_disputed', 'invoice_sent',
  'payment_received', 'po_threshold', 'insurance_expiry',
  'dispatch_assigned', 'escalation'
);
CREATE TYPE public.notification_channel AS ENUM ('in_app', 'email', 'sms');
CREATE TYPE public.qb_sync_action AS ENUM ('create', 'update', 'delete');
CREATE TYPE public.qb_sync_status AS ENUM ('pending', 'success', 'failed');
CREATE TYPE public.audit_action AS ENUM ('insert', 'update', 'delete');
CREATE TYPE public.entity_status AS ENUM ('active', 'inactive');
CREATE TYPE public.truck_status AS ENUM ('active', 'maintenance', 'inactive');

-- ============================================================================
-- UTILITY: updated_at trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TABLE: profiles (extends auth.users)
-- ============================================================================

CREATE TABLE public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        public.user_role NOT NULL DEFAULT 'customer',
  full_name   text NOT NULL,
  phone       text,
  avatar_url  text,
  company_name text,
  status      public.profile_status NOT NULL DEFAULT 'active',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_status ON public.profiles(status);

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, phone, company_name)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'customer'),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.raw_user_meta_data ->> 'phone',
    NEW.raw_user_meta_data ->> 'company_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- TABLE: customers
-- ============================================================================

CREATE TABLE public.customers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  billing_address text,
  billing_email   text,
  phone           text,
  payment_terms   public.payment_terms NOT NULL DEFAULT 'net_30',
  qb_customer_id  text,
  status          public.entity_status NOT NULL DEFAULT 'active',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_status ON public.customers(status);
CREATE INDEX idx_customers_qb_id ON public.customers(qb_customer_id) WHERE qb_customer_id IS NOT NULL;

CREATE TRIGGER set_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- TABLE: carriers
-- ============================================================================

CREATE TABLE public.carriers (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text NOT NULL,
  contact_name          text,
  phone                 text,
  email                 text,
  address               text,
  dispatch_fee_weekly   numeric(10,2) NOT NULL DEFAULT 0,
  ein                   text,
  qb_vendor_id          text,
  insurance_expiry      date,
  w9_url                text,
  status                public.entity_status NOT NULL DEFAULT 'active',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_carriers_status ON public.carriers(status);
CREATE INDEX idx_carriers_insurance ON public.carriers(insurance_expiry);

CREATE TRIGGER set_carriers_updated_at
  BEFORE UPDATE ON public.carriers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- TABLE: drivers
-- ============================================================================

CREATE TABLE public.drivers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id      uuid NOT NULL REFERENCES public.carriers(id) ON DELETE RESTRICT,
  profile_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  name            text NOT NULL,
  phone           text,
  license_number  text,
  license_expiry  date,
  status          public.entity_status NOT NULL DEFAULT 'active',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_drivers_carrier ON public.drivers(carrier_id);
CREATE INDEX idx_drivers_profile ON public.drivers(profile_id) WHERE profile_id IS NOT NULL;
CREATE INDEX idx_drivers_status ON public.drivers(status);

CREATE TRIGGER set_drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- TABLE: trucks
-- ============================================================================

CREATE TABLE public.trucks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id      uuid NOT NULL REFERENCES public.carriers(id) ON DELETE RESTRICT,
  number          text NOT NULL,
  license_plate   text,
  type            text,
  capacity_tons   numeric(8,2),
  status          public.truck_status NOT NULL DEFAULT 'active',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_trucks_carrier ON public.trucks(carrier_id);
CREATE INDEX idx_trucks_status ON public.trucks(status);

CREATE TRIGGER set_trucks_updated_at
  BEFORE UPDATE ON public.trucks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- TABLE: sites
-- ============================================================================

CREATE TABLE public.sites (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    text NOT NULL,
  type                    public.site_type NOT NULL,
  address                 text,
  city                    text,
  state                   text DEFAULT 'TX',
  zip                     text,
  latitude                numeric(10,7),
  longitude               numeric(10,7),
  contact_name            text,
  contact_phone           text,
  gate_code               text,
  operating_hours         text,
  special_instructions    text,
  customer_id             uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  geofence_radius_meters  integer NOT NULL DEFAULT 500,
  status                  public.entity_status NOT NULL DEFAULT 'active',
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sites_type ON public.sites(type);
CREATE INDEX idx_sites_customer ON public.sites(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_sites_status ON public.sites(status);
CREATE INDEX idx_sites_location ON public.sites(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE TRIGGER set_sites_updated_at
  BEFORE UPDATE ON public.sites
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- TABLE: materials
-- ============================================================================

CREATE TABLE public.materials (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL UNIQUE,
  unit_of_measure public.unit_of_measure NOT NULL DEFAULT 'ton',
  description     text,
  status          public.entity_status NOT NULL DEFAULT 'active',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_materials_updated_at
  BEFORE UPDATE ON public.materials
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- TABLE: purchase_orders
-- ============================================================================

CREATE TABLE public.purchase_orders (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  po_number           text NOT NULL,
  material_id         uuid NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
  delivery_site_id    uuid NOT NULL REFERENCES public.sites(id) ON DELETE RESTRICT,
  quantity_ordered    numeric(12,2) NOT NULL,
  quantity_delivered  numeric(12,2) NOT NULL DEFAULT 0,
  unit                public.unit_of_measure NOT NULL DEFAULT 'ton',
  status              public.purchase_order_status NOT NULL DEFAULT 'active',
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_po_customer ON public.purchase_orders(customer_id);
CREATE INDEX idx_po_material ON public.purchase_orders(material_id);
CREATE INDEX idx_po_status ON public.purchase_orders(status);
CREATE UNIQUE INDEX idx_po_number_customer ON public.purchase_orders(customer_id, po_number);

CREATE TRIGGER set_purchase_orders_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- TABLE: rates
-- ============================================================================

CREATE TABLE public.rates (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type              public.rate_entity_type NOT NULL,
  customer_id       uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  carrier_id        uuid REFERENCES public.carriers(id) ON DELETE CASCADE,
  material_id       uuid NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
  pickup_site_id    uuid REFERENCES public.sites(id) ON DELETE SET NULL,
  delivery_site_id  uuid REFERENCES public.sites(id) ON DELETE SET NULL,
  rate_per_unit     numeric(10,2) NOT NULL,
  rate_type         public.rate_type NOT NULL DEFAULT 'per_ton',
  effective_date    date NOT NULL DEFAULT CURRENT_DATE,
  expiration_date   date,
  created_by        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT rates_entity_check CHECK (
    (type = 'customer' AND customer_id IS NOT NULL AND carrier_id IS NULL) OR
    (type = 'carrier' AND carrier_id IS NOT NULL AND customer_id IS NULL)
  )
);

CREATE INDEX idx_rates_customer ON public.rates(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_rates_carrier ON public.rates(carrier_id) WHERE carrier_id IS NOT NULL;
CREATE INDEX idx_rates_material ON public.rates(material_id);
CREATE INDEX idx_rates_effective ON public.rates(effective_date, expiration_date);
CREATE INDEX idx_rates_type ON public.rates(type);

CREATE TRIGGER set_rates_updated_at
  BEFORE UPDATE ON public.rates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- TABLE: orders
-- ============================================================================

CREATE TABLE public.orders (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  purchase_order_id   uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE RESTRICT,
  material_id         uuid NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
  pickup_site_id      uuid NOT NULL REFERENCES public.sites(id) ON DELETE RESTRICT,
  delivery_site_id    uuid NOT NULL REFERENCES public.sites(id) ON DELETE RESTRICT,
  requested_loads     integer NOT NULL DEFAULT 1,
  scheduled_date      date NOT NULL,
  status              public.order_status NOT NULL DEFAULT 'pending',
  notes               text,
  created_by          uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_customer ON public.orders(customer_id);
CREATE INDEX idx_orders_po ON public.orders(purchase_order_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_date ON public.orders(scheduled_date);
CREATE INDEX idx_orders_material ON public.orders(material_id);

CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- TABLE: dispatches
-- ============================================================================

CREATE TABLE public.dispatches (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  carrier_id          uuid NOT NULL REFERENCES public.carriers(id) ON DELETE RESTRICT,
  driver_id           uuid NOT NULL REFERENCES public.drivers(id) ON DELETE RESTRICT,
  truck_id            uuid NOT NULL REFERENCES public.trucks(id) ON DELETE RESTRICT,
  material_id         uuid NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
  pickup_site_id      uuid NOT NULL REFERENCES public.sites(id) ON DELETE RESTRICT,
  delivery_site_id    uuid NOT NULL REFERENCES public.sites(id) ON DELETE RESTRICT,
  purchase_order_id   uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  scheduled_date      date NOT NULL,
  status              public.dispatch_status NOT NULL DEFAULT 'scheduled',
  dispatched_at       timestamptz,
  acknowledged_at     timestamptz,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dispatches_order ON public.dispatches(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_dispatches_carrier ON public.dispatches(carrier_id);
CREATE INDEX idx_dispatches_driver ON public.dispatches(driver_id);
CREATE INDEX idx_dispatches_truck ON public.dispatches(truck_id);
CREATE INDEX idx_dispatches_status ON public.dispatches(status);
CREATE INDEX idx_dispatches_date ON public.dispatches(scheduled_date);
CREATE INDEX idx_dispatches_po ON public.dispatches(purchase_order_id) WHERE purchase_order_id IS NOT NULL;

CREATE TRIGGER set_dispatches_updated_at
  BEFORE UPDATE ON public.dispatches
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- TABLE: deliveries (proof of delivery)
-- ============================================================================

CREATE TABLE public.deliveries (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id             uuid NOT NULL REFERENCES public.dispatches(id) ON DELETE RESTRICT,
  driver_id               uuid NOT NULL REFERENCES public.drivers(id) ON DELETE RESTRICT,
  truck_id                uuid NOT NULL REFERENCES public.trucks(id) ON DELETE RESTRICT,
  material_id             uuid NOT NULL REFERENCES public.materials(id) ON DELETE RESTRICT,
  delivery_site_id        uuid NOT NULL REFERENCES public.sites(id) ON DELETE RESTRICT,
  ticket_number           text,
  ticket_photo_url        text,
  gross_weight            numeric(10,2),
  tare_weight             numeric(10,2),
  net_weight              numeric(10,2),
  gps_latitude            numeric(10,7),
  gps_longitude           numeric(10,7),
  gps_accuracy_meters     numeric(8,2),
  geofence_verified       boolean NOT NULL DEFAULT false,
  delivered_at            timestamptz NOT NULL DEFAULT now(),
  confirmation_status     public.confirmation_status NOT NULL DEFAULT 'pending',
  confirmed_at            timestamptz,
  confirmed_by            uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  dispute_reason          text,
  dispute_resolved_at     timestamptz,
  dispute_resolved_by     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  dispute_resolution      text,
  synced_offline          boolean NOT NULL DEFAULT false,
  synced_at               timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_deliveries_dispatch ON public.deliveries(dispatch_id);
CREATE INDEX idx_deliveries_driver ON public.deliveries(driver_id);
CREATE INDEX idx_deliveries_status ON public.deliveries(confirmation_status);
CREATE INDEX idx_deliveries_date ON public.deliveries(delivered_at);
CREATE INDEX idx_deliveries_site ON public.deliveries(delivery_site_id);
CREATE INDEX idx_deliveries_ticket ON public.deliveries(ticket_number) WHERE ticket_number IS NOT NULL;

CREATE TRIGGER set_deliveries_updated_at
  BEFORE UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- TABLE: invoices
-- ============================================================================

CREATE TABLE public.invoices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  invoice_number  text NOT NULL UNIQUE,
  period_start    date NOT NULL,
  period_end      date NOT NULL,
  subtotal        numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount      numeric(12,2) NOT NULL DEFAULT 0,
  total           numeric(12,2) NOT NULL DEFAULT 0,
  status          public.invoice_status NOT NULL DEFAULT 'draft',
  due_date        date NOT NULL,
  sent_at         timestamptz,
  paid_at         timestamptz,
  qb_invoice_id   text,
  qb_payment_link text,
  pdf_url         text,
  notes           text,
  created_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_customer ON public.invoices(customer_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_due ON public.invoices(due_date);
CREATE INDEX idx_invoices_number ON public.invoices(invoice_number);
CREATE INDEX idx_invoices_qb ON public.invoices(qb_invoice_id) WHERE qb_invoice_id IS NOT NULL;

CREATE TRIGGER set_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- TABLE: invoice_line_items
-- ============================================================================

CREATE TABLE public.invoice_line_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id        uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  delivery_id       uuid REFERENCES public.deliveries(id) ON DELETE SET NULL,
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  description       text NOT NULL,
  quantity          numeric(12,2) NOT NULL,
  unit              text,
  rate              numeric(10,2) NOT NULL,
  amount            numeric(12,2) NOT NULL,
  material_id       uuid REFERENCES public.materials(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_line_items_invoice ON public.invoice_line_items(invoice_id);
CREATE INDEX idx_line_items_delivery ON public.invoice_line_items(delivery_id) WHERE delivery_id IS NOT NULL;

-- ============================================================================
-- TABLE: payments
-- ============================================================================

CREATE TABLE public.payments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id          uuid NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  customer_id         uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  amount              numeric(12,2) NOT NULL,
  payment_method      public.payment_method NOT NULL DEFAULT 'ach',
  status              public.payment_status NOT NULL DEFAULT 'pending',
  qb_payment_id       text,
  ach_transaction_id   text,
  failure_reason      text,
  paid_at             timestamptz,
  recorded_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_invoice ON public.payments(invoice_id);
CREATE INDEX idx_payments_customer ON public.payments(customer_id);
CREATE INDEX idx_payments_status ON public.payments(status);

CREATE TRIGGER set_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- TABLE: carrier_settlements
-- ============================================================================

CREATE TABLE public.carrier_settlements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id      uuid NOT NULL REFERENCES public.carriers(id) ON DELETE RESTRICT,
  period_start    date NOT NULL,
  period_end      date NOT NULL,
  hauling_amount  numeric(12,2) NOT NULL DEFAULT 0,
  dispatch_fee    numeric(12,2) NOT NULL DEFAULT 0,
  deductions      numeric(12,2) NOT NULL DEFAULT 0,
  total_amount    numeric(12,2) NOT NULL DEFAULT 0,
  status          public.settlement_status NOT NULL DEFAULT 'draft',
  qb_bill_id      text,
  approved_by     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at     timestamptz,
  paid_at         timestamptz,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_settlements_carrier ON public.carrier_settlements(carrier_id);
CREATE INDEX idx_settlements_status ON public.carrier_settlements(status);
CREATE INDEX idx_settlements_period ON public.carrier_settlements(period_start, period_end);

CREATE TRIGGER set_settlements_updated_at
  BEFORE UPDATE ON public.carrier_settlements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- TABLE: carrier_settlement_lines
-- ============================================================================

CREATE TABLE public.carrier_settlement_lines (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id   uuid NOT NULL REFERENCES public.carrier_settlements(id) ON DELETE CASCADE,
  delivery_id     uuid NOT NULL REFERENCES public.deliveries(id) ON DELETE RESTRICT,
  rate_applied    numeric(10,2) NOT NULL,
  amount          numeric(12,2) NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_settlement_lines_settlement ON public.carrier_settlement_lines(settlement_id);
CREATE INDEX idx_settlement_lines_delivery ON public.carrier_settlement_lines(delivery_id);

-- ============================================================================
-- TABLE: documents
-- ============================================================================

CREATE TABLE public.documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     public.document_entity_type NOT NULL,
  entity_id       uuid NOT NULL,
  document_type   public.document_type NOT NULL DEFAULT 'other',
  name            text NOT NULL,
  file_url        text NOT NULL,
  file_size       integer,
  expiry_date     date,
  uploaded_by     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_entity ON public.documents(entity_type, entity_id);
CREATE INDEX idx_documents_expiry ON public.documents(expiry_date) WHERE expiry_date IS NOT NULL;

-- ============================================================================
-- TABLE: notifications
-- ============================================================================

CREATE TABLE public.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        public.notification_type NOT NULL,
  title       text NOT NULL,
  message     text NOT NULL,
  channel     public.notification_channel NOT NULL DEFAULT 'in_app',
  read        boolean NOT NULL DEFAULT false,
  read_at     timestamptz,
  data        jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, read) WHERE read = false;
CREATE INDEX idx_notifications_type ON public.notifications(type);

-- ============================================================================
-- TABLE: qb_sync_log
-- ============================================================================

CREATE TABLE public.qb_sync_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     text NOT NULL,
  entity_id       uuid NOT NULL,
  action          public.qb_sync_action NOT NULL,
  qb_entity_type  text,
  qb_entity_id    text,
  status          public.qb_sync_status NOT NULL DEFAULT 'pending',
  error_message   text,
  synced_at       timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_qb_sync_entity ON public.qb_sync_log(entity_type, entity_id);
CREATE INDEX idx_qb_sync_status ON public.qb_sync_log(status);

-- ============================================================================
-- TABLE: audit_log
-- ============================================================================

CREATE TABLE public.audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name  text NOT NULL,
  record_id   uuid NOT NULL,
  action      public.audit_action NOT NULL,
  old_data    jsonb,
  new_data    jsonb,
  changed_by  uuid,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_table_record ON public.audit_log(table_name, record_id);
CREATE INDEX idx_audit_changed_by ON public.audit_log(changed_by) WHERE changed_by IS NOT NULL;
CREATE INDEX idx_audit_created ON public.audit_log(created_at);

-- ============================================================================
-- FUNCTION: Audit log trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_log (table_name, record_id, action, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'insert', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_log (table_name, record_id, action, old_data, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'update', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.audit_log (table_name, record_id, action, old_data, changed_by)
    VALUES (TG_TABLE_NAME, OLD.id, 'delete', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Apply audit triggers to sensitive tables
CREATE TRIGGER audit_deliveries
  AFTER INSERT OR UPDATE OR DELETE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

CREATE TRIGGER audit_invoices
  AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

CREATE TRIGGER audit_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

CREATE TRIGGER audit_rates
  AFTER INSERT OR UPDATE OR DELETE ON public.rates
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

CREATE TRIGGER audit_carrier_settlements
  AFTER INSERT OR UPDATE OR DELETE ON public.carrier_settlements
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

-- ============================================================================
-- FUNCTION: Auto-update PO quantity_delivered when delivery is confirmed
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_delivery_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act when confirmation_status changes to 'confirmed' or 'auto_confirmed' or 'admin_override'
  IF (NEW.confirmation_status IN ('confirmed', 'auto_confirmed', 'admin_override'))
     AND (OLD.confirmation_status = 'pending' OR OLD.confirmation_status = 'disputed') THEN

    -- Get the purchase_order_id from the dispatch
    UPDATE public.purchase_orders
    SET quantity_delivered = quantity_delivered + COALESCE(NEW.net_weight, 0)
    WHERE id = (
      SELECT purchase_order_id FROM public.dispatches
      WHERE id = NEW.dispatch_id AND purchase_order_id IS NOT NULL
    );

    -- Auto-fulfill PO if quantity met
    UPDATE public.purchase_orders
    SET status = 'fulfilled'
    WHERE id = (
      SELECT purchase_order_id FROM public.dispatches
      WHERE id = NEW.dispatch_id AND purchase_order_id IS NOT NULL
    )
    AND quantity_delivered >= quantity_ordered
    AND status = 'active';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER on_delivery_confirmed
  AFTER UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.handle_delivery_confirmed();

-- ============================================================================
-- FUNCTION: Recalculate invoice totals from line items
-- ============================================================================

CREATE OR REPLACE FUNCTION public.recalculate_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id uuid;
  v_subtotal numeric(12,2);
BEGIN
  -- Determine which invoice to update
  IF TG_OP = 'DELETE' THEN
    v_invoice_id := OLD.invoice_id;
  ELSE
    v_invoice_id := NEW.invoice_id;
  END IF;

  -- Calculate subtotal from line items
  SELECT COALESCE(SUM(amount), 0) INTO v_subtotal
  FROM public.invoice_line_items
  WHERE invoice_id = v_invoice_id;

  -- Update invoice totals (tax_amount preserved, total = subtotal + tax)
  UPDATE public.invoices
  SET subtotal = v_subtotal,
      total = v_subtotal + tax_amount
  WHERE id = v_invoice_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER recalc_invoice_on_line_change
  AFTER INSERT OR UPDATE OR DELETE ON public.invoice_line_items
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_invoice_totals();

-- ============================================================================
-- FUNCTION: Helper to get user role from JWT for RLS policies
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'user_role')::public.user_role,
    (SELECT role FROM public.profiles WHERE id = auth.uid())
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

-- Helper to get the customer_id linked to the current user
CREATE OR REPLACE FUNCTION public.get_user_customer_id()
RETURNS uuid AS $$
  SELECT c.id FROM public.customers c
  INNER JOIN public.profiles p ON p.company_name = c.name
  WHERE p.id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

-- Helper to get the driver record linked to the current user
CREATE OR REPLACE FUNCTION public.get_user_driver_id()
RETURNS uuid AS $$
  SELECT d.id FROM public.drivers d
  WHERE d.profile_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

-- ============================================================================
-- CUSTOM ACCESS TOKEN HOOK: Add role to JWT claims
-- ============================================================================
-- This function is called by Supabase Auth before issuing a token.
-- Configure it in Supabase Dashboard > Auth > Hooks > Custom Access Token.

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb AS $$
DECLARE
  claims jsonb;
  user_role public.user_role;
BEGIN
  -- Get the user's role from the profiles table
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = (event ->> 'user_id')::uuid;

  claims := event -> 'claims';

  IF user_role IS NOT NULL THEN
    -- Set the role claim
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  ELSE
    claims := jsonb_set(claims, '{user_role}', '"customer"');
  END IF;

  -- Update the claims in the event
  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '';

-- Grant necessary permissions for the hook
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
GRANT ALL ON TABLE public.profiles TO supabase_auth_admin;

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carrier_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carrier_settlement_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qb_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- ---------- profiles ----------

-- Admin: full access
CREATE POLICY "admin_profiles_all" ON public.profiles
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- Users: read/update own profile
CREATE POLICY "users_read_own_profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users_update_own_profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ---------- customers ----------

CREATE POLICY "admin_customers_all" ON public.customers
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "customer_read_own" ON public.customers
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'customer'
    AND id = public.get_user_customer_id()
  );

-- ---------- carriers ----------

CREATE POLICY "admin_carriers_all" ON public.carriers
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- Drivers can read their own carrier
CREATE POLICY "driver_read_own_carrier" ON public.carriers
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'driver'
    AND id = (SELECT carrier_id FROM public.drivers WHERE profile_id = auth.uid() LIMIT 1)
  );

-- ---------- drivers ----------

CREATE POLICY "admin_drivers_all" ON public.drivers
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "driver_read_own" ON public.drivers
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'driver'
    AND profile_id = auth.uid()
  );

-- ---------- trucks ----------

CREATE POLICY "admin_trucks_all" ON public.trucks
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "driver_read_carrier_trucks" ON public.trucks
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'driver'
    AND carrier_id = (SELECT carrier_id FROM public.drivers WHERE profile_id = auth.uid() LIMIT 1)
  );

-- ---------- sites ----------

CREATE POLICY "admin_sites_all" ON public.sites
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- Customers can see quarries/plants and their own jobsites
CREATE POLICY "customer_read_sites" ON public.sites
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'customer'
    AND (
      type IN ('quarry', 'plant')
      OR customer_id = public.get_user_customer_id()
    )
  );

-- Drivers can see all sites (need for navigation)
CREATE POLICY "driver_read_sites" ON public.sites
  FOR SELECT TO authenticated
  USING (public.get_user_role() = 'driver');

-- ---------- materials ----------

-- All authenticated users can read materials
CREATE POLICY "authenticated_read_materials" ON public.materials
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admin_materials_all" ON public.materials
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- ---------- purchase_orders ----------

CREATE POLICY "admin_po_all" ON public.purchase_orders
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "customer_read_own_po" ON public.purchase_orders
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'customer'
    AND customer_id = public.get_user_customer_id()
  );

-- ---------- rates ----------

CREATE POLICY "admin_rates_all" ON public.rates
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- Customers and drivers cannot see rates

-- ---------- orders ----------

CREATE POLICY "admin_orders_all" ON public.orders
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "customer_read_own_orders" ON public.orders
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'customer'
    AND customer_id = public.get_user_customer_id()
  );

CREATE POLICY "customer_create_orders" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() = 'customer'
    AND customer_id = public.get_user_customer_id()
  );

-- ---------- dispatches ----------

CREATE POLICY "admin_dispatches_all" ON public.dispatches
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "driver_read_own_dispatches" ON public.dispatches
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'driver'
    AND driver_id = public.get_user_driver_id()
  );

-- Drivers can update dispatch status (acknowledge, in_transit, etc.)
CREATE POLICY "driver_update_own_dispatches" ON public.dispatches
  FOR UPDATE TO authenticated
  USING (
    public.get_user_role() = 'driver'
    AND driver_id = public.get_user_driver_id()
  )
  WITH CHECK (
    public.get_user_role() = 'driver'
    AND driver_id = public.get_user_driver_id()
  );

-- ---------- deliveries ----------

CREATE POLICY "admin_deliveries_all" ON public.deliveries
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- Drivers can create deliveries for their dispatches
CREATE POLICY "driver_create_deliveries" ON public.deliveries
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() = 'driver'
    AND driver_id = public.get_user_driver_id()
    AND dispatch_id IN (
      SELECT id FROM public.dispatches WHERE driver_id = public.get_user_driver_id()
    )
  );

-- Drivers can read their own deliveries
CREATE POLICY "driver_read_own_deliveries" ON public.deliveries
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'driver'
    AND driver_id = public.get_user_driver_id()
  );

-- Customers can read deliveries linked to their POs
CREATE POLICY "customer_read_own_deliveries" ON public.deliveries
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'customer'
    AND dispatch_id IN (
      SELECT d.id FROM public.dispatches d
      INNER JOIN public.purchase_orders po ON d.purchase_order_id = po.id
      WHERE po.customer_id = public.get_user_customer_id()
    )
  );

-- Customers can confirm/dispute deliveries linked to their POs
CREATE POLICY "customer_update_delivery_status" ON public.deliveries
  FOR UPDATE TO authenticated
  USING (
    public.get_user_role() = 'customer'
    AND dispatch_id IN (
      SELECT d.id FROM public.dispatches d
      INNER JOIN public.purchase_orders po ON d.purchase_order_id = po.id
      WHERE po.customer_id = public.get_user_customer_id()
    )
  )
  WITH CHECK (
    public.get_user_role() = 'customer'
    AND dispatch_id IN (
      SELECT d.id FROM public.dispatches d
      INNER JOIN public.purchase_orders po ON d.purchase_order_id = po.id
      WHERE po.customer_id = public.get_user_customer_id()
    )
  );

-- ---------- invoices ----------

CREATE POLICY "admin_invoices_all" ON public.invoices
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "customer_read_own_invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'customer'
    AND customer_id = public.get_user_customer_id()
  );

-- ---------- invoice_line_items ----------

CREATE POLICY "admin_line_items_all" ON public.invoice_line_items
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "customer_read_own_line_items" ON public.invoice_line_items
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'customer'
    AND invoice_id IN (
      SELECT id FROM public.invoices WHERE customer_id = public.get_user_customer_id()
    )
  );

-- ---------- payments ----------

CREATE POLICY "admin_payments_all" ON public.payments
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "customer_read_own_payments" ON public.payments
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'customer'
    AND customer_id = public.get_user_customer_id()
  );

-- ---------- carrier_settlements ----------

CREATE POLICY "admin_settlements_all" ON public.carrier_settlements
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- ---------- carrier_settlement_lines ----------

CREATE POLICY "admin_settlement_lines_all" ON public.carrier_settlement_lines
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- ---------- documents ----------

CREATE POLICY "admin_documents_all" ON public.documents
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- ---------- notifications ----------

CREATE POLICY "admin_notifications_all" ON public.notifications
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- Users can read their own notifications
CREATE POLICY "users_read_own_notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can mark their own notifications as read
CREATE POLICY "users_update_own_notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------- qb_sync_log ----------

CREATE POLICY "admin_qb_sync_all" ON public.qb_sync_log
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- ---------- audit_log ----------

CREATE POLICY "admin_audit_read" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.get_user_role() = 'admin');

-- ============================================================================
-- SEED DATA: Materials
-- ============================================================================

INSERT INTO public.materials (name, unit_of_measure, description) VALUES
  ('Mason Sand', 'ton', 'Fine-grade mason sand for masonry and concrete work'),
  ('Cushion Sand', 'ton', 'Cushion sand for pipe bedding and backfill');

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================
-- Run these separately in the Supabase Dashboard > Storage or via the API:
--
-- 1. Create bucket: 'ticket-photos' (public: false)
--    - For delivery ticket photos uploaded by drivers
--
-- 2. Create bucket: 'documents' (public: false)
--    - For W9s, insurance certs, PO documents, rate agreements
--
-- 3. Create bucket: 'invoices' (public: false)
--    - For generated invoice PDFs
--
-- 4. Create bucket: 'avatars' (public: true)
--    - For user profile photos
--
-- Storage RLS policies should be configured in the Supabase Dashboard.
-- ============================================================================
