-- ============================================================
-- Production Security Hardening
-- RPC / Function Execute Permissions
-- ============================================================

-- ------------------------------------------------------------
-- 1. Remove anonymous/public execution from ALL public functions
-- ------------------------------------------------------------

do $$
declare
  fn record;
begin
  for fn in
    select
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as arguments
    from pg_proc p
    join pg_namespace n
      on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    execute format(
      'revoke execute on function %I.%I(%s) from public, anon',
      fn.schema_name,
      fn.function_name,
      fn.arguments
    );
  end loop;
end
$$;


-- ------------------------------------------------------------
-- 2. Authorization helpers
-- ------------------------------------------------------------

grant execute on function public.is_admin()
to authenticated;

grant execute on function public.can_view_rfqs()
to authenticated;

grant execute on function public.can_manage_rfqs()
to authenticated;

grant execute on function public.can_approve_rfqs()
to authenticated;


-- ------------------------------------------------------------
-- 3. Product supplier management
-- ------------------------------------------------------------

grant execute on function
public.set_product_preferred_supplier(uuid, uuid)
to authenticated;

grant execute on function
public.archive_product_supplier(uuid, uuid)
to authenticated;

grant execute on function
public.restore_product_supplier(uuid, uuid)
to authenticated;


-- ------------------------------------------------------------
-- 4. RFQ workflows
-- ------------------------------------------------------------

grant execute on function
public.create_rfq_transaction(jsonb, jsonb, jsonb)
to authenticated;

grant execute on function
public.send_rfq(uuid)
to authenticated;

grant execute on function
public.close_rfq(uuid)
to authenticated;

grant execute on function
public.award_supplier_quotation(uuid, uuid)
to authenticated;


-- ------------------------------------------------------------
-- 5. Supplier quotation workflows
-- ------------------------------------------------------------

grant execute on function
public.submit_supplier_quotation(uuid)
to authenticated;

grant execute on function
public.review_supplier_quotation(uuid)
to authenticated;

grant execute on function
public.reject_supplier_quotation(uuid, text)
to authenticated;


-- ------------------------------------------------------------
-- 6. Purchase order workflows
-- ------------------------------------------------------------

grant execute on function
public.create_purchase_order(
  uuid,
  purchase_order_source,
  text,
  date,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  text,
  text,
  text,
  text,
  jsonb
)
to authenticated;

grant execute on function
public.create_purchase_order_from_award(uuid)
to authenticated;

grant execute on function
public.create_draft_goods_receipt(uuid, uuid)
to authenticated;

grant execute on function
public.complete_goods_receipt(uuid)
to authenticated;


-- ------------------------------------------------------------
-- 7. Inventory operations
-- ------------------------------------------------------------

grant execute on function
public.post_manual_inventory_transaction(
  text,
  uuid,
  date,
  text,
  text,
  text,
  jsonb
)
to authenticated;

grant execute on function
public.post_local_purchase_inventory(
  uuid,
  date,
  uuid,
  text,
  text,
  text,
  text,
  jsonb
)
to authenticated;

grant execute on function
public.get_inventory_dashboard_summary()
to authenticated;

grant execute on function
public.get_inventory_product_health(integer)
to authenticated;

grant execute on function
public.get_inventory_transaction_details(uuid)
to authenticated;

grant execute on function
public.get_inventory_transaction_page(
  text,
  text,
  uuid,
  text,
  date,
  date,
  text,
  text,
  integer,
  integer
)
to authenticated;

grant execute on function
public.get_warehouse_stock_page(
  text,
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  integer,
  integer
)
to authenticated;


-- ------------------------------------------------------------
-- 8. Sales order workflows
-- ------------------------------------------------------------

grant execute on function
public.confirm_sales_order_atomic(uuid, boolean)
to authenticated;

grant execute on function
public.cancel_sales_order_atomic(uuid)
to authenticated;

grant execute on function
public.synchronize_sales_order_fulfilment(uuid)
to authenticated;


-- ------------------------------------------------------------
-- 9. Delivery workflows
-- ------------------------------------------------------------

grant execute on function
public.create_delivery_from_sales_order(uuid)
to authenticated;

grant execute on function
public.start_delivery_picking(uuid)
to authenticated;

grant execute on function
public.confirm_delivery_picked(uuid)
to authenticated;

grant execute on function
public.start_delivery_packing(uuid)
to authenticated;

grant execute on function
public.confirm_delivery_packed(uuid)
to authenticated;

grant execute on function
public.dispatch_delivery_order_atomic(uuid)
to authenticated;

grant execute on function
public.mark_delivery_delivered(uuid)
to authenticated;

grant execute on function
public.cancel_delivery_order(uuid)
to authenticated;


-- ============================================================
-- IMPORTANT
--
-- Trigger-only functions intentionally receive NO direct
-- authenticated/anonymous EXECUTE grant here.
--
-- Examples:
--   handle_new_user()
--   set_customer_number()
--   set_customer_user_fields()
--   set_delivery_order_number()
--   set_delivery_order_user_fields()
--   set_inventory_transfer_created_by()
--   set_inventory_transfer_number()
--   set_rfq_user_fields()
--   set_sales_order_number()
--   set_sales_order_user_fields()
--   set_sales_quotation_number()
--   set_sales_quotation_user_fields()
--   sync_quotation_totals()
--   sync_rfq_quotation_status()
--   record_rfq_status_change()
--   etc.
--
-- PostgreSQL triggers can execute their trigger functions
-- without exposing those functions as RPCs to API clients.
-- ============================================================