/*
 * =========================================================
 * 105 — Historical AR / AP GL Reconciliation
 *
 * PURPOSE
 * -------
 *
 * Reconciles historical Accounts Receivable and Accounts
 * Payable differences created before the formal General
 * Ledger integrations existed.
 *
 *
 * THIS HELPER COVERS
 * ------------------
 *
 * 1. Historical Sales Orders missing Revenue / AR journals
 *
 * 2. Historical Customer Receipts that:
 *      - are posted
 *      - have no Financial Account
 *      - have no account_transaction
 *      - therefore must NOT replay treasury
 *
 * 3. Historical Supplier Payments that:
 *      - are posted
 *      - have no Financial Account
 *      - have no account_transaction
 *      - therefore must NOT replay treasury
 *
 * 4. Missing Supplier Advance Application GL journals
 *
 * 5. Legacy Quick Purchase payment_opening_amount
 *
 * 6. Receipt allocations against Draft Sales Orders
 *
 *
 * IMPORTANT ACCOUNTING PRINCIPLE
 * ------------------------------
 *
 * Historical operational documents that never recorded a
 * treasury transaction are bridged through Opening Balance
 * Equity.
 *
 * Cash / Bank must NOT be replayed because Financial Account
 * ↔ GL reconciliation is already correct.
 *
 *
 * HISTORICAL SUPPLIER PAYMENT RULE
 * --------------------------------
 *
 * supplier_payment_allocations now contains two concepts:
 *
 *   payment_posting
 *     Allocation made when the Supplier Payment was posted.
 *
 *   supplier_advance_application
 *     Later use of an already-existing Supplier Advance.
 *
 * Therefore historical Supplier Payment reconstruction must
 * use ONLY payment_posting allocations when reconstructing
 * the original payment journal.
 *
 * Later supplier_advance_application rows are posted
 * separately through:
 *
 *   post_supplier_advance_application_gl(...)
 *
 * This prevents Accounts Payable from being double-debited.
 * =========================================================
 */


create or replace function
  public.backfill_historical_ar_ap_gl()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare

  v_record record;

  v_journal_id uuid;

  v_lines jsonb;


  /* =======================================================
   * GL Accounts
   * ======================================================= */

  v_ar_account_id uuid;

  v_ap_account_id uuid;

  v_customer_advances_account_id uuid;

  v_supplier_advances_account_id uuid;

  v_opening_equity_account_id uuid;


  /* =======================================================
   * Sales Orders
   * ======================================================= */

  v_sales_order_count
    integer := 0;

  v_sales_order_value
    numeric(18, 2) := 0;


  /* =======================================================
   * Historical Customer Receipts
   * ======================================================= */

  v_receipt_count
    integer := 0;

  v_receipt_ar_value
    numeric(18, 2) := 0;


  /* =======================================================
   * Historical Supplier Payments
   * ======================================================= */

  v_supplier_payment_count
    integer := 0;

  v_supplier_payment_total
    numeric(18, 2) := 0;

  v_supplier_payment_ap_value
    numeric(18, 2) := 0;

  v_supplier_payment_advance_value
    numeric(18, 2) := 0;


  /* =======================================================
   * Supplier Advance Applications
   * ======================================================= */

  v_advance_application_count
    integer := 0;

  v_advance_application_value
    numeric(18, 2) := 0;


  /* =======================================================
   * Quick Purchase Opening Payments
   * ======================================================= */

  v_opening_payment_count
    integer := 0;

  v_opening_payment_value
    numeric(18, 2) := 0;


  /* =======================================================
   * Draft Sales Order Receipt Allocations
   * ======================================================= */

  v_draft_allocation_count
    integer := 0;

  v_draft_allocation_value
    numeric(18, 2) := 0;


  /* =======================================================
   * Audit Result
   * ======================================================= */

  v_result_journals jsonb :=
    '[]'::jsonb;


