-- Migration: Subcontractor (Carrier) Portal — Part 1
-- Adds carrier role and carrier_id column.
-- RLS policies are in 006b (enum values can't be used in the same transaction they're added).

-- Add carrier role
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'carrier';

-- Add carrier_id to profiles for linking carrier users to their carrier company
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS carrier_id uuid REFERENCES public.carriers(id);
