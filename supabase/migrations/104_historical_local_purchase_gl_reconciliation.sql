/*
 * =========================================================
 * 104 — Historical Local Purchase GL Reconciliation
 *
 * PURPOSE
 * -------
 *
 * Reconciles legacy local_purchase inventory transactions
 * that changed operational inventory before formal GL
 * integration existed.
 *
 * Historical treatment:
 *
 *   Dr Inventory
 *      Cr Opening Balance Equity
 *
 * Each legacy inventory transaction is posted individually
 * using its own source ID and transaction number.
 *
 * A separate AED 0.01 rounding reconciliation is also posted
 * because historical sales_issue operational valuation used
 * higher precision than item-rounded GL COGS posting.
 *
 * IMPORTANT
 * ---------
 *
 * This migration does not alter operational inventory,
 * Cash, Bank, Accounts Payable or source transactions.
 * =========================================================
 */


create or replace function
  public.backfill_legacy_local_purchase_gl()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare

  v_transaction record;

  v_inventory_account_id uuid;

  v_opening_equity_account_id uuid;

  v_rounding_loss_account_id uuid;

  v_journal_id uuid;

  v_inventory_value numeric(18, 2);

  v_rounding_source_id uuid :=
  '10400000-0000-4000-8000-000000000001';

  v_count integer := 0;

  v_total_value numeric(18, 2) := 0;


  v_journals jsonb :=
    '[]'::jsonb;

begin

  /* =======================================================
   * Security
   * ======================================================= */

  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;


  if not public.is_admin() then
    raise exception
      'Administrator access is required.';
  end if;


  /* =======================================================
   * Resolve GL Accounts
   * ======================================================= */

  v_inventory_account_id :=
    public.get_mapped_gl_account(
      'inventory'
    );


  select id
  into v_opening_equity_account_id
  from public.gl_accounts
  where account_code = '3400'
    and is_active = true
    and is_posting_account = true;


  if not found then
    raise exception
      'Opening Balance Equity account 3400 is not available.';
  end if;


  select id
  into v_rounding_loss_account_id
  from public.gl_accounts
  where account_code = '5200'
    and is_active = true
    and is_posting_account = true;


  if not found then
    raise exception
      'Inventory Adjustments & Losses account 5200 is not available.';
  end if;


  /* =======================================================
   * Legacy Local Purchases
   *
   * Only inventory transactions that:
   *
   * - are posted
   * - are local_purchase
   * - are not linked to a Quick Purchase
   * - do not already have a historical GL journal
   * ======================================================= */

  for v_transaction in

    select
      it.id,
      it.transaction_number,
      it.transaction_date,

      round(
        coalesce(
          sum(iti.total_cost),
          0
        ),
        2
      ) as inventory_value

    from public.inventory_transactions it

    join public.inventory_transaction_items iti
      on iti.inventory_transaction_id = it.id

    where
      it.status = 'posted'

      and it.transaction_type = 'local_purchase'

      and not exists (
        select 1
        from public.quick_purchases qp
        where qp.inventory_transaction_id = it.id
      )

      and not exists (
        select 1
        from public.gl_journal_entries gj
        where gj.source_type = 'legacy_local_purchase'
          and gj.source_id = it.id
          and gj.status in (
            'posted',
            'reversed'
          )
      )

    group by
      it.id,
      it.transaction_number,
      it.transaction_date

    order by
      it.transaction_date,
      it.transaction_number

  loop

    v_inventory_value :=
      round(
        coalesce(
          v_transaction.inventory_value,
          0
        ),
        2
      );


    if v_inventory_value <= 0 then
      continue;
    end if;


    v_journal_id :=
      public.post_erp_gl_journal(
        'legacy_local_purchase',

        v_transaction.id,

        v_transaction.transaction_number,

        v_transaction.transaction_date,

        v_transaction.transaction_date,

        'Historical Local Purchase Inventory - '
        ||
        v_transaction.transaction_number,

        'AED',

        1,

        jsonb_build_array(

          jsonb_build_object(
            'glAccountId',
              v_inventory_account_id,

            'debit',
              v_inventory_value,

            'credit',
              0,

            'baseDebit',
              v_inventory_value,

            'baseCredit',
              0,

            'description',
              'Historical inventory recognition - '
              ||
              v_transaction.transaction_number
          ),

          jsonb_build_object(
            'glAccountId',
              v_opening_equity_account_id,

            'debit',
              0,

            'credit',
              v_inventory_value,

            'baseDebit',
              0,

            'baseCredit',
              v_inventory_value,

            'description',
              'Historical inventory offset - '
              ||
              v_transaction.transaction_number
          )

        )
      );


    v_count :=
      v_count + 1;


    v_total_value :=
      round(
        v_total_value
        +
        v_inventory_value,
        2
      );


    v_journals :=
      v_journals
      ||
      jsonb_build_array(
        jsonb_build_object(
          'inventoryTransactionId',
            v_transaction.id,

          'transactionNumber',
            v_transaction.transaction_number,

          'inventoryValue',
            v_inventory_value,

          'journalId',
            v_journal_id
        )
      );

  end loop;


  /* =======================================================
   * Historical Rounding Reconciliation
   *
   * Operational sales_issue total:
   *   887.2485 -> 887.25
   *
   * GL item-rounded total:
   *   887.24
   *
   * Difference:
   *   0.01
   *
   * The GL therefore needs one additional Inventory credit
   * so accounting inventory matches operational valuation.
   * ======================================================= */

    if not exists (
    select 1
    from public.gl_journal_entries
    where source_type =
      'inventory_rounding_reconciliation'

      and source_id =
        v_rounding_source_id

      and status in (
        'posted',
        'reversed'
      )
  )
  then

    perform
      public.post_erp_gl_journal(
        'inventory_rounding_reconciliation',

                v_rounding_source_id,

        'HISTORICAL-COGS-ROUNDING-2026',

        current_date,

        current_date,

        'Historical Inventory COGS Rounding Reconciliation',

        'AED',

        1,

        jsonb_build_array(

          jsonb_build_object(
            'glAccountId',
              v_rounding_loss_account_id,

            'debit',
              0.01,

            'credit',
              0,

            'baseDebit',
              0.01,

            'baseCredit',
              0,

            'description',
              'Historical inventory COGS rounding adjustment'
          ),

          jsonb_build_object(
            'glAccountId',
              v_inventory_account_id,

            'debit',
              0,

            'credit',
              0.01,

            'baseDebit',
              0,

            'baseCredit',
              0.01,

            'description',
              'Historical inventory COGS rounding adjustment'
          )

        )
      );

  end if;


  /* =======================================================
   * Result
   * ======================================================= */

  return
    jsonb_build_object(
      'legacyLocalPurchases',
        v_count,

      'legacyInventoryValue',
        v_total_value,

      'roundingAdjustment',
        0.01,

      'journals',
        v_journals
    );

end;
$$;


/* =========================================================
 * Permissions
 * ========================================================= */

revoke all
on function
  public.backfill_legacy_local_purchase_gl()
from public;


grant execute
on function
  public.backfill_legacy_local_purchase_gl()
to authenticated;


/* =========================================================
 * Documentation
 * ========================================================= */

comment on function
  public.backfill_legacy_local_purchase_gl()
is
  'Admin-only historical reconciliation for legacy local_purchase inventory movements. Posts Inventory against Opening Balance Equity without altering treasury/AP, and records a one-time historical COGS rounding adjustment.';