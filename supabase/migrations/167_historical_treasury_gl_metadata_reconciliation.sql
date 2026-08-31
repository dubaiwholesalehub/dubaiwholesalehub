/* Migration 167 - Treasury GL financial-account metadata hardening */

create or replace function
  public.post_customer_receipt_gl(
    p_customer_receipt_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receipt
    public.customer_receipts%rowtype;

  v_financial_gl_account_id uuid;

  v_receivable_account_id uuid;

  v_customer_advance_account_id uuid;

  v_receipt_amount numeric(18, 2);

  v_allocated_amount numeric(18, 2);

  v_unallocated_amount numeric(18, 2);

  v_base_receipt_amount numeric(18, 2);

  v_base_allocated_amount numeric(18, 2);

  v_base_unallocated_amount numeric(18, 2);

  v_lines jsonb;

  v_journal_id uuid;

begin

  /* =======================================================
   * Authentication
   * ======================================================= */

  if
    auth.uid()
      is null
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
   * Validate Input
   * ======================================================= */

  if
    p_customer_receipt_id
      is null
  then
    raise exception
      'Customer Receipt ID is required.';
  end if;


  /* =======================================================
   * Lock Customer Receipt
   * ======================================================= */

  select
    *

  into
    v_receipt

  from
    public.customer_receipts

  where
    id =
      p_customer_receipt_id

  for update;


  if not found then
    raise exception
      'Customer Receipt was not found.';
  end if;


  /* =======================================================
   * Receipt Must Be Posted
   * ======================================================= */

  if
    v_receipt.status
      <>
    'posted'
  then
    raise exception
      'Customer Receipt % must be posted before General Ledger posting.',
      v_receipt.receipt_number;
  end if;


  /* =======================================================
   * Financial Account Required
   * ======================================================= */

  if
    v_receipt.financial_account_id
      is null
  then
    raise exception
      'Customer Receipt % does not have a financial account.',
      v_receipt.receipt_number;
  end if;


  /* =======================================================
   * Validate Currency
   * ======================================================= */

  if
    v_receipt.currency_code
      is null
    or
    trim(
      v_receipt.currency_code
    ) =
      ''
  then
    raise exception
      'Customer Receipt % does not have a valid currency.',
      v_receipt.receipt_number;
  end if;


  if
    v_receipt.exchange_rate
      is null
    or
    v_receipt.exchange_rate <=
      0
  then
    raise exception
      'Customer Receipt % does not have a valid exchange rate.',
      v_receipt.receipt_number;
  end if;


  /* =======================================================
   * Accounting Amounts
   * ======================================================= */

  v_receipt_amount :=
    round(
      coalesce(
        v_receipt.amount,
        0
      ),
      2
    );


  v_allocated_amount :=
    round(
      coalesce(
        v_receipt.allocated_amount,
        0
      ),
      2
    );


  v_unallocated_amount :=
    round(
      coalesce(
        v_receipt.unallocated_amount,
        0
      ),
      2
    );


  /* =======================================================
   * Validate Amounts
   * ======================================================= */

  if
    v_receipt_amount <=
      0
  then
    raise exception
      'Customer Receipt % has zero or negative accounting value.',
      v_receipt.receipt_number;
  end if;


  if
    v_allocated_amount <
      0
    or
    v_unallocated_amount <
      0
  then
    raise exception
      'Customer Receipt % contains invalid allocation totals.',
      v_receipt.receipt_number;
  end if;


  /*
   * Operational receipt invariant:
   *
   * amount =
   *   allocated_amount
   *   +
   *   unallocated_amount
   */

  if
    abs(
      v_receipt_amount
      -
      (
        v_allocated_amount
        +
        v_unallocated_amount
      )
    )
    >
    0.01
  then
    raise exception
      'Customer Receipt % accounting totals are inconsistent. Receipt %, allocated %, unallocated %.',
      v_receipt.receipt_number,
      v_receipt_amount,
      v_allocated_amount,
      v_unallocated_amount;
  end if;


  /* =======================================================
   * Calculate AED Base Amounts
   * ======================================================= */

  v_base_receipt_amount :=
    round(
      v_receipt_amount
      *
      v_receipt.exchange_rate,
      2
    );


  v_base_allocated_amount :=
    round(
      v_allocated_amount
      *
      v_receipt.exchange_rate,
      2
    );


  /*
   * Use subtraction for the final component.
   *
   * This protects the journal from small currency rounding
   * differences and guarantees:
   *
   * base receipt =
   *   base allocated
   *   +
   *   base unallocated
   */

  v_base_unallocated_amount :=
    round(
      v_base_receipt_amount
      -
      v_base_allocated_amount,
      2
    );


  /* =======================================================
   * Resolve Financial Account GL Mapping
   * ======================================================= */

  v_financial_gl_account_id :=
    public.get_financial_account_gl_account(
      v_receipt.financial_account_id
    );


  /* =======================================================
   * Resolve Accounts Receivable
   * ======================================================= */

  if
    v_allocated_amount >
      0
  then

    v_receivable_account_id :=
      public.get_mapped_gl_account(
        'accounts_receivable'
      );

  end if;


  /* =======================================================
   * Resolve Customer Advances
   * ======================================================= */

  if
    v_unallocated_amount >
      0
  then

    v_customer_advance_account_id :=
      public.get_mapped_gl_account(
        'customer_advances'
      );

  end if;


  /* =======================================================
   * Build Debit Line
   *
   * Entire receipt enters Cash / Bank / Card / Gateway.
   * ======================================================= */

  v_lines :=
    jsonb_build_array(

      jsonb_build_object(
        'glAccountId',
          v_financial_gl_account_id,

        'financialAccountId',
          v_receipt.financial_account_id,

        'debit',
          v_receipt_amount,

        'credit',
          0,

        'baseDebit',
          v_base_receipt_amount,

        'baseCredit',
          0,

        'description',
          'Customer Receipt - '
          ||
          v_receipt.receipt_number,

        'customerId',
          v_receipt.customer_id
      )
    );


  /* =======================================================
   * Accounts Receivable Credit
   * ======================================================= */

  if
    v_allocated_amount >
      0
  then

    v_lines :=
      v_lines
      ||
      jsonb_build_array(

        jsonb_build_object(
          'glAccountId',
            v_receivable_account_id,

          'debit',
            0,

          'credit',
            v_allocated_amount,

          'baseDebit',
            0,

          'baseCredit',
            v_base_allocated_amount,

          'description',
            'Customer Receipt allocation - '
            ||
            v_receipt.receipt_number,

          'customerId',
            v_receipt.customer_id
        )
      );

  end if;


  /* =======================================================
   * Customer Advance Credit
   * ======================================================= */

  if
    v_unallocated_amount >
      0
  then

    v_lines :=
      v_lines
      ||
      jsonb_build_array(

        jsonb_build_object(
          'glAccountId',
            v_customer_advance_account_id,

          'debit',
            0,

          'credit',
            v_unallocated_amount,

          'baseDebit',
            0,

          'baseCredit',
            v_base_unallocated_amount,

          'description',
            'Customer Advance - '
            ||
            v_receipt.receipt_number,

          'customerId',
            v_receipt.customer_id
        )
      );

  end if;


  /* =======================================================
   * Post Through Controlled GL Engine
   *
   * post_erp_gl_journal provides:
   *
   * - accounting-period validation
   * - GL account validation
   * - duplicate-source protection
   * - debit / credit validation
   * - AED base balance validation
   * - atomic posting
   * - posted journal immutability
   * ======================================================= */

  v_journal_id :=
    public.post_erp_gl_journal(
      'customer_receipt',
      v_receipt.id,
      v_receipt.receipt_number,
      v_receipt.receipt_date,
      v_receipt.receipt_date,

      'Customer Receipt - '
        ||
      v_receipt.receipt_number,

      v_receipt.currency_code,
      v_receipt.exchange_rate,
      v_lines
    );


  return
    v_journal_id;

end;
$$;

create or replace function
  public.post_supplier_payment_gl(
    p_supplier_payment_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment
    public.supplier_payments%rowtype;

  v_financial_gl_account_id uuid;

  v_accounts_payable_account_id uuid;

  v_supplier_advance_account_id uuid;


  v_payment_amount
    numeric(18, 2);

  v_allocated_amount
    numeric(18, 2);

  v_unallocated_amount
    numeric(18, 2);


  v_base_payment_amount
    numeric(18, 2);

  v_base_allocated_amount
    numeric(18, 2);

  v_base_unallocated_amount
    numeric(18, 2);


  v_lines jsonb;

  v_journal_id uuid;

begin

  /* =======================================================
   * Authentication
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
   * Input
   * ======================================================= */

  if
    p_supplier_payment_id is null
  then
    raise exception
      'Supplier Payment ID is required.';
  end if;


  /* =======================================================
   * Lock Payment
   * ======================================================= */

  select
    *

  into
    v_payment

  from
    public.supplier_payments

  where
    id =
      p_supplier_payment_id

  for update;


  if not found
  then
    raise exception
      'Supplier Payment was not found.';
  end if;


  if
    v_payment.status <>
      'posted'
  then
    raise exception
      'Supplier Payment % must be posted before General Ledger posting.',
      v_payment.payment_number;
  end if;


  if
    v_payment.financial_account_id is null
  then
    raise exception
      'Supplier Payment % does not have a financial account.',
      v_payment.payment_number;
  end if;


  if
    v_payment.account_transaction_id is null
  then
    raise exception
      'Supplier Payment % does not have an account transaction.',
      v_payment.payment_number;
  end if;


  if
    v_payment.currency_code is null
    or
    trim(
      v_payment.currency_code
    ) = ''
  then
    raise exception
      'Supplier Payment % does not have a valid currency.',
      v_payment.payment_number;
  end if;


  if
    v_payment.exchange_rate is null
    or
    v_payment.exchange_rate <= 0
  then
    raise exception
      'Supplier Payment % does not have a valid exchange rate.',
      v_payment.payment_number;
  end if;


  /* =======================================================
   * Original Payment Accounting Amount
   * ======================================================= */

  v_payment_amount :=
    round(
      coalesce(
        v_payment.amount,
        0
      ),
      2
    );


  /*
   * ONLY allocations made during original Supplier Payment
   * posting belong to the original payment accounting event.
   */

  select
    round(
      coalesce(
        sum(
          allocation.amount
        ),
        0
      ),
      2
    )

  into
    v_allocated_amount

  from
    public.supplier_payment_allocations
      allocation

  where
    allocation.supplier_payment_id =
      v_payment.id

    and allocation.allocation_source =
      'payment_posting';


  v_unallocated_amount :=
    round(
      v_payment_amount
      -
      v_allocated_amount,
      2
    );


  /* =======================================================
   * Validation
   * ======================================================= */

  if
    v_payment_amount <= 0
  then
    raise exception
      'Supplier Payment % has zero or negative accounting value.',
      v_payment.payment_number;
  end if;


  if
    v_allocated_amount < 0
    or
    v_unallocated_amount < 0
  then
    raise exception
      'Supplier Payment % contains invalid original allocation totals.',
      v_payment.payment_number;
  end if;


  if
    v_allocated_amount >
      v_payment_amount
  then
    raise exception
      'Supplier Payment % original allocations exceed payment amount.',
      v_payment.payment_number;
  end if;


  if
    abs(
      v_payment_amount
      -
      (
        v_allocated_amount
        +
        v_unallocated_amount
      )
    ) > 0.01
  then
    raise exception
      'Supplier Payment % original accounting totals are inconsistent.',
      v_payment.payment_number;
  end if;


  /* =======================================================
   * AED Base Amounts
   * ======================================================= */

  v_base_allocated_amount :=
    round(
      v_allocated_amount
      *
      v_payment.exchange_rate,
      2
    );


  v_base_unallocated_amount :=
    round(
      v_unallocated_amount
      *
      v_payment.exchange_rate,
      2
    );


  v_base_payment_amount :=
    round(
      v_base_allocated_amount
      +
      v_base_unallocated_amount,
      2
    );


  /* =======================================================
   * Resolve GL Accounts
   * ======================================================= */

  v_financial_gl_account_id :=
    public.get_financial_account_gl_account(
      v_payment.financial_account_id
    );


  if
    v_allocated_amount > 0
  then

    v_accounts_payable_account_id :=
      public.get_mapped_gl_account(
        'accounts_payable'
      );

  end if;


  if
    v_unallocated_amount > 0
  then

    v_supplier_advance_account_id :=
      public.get_mapped_gl_account(
        'supplier_advances'
      );

  end if;


  /* =======================================================
   * Build Journal
   * ======================================================= */

  v_lines :=
    '[]'::jsonb;


  if
    v_allocated_amount > 0
  then

    v_lines :=
      v_lines
      ||
      jsonb_build_array(

        jsonb_build_object(
          'glAccountId',
            v_accounts_payable_account_id,

          'debit',
            v_allocated_amount,

          'credit',
            0,

          'baseDebit',
            v_base_allocated_amount,

          'baseCredit',
            0,

          'description',
            'Supplier Payment allocation - '
            ||
            v_payment.payment_number,

          'supplierId',
            v_payment.supplier_id
        )
      );

  end if;


  if
    v_unallocated_amount > 0
  then

    v_lines :=
      v_lines
      ||
      jsonb_build_array(

        jsonb_build_object(
          'glAccountId',
            v_supplier_advance_account_id,

          'debit',
            v_unallocated_amount,

          'credit',
            0,

          'baseDebit',
            v_base_unallocated_amount,

          'baseCredit',
            0,

          'description',
            'Supplier Advance - '
            ||
            v_payment.payment_number,

          'supplierId',
            v_payment.supplier_id
        )
      );

  end if;


  v_lines :=
    v_lines
    ||
    jsonb_build_array(

      jsonb_build_object(
        'glAccountId',
          v_financial_gl_account_id,

        'financialAccountId',
          v_payment.financial_account_id,

        'debit',
          0,

        'credit',
          v_payment_amount,

        'baseDebit',
          0,

        'baseCredit',
          v_base_payment_amount,

        'description',
          'Supplier Payment - '
          ||
          v_payment.payment_number,

        'supplierId',
          v_payment.supplier_id
      )
    );


  v_journal_id :=
    public.post_erp_gl_journal(
      'supplier_payment',
      v_payment.id,
      v_payment.payment_number,
      v_payment.payment_date,
      v_payment.payment_date,

      'Supplier Payment - '
      ||
      v_payment.payment_number,

      v_payment.currency_code,
      v_payment.exchange_rate,
      v_lines
    );


  return
    v_journal_id;

end;
$$;

/*
 * =========================================================
 * Historical Treasury GL Metadata Reconciliation
 * =========================================================
 *
 * Historical defect:
 *
 * Customer Receipt and Supplier Payment GL adapters correctly
 * posted monetary amounts to the mapped FA-* GL account, but
 * their treasury GL lines did not populate:
 *
 *   gl_journal_lines.financial_account_id
 *
 * This repair:
 *
 *   1. Links Customer Receipt treasury lines to the receipt's
 *      financial_account_id.
 *
 *   2. Links Supplier Payment treasury lines to the payment's
 *      financial_account_id.
 *
 *   3. Links reversal treasury lines to the same financial
 *      account as the corresponding original GL line.
 *
 * IMPORTANT:
 *
 * This is a dimensional metadata repair only.
 *
 * It does NOT change:
 *
 *   debit
 *   credit
 *   base_debit
 *   base_credit
 *   journal status
 *   source IDs
 *   journal dates
 *   monetary balances
 * =========================================================
 */

create or replace function
  public.reconcile_historical_treasury_gl_metadata_167()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_missing_before integer := 0;

  v_missing_after integer := 0;

  v_receipt_candidates integer := 0;

  v_payment_candidates integer := 0;

  v_reversal_candidates integer := 0;

  v_receipt_updated integer := 0;

  v_payment_updated integer := 0;

  v_reversal_updated integer := 0;

  v_invalid_receipt_mappings integer := 0;

  v_invalid_payment_mappings integer := 0;

  v_invalid_reversal_mappings integer := 0;

  v_result jsonb;

begin

  /* =======================================================
   * Authentication / Authorization
   * ======================================================= */

  if auth.uid() is null
  then
    raise exception
      'Authentication is required.';
  end if;


  if not public.is_admin()
  then
    raise exception
      'Administrator access is required.';
  end if;


  /* =======================================================
   * Serialize Historical Repair
   * ======================================================= */

  perform
    pg_advisory_xact_lock(
      hashtext(
        'reconcile_historical_treasury_gl_metadata_167'
      )
    );


  /* =======================================================
   * Count Missing Treasury Metadata Before Repair
   *
   * A treasury GL line is identified by the GL account
   * currently mapped to a financial account.
   * ======================================================= */

  select
    count(*)::integer
  into
    v_missing_before
  from
    public.gl_journal_lines line
  join
    public.gl_journal_entries journal
      on journal.id =
         line.journal_entry_id
  join
    public.financial_accounts financial_account
      on financial_account.gl_account_id =
         line.gl_account_id
  where
    journal.status in (
      'posted',
      'reversed'
    )
    and
    line.financial_account_id is null;


  /* =======================================================
   * Customer Receipt Validation
   * ======================================================= */

  select
    count(*)::integer
  into
    v_receipt_candidates
  from
    public.gl_journal_lines line
  join
    public.gl_journal_entries journal
      on journal.id =
         line.journal_entry_id
  join
    public.customer_receipts receipt
      on receipt.id =
         journal.source_id
  join
    public.financial_accounts financial_account
      on financial_account.id =
         receipt.financial_account_id
      and
         financial_account.gl_account_id =
         line.gl_account_id
  where
    journal.source_type =
      'customer_receipt'
    and
    journal.status in (
      'posted',
      'reversed'
    )
    and
    line.financial_account_id is null;


  /*
   * Every NULL treasury line belonging to a Customer Receipt
   * must resolve uniquely through:
   *
   * journal.source_id
   *   -> customer_receipts.id
   *   -> financial_account_id
   *   -> financial_accounts.gl_account_id
   */

  select
    count(*)::integer
  into
    v_invalid_receipt_mappings
  from
    public.gl_journal_lines line
  join
    public.gl_journal_entries journal
      on journal.id =
         line.journal_entry_id
  join
    public.financial_accounts treasury_account
      on treasury_account.gl_account_id =
         line.gl_account_id
  left join
    public.customer_receipts receipt
      on receipt.id =
         journal.source_id
  left join
    public.financial_accounts source_account
      on source_account.id =
         receipt.financial_account_id
  where
    journal.source_type =
      'customer_receipt'
    and
    journal.status in (
      'posted',
      'reversed'
    )
    and
    line.financial_account_id is null
    and
    (
      receipt.id is null
      or
      receipt.financial_account_id is null
      or
      source_account.id is null
      or
      source_account.gl_account_id is distinct from
        line.gl_account_id
    );


  if
    v_invalid_receipt_mappings > 0
  then
    raise exception
      'Treasury metadata repair aborted: % Customer Receipt treasury GL line(s) have invalid or ambiguous financial-account mappings.',
      v_invalid_receipt_mappings;
  end if;


  /* =======================================================
   * Supplier Payment Validation
   * ======================================================= */

  select
    count(*)::integer
  into
    v_payment_candidates
  from
    public.gl_journal_lines line
  join
    public.gl_journal_entries journal
      on journal.id =
         line.journal_entry_id
  join
    public.supplier_payments payment
      on payment.id =
         journal.source_id
  join
    public.financial_accounts financial_account
      on financial_account.id =
         payment.financial_account_id
      and
         financial_account.gl_account_id =
         line.gl_account_id
  where
    journal.source_type =
      'supplier_payment'
    and
    journal.status in (
      'posted',
      'reversed'
    )
    and
    line.financial_account_id is null;


  select
    count(*)::integer
  into
    v_invalid_payment_mappings
  from
    public.gl_journal_lines line
  join
    public.gl_journal_entries journal
      on journal.id =
         line.journal_entry_id
  join
    public.financial_accounts treasury_account
      on treasury_account.gl_account_id =
         line.gl_account_id
  left join
    public.supplier_payments payment
      on payment.id =
         journal.source_id
  left join
    public.financial_accounts source_account
      on source_account.id =
         payment.financial_account_id
  where
    journal.source_type =
      'supplier_payment'
    and
    journal.status in (
      'posted',
      'reversed'
    )
    and
    line.financial_account_id is null
    and
    (
      payment.id is null
      or
      payment.financial_account_id is null
      or
      source_account.id is null
      or
      source_account.gl_account_id is distinct from
        line.gl_account_id
    );


  if
    v_invalid_payment_mappings > 0
  then
    raise exception
      'Treasury metadata repair aborted: % Supplier Payment treasury GL line(s) have invalid or ambiguous financial-account mappings.',
      v_invalid_payment_mappings;
  end if;


  /* =======================================================
   * Reversal Validation
   * ======================================================= */

  select
    count(*)::integer
  into
    v_reversal_candidates
  from
    public.gl_journal_lines reversal_line
  join
    public.gl_journal_entries reversal_journal
      on reversal_journal.id =
         reversal_line.journal_entry_id
  join
    public.financial_accounts treasury_account
      on treasury_account.gl_account_id =
         reversal_line.gl_account_id
  where
    reversal_journal.source_type =
      'journal_reversal'
    and
    reversal_journal.status in (
      'posted',
      'reversed'
    )
    and
    reversal_line.financial_account_id is null
    and
    reversal_journal.original_entry_id is not null;


  /*
   * Each reversal treasury line must have exactly one
   * corresponding original line for the same GL account,
   * and that original line must have financial-account
   * metadata after the original-line repairs above.
   *
   * Validation of this condition is performed immediately
   * before the reversal update.
   */


  /* =======================================================
   * Repair Customer Receipt Treasury Metadata
   * ======================================================= */

  update
    public.gl_journal_lines line
  set
    financial_account_id =
      receipt.financial_account_id
  from
    public.gl_journal_entries journal,
    public.customer_receipts receipt,
    public.financial_accounts financial_account
  where
    journal.id =
      line.journal_entry_id
    and
    journal.source_type =
      'customer_receipt'
    and
    journal.status in (
      'posted',
      'reversed'
    )
    and
    receipt.id =
      journal.source_id
    and
    financial_account.id =
      receipt.financial_account_id
    and
    financial_account.gl_account_id =
      line.gl_account_id
    and
    line.financial_account_id is null;

  get diagnostics
    v_receipt_updated =
      row_count;


  if
    v_receipt_updated <>
      v_receipt_candidates
  then
    raise exception
      'Treasury metadata repair aborted: Customer Receipt candidate count % does not match updated count %.',
      v_receipt_candidates,
      v_receipt_updated;
  end if;


  /* =======================================================
   * Repair Supplier Payment Treasury Metadata
   * ======================================================= */

  update
    public.gl_journal_lines line
  set
    financial_account_id =
      payment.financial_account_id
  from
    public.gl_journal_entries journal,
    public.supplier_payments payment,
    public.financial_accounts financial_account
  where
    journal.id =
      line.journal_entry_id
    and
    journal.source_type =
      'supplier_payment'
    and
    journal.status in (
      'posted',
      'reversed'
    )
    and
    payment.id =
      journal.source_id
    and
    financial_account.id =
      payment.financial_account_id
    and
    financial_account.gl_account_id =
      line.gl_account_id
    and
    line.financial_account_id is null;

  get diagnostics
    v_payment_updated =
      row_count;


  if
    v_payment_updated <>
      v_payment_candidates
  then
    raise exception
      'Treasury metadata repair aborted: Supplier Payment candidate count % does not match updated count %.',
      v_payment_candidates,
      v_payment_updated;
  end if;


  /* =======================================================
   * Validate Reversal Mapping After Original Repair
   * ======================================================= */

  select
    count(*)::integer
  into
    v_invalid_reversal_mappings
  from
    public.gl_journal_lines reversal_line
  join
    public.gl_journal_entries reversal_journal
      on reversal_journal.id =
         reversal_line.journal_entry_id
  join
    public.financial_accounts treasury_account
      on treasury_account.gl_account_id =
         reversal_line.gl_account_id
  where
    reversal_journal.source_type =
      'journal_reversal'
    and
    reversal_journal.status in (
      'posted',
      'reversed'
    )
    and
    reversal_line.financial_account_id is null
    and
    (
      reversal_journal.original_entry_id is null
      or
      (
        select
          count(*)
        from
          public.gl_journal_lines original_line
        where
          original_line.journal_entry_id =
            reversal_journal.original_entry_id
          and
          original_line.gl_account_id =
            reversal_line.gl_account_id
          and
          original_line.financial_account_id is not null
      ) <> 1
    );


  if
    v_invalid_reversal_mappings > 0
  then
    raise exception
      'Treasury metadata repair aborted: % reversal treasury GL line(s) do not resolve uniquely to an original financial-account line.',
      v_invalid_reversal_mappings;
  end if;


  /* =======================================================
   * Repair Reversal Treasury Metadata
   * ======================================================= */

  update
    public.gl_journal_lines reversal_line
  set
    financial_account_id =
      (
        select
          original_line.financial_account_id
        from
          public.gl_journal_lines original_line
        where
          original_line.journal_entry_id =
            reversal_journal.original_entry_id
          and
          original_line.gl_account_id =
            reversal_line.gl_account_id
          and
          original_line.financial_account_id is not null
      )
  from
    public.gl_journal_entries reversal_journal,
    public.financial_accounts treasury_account
  where
    reversal_journal.id =
      reversal_line.journal_entry_id
    and
    reversal_journal.source_type =
      'journal_reversal'
    and
    reversal_journal.status in (
      'posted',
      'reversed'
    )
    and
    treasury_account.gl_account_id =
      reversal_line.gl_account_id
    and
    reversal_line.financial_account_id is null
    and
    reversal_journal.original_entry_id is not null
    and
    (
      select
        count(*)
      from
        public.gl_journal_lines original_line
      where
        original_line.journal_entry_id =
          reversal_journal.original_entry_id
        and
        original_line.gl_account_id =
          reversal_line.gl_account_id
        and
        original_line.financial_account_id is not null
    ) = 1;

  get diagnostics
    v_reversal_updated =
      row_count;


  if
    v_reversal_updated <>
      v_reversal_candidates
  then
    raise exception
      'Treasury metadata repair aborted: reversal candidate count % does not match updated count %.',
      v_reversal_candidates,
      v_reversal_updated;
  end if;


  /* =======================================================
   * Final Validation
   * ======================================================= */

  select
    count(*)::integer
  into
    v_missing_after
  from
    public.gl_journal_lines line
  join
    public.gl_journal_entries journal
      on journal.id =
         line.journal_entry_id
  join
    public.financial_accounts financial_account
      on financial_account.gl_account_id =
         line.gl_account_id
  where
    journal.status in (
      'posted',
      'reversed'
    )
    and
    line.financial_account_id is null;


  if
    v_missing_after <> 0
  then
    raise exception
      'Treasury metadata repair incomplete: % active/reversed treasury GL line(s) still have NULL financial_account_id.',
      v_missing_after;
  end if;


  /* =======================================================
   * Result
   * ======================================================= */

  v_result :=
    jsonb_build_object(
      'status',
        'completed',

      'missing_before',
        v_missing_before,

      'customer_receipt_candidates',
        v_receipt_candidates,

      'customer_receipt_updated',
        v_receipt_updated,

      'supplier_payment_candidates',
        v_payment_candidates,

      'supplier_payment_updated',
        v_payment_updated,

      'reversal_candidates',
        v_reversal_candidates,

      'reversal_updated',
        v_reversal_updated,

      'total_updated',
        (
          v_receipt_updated
          +
          v_payment_updated
          +
          v_reversal_updated
        ),

      'missing_after',
        v_missing_after
    );


  return
    v_result;

end;
$$;


/* =========================================================
 * Permissions
 * ========================================================= */

revoke all
on function
  public.reconcile_historical_treasury_gl_metadata_167()
from public;

revoke all
on function
  public.reconcile_historical_treasury_gl_metadata_167()
from anon;

grant execute
on function
  public.reconcile_historical_treasury_gl_metadata_167()
to authenticated;


/* =========================================================
 * Documentation
 * ========================================================= */

comment on function
  public.reconcile_historical_treasury_gl_metadata_167()
is
  'Repairs historical treasury GL financial_account_id metadata for Customer Receipt, Supplier Payment and corresponding reversal lines. Monetary journal values are not changed. Also complements the forward adapter hardening introduced by Migration 167.';
