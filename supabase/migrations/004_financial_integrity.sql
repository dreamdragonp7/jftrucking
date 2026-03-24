-- ============================================================================
-- Migration 004: Financial Integrity Fixes
-- ============================================================================

-- Prevent duplicate QBO payment syncs
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_qb_payment_id_unique
ON public.payments (qb_payment_id)
WHERE qb_payment_id IS NOT NULL;

-- Prevent duplicate deliveries per dispatch (one load = one delivery)
CREATE UNIQUE INDEX IF NOT EXISTS idx_deliveries_dispatch_unique
ON public.deliveries (dispatch_id);

-- Atomic invoice number generation to prevent race conditions
CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS text AS $$
DECLARE
  year text := to_char(now(), 'YYYY');
  max_num int;
  next_num int;
BEGIN
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(invoice_number, '-', 3) AS int)
  ), 0) INTO max_num
  FROM public.invoices
  WHERE invoice_number LIKE 'JFT-' || year || '-%';

  next_num := max_num + 1;
  RETURN 'JFT-' || year || '-' || LPAD(next_num::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Atomic settlement number generation
CREATE OR REPLACE FUNCTION public.next_settlement_number()
RETURNS text AS $$
DECLARE
  max_num int;
  next_num int;
BEGIN
  SELECT COALESCE(MAX(
    CAST(REPLACE(settlement_number, 'SET-', '') AS int)
  ), 0) INTO max_num
  FROM public.carrier_settlements
  WHERE settlement_number LIKE 'SET-%';

  next_num := max_num + 1;
  RETURN 'SET-' || LPAD(next_num::text, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Add settlement_number column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'carrier_settlements'
    AND column_name = 'settlement_number'
  ) THEN
    ALTER TABLE public.carrier_settlements ADD COLUMN settlement_number text;
  END IF;
END $$;
