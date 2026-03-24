-- ============================================================================
-- Migration 011: QuickBooks Environment Isolation
-- ============================================================================
-- PURPOSE: Prevent sandbox QB data from polluting production data.
--
-- This migration adds environment tracking to every table that stores QB IDs,
-- to the sync log, and to the token storage. It creates guard functions that
-- prevent cross-environment operations at the database level.
--
-- TABLES MODIFIED:
--   customers       — add qb_environment
--   carriers        — add qb_environment
--   invoices        — add qb_environment
--   payments        — add qb_environment
--   carrier_settlements — add qb_environment
--   qb_sync_log     — add qb_environment
--   app_settings    — new keys for environment tracking
--
-- NEW TABLE:
--   qb_environment_state — single-row table tracking current QB mode
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Create the environment enum
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'qb_environment') THEN
    CREATE TYPE public.qb_environment AS ENUM ('sandbox', 'production');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Single-row environment state table
-- ---------------------------------------------------------------------------
-- This table stores the CURRENT operating environment for QuickBooks.
-- It is the single source of truth — the app reads this to know whether
-- it should talk to sandbox or production QBO.
-- Only one row is ever allowed (enforced by CHECK + unique constraint).

CREATE TABLE IF NOT EXISTS public.qb_environment_state (
  id                  int PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- enforce single row
  current_environment public.qb_environment NOT NULL DEFAULT 'sandbox',
  switched_at         timestamptz NOT NULL DEFAULT now(),
  switched_by         uuid REFERENCES public.profiles(id),
  previous_environment public.qb_environment,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Insert default row (sandbox)
INSERT INTO public.qb_environment_state (id, current_environment)
VALUES (1, 'sandbox')
ON CONFLICT (id) DO NOTHING;

-- RLS: only admins can read, only service_role can write
ALTER TABLE public.qb_environment_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_env_state" ON public.qb_environment_state
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "service_role_write_env_state" ON public.qb_environment_state
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 3. Add qb_environment column to all QB-linked tables
-- ---------------------------------------------------------------------------

-- customers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'customers'
    AND column_name = 'qb_environment'
  ) THEN
    ALTER TABLE public.customers
      ADD COLUMN qb_environment public.qb_environment;
  END IF;
END $$;

-- carriers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'carriers'
    AND column_name = 'qb_environment'
  ) THEN
    ALTER TABLE public.carriers
      ADD COLUMN qb_environment public.qb_environment;
  END IF;
END $$;

-- invoices
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices'
    AND column_name = 'qb_environment'
  ) THEN
    ALTER TABLE public.invoices
      ADD COLUMN qb_environment public.qb_environment;
  END IF;
END $$;

-- payments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments'
    AND column_name = 'qb_environment'
  ) THEN
    ALTER TABLE public.payments
      ADD COLUMN qb_environment public.qb_environment;
  END IF;
END $$;

-- carrier_settlements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'carrier_settlements'
    AND column_name = 'qb_environment'
  ) THEN
    ALTER TABLE public.carrier_settlements
      ADD COLUMN qb_environment public.qb_environment;
  END IF;
END $$;

-- qb_sync_log
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'qb_sync_log'
    AND column_name = 'qb_environment'
  ) THEN
    ALTER TABLE public.qb_sync_log
      ADD COLUMN qb_environment public.qb_environment;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Backfill: mark any existing QB IDs as sandbox
