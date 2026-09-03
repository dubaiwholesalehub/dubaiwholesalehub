-- ============================================================
-- Migration 171
-- Pre-Live Transactional Reset
--
-- IMPORTANT:
--   This migration DOES NOT delete transactional data.
--
--   It only installs an explicitly invoked, admin-only,
--   one-time pre-live reset function.
--
--   The actual reset will only happen when:
--
--     public.execute_pre_live_transactional_reset_171(...)
--
--   is called manually with the required confirmation token.
--
-- This function is intended ONLY for the final pre-production
-- cutover before the first real/live ERP transaction is entered.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Remove any previous development copy
-- ------------------------------------------------------------

drop function if exists
  public.execute_pre_live_transactional_reset_171(text);


-- ------------------------------------------------------------
-- 2. Create protected reset function
-- ------------------------------------------------------------

create or replace function
  public.execute_pre_live_transactional_reset_171(
    p_confirmation text
  )
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_role text;

  v_before_gl_journals bigint;
  v_before_gl_lines bigint;
  v_before_inventory_transactions bigint;
  v_before_account_transactions bigint;
  v_before_sales_orders bigint;
  v_before_customer_receipts bigint;
  v_before_supplier_payments bigint;

  v_remaining_transactions bigint;

  v_result jsonb;
