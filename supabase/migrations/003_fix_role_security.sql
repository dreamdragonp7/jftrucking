-- ============================================================================
-- Migration 003: Fix get_user_role() to read server-authoritative claim
-- ============================================================================
--
-- SECURITY FIX: The previous implementation read from `user_metadata.role`,
-- which is CLIENT-WRITABLE via supabase.auth.updateUser(). Any authenticated
-- user could escalate their role to "admin" by calling:
--
--   supabase.auth.updateUser({ data: { role: "admin" } })
--
-- The custom_access_token_hook (in 001_initial_schema.sql) sets a top-level
-- `user_role` claim from the profiles table, which is only writable via the
-- service_role key. This migration fixes get_user_role() to read that
-- server-authoritative claim instead.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role AS $$
  -- Read the server-set 'user_role' claim from the JWT (set by custom_access_token_hook),
  -- NOT 'user_metadata.role' which is client-writable.
  SELECT COALESCE(
    (auth.jwt() ->> 'user_role')::public.user_role,
    (SELECT role FROM public.profiles WHERE id = auth.uid())
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';
