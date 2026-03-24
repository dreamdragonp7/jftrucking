-- ============================================================================
-- Migration 005: Admin Controls
-- Account lifecycle, credit limits, and business settings support
-- ============================================================================

-- Add new profile status values
ALTER TYPE public.profile_status ADD VALUE IF NOT EXISTS 'deactivated';
ALTER TYPE public.profile_status ADD VALUE IF NOT EXISTS 'rejected';

-- Add suspension reason and metadata to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status_reason text,
  ADD COLUMN IF NOT EXISTS status_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS status_changed_by uuid REFERENCES public.profiles(id);

-- Add credit limit to customers
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS credit_limit numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_limit_enabled boolean DEFAULT false;
