-- ============================================================
-- Migration 184
-- Grant authenticated read access to opening-balance
-- outstanding calculation helpers.
--
-- These functions are read-only helpers used by:
--   - receivable_open_items
--   - supplier_payable_open_items
--   - Opening Balance Register
--
-- Lifecycle mutation/sync functions remain restricted.
-- ============================================================

revoke all
on function public.get_customer_opening_balance_outstanding(uuid)
from public, anon;

grant execute
on function public.get_customer_opening_balance_outstanding(uuid)
to authenticated;


revoke all
on function public.get_supplier_opening_balance_outstanding(uuid)
from public, anon;

grant execute
on function public.get_supplier_opening_balance_outstanding(uuid)
to authenticated;