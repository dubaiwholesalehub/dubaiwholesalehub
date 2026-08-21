/*
 * =========================================================
 * 103 — Historical Inventory GL Backfill Helper
 *
 * PURPOSE
 * -------
 *
 * Backfills historical inventory-related GL journals for:
 *
 * 1. Posted Quick Purchases with no Quick Purchase GL journal
 * 2. Posted sales_issue Inventory Transactions with no COGS GL journal
 *
 * IMPORTANT
 * ---------
 *
 * This function does NOT recreate accounting logic.
 *
 * It delegates to the existing production adapters:
 *
 *   public.post_quick_purchase_gl(uuid)
 *   public.post_inventory_cogs_gl(uuid)
 *
 * Therefore:
 *
 * - existing validation remains authoritative
 * - existing account mappings are reused
 * - duplicate-source protection remains active
 * - journals stay auditable and source-linked
 *
 * Legacy unlinked local_purchase inventory transactions are
 * intentionally NOT handled here.
 * =========================================================
 */


create or replace function
  public.backfill_historical_inventory_gl()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare

  v_quick_purchase record;

  v_inventory_transaction record;

  v_journal_id uuid;


  v_quick_purchase_count integer := 0;

  v_cogs_count integer := 0;


  v_quick_purchase_inventory_value
    numeric(18, 2) := 0;

  v_cogs_value
    numeric(18, 2) := 0;


  v_quick_purchase_journals jsonb :=
    '[]'::jsonb;

  v_cogs_journals jsonb :=
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
   * 1. Historical Quick Purchase GL
   *
   * Only:
   * - posted purchases
   * - registered suppliers
   * - no existing posted/reversed Quick Purchase journal
   * ======================================================= */

  for v_quick_purchase in

    select
      qp.id,
      qp.purchase_number,
      qp.inventory_transaction_id,

      round(
        coalesce(
          sum(
            iti.quantity_change
            *
            iti.unit_cost
          ),
          0
        ),
        2
      ) as inventory_value

    from
      public.quick_purchases qp

    join
      public.inventory_transactions it
    on
      it.id =
        qp.inventory_transaction_id

    join
      public.inventory_transaction_items iti
    on
      iti.inventory_transaction_id =
        it.id

    where
      qp.status =
        'posted'

      and qp.supplier_id
        is not null

      and not exists (
        select
          1

        from
          public.gl_journal_entries gj

        where
          gj.source_type =
            'quick_purchase'

          and gj.source_id =
            qp.id

          and gj.status in (
            'posted',
            'reversed'
          )
      )

    group by
      qp.id,
      qp.purchase_number,
      qp.inventory_transaction_id

    order by
      qp.purchase_date,
      qp.purchase_number

  loop

    v_journal_id :=
      public.post_quick_purchase_gl(
        v_quick_purchase.id
      );


    v_quick_purchase_count :=
      v_quick_purchase_count
      +
      1;


    v_quick_purchase_inventory_value :=
      round(
        v_quick_purchase_inventory_value
        +
        coalesce(
          v_quick_purchase.inventory_value,
          0
        ),
        2
      );


    v_quick_purchase_journals :=
      v_quick_purchase_journals
      ||
      jsonb_build_array(
        jsonb_build_object(
          'quickPurchaseId',
            v_quick_purchase.id,

          'purchaseNumber',
            v_quick_purchase.purchase_number,

          'inventoryTransactionId',
            v_quick_purchase.inventory_transaction_id,

          'inventoryValue',
            v_quick_purchase.inventory_value,

          'journalId',
            v_journal_id
        )
      );

  end loop;


  /* =======================================================
   * 2. Historical Sales-Issue COGS GL
   *
   * Only:
   * - posted inventory transaction
   * - transaction_type = sales_issue
   * - linked to Delivery Order
   * - no existing posted/reversed inventory_cogs journal
   * ======================================================= */

  for v_inventory_transaction in

    select
      it.id,
      it.transaction_number,

      round(
        abs(
          coalesce(
            sum(
              iti.quantity_change
              *
              iti.unit_cost
            ),
            0
          )
        ),
        2
      ) as cogs_value

    from
      public.inventory_transactions it

    join
      public.inventory_transaction_items iti
    on
      iti.inventory_transaction_id =
        it.id

    where
      it.status =
        'posted'

      and it.transaction_type =
        'sales_issue'

      and it.reference_type =
        'delivery_order'

      and it.reference_id
        is not null

      and not exists (
        select
          1

        from
          public.gl_journal_entries gj

        where
          gj.source_type =
            'inventory_cogs'

          and gj.source_id =
            it.id

          and gj.status in (
            'posted',
            'reversed'
          )
      )

    group by
      it.id,
      it.transaction_number

    order by
      it.transaction_date,
      it.transaction_number

  loop

    v_journal_id :=
      public.post_inventory_cogs_gl(
        v_inventory_transaction.id
      );


    v_cogs_count :=
      v_cogs_count
      +
      1;


    v_cogs_value :=
      round(
        v_cogs_value
        +
        coalesce(
          v_inventory_transaction.cogs_value,
          0
        ),
        2
      );


    v_cogs_journals :=
      v_cogs_journals
      ||
      jsonb_build_array(
        jsonb_build_object(
          'inventoryTransactionId',
            v_inventory_transaction.id,

          'transactionNumber',
            v_inventory_transaction.transaction_number,

          'cogsValue',
            v_inventory_transaction.cogs_value,

          'journalId',
            v_journal_id
        )
      );

  end loop;


  /* =======================================================
   * Result
   * ======================================================= */

  return
    jsonb_build_object(

      'quickPurchases',
        v_quick_purchase_count,

      'quickPurchaseInventoryValue',
        v_quick_purchase_inventory_value,

      'salesIssues',
        v_cogs_count,

      'cogsValue',
        v_cogs_value,

      'totalSources',
        v_quick_purchase_count
        +
        v_cogs_count,

      'quickPurchaseJournals',
        v_quick_purchase_journals,

      'cogsJournals',
        v_cogs_journals

    );

end;
$$;


/* =========================================================
 * Permissions
 * ========================================================= */

revoke all
on function
  public.backfill_historical_inventory_gl()
from public;


grant execute
on function
  public.backfill_historical_inventory_gl()
to authenticated;


/* =========================================================
 * Documentation
 * ========================================================= */

comment on function
  public.backfill_historical_inventory_gl()
is
  'Admin-only historical inventory GL backfill helper. Backfills missing Quick Purchase journals through post_quick_purchase_gl() and missing sales_issue COGS journals through post_inventory_cogs_gl(). Legacy unlinked local_purchase inventory movements are intentionally excluded.';