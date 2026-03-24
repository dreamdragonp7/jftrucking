-- Migration: Subcontractor (Carrier) Portal — Part 2
-- RLS policies for carrier role (enum value was added in 006).

-- Carriers can see their own carrier record
CREATE POLICY carrier_own_carrier ON public.carriers
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'carrier'
    AND id = (SELECT carrier_id FROM public.profiles WHERE id = auth.uid())
  );

-- Carriers can see drivers linked to their carrier
CREATE POLICY carrier_own_drivers ON public.drivers
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'carrier'
    AND carrier_id = (SELECT carrier_id FROM public.profiles WHERE id = auth.uid())
  );

-- Carriers can see trucks linked to their carrier
CREATE POLICY carrier_own_trucks ON public.trucks
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'carrier'
    AND carrier_id = (SELECT carrier_id FROM public.profiles WHERE id = auth.uid())
  );

-- Carriers can see dispatches assigned to their drivers
CREATE POLICY carrier_own_dispatches ON public.dispatches
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'carrier'
    AND driver_id IN (
      SELECT id FROM public.drivers
      WHERE carrier_id = (SELECT carrier_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Carriers can see deliveries from their dispatches
CREATE POLICY carrier_own_deliveries ON public.deliveries
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'carrier'
    AND dispatch_id IN (
      SELECT d.id FROM public.dispatches d
      JOIN public.drivers dr ON d.driver_id = dr.id
      WHERE dr.carrier_id = (SELECT carrier_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Carriers can see their own settlements
CREATE POLICY carrier_own_settlements ON public.carrier_settlements
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'carrier'
    AND carrier_id = (SELECT carrier_id FROM public.profiles WHERE id = auth.uid())
  );

-- Carriers can see their own settlement lines
CREATE POLICY carrier_own_settlement_lines ON public.carrier_settlement_lines
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'carrier'
    AND settlement_id IN (
      SELECT id FROM public.carrier_settlements
      WHERE carrier_id = (SELECT carrier_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Carriers can see sites (read-only, need for dispatch context)
CREATE POLICY carrier_read_sites ON public.sites
  FOR SELECT TO authenticated
  USING (public.get_user_role() = 'carrier');

-- Carriers can see materials (read-only)
CREATE POLICY carrier_read_materials ON public.materials
  FOR SELECT TO authenticated
  USING (public.get_user_role() = 'carrier');

-- Carriers can read their own notifications
CREATE POLICY carrier_own_notifications ON public.notifications
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'carrier'
    AND user_id = auth.uid()
  );

-- Helper function to get carrier ID for current user
CREATE OR REPLACE FUNCTION public.get_user_carrier_id()
RETURNS uuid AS $$
  SELECT carrier_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';
