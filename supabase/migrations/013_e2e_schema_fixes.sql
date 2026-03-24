-- Migration 013: E2E Schema Fixes
-- 1. Add missing columns to payments table (notes, payment_date, reference_number)
-- 2. Add 'completed' to dispatch_status enum
-- 3. Add trigger to prevent users from changing their own role via direct DB access

-- ============================================================================
-- 1. PAYMENTS TABLE: Add missing columns
-- ============================================================================

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS payment_date date,
  ADD COLUMN IF NOT EXISTS reference_number text;

-- ============================================================================
-- 2. DISPATCH STATUS ENUM: Add 'completed'
-- ============================================================================

ALTER TYPE public.dispatch_status ADD VALUE IF NOT EXISTS 'completed' AFTER 'delivered';

-- ============================================================================
-- 3. PROFILES ROLE PROTECTION: Prevent self-role-change at DB level
-- ============================================================================

-- This trigger fires BEFORE UPDATE on profiles.
-- If the role column is being changed AND the caller is not service_role,
-- it blocks the change. This prevents users from escalating privileges
-- via direct Supabase client calls (e.g., browser devtools).

CREATE OR REPLACE FUNCTION public.prevent_self_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check if role is actually changing
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- service_role can change anything (admin API, server actions)
    IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
      RETURN NEW;
    END IF;

    -- For authenticated users: block if they're changing their OWN role
    IF auth.uid() = OLD.id THEN
      RAISE EXCEPTION 'Users cannot change their own role';
    END IF;

    -- Non-self role changes by authenticated users are also blocked
    -- (only service_role / admin API should change roles)
    IF current_setting('request.jwt.claim.role', true) = 'authenticated' THEN
      RAISE EXCEPTION 'Role changes require admin privileges';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop if exists (idempotent)
DROP TRIGGER IF EXISTS prevent_self_role_change_trigger ON public.profiles;

CREATE TRIGGER prevent_self_role_change_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_role_change();

-- ============================================================================
-- 4. SEED QB ACCOUNT SETTINGS (if not already set)
-- ============================================================================

INSERT INTO public.app_settings (key, value, updated_at)
VALUES
  ('qb_expense_account', 'Subcontractor Expense', now()),
  ('qb_income_account', 'Services', now()),
  ('qb_bank_account', 'Checking', now())
ON CONFLICT (key) DO UPDATE
  SET value = CASE
    WHEN app_settings.value IS NULL OR app_settings.value = '' THEN EXCLUDED.value
    ELSE app_settings.value
  END,
  updated_at = now();
