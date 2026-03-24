-- =============================================
-- Carrier table completeness (subcontractor onboarding)
-- =============================================
ALTER TABLE public.carriers
  ADD COLUMN IF NOT EXISTS dba text,
  ADD COLUMN IF NOT EXISTS mc_number text,
  ADD COLUMN IF NOT EXISTS dot_number text,
  ADD COLUMN IF NOT EXISTS bank_routing_encrypted text,
  ADD COLUMN IF NOT EXISTS bank_account_encrypted text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS insurance_cert_url text,
  ADD COLUMN IF NOT EXISTS agreement_url text,
  ADD COLUMN IF NOT EXISTS agreement_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_terms text DEFAULT 'net_14',
  ADD COLUMN IF NOT EXISTS is_1099_tracked boolean DEFAULT true;

-- =============================================
-- Truck table completeness
-- =============================================
ALTER TABLE public.trucks
  ADD COLUMN IF NOT EXISTS vin text,
  ADD COLUMN IF NOT EXISTS year integer,
  ADD COLUMN IF NOT EXISTS make text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS insurance_policy text,
  ADD COLUMN IF NOT EXISTS insurance_expiry date;

-- =============================================
-- Driver table completeness
-- =============================================
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS truck_id uuid REFERENCES public.trucks(id);

-- =============================================
-- Tax forms table (1099-NEC, W-9 tracking)
-- =============================================
CREATE TABLE IF NOT EXISTS public.tax_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id uuid NOT NULL REFERENCES public.carriers(id) ON DELETE CASCADE,
  form_type text NOT NULL CHECK (form_type IN ('w9', '1099_nec')),
  tax_year integer NOT NULL,
  total_paid numeric DEFAULT 0,
  filed_at timestamptz,
  form_url text,
  qbo_synced boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tax_forms ENABLE ROW LEVEL SECURITY;

-- Admin can manage all tax forms
CREATE POLICY admin_tax_forms_all ON public.tax_forms
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- Carriers can view their own tax forms
CREATE POLICY carrier_own_tax_forms ON public.tax_forms
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'carrier'
    AND carrier_id = (SELECT carrier_id FROM public.profiles WHERE id = auth.uid())
  );

-- Updated at trigger
CREATE TRIGGER set_tax_forms_updated_at
  BEFORE UPDATE ON public.tax_forms
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