--    (Since we've only used sandbox so far, this is safe)
-- ---------------------------------------------------------------------------
UPDATE public.customers
  SET qb_environment = 'sandbox'
  WHERE qb_customer_id IS NOT NULL AND qb_environment IS NULL;

UPDATE public.carriers
  SET qb_environment = 'sandbox'
  WHERE qb_vendor_id IS NOT NULL AND qb_environment IS NULL;

UPDATE public.invoices
  SET qb_environment = 'sandbox'
  WHERE qb_invoice_id IS NOT NULL AND qb_environment IS NULL;

UPDATE public.payments
  SET qb_environment = 'sandbox'
  WHERE qb_payment_id IS NOT NULL AND qb_environment IS NULL;

UPDATE public.carrier_settlements
  SET qb_environment = 'sandbox'
  WHERE qb_bill_id IS NOT NULL AND qb_environment IS NULL;

UPDATE public.qb_sync_log
  SET qb_environment = 'sandbox'
  WHERE qb_environment IS NULL;

-- ---------------------------------------------------------------------------
-- 5. CHECK constraints: qb_environment MUST be set when a QB ID is present
-- ---------------------------------------------------------------------------

ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS chk_customers_qb_env;
ALTER TABLE public.customers
  ADD CONSTRAINT chk_customers_qb_env
  CHECK (
    (qb_customer_id IS NULL AND qb_environment IS NULL)
    OR (qb_customer_id IS NOT NULL AND qb_environment IS NOT NULL)
  );

ALTER TABLE public.carriers
  DROP CONSTRAINT IF EXISTS chk_carriers_qb_env;
ALTER TABLE public.carriers
  ADD CONSTRAINT chk_carriers_qb_env
  CHECK (
    (qb_vendor_id IS NULL AND qb_environment IS NULL)
    OR (qb_vendor_id IS NOT NULL AND qb_environment IS NOT NULL)
  );

ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS chk_invoices_qb_env;
ALTER TABLE public.invoices
  ADD CONSTRAINT chk_invoices_qb_env
  CHECK (
    (qb_invoice_id IS NULL AND qb_environment IS NULL)
    OR (qb_invoice_id IS NOT NULL AND qb_environment IS NOT NULL)
  );

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS chk_payments_qb_env;
ALTER TABLE public.payments
  ADD CONSTRAINT chk_payments_qb_env
  CHECK (
    (qb_payment_id IS NULL AND qb_environment IS NULL)
    OR (qb_payment_id IS NOT NULL AND qb_environment IS NOT NULL)
  );

ALTER TABLE public.carrier_settlements
  DROP CONSTRAINT IF EXISTS chk_settlements_qb_env;
ALTER TABLE public.carrier_settlements
  ADD CONSTRAINT chk_settlements_qb_env
  CHECK (
    (qb_bill_id IS NULL AND qb_environment IS NULL)
    OR (qb_bill_id IS NOT NULL AND qb_environment IS NOT NULL)
  );

-- ---------------------------------------------------------------------------
-- 6. Trigger: prevent writing a QB ID with wrong environment
-- ---------------------------------------------------------------------------
-- This trigger fires BEFORE INSERT or UPDATE on any QB-linked table.
-- It reads the current environment from qb_environment_state and ensures
-- the qb_environment on the row matches.

CREATE OR REPLACE FUNCTION public.enforce_qb_environment()
RETURNS trigger AS $$
DECLARE
  current_env public.qb_environment;
BEGIN
  -- Only check when a QB ID is being set
  -- The trigger is generic; the calling trigger definition determines
  -- which column to check via TG_ARGV[0] (the QB ID column name).

  -- Get current environment
  SELECT current_environment INTO current_env
  FROM public.qb_environment_state
  WHERE id = 1;

  -- If no environment state row exists, default to sandbox
  IF current_env IS NULL THEN
    current_env := 'sandbox';
  END IF;

  -- Auto-set the qb_environment column to match current state
  IF NEW.qb_environment IS NULL THEN
    NEW.qb_environment := current_env;
  END IF;

  -- Block writes where qb_environment doesn't match current state
  IF NEW.qb_environment != current_env THEN
    RAISE EXCEPTION 'QB environment mismatch: row has %, but system is in % mode. '
      'Cannot write cross-environment QB data.',
      NEW.qb_environment, current_env;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to customers (only fires when qb_customer_id is set)
DROP TRIGGER IF EXISTS trg_customers_qb_env ON public.customers;
CREATE TRIGGER trg_customers_qb_env
  BEFORE INSERT OR UPDATE ON public.customers
  FOR EACH ROW
  WHEN (NEW.qb_customer_id IS NOT NULL)
  EXECUTE FUNCTION public.enforce_qb_environment();

-- Apply trigger to carriers
DROP TRIGGER IF EXISTS trg_carriers_qb_env ON public.carriers;
CREATE TRIGGER trg_carriers_qb_env
  BEFORE INSERT OR UPDATE ON public.carriers
  FOR EACH ROW
  WHEN (NEW.qb_vendor_id IS NOT NULL)
  EXECUTE FUNCTION public.enforce_qb_environment();

-- Apply trigger to invoices
DROP TRIGGER IF EXISTS trg_invoices_qb_env ON public.invoices;
CREATE TRIGGER trg_invoices_qb_env
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW
  WHEN (NEW.qb_invoice_id IS NOT NULL)
  EXECUTE FUNCTION public.enforce_qb_environment();

-- Apply trigger to payments
DROP TRIGGER IF EXISTS trg_payments_qb_env ON public.payments;
CREATE TRIGGER trg_payments_qb_env
  BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW
  WHEN (NEW.qb_payment_id IS NOT NULL)
  EXECUTE FUNCTION public.enforce_qb_environment();

-- Apply trigger to carrier_settlements
DROP TRIGGER IF EXISTS trg_settlements_qb_env ON public.carrier_settlements;
CREATE TRIGGER trg_settlements_qb_env
  BEFORE INSERT OR UPDATE ON public.carrier_settlements
  FOR EACH ROW
  WHEN (NEW.qb_bill_id IS NOT NULL)
  EXECUTE FUNCTION public.enforce_qb_environment();

-- ---------------------------------------------------------------------------
-- 7. Environment switch audit log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.qb_environment_switch_log (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_environment     public.qb_environment NOT NULL,
  to_environment       public.qb_environment NOT NULL,
  switched_by          uuid REFERENCES public.profiles(id),
  sandbox_records_cleared boolean NOT NULL DEFAULT false,
  production_records_backed_up boolean NOT NULL DEFAULT false,
  notes                text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.qb_environment_switch_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_env_switch_log" ON public.qb_environment_switch_log
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "service_role_write_env_switch_log" ON public.qb_environment_switch_log
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 8. Function: clear sandbox QB data (used during sandbox->production switch)
-- ---------------------------------------------------------------------------
-- This function NULLs out all sandbox QB IDs so they don't collide with
-- production IDs. The TMS records themselves are preserved.

CREATE OR REPLACE FUNCTION public.clear_sandbox_qb_data()
RETURNS jsonb AS $$
DECLARE
  cleared jsonb := '{}'::jsonb;
  cnt int;
BEGIN
  -- Clear customer QB IDs
  UPDATE public.customers
    SET qb_customer_id = NULL, qb_environment = NULL
    WHERE qb_environment = 'sandbox' AND qb_customer_id IS NOT NULL;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  cleared := cleared || jsonb_build_object('customers', cnt);

  -- Clear carrier QB IDs
  UPDATE public.carriers
    SET qb_vendor_id = NULL, qb_environment = NULL
    WHERE qb_environment = 'sandbox' AND qb_vendor_id IS NOT NULL;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  cleared := cleared || jsonb_build_object('carriers', cnt);

  -- Clear invoice QB IDs
  UPDATE public.invoices
    SET qb_invoice_id = NULL, qb_environment = NULL
    WHERE qb_environment = 'sandbox' AND qb_invoice_id IS NOT NULL;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  cleared := cleared || jsonb_build_object('invoices', cnt);

  -- Clear payment QB IDs
  UPDATE public.payments
    SET qb_payment_id = NULL, qb_environment = NULL
    WHERE qb_environment = 'sandbox' AND qb_payment_id IS NOT NULL;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  cleared := cleared || jsonb_build_object('payments', cnt);

  -- Clear settlement QB IDs
  UPDATE public.carrier_settlements
    SET qb_bill_id = NULL, qb_environment = NULL
    WHERE qb_environment = 'sandbox' AND qb_bill_id IS NOT NULL;
  GET DIAGNOSTICS cnt = ROW_COUNT;
  cleared := cleared || jsonb_build_object('settlements', cnt);

  RETURN cleared;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 9. Function: count QB data by environment (diagnostic)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.qb_data_summary()
RETURNS jsonb AS $$
DECLARE
  result jsonb := '{}'::jsonb;
  sandbox_count int;
  prod_count int;
BEGIN
  SELECT count(*) INTO sandbox_count FROM public.customers WHERE qb_environment = 'sandbox';
  SELECT count(*) INTO prod_count FROM public.customers WHERE qb_environment = 'production';
  result := result || jsonb_build_object('customers', jsonb_build_object('sandbox', sandbox_count, 'production', prod_count));

  SELECT count(*) INTO sandbox_count FROM public.carriers WHERE qb_environment = 'sandbox';
  SELECT count(*) INTO prod_count FROM public.carriers WHERE qb_environment = 'production';
  result := result || jsonb_build_object('carriers', jsonb_build_object('sandbox', sandbox_count, 'production', prod_count));

  SELECT count(*) INTO sandbox_count FROM public.invoices WHERE qb_environment = 'sandbox';
  SELECT count(*) INTO prod_count FROM public.invoices WHERE qb_environment = 'production';
  result := result || jsonb_build_object('invoices', jsonb_build_object('sandbox', sandbox_count, 'production', prod_count));

  SELECT count(*) INTO sandbox_count FROM public.payments WHERE qb_environment = 'sandbox';
  SELECT count(*) INTO prod_count FROM public.payments WHERE qb_environment = 'production';
  result := result || jsonb_build_object('payments', jsonb_build_object('sandbox', sandbox_count, 'production', prod_count));

  SELECT count(*) INTO sandbox_count FROM public.carrier_settlements WHERE qb_environment = 'sandbox';
  SELECT count(*) INTO prod_count FROM public.carrier_settlements WHERE qb_environment = 'production';
  result := result || jsonb_build_object('settlements', jsonb_build_object('sandbox', sandbox_count, 'production', prod_count));

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 10. Indexes for environment-filtered queries
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_customers_qb_env
  ON public.customers(qb_environment)
  WHERE qb_environment IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_carriers_qb_env
  ON public.carriers(qb_environment)
  WHERE qb_environment IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_qb_env
  ON public.invoices(qb_environment)
  WHERE qb_environment IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_qb_env
  ON public.payments(qb_environment)
  WHERE qb_environment IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_settlements_qb_env
  ON public.carrier_settlements(qb_environment)
  WHERE qb_environment IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_qb_sync_log_env
  ON public.qb_sync_log(qb_environment)
  WHERE qb_environment IS NOT NULL;