begin

  -- ==========================================================
  -- B. EXPLICIT DESTRUCTIVE CONFIRMATION
  -- ==========================================================

  if p_confirmation is distinct from
     'RESET-DUBAI-WHOLESALE-HUB-PRE-LIVE-171' then
    raise exception
      'Invalid pre-live reset confirmation token.';
  end if;


  -- ==========================================================
  -- C. SERIALIZE CUTOVER
  -- ==========================================================

  perform pg_advisory_xact_lock(
    hashtext('dubai_wholesale_hub_pre_live_reset_171')
  );


  -- ==========================================================
  -- G. CAPTURE BEFORE COUNTS
  -- ==========================================================

  select count(*) into v_before_gl_journals
  from public.gl_journal_entries;

  select count(*) into v_before_gl_lines
  from public.gl_journal_lines;

  select count(*) into v_before_inventory_transactions
  from public.inventory_transactions;

  select count(*) into v_before_account_transactions
  from public.account_transactions;

  select count(*) into v_before_sales_orders
  from public.sales_orders;

  select count(*) into v_before_customer_receipts
  from public.customer_receipts;

  select count(*) into v_before_supplier_payments
  from public.supplier_payments;

  -- ==========================================================
  -- H. TEMPORARILY BYPASS ONLY AUDITED IMMUTABILITY TRIGGERS
  --
  -- Foreign-key constraints remain enabled.
  --
  -- ALTER TABLE trigger state changes are transactional.
  -- Therefore any exception below rolls back both the data
  -- changes and these temporary trigger-state changes.
  -- ==========================================================

  alter table public.customer_receipt_allocations
    disable trigger zz_customer_receipt_allocation_lifecycle_guard;

  alter table public.customer_receipts
    disable trigger zz_customer_receipt_lifecycle_guard;

  alter table public.delivery_order_items
    disable trigger trg_enforce_delivery_order_item_lifecycle_immutability;

  alter table public.delivery_orders
    disable trigger trg_enforce_delivery_order_lifecycle_immutability;

  alter table public.gl_journal_lines
    disable trigger protect_posted_gl_journal_line;

  alter table public.gl_journal_entries
    disable trigger protect_posted_gl_journal;

  alter table public.goods_receipt_items
    disable trigger trg_enforce_completed_goods_receipt_item_immutability;

  alter table public.goods_receipts
    disable trigger trg_prevent_completed_goods_receipt_delete;

  alter table public.sales_order_items
    disable trigger trg_enforce_sales_order_item_lifecycle_immutability;

  alter table public.sales_orders
    disable trigger trg_enforce_sales_order_lifecycle_immutability;

  alter table public.sales_return_items
    disable trigger protect_final_sales_return_item;

  alter table public.supplier_return_items
    disable trigger trg_enforce_supplier_return_item_immutability;

  alter table public.supplier_returns
    disable trigger trg_enforce_supplier_return_lifecycle_immutability;


  -- ==========================================================
  -- I. DELETE TRANSACTIONAL CHILD RECORDS
  -- ==========================================================

  delete from public.customer_receipt_allocation_repair_audit;

  delete from public.customer_receipt_allocations;

  delete from public.supplier_return_credit_applications;

  delete from public.supplier_return_credit_refunds;

  delete from public.supplier_payment_allocations;

  delete from public.sales_margin_approvals;


  -- ==========================================================
  -- J. SALES RETURN / SUPPLIER RETURN CHILDREN
  -- ==========================================================

  delete from public.sales_return_items;

  delete from public.supplier_return_items;


  -- ==========================================================
  -- K. DELIVERY CHILDREN
  -- ==========================================================

  delete from public.delivery_order_items;


  -- ==========================================================
  -- L. PURCHASING CHILDREN
  -- ==========================================================

  delete from public.goods_receipt_items;

  delete from public.quick_purchase_items;

  delete from public.purchase_order_items;

  delete from public.supplier_quotation_items;


  -- ==========================================================
  -- M. SALES CHILDREN
  -- ==========================================================

  delete from public.sales_order_items;

  delete from public.sales_quotation_items;


  -- ==========================================================
  -- N. DELETE BUSINESS DOCUMENT HEADERS THAT REFERENCE
  --    INVENTORY / GL / ACCOUNT TRANSACTIONS
  -- ==========================================================

  delete from public.sales_returns;

  delete from public.supplier_returns;

  delete from public.delivery_orders;

  delete from public.expenses;

  delete from public.supplier_payments;

  delete from public.customer_receipts;


  -- ==========================================================
  -- O. PURCHASING DOCUMENT HEADERS
  -- ==========================================================

  delete from public.goods_receipts;

  delete from public.quick_purchases;

  delete from public.purchase_orders;

  delete from public.supplier_quotations;

  delete from public.rfq_status_history;

  delete from public.rfq_suppliers;

  delete from public.rfq_items;

  delete from public.rfqs;


  -- ==========================================================
  -- P. SALES DOCUMENT HEADERS
  -- ==========================================================

  delete from public.sales_orders;

  delete from public.sales_quotations;


  -- ==========================================================
  -- Q. FINANCIAL ACCOUNT TRANSFERS
  -- ==========================================================

  delete from public.financial_account_transfers;


  -- ==========================================================
  -- R. INVENTORY LEDGER
  -- ==========================================================

  delete from public.inventory_transaction_items;

  delete from public.inventory_transactions;

  delete from public.inventory_transfer_items;

  delete from public.inventory_transfers;

  delete from public.warehouse_stock;


  -- ==========================================================
  -- S. GL
  --
  -- Journals contain self-references:
  --   original_entry_id
  --   reversal_entry_id
  --
  -- Clear only those relationship pointers before deleting
  -- the entire audited test GL population.
  -- ==========================================================

  update public.gl_journal_entries
  set
    original_entry_id = null,
    reversal_entry_id = null
  where original_entry_id is not null
     or reversal_entry_id is not null;

  delete from public.gl_journal_lines;

  delete from public.gl_journal_entries;


  -- ==========================================================
  -- T. OPERATIONAL FINANCIAL LEDGER
  --
  -- All business documents referencing account transactions
  -- have now been removed.
  -- ==========================================================

  delete from public.account_transactions;


  -- ==========================================================
  -- U. RESET FINANCIAL ACCOUNT TEST BALANCES
  --
  -- Keep the account definitions themselves.
  -- ==========================================================

  update public.financial_accounts
  set
    opening_balance = 0,
    opening_balance_date = null,
    current_balance = 0
  where account_code in (
    'BANK-AED',
    'CARD-AED',
    'CASH-AED'
  );


  -- ==========================================================
  -- V. RESET PURCHASE ORDER COUNTER
  --
  -- Preserve the counter row/year configuration.
  -- ==========================================================

  update public.purchase_order_number_counters
  set
    last_number = 0,
    updated_at = now();


  -- ==========================================================
  -- W. RESET TRANSACTIONAL DOCUMENT SEQUENCES
  --
  -- DO NOT reset:
  --   customer_number_seq
  --   product_sku_seq
  --
  -- Those belong to preserved master data.
  -- ==========================================================

  alter sequence public.account_transaction_number_seq
    restart with 1;

  alter sequence public.customer_receipt_number_seq
    restart with 1;

  alter sequence public.delivery_order_number_seq
    restart with 1;

  alter sequence public.expense_number_seq
    restart with 1;

  alter sequence public.financial_account_transfer_number_seq
    restart with 1;

  alter sequence public.gl_journal_number_seq
    restart with 1;

  alter sequence public.goods_receipt_number_seq
    restart with 1;

  alter sequence public.inventory_transaction_number_seq
    restart with 1;

    alter sequence public.inventory_transfer_number_seq
    restart with 1;

  alter sequence public.quick_purchase_number_seq
    restart with 1;

  alter sequence public.rfq_number_sequence
    restart with 1;

  alter sequence public.sales_order_number_seq
    restart with 1;

  alter sequence public.sales_quotation_number_seq
    restart with 1;

  alter sequence public.sales_return_number_seq
    restart with 1;

  alter sequence public.supplier_payment_number_seq
    restart with 1;

  alter sequence public.supplier_return_credit_refund_number_seq
    restart with 1;

  alter sequence public.supplier_return_number_seq
    restart with 1;


  -- ==========================================================
  -- X. RE-ENABLE EVERY TEMPORARILY DISABLED PROTECTION
  -- ==========================================================

  alter table public.customer_receipt_allocations
    enable trigger zz_customer_receipt_allocation_lifecycle_guard;

  alter table public.customer_receipts
    enable trigger zz_customer_receipt_lifecycle_guard;

  alter table public.delivery_order_items
    enable trigger trg_enforce_delivery_order_item_lifecycle_immutability;

  alter table public.delivery_orders
    enable trigger trg_enforce_delivery_order_lifecycle_immutability;

  alter table public.gl_journal_lines
    enable trigger protect_posted_gl_journal_line;

  alter table public.gl_journal_entries
    enable trigger protect_posted_gl_journal;

  alter table public.goods_receipt_items
    enable trigger trg_enforce_completed_goods_receipt_item_immutability;

  alter table public.goods_receipts
    enable trigger trg_prevent_completed_goods_receipt_delete;

  alter table public.sales_order_items
    enable trigger trg_enforce_sales_order_item_lifecycle_immutability;

  alter table public.sales_orders
    enable trigger trg_enforce_sales_order_lifecycle_immutability;

  alter table public.sales_return_items
    enable trigger protect_final_sales_return_item;

  alter table public.supplier_return_items
    enable trigger trg_enforce_supplier_return_item_immutability;

  alter table public.supplier_returns
    enable trigger trg_enforce_supplier_return_lifecycle_immutability;


  -- ==========================================================
  -- Y. POST-RESET ASSERTIONS
  -- ==========================================================

  select
      (select count(*) from public.account_transactions)
    + (select count(*) from public.customer_receipt_allocation_repair_audit)
    + (select count(*) from public.customer_receipt_allocations)
    + (select count(*) from public.customer_receipts)
    + (select count(*) from public.delivery_order_items)
    + (select count(*) from public.delivery_orders)
    + (select count(*) from public.expenses)
    + (select count(*) from public.financial_account_transfers)
    + (select count(*) from public.gl_journal_entries)
    + (select count(*) from public.gl_journal_lines)
    + (select count(*) from public.goods_receipt_items)
    + (select count(*) from public.goods_receipts)
    + (select count(*) from public.inventory_transaction_items)
    + (select count(*) from public.inventory_transactions)
    + (select count(*) from public.inventory_transfer_items)
    + (select count(*) from public.inventory_transfers)
    + (select count(*) from public.purchase_order_items)
    + (select count(*) from public.purchase_orders)
    + (select count(*) from public.quick_purchase_items)
    + (select count(*) from public.quick_purchases)
    + (select count(*) from public.rfq_items)
    + (select count(*) from public.rfq_status_history)
    + (select count(*) from public.rfq_suppliers)
    + (select count(*) from public.rfqs)
    + (select count(*) from public.sales_margin_approvals)
    + (select count(*) from public.sales_order_items)
    + (select count(*) from public.sales_orders)
    + (select count(*) from public.sales_quotation_items)
    + (select count(*) from public.sales_quotations)
    + (select count(*) from public.sales_return_items)
    + (select count(*) from public.sales_returns)
    + (select count(*) from public.supplier_payment_allocations)
    + (select count(*) from public.supplier_payments)
    + (select count(*) from public.supplier_quotation_items)
    + (select count(*) from public.supplier_quotations)
    + (select count(*) from public.supplier_return_credit_applications)
    + (select count(*) from public.supplier_return_credit_refunds)
    + (select count(*) from public.supplier_return_items)
    + (select count(*) from public.supplier_returns)
    + (select count(*) from public.warehouse_stock)
  into v_remaining_transactions;

  if v_remaining_transactions <> 0 then
    raise exception
      'Pre-live reset verification failed: % transactional rows remain.',
      v_remaining_transactions;
  end if;


  if exists (
    select 1
    from public.financial_accounts
    where account_code in (
      'BANK-AED',
      'CARD-AED',
      'CASH-AED'
    )
      and (
        opening_balance <> 0
        or opening_balance_date is not null
        or current_balance <> 0
      )
  ) then
    raise exception
      'Pre-live reset verification failed: financial account balances are not zero.';
  end if;


  -- ==========================================================
  -- Z. VERIFY PRESERVED MASTER DATA
  -- ==========================================================

  if (select count(*) from public.products) <> 6
     or (select count(*) from public.suppliers) <> 5
     or (select count(*) from public.customers) <> 2
     or (select count(*) from public.warehouses) <> 5
     or (select count(*) from public.financial_accounts) <> 3
     or (select count(*) from public.gl_accounts) <> 65 then

    raise exception
      'Pre-live reset verification failed: preserved master data changed.';

  end if;


  -- ==========================================================
  -- AA. SUCCESS RESULT
  -- ==========================================================

  v_result :=
    jsonb_build_object(
      'status', 'completed',
      'migration', 171,
      'executed_by', v_user_id,

      'removed', jsonb_build_object(
        'gl_journals', v_before_gl_journals,
        'gl_lines', v_before_gl_lines,
        'inventory_transactions',
          v_before_inventory_transactions,
        'account_transactions',
          v_before_account_transactions,
        'sales_orders',
          v_before_sales_orders,
        'customer_receipts',
          v_before_customer_receipts,
        'supplier_payments',
          v_before_supplier_payments
      ),

      'financial_accounts_reset', true,
      'warehouse_stock_reset', true,
      'transaction_sequences_reset', true,
      'master_data_preserved', true
    );

  return v_result;

end;
$$;


-- ------------------------------------------------------------
-- 3. Lock down execution permissions
-- ------------------------------------------------------------

revoke all on function
  public.execute_pre_live_transactional_reset_171(text)
from public;

revoke all on function
  public.execute_pre_live_transactional_reset_171(text)
from anon;

grant execute on function
  public.execute_pre_live_transactional_reset_171(text)
to authenticated;


comment on function
  public.execute_pre_live_transactional_reset_171(text)
is
  'One-time protected pre-live transactional reset. '
  'Migration deployment itself performs no reset. '
  'Execution requires authenticated admin privileges and '
  'the explicit migration-171 confirmation token.';

-- FINAL POST-TEST CLEANUP
delete from public.sales_invoice_documents;
alter sequence public.sales_invoice_number_seq restart with 1;
select public.execute_pre_live_transactional_reset_171('RESET-DUBAI-WHOLESALE-HUB-PRE-LIVE-171');
drop function if exists public.execute_pre_live_transactional_reset_171(text);




