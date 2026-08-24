/*
 * =========================================================
 * 136 - Revoke Legacy Management Workflow Entry Points
 *
 * PURPOSE
 * -------
 * The application has migrated to the management-controlled
 * wrappers introduced in migration 135:
 *
 *   create_purchase_order_from_award_managed(uuid)
 *   complete_goods_receipt_managed(uuid)
 *
 * Both wrappers have been validated through the production
 * application workflow.
 *
 * Direct authenticated execution of the underlying functions
 * is therefore no longer required.
 * =========================================================
 */


/* =========================================================
 * 1. Purchase Order creation primitive
 * ========================================================= */

revoke execute
on function public.create_purchase_order_from_award(
    uuid
)
from authenticated, anon, public;


/* =========================================================
 * 2. Goods Receipt completion primitive
 * ========================================================= */

revoke execute
on function public.complete_goods_receipt(
    uuid
)
from authenticated, anon, public;


/* =========================================================
 * 3. Documentation
 * ========================================================= */

comment on function public.create_purchase_order_from_award(
    uuid
)
is
'Internal Purchase Order creation workflow. Direct application execution is disabled; use create_purchase_order_from_award_managed(uuid).';


comment on function public.complete_goods_receipt(
    uuid
)
is
'Internal Goods Receipt completion and inventory-posting workflow. Direct application execution is disabled; use complete_goods_receipt_managed(uuid).';