begin

  /* =======================================================
   * Security
   * ======================================================= */

  if
    auth.uid() is null
  then
    raise exception
      'Authentication is required.';
  end if;


  if
    not public.is_admin()
  then
    raise exception
      'Administrator access is required.';
  end if;


  /* =======================================================
   * Resolve Required GL Accounts
   * ======================================================= */

  v_ar_account_id :=
    public.get_mapped_gl_account(
      'accounts_receivable'
    );


  v_ap_account_id :=
    public.get_mapped_gl_account(
      'accounts_payable'
    );


  v_customer_advances_account_id :=
    public.get_mapped_gl_account(
      'customer_advances'
    );


  v_supplier_advances_account_id :=
    public.get_mapped_gl_account(
      'supplier_advances'
    );


  v_opening_equity_account_id :=
    public.get_mapped_gl_account(
      'opening_balance_equity'
    );


  /* =======================================================
   * 1. Historical Sales Orders
   *
   * Production accounting adapter:
   *
   *   Dr Accounts Receivable
   *      Cr Revenue
   *      Cr Output VAT where applicable
   *
   * COGS remains a separate inventory accounting event.
   * ======================================================= */

  for v_record in

    select
      so.id,
      so.order_number,
      so.order_date,
      so.grand_total

    from
      public.sales_orders so

    where
      so.status in (
        'confirmed',
        'processing',
        'partially_fulfilled',
        'fulfilled'
      )

      and not exists (
        select
          1

        from
          public.gl_journal_entries gj

        where
          gj.source_type =
            'sales_order_revenue'

          and gj.source_id =
            so.id

          and gj.status in (
            'posted',
            'reversed'
          )
      )

    order by
      so.order_date,
      so.order_number

  loop

    v_journal_id :=
      public.post_sales_order_revenue_gl(
        v_record.id
      );


    v_sales_order_count :=
      v_sales_order_count
      +
      1;


    v_sales_order_value :=
      round(
        v_sales_order_value
        +
        coalesce(
          v_record.grand_total,
          0
        ),
        2
      );


    v_result_journals :=
      v_result_journals
      ||
      jsonb_build_array(
        jsonb_build_object(
          'type',
            'sales_order_revenue',

          'sourceId',
            v_record.id,

          'sourceNumber',
            v_record.order_number,

          'journalId',
            v_journal_id
        )
      );

  end loop;


  /* =======================================================
   * 2. Historical Customer Receipts
   *
   * Historical receipts before treasury integration have:
   *
   *   financial_account_id = NULL
   *   account_transaction_id = NULL
   *
   * They already affected operational Sales Order balances,
   * but never affected GL.
   *
   * We must NOT invent historical Cash / Bank movement.
   *
   * Therefore:
   *
   *   Dr Opening Balance Equity
   *      Cr Accounts Receivable
   *
   * Only allocated_amount reduces Accounts Receivable.
   * ======================================================= */

  for v_record in

    select
      cr.id,
      cr.receipt_number,
      cr.receipt_date,
      cr.allocated_amount

    from
      public.customer_receipts cr

    where
      cr.status =
        'posted'

      and cr.financial_account_id
        is null

      and cr.account_transaction_id
        is null

      and coalesce(
        cr.allocated_amount,
        0
      ) > 0

      /*
       * Do not bridge a receipt that somehow already has its
       * normal production Customer Receipt journal.
       */

      and not exists (
        select
          1

        from
          public.gl_journal_entries gj

        where
          gj.source_type =
            'customer_receipt'

          and gj.source_id =
            cr.id

          and gj.status in (
            'posted',
            'reversed'
          )
      )

      /*
       * Idempotency for historical bridge.
       */

      and not exists (
        select
          1

        from
          public.gl_journal_entries gj

        where
          gj.source_type =
            'historical_customer_receipt_ar'

          and gj.source_id =
            cr.id

          and gj.status in (
            'posted',
            'reversed'
          )
      )

    order by
      cr.receipt_date,
      cr.receipt_number

  loop

    v_lines :=
      jsonb_build_array(

        jsonb_build_object(
          'glAccountId',
            v_opening_equity_account_id,

          'debit',
            v_record.allocated_amount,

          'credit',
            0,

          'baseDebit',
            v_record.allocated_amount,

          'baseCredit',
            0,

          'description',
            'Historical customer receipt offset'
        ),

        jsonb_build_object(
          'glAccountId',
            v_ar_account_id,

          'debit',
            0,

          'credit',
            v_record.allocated_amount,

          'baseDebit',
            0,

          'baseCredit',
            v_record.allocated_amount,

          'description',
            'Historical customer receipt AR reduction'
        )

      );


    v_journal_id :=
      public.post_erp_gl_journal(
        'historical_customer_receipt_ar',

        v_record.id,

        v_record.receipt_number,

        v_record.receipt_date,

        v_record.receipt_date,

        'Historical Customer Receipt AR - '
        ||
        v_record.receipt_number,

        'AED',

        1,

        v_lines
      );


    v_receipt_count :=
      v_receipt_count
      +
      1;


    v_receipt_ar_value :=
      round(
        v_receipt_ar_value
        +
        v_record.allocated_amount,
        2
      );


    v_result_journals :=
      v_result_journals
      ||
      jsonb_build_array(
        jsonb_build_object(
          'type',
            'historical_customer_receipt_ar',

          'sourceId',
            v_record.id,

          'sourceNumber',
            v_record.receipt_number,

          'value',
            v_record.allocated_amount,

          'journalId',
            v_journal_id
        )
      );

  end loop;


  /* =======================================================
   * 3. Historical Supplier Payments
   *
   * Historical supplier payments before treasury integration
   * have:
   *
   *   financial_account_id = NULL
   *   account_transaction_id = NULL
   *
   *
   * IMPORTANT
   * ---------
   *
   * Current supplier_payments.allocated_amount can include
   * later Supplier Advance applications.
   *
   * We therefore reconstruct the ORIGINAL payment using only
   * allocations classified:
   *
   *   allocation_source = 'payment_posting'
   *
   *
   * Original payment accounting:
   *
   * payment_posting portion:
   *
   *   Dr Accounts Payable
   *
   * remaining original unallocated portion:
   *
   *   Dr Supplier Advances
   *
   * balancing historical offset:
   *
   *      Cr Opening Balance Equity
   *
   *
   * Later supplier_advance_application allocations are
   * handled separately in Section 4.
   * ======================================================= */

  for v_record in

    select
      sp.id,
      sp.payment_number,
      sp.payment_date,
      sp.amount,

      round(
        coalesce(
          (
            select
              sum(spa.amount)

            from
              public.supplier_payment_allocations spa

            where
              spa.supplier_payment_id =
                sp.id

              and spa.allocation_source =
                'payment_posting'
          ),
          0
        ),
        2
      ) as original_ap_allocation,

      round(
        sp.amount
        -
        coalesce(
          (
            select
              sum(spa.amount)

            from
              public.supplier_payment_allocations spa

            where
              spa.supplier_payment_id =
                sp.id

              and spa.allocation_source =
                'payment_posting'
          ),
          0
        ),
        2
      ) as original_advance_amount

    from
      public.supplier_payments sp

    where
      sp.status =
        'posted'

      and sp.financial_account_id
        is null

      and sp.account_transaction_id
        is null

      /*
       * Do not bridge if a normal Supplier Payment journal
       * already exists.
       */

      and not exists (
        select
          1

        from
          public.gl_journal_entries gj

        where
          gj.source_type =
            'supplier_payment'

          and gj.source_id =
            sp.id

          and gj.status in (
            'posted',
            'reversed'
          )
      )

      /*
       * Historical bridge idempotency.
       */

      and not exists (
        select
          1

        from
          public.gl_journal_entries gj

        where
          gj.source_type =
            'historical_supplier_payment'

          and gj.source_id =
            sp.id

          and gj.status in (
            'posted',
            'reversed'
          )
      )

    order by
      sp.payment_date,
      sp.payment_number

  loop

    /* =====================================================
     * Source validation
     * ===================================================== */

    if
      v_record.amount is null

      or
      v_record.amount <= 0
    then
      raise exception
        'Historical Supplier Payment % has an invalid amount.',
        v_record.payment_number;
    end if;


    if
      v_record.original_ap_allocation < 0

      or
      v_record.original_advance_amount < 0
    then
      raise exception
        'Historical Supplier Payment % contains invalid reconstructed payment values.',
        v_record.payment_number;
    end if;


    if
      round(
        v_record.original_ap_allocation
        +
        v_record.original_advance_amount,
        2
      )
      <>
      round(
        v_record.amount,
        2
      )
    then
      raise exception
        'Historical Supplier Payment % reconstructed allocation total does not equal payment amount.',
        v_record.payment_number;
    end if;


    /* =====================================================
     * Build only NON-ZERO GL lines.
     *
     * GL engine rejects zero / zero lines.
     * ===================================================== */

    v_lines :=
      '[]'::jsonb;


    /*
     * Original payment-posting allocation.
     */

    if
      v_record.original_ap_allocation > 0
    then

      v_lines :=
        v_lines
        ||
        jsonb_build_array(
          jsonb_build_object(
            'glAccountId',
              v_ap_account_id,

            'debit',
              v_record.original_ap_allocation,

            'credit',
              0,

            'baseDebit',
              v_record.original_ap_allocation,

            'baseCredit',
              0,

            'description',
              'Historical supplier payment AP reduction'
          )
        );

    end if;


    /*
     * Amount originally left as Supplier Advance.
     */

    if
      v_record.original_advance_amount > 0
    then

      v_lines :=
        v_lines
        ||
        jsonb_build_array(
          jsonb_build_object(
            'glAccountId',
              v_supplier_advances_account_id,

            'debit',
              v_record.original_advance_amount,

            'credit',
              0,

            'baseDebit',
              v_record.original_advance_amount,

            'baseCredit',
              0,

            'description',
              'Historical supplier advance recognition'
          )
        );

    end if;


    /*
     * Historical offset.
     *
     * Never replay Cash / Bank because this historical
     * payment never had a financial-account transaction.
     */

    v_lines :=
      v_lines
      ||
      jsonb_build_array(
        jsonb_build_object(
          'glAccountId',
            v_opening_equity_account_id,

          'debit',
            0,

          'credit',
            v_record.amount,

          'baseDebit',
            0,

          'baseCredit',
            v_record.amount,

          'description',
            'Historical supplier payment offset'
        )
      );


    v_journal_id :=
      public.post_erp_gl_journal(
        'historical_supplier_payment',

        v_record.id,

        v_record.payment_number,

        v_record.payment_date,

        v_record.payment_date,

        'Historical Supplier Payment - '
        ||
        v_record.payment_number,

        'AED',

        1,

        v_lines
      );


    v_supplier_payment_count :=
      v_supplier_payment_count
      +
      1;


    v_supplier_payment_total :=
      round(
        v_supplier_payment_total
        +
        v_record.amount,
        2
      );


    v_supplier_payment_ap_value :=
      round(
        v_supplier_payment_ap_value
        +
        v_record.original_ap_allocation,
        2
      );


    v_supplier_payment_advance_value :=
      round(
        v_supplier_payment_advance_value
        +
        v_record.original_advance_amount,
        2
      );


    v_result_journals :=
      v_result_journals
      ||
      jsonb_build_array(
        jsonb_build_object(
          'type',
            'historical_supplier_payment',

          'sourceId',
            v_record.id,

          'sourceNumber',
            v_record.payment_number,

          'paymentAmount',
            v_record.amount,

          'apReduction',
            v_record.original_ap_allocation,

          'supplierAdvance',
            v_record.original_advance_amount,

          'journalId',
            v_journal_id
        )
      );

  end loop;


  /* =======================================================
   * 4. Missing Supplier Advance Applications
   *
   * Existing production adapter:
   *
   *   Dr Accounts Payable
   *      Cr Supplier Advances
   *
   * No treasury movement occurs.
   *
   * Source identity is supplier_payment_allocations.id.
   * ======================================================= */

  for v_record in

    select
      spa.id,
      spa.amount

    from
      public.supplier_payment_allocations spa

    inner join
      public.supplier_payments sp

      on
        sp.id =
          spa.supplier_payment_id

    inner join
      public.quick_purchases qp

      on
        qp.id =
          spa.quick_purchase_id

    where
      sp.status =
        'posted'

      and qp.status =
        'posted'

      and spa.allocation_source =
        'supplier_advance_application'

      and spa.amount >
        0

      and not exists (
        select
          1

        from
          public.gl_journal_entries gj

        where
          gj.source_type =
            'supplier_advance_application'

          and gj.source_id =
            spa.id

          and gj.status in (
            'posted',
            'reversed'
          )
      )

    order by
      spa.created_at,
      spa.id

  loop

    v_journal_id :=
      public.post_supplier_advance_application_gl(
        v_record.id
      );


    v_advance_application_count :=
      v_advance_application_count
      +
      1;


    v_advance_application_value :=
      round(
        v_advance_application_value
        +
        v_record.amount,
        2
      );


    v_result_journals :=
      v_result_journals
      ||
      jsonb_build_array(
        jsonb_build_object(
          'type',
            'supplier_advance_application',

          'sourceId',
            v_record.id,

          'value',
            v_record.amount,

          'journalId',
            v_journal_id
        )
      );

  end loop;


  /* =======================================================
   * 5. Legacy Quick Purchase Opening Payments
   *
   * Migration 069 introduced:
   *
   *   payment_opening_amount
   *
   * as a transitional mechanism to preserve Quick Purchases
   * that were already considered paid before the formal
   * Supplier Payment workflow existed.
   *
   *
   * These amounts already reduce operational AP.
   *
   * They must NOT reduce Cash / Bank again.
   *
   * Therefore:
   *
   *   Dr Accounts Payable
   *      Cr Opening Balance Equity
   * ======================================================= */

  for v_record in

    select
      qp.id,
      qp.purchase_number,
      qp.purchase_date,
      qp.payment_opening_amount

    from
      public.quick_purchases qp

    where
      qp.status =
        'posted'

      and coalesce(
        qp.payment_opening_amount,
        0
      ) > 0

      and not exists (
        select
          1

        from
          public.gl_journal_entries gj

        where
          gj.source_type =
            'quick_purchase_opening_payment'

          and gj.source_id =
            qp.id

          and gj.status in (
            'posted',
            'reversed'
          )
      )

    order by
      qp.purchase_date,
      qp.purchase_number

  loop

    v_lines :=
      jsonb_build_array(

        jsonb_build_object(
          'glAccountId',
            v_ap_account_id,

          'debit',
            v_record.payment_opening_amount,

          'credit',
            0,

          'baseDebit',
            v_record.payment_opening_amount,

          'baseCredit',
            0,

          'description',
            'Legacy Quick Purchase opening AP reduction'
        ),

        jsonb_build_object(
          'glAccountId',
            v_opening_equity_account_id,

          'debit',
            0,

          'credit',
            v_record.payment_opening_amount,

          'baseDebit',
            0,

          'baseCredit',
            v_record.payment_opening_amount,

          'description',
            'Legacy Quick Purchase opening payment offset'
        )

      );


    v_journal_id :=
      public.post_erp_gl_journal(
        'quick_purchase_opening_payment',

        v_record.id,

        v_record.purchase_number,

        v_record.purchase_date,

        v_record.purchase_date,

        'Legacy Quick Purchase Opening Payment - '
        ||
        v_record.purchase_number,

        'AED',

        1,

        v_lines
      );


    v_opening_payment_count :=
      v_opening_payment_count
      +
      1;


    v_opening_payment_value :=
      round(
        v_opening_payment_value
        +
        v_record.payment_opening_amount,
        2
      );


    v_result_journals :=
      v_result_journals
      ||
      jsonb_build_array(
        jsonb_build_object(
          'type',
            'quick_purchase_opening_payment',

          'sourceId',
            v_record.id,

          'sourceNumber',
            v_record.purchase_number,

          'value',
            v_record.payment_opening_amount,

          'journalId',
            v_journal_id
        )
      );

  end loop;


  /* =======================================================
   * 6. Receipt Allocations Against Draft Sales Orders
   *
   * We identified receipt allocations against Sales Orders
   * that remain in Draft status.
   *
   * The Customer Receipt GL correctly reduced AR based on the
   * allocation, but a Draft Sales Order has never created AR.
   *
   * Economically this amount remains a Customer Advance until
   * the Sales Order becomes an accounting event.
   *
   * Therefore:
   *
   *   Dr Accounts Receivable
   *      Cr Customer Advances
   *
   * Source identity is the allocation row.
   * ======================================================= */

  for v_record in

    select
      cra.id,
      cra.amount,

      cr.receipt_date,
      cr.receipt_number,

      so.order_number

    from
      public.customer_receipt_allocations cra

    inner join
      public.customer_receipts cr

      on
        cr.id =
          cra.receipt_id

    inner join
      public.sales_orders so

      on
        so.id =
          cra.sales_order_id

    where
      cr.status =
        'posted'

      and so.status =
        'draft'

      and cra.amount >
        0

      /*
       * Reclassification only applies when the receipt itself
       * already has a normal Customer Receipt GL journal.
       *
       * Historical receipts handled in Section 2 must not be
       * reclassified here.
       */

      and exists (
        select
          1

        from
          public.gl_journal_entries receipt_gl

        where
          receipt_gl.source_type =
            'customer_receipt'

          and receipt_gl.source_id =
            cr.id

          and receipt_gl.status =
            'posted'
      )

      and not exists (
        select
          1

        from
          public.gl_journal_entries gj

        where
          gj.source_type =
            'draft_order_receipt_reclassification'

          and gj.source_id =
            cra.id

          and gj.status in (
            'posted',
            'reversed'
          )
      )

    order by
      cr.receipt_date,
      cr.receipt_number,
      so.order_number

  loop

    v_lines :=
      jsonb_build_array(

        jsonb_build_object(
          'glAccountId',
            v_ar_account_id,

          'debit',
            v_record.amount,

          'credit',
            0,

          'baseDebit',
            v_record.amount,

          'baseCredit',
            0,

          'description',
            'Reverse AR reduction for Draft Sales Order allocation'
        ),

        jsonb_build_object(
          'glAccountId',
            v_customer_advances_account_id,

          'debit',
            0,

          'credit',
            v_record.amount,

          'baseDebit',
            0,

          'baseCredit',
            v_record.amount,

          'description',
            'Customer advance from Draft Sales Order allocation'
        )

      );


    v_journal_id :=
      public.post_erp_gl_journal(
        'draft_order_receipt_reclassification',

        v_record.id,

        v_record.receipt_number
        ||
        '-'
        ||
        v_record.order_number,

        v_record.receipt_date,

        v_record.receipt_date,

        'Draft Order Receipt Reclassification - '
        ||
        v_record.order_number,

        'AED',

        1,

        v_lines
      );


    v_draft_allocation_count :=
      v_draft_allocation_count
      +
      1;


    v_draft_allocation_value :=
      round(
        v_draft_allocation_value
        +
        v_record.amount,
        2
      );


    v_result_journals :=
      v_result_journals
      ||
      jsonb_build_array(
        jsonb_build_object(
          'type',
            'draft_order_receipt_reclassification',

          'sourceId',
            v_record.id,

          'receiptNumber',
            v_record.receipt_number,

          'orderNumber',
            v_record.order_number,

          'value',
            v_record.amount,

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

      'salesOrders',
        v_sales_order_count,

      'salesOrderValue',
        v_sales_order_value,


      'historicalReceipts',
        v_receipt_count,

      'historicalReceiptArValue',
        v_receipt_ar_value,


      'historicalSupplierPayments',
        v_supplier_payment_count,

      'historicalSupplierPaymentTotal',
        v_supplier_payment_total,

      'historicalSupplierPaymentApValue',
        v_supplier_payment_ap_value,

      'historicalSupplierAdvanceValue',
        v_supplier_payment_advance_value,


      'supplierAdvanceApplications',
        v_advance_application_count,

      'supplierAdvanceApplicationValue',
        v_advance_application_value,


      'openingPayments',
        v_opening_payment_count,

      'openingPaymentValue',
        v_opening_payment_value,


      'draftReceiptAllocations',
        v_draft_allocation_count,

      'draftReceiptAllocationValue',
        v_draft_allocation_value,


      'journals',
        v_result_journals

    );

end;
$$;


/* =========================================================
 * Permissions
 * ========================================================= */

revoke all
on function
  public.backfill_historical_ar_ap_gl()
from public;


grant execute
on function
  public.backfill_historical_ar_ap_gl()
to authenticated;


/* =========================================================
 * Documentation
 * ========================================================= */

comment on function
  public.backfill_historical_ar_ap_gl()
is
  'Admin-only historical AR/AP reconciliation helper. Backfills missing Sales Order revenue journals, bridges historical receipts and supplier payments without replaying treasury, posts missing Supplier Advance applications, recognizes legacy Quick Purchase opening payments and reclassifies receipt allocations against Draft Sales Orders.';