-- ============================================================================
-- Fix: handle_delivery_confirmed should not count cancelled dispatches
--
-- BUG: The original trigger blindly increments quantity_delivered when a
-- delivery's confirmation_status changes to confirmed, even if the parent
-- dispatch was cancelled. This can inflate PO progress and prematurely
-- mark POs as fulfilled.
--
-- FIX: Add a check that the dispatch status is NOT 'cancelled' before
-- incrementing quantity_delivered on the purchase order.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_delivery_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act when confirmation_status changes to 'confirmed' or 'auto_confirmed' or 'admin_override'
  IF (NEW.confirmation_status IN ('confirmed', 'auto_confirmed', 'admin_override'))
     AND (OLD.confirmation_status = 'pending' OR OLD.confirmation_status = 'disputed') THEN

    -- Get the purchase_order_id from the dispatch, but ONLY if the dispatch
    -- is not cancelled. A cancelled dispatch should not affect PO progress.
    UPDATE public.purchase_orders
    SET quantity_delivered = quantity_delivered + COALESCE(NEW.net_weight, 0)
    WHERE id = (
      SELECT purchase_order_id FROM public.dispatches
      WHERE id = NEW.dispatch_id
        AND purchase_order_id IS NOT NULL
        AND status != 'cancelled'
    );

    -- Auto-fulfill PO if quantity met
    UPDATE public.purchase_orders
    SET status = 'fulfilled'
    WHERE id = (
      SELECT purchase_order_id FROM public.dispatches
      WHERE id = NEW.dispatch_id
        AND purchase_order_id IS NOT NULL
        AND status != 'cancelled'
    )
    AND quantity_delivered >= quantity_ordered
    AND status = 'active';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
