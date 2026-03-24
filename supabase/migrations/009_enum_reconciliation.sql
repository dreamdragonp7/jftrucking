-- ============================================================================
-- Migration 009: Enum Reconciliation
-- Aligns SQL enum types with TypeScript types in src/types/database.ts
-- ============================================================================

-- ----------------------------------------------------------------------------
-- dispatch_status: Add 'in_progress'
-- The old granular values (in_transit, at_pickup, loaded, delivering) are
-- deprecated in favour of a single 'in_progress' state. We cannot remove
-- enum values in Postgres without recreating the type, so the old values
-- remain in the SQL enum but should not be used by new code.
-- ----------------------------------------------------------------------------
ALTER TYPE public.dispatch_status ADD VALUE IF NOT EXISTS 'in_progress' AFTER 'acknowledged';

-- ----------------------------------------------------------------------------
-- profile_status: Add 'inactive'
-- TypeScript uses "active" | "inactive" | "pending" | "suspended" |
-- "deactivated" | "rejected". SQL has all except 'inactive'.
-- ----------------------------------------------------------------------------
ALTER TYPE public.profile_status ADD VALUE IF NOT EXISTS 'inactive';

-- ----------------------------------------------------------------------------
-- confirmation_status: No SQL changes needed.
-- SQL already has: pending, confirmed, disputed, auto_confirmed, admin_override
-- TypeScript updated to match SQL (added auto_confirmed, admin_override).
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- invoice_status: No SQL changes needed.
-- SQL already has: draft, sent, viewed, paid, overdue, cancelled, partially_paid
-- TypeScript updated to match SQL (added viewed, overdue, partially_paid).
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- NOTE: rate_type still has 'per_hour' and unit_of_measure still has
-- 'cubic_yard' in SQL. TypeScript no longer exposes these since the business
-- only uses per_ton/per_load and ton/load. The SQL values are harmless and
-- removing them would require type recreation, so they stay.
-- ----------------------------------------------------------------------------
