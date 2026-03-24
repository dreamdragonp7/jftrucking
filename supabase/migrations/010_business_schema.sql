-- ============================================================================
-- Migration 010: Business Schema Expansion
-- Adds business-critical fields and tables identified in JFT-MASTER.md audit
-- ============================================================================

-- 1. Customer billing cycle and business fields
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'biweekly'
  CHECK (billing_cycle IN ('biweekly', 'monthly', 'as_needed'));
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS vendor_number text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS vendor_portal_url text;

-- 2. Site subdivision and project number
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS subdivision_name text;
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS project_number text;

-- 3. Delivery address on orders, dispatches, deliveries
-- Individual house addresses within subdivisions (e.g. "10406 Echo Brook, Silverado West")
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_address text;
ALTER TABLE public.dispatches ADD COLUMN IF NOT EXISTS delivery_address text;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS delivery_address text;

-- 4. Cost code on purchase orders and invoice line items
-- DR Horton uses cost codes like 40023.06, 40026.05
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS cost_code text;
ALTER TABLE public.invoice_line_items ADD COLUMN IF NOT EXISTS cost_code text;
ALTER TABLE public.invoice_line_items ADD COLUMN IF NOT EXISTS delivery_date date;
ALTER TABLE public.invoice_line_items ADD COLUMN IF NOT EXISTS delivery_address text;

-- 5. City-based pricing on rates
-- Pricing is Customer x Material x City (3D), e.g. Kaufman Slab Sand to Ft Worth = $260
ALTER TABLE public.rates ADD COLUMN IF NOT EXISTS delivery_city text;

-- 6. Fractional loads (change integer to numeric)
-- Orders like 1.5 loads or 2.5 loads are common
ALTER TABLE public.orders ALTER COLUMN requested_loads TYPE numeric(6,1);

-- 7. Customer ID FK on profiles (replace fragile company_name string matching)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id);

-- 8. Dual-PO support
-- DR Horton has two PO layers: weekly field direction from superintendent + corporate/master PO
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS po_type text NOT NULL DEFAULT 'corporate'
  CHECK (po_type IN ('corporate', 'field_direction'));
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS parent_po_id uuid REFERENCES public.purchase_orders(id);

-- 9. Drop the unique constraint on (customer_id, po_number) -- corporate POs reuse numbers across sites
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'idx_po_number_customer') THEN
    ALTER TABLE public.purchase_orders DROP CONSTRAINT idx_po_number_customer;
  END IF;
  -- Also try dropping as index (CREATE UNIQUE INDEX creates an index, not a constraint name in pg_constraint)
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_po_number_customer') THEN
    DROP INDEX IF EXISTS public.idx_po_number_customer;
  END IF;
END $$;

-- Replace with a non-unique index
CREATE INDEX IF NOT EXISTS idx_po_customer_number ON public.purchase_orders(customer_id, po_number);

-- 10. Suppliers table (sand suppliers like United Sand, Hanson, etc.)
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_name text,
  phone text,
  email text,
  address text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 11. Supplier rates (what JFT pays the supplier per load by city)
CREATE TABLE IF NOT EXISTS public.supplier_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  material_id uuid NOT NULL REFERENCES public.materials(id),
  delivery_city text NOT NULL,
  rate_per_load numeric(10,2) NOT NULL,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_rates_lookup
  ON public.supplier_rates(supplier_id, material_id, delivery_city);

-- 12. Material aliases (Cushion Sand = Slab Sand = Backfill)
CREATE TABLE IF NOT EXISTS public.material_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  alias_name text NOT NULL,
  used_by_customer_id uuid REFERENCES public.customers(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_material_alias_unique
  ON public.material_aliases(material_id, alias_name);

-- 13. Site contacts (superintendent contacts — 35 for DR Horton alone)
CREATE TABLE IF NOT EXISTS public.site_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  role text DEFAULT 'superintendent',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_contacts_site ON public.site_contacts(site_id);

-- 14. Customer saved delivery addresses (reusable house addresses within subdivisions)
CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  label text,
  address text NOT NULL,
  city text,
  state text DEFAULT 'TX',
  zip text,
  site_id uuid REFERENCES public.sites(id),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer ON public.customer_addresses(customer_id);

-- ============================================================================
-- RLS policies for new tables
-- ============================================================================

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY admin_suppliers ON public.suppliers FOR ALL
  TO authenticated USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY admin_supplier_rates ON public.supplier_rates FOR ALL
  TO authenticated USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY admin_material_aliases ON public.material_aliases FOR ALL
  TO authenticated USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY admin_site_contacts ON public.site_contacts FOR ALL
  TO authenticated USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY admin_customer_addresses ON public.customer_addresses FOR ALL
  TO authenticated USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- Customers can manage their own saved addresses
CREATE POLICY customer_own_addresses ON public.customer_addresses FOR ALL
  TO authenticated
  USING (customer_id = public.get_user_customer_id())
  WITH CHECK (customer_id = public.get_user_customer_id());

-- Everyone can read material aliases (needed for lookups)
CREATE POLICY read_material_aliases ON public.material_aliases FOR SELECT
  TO authenticated USING (true);

-- Everyone can read site contacts (needed for dispatch)
CREATE POLICY read_site_contacts ON public.site_contacts FOR SELECT
  TO authenticated USING (true);

-- Carriers/drivers can read suppliers (they pick up from them)
CREATE POLICY carrier_read_suppliers ON public.suppliers FOR SELECT
  TO authenticated USING (public.get_user_role() IN ('admin', 'carrier', 'driver'));

-- ============================================================================
-- Update get_user_customer_id to use customer_id FK when available
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_customer_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
  cid uuid;
BEGIN
  -- First try the direct FK (new approach)
  SELECT customer_id INTO cid
  FROM public.profiles
  WHERE id = auth.uid() AND customer_id IS NOT NULL;

  IF cid IS NOT NULL THEN RETURN cid; END IF;

  -- Fallback to company_name match (legacy)
  SELECT c.id INTO cid
  FROM public.profiles p
  JOIN public.customers c ON c.name = p.company_name
  WHERE p.id = auth.uid();

  RETURN cid;
END;
$$;

-- ============================================================================
-- Triggers for updated_at on new tables
-- ============================================================================

CREATE TRIGGER set_suppliers_updated_at BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_supplier_rates_updated_at BEFORE UPDATE ON public.supplier_rates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_site_contacts_updated_at BEFORE UPDATE ON public.site_contacts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_customer_addresses_updated_at BEFORE UPDATE ON public.customer_addresses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
