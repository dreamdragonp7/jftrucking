-- ============================================================================
-- Migration 002: App Settings key-value table
-- Used for QuickBooks OAuth tokens and other application configuration.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
  key         text PRIMARY KEY,
  value       text NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS: only service role can read/write app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON public.app_settings
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Admin users can read (but not write directly — writes go through server actions)
CREATE POLICY "admin_read_settings" ON public.app_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
