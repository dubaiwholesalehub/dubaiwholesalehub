/*
 * =========================================================
 * 132 - Internal RPC Isolation
 *
 * PURPOSE
 * -------
 * Remove direct API execution privileges from database
 * functions that are not application-facing RPCs.
 *
 * This migration covers:
 *
 *   1. Retired historical accounting backfill functions
 *   2. Database trigger-only functions
 *
 * IMPORTANT
 * ---------
 * GL posting primitives are intentionally NOT changed here.
 * They will be reviewed separately because higher-level ERP
 * posting functions depend on them internally.
 * =========================================================
 */


/* =========================================================
 * 1. Historical accounting backfills
 *
 * These were administrative migration/reconciliation tools.
 * The production Next.js application no longer calls them.
 * ========================================================= */

revoke execute
on function public.backfill_historical_receipt_payment_gl()
from authenticated;

revoke execute
on function public.backfill_historical_inventory_gl()
from authenticated;

revoke execute
on function public.backfill_legacy_local_purchase_gl()
from authenticated;

revoke execute
on function public.backfill_historical_ar_ap_gl()
from authenticated;


/* =========================================================
 * 2. Trigger-only functions
 *
 * These functions are invoked by PostgreSQL triggers and
 * must not be directly exposed as authenticated RPCs.
 * ========================================================= */

revoke execute
on function public.handle_new_user()
from authenticated;

revoke execute
on function public.enforce_sales_order_margin_before_confirmation()
from authenticated;

revoke execute
on function public.link_quick_purchase_inventory_item_trigger()
from authenticated;


/* =========================================================
 * 3. Defensive privilege cleanup
 *
 * Migration 131 already established these restrictions.
 * Repeat them explicitly for the isolated functions so their
 * intended privilege model is self-documenting.
 * ========================================================= */

revoke execute
on function public.backfill_historical_receipt_payment_gl()
from anon, public;

revoke execute
on function public.backfill_historical_inventory_gl()
from anon, public;

revoke execute
on function public.backfill_legacy_local_purchase_gl()
from anon, public;

revoke execute
on function public.backfill_historical_ar_ap_gl()
from anon, public;

revoke execute
on function public.handle_new_user()
from anon, public;

revoke execute
on function public.enforce_sales_order_margin_before_confirmation()
from anon, public;

revoke execute
on function public.link_quick_purchase_inventory_item_trigger()
from anon, public;


/* =========================================================
 * Documentation
 * ========================================================= */

comment on function
    public.backfill_historical_receipt_payment_gl()
is
    'Internal historical accounting reconciliation utility. Direct application execution is disabled.';

comment on function
    public.backfill_historical_inventory_gl()
is
    'Internal historical inventory accounting reconciliation utility. Direct application execution is disabled.';

comment on function
    public.backfill_legacy_local_purchase_gl()
is
    'Internal legacy local-purchase accounting reconciliation utility. Direct application execution is disabled.';

comment on function
    public.backfill_historical_ar_ap_gl()
is
    'Internal historical AR/AP accounting reconciliation utility. Direct application execution is disabled.';

comment on function
    public.handle_new_user()
is
    'Internal authentication profile trigger function. Direct application execution is disabled.';

comment on function
    public.enforce_sales_order_margin_before_confirmation()
is
    'Internal Sales Order margin enforcement trigger function. Direct application execution is disabled.';

comment on function
    public.link_quick_purchase_inventory_item_trigger()
is
    'Internal Quick Purchase inventory-lineage trigger function. Direct application execution is disabled.';