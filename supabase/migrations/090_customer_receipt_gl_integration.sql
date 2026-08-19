/*
 * =========================================================
 * 090 — Customer Receipt General Ledger Integration
 *
 * PURPOSE
 * -------
 *
 * Connects posted Customer Receipts to the formal
 * General Ledger introduced in migrations 087–089.
 *
 *
 * ACCOUNTING EVENT
 * ----------------
 *
 * Customer receipt:
 *
 *   Dr Cash / Bank / Card / Gateway
 *      Cr Accounts Receivable
 *      Cr Customer Advances
 *
 *
 * Allocated receipt amount:
 *
 *   reduces Accounts Receivable.
 *
 *
 * Unallocated receipt amount:
 *
 *   becomes a Customer Advance liability.
 *
 *
 * Example
 * -------
 *
 * Receipt:
 *   AED 1,000
 *
 * Allocated:
 *   AED 800
 *
 * Unallocated:
 *   AED 200
 *
 * Journal:
 *
 *   Dr Bank                         1,000
 *      Cr Accounts Receivable        800
 *      Cr Customer Advances          200
 *
 *
 * IMPORTANT ARCHITECTURE
 * ----------------------
 *
 * customer_receipts remains the operational source of truth.
 *
 * account_transactions remains the treasury / financial
 * account operational ledger.
 *
 * This migration creates the formal accounting representation
 * of the already-posted Customer Receipt.
 *
 *
 * IDEMPOTENCY
 * -----------
 *
 * GL source:
 *
 *   source_type = customer_receipt
 *   source_id   = customer_receipts.id
 *
 * Repeated posting therefore returns the existing posted
 * journal through public.post_erp_gl_journal(...).
 *
 *
 * CANCELLATION
 * ------------
 *
 * This migration does NOT yet reverse cancelled Customer
 * Receipt journals.
 *
 * Cancellation / GL reversal integration will be handled by
 * the dedicated reversal bridge migration after all major ERP
 * posting adapters are connected.
 * =========================================================
 */


/* =========================================================
 * 1. Resolve Financial Account GL Account
 *
 * Treasury accounts are operational financial_accounts.
 *
 * Each operational financial account must map to a formal
 * posting GL account using:
 *
 *   financial_accounts.gl_account_id
 *
 * This helper validates the mapping before an ERP accounting
 * adapter attempts to post.
 * ========================================================= */

create or replace function
  public.get_financial_account_gl_account(
    p_financial_account_id uuid
  )
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_gl_account_id uuid;

  v_account_name text;
  v_financial_account_active boolean;

  v_gl_account_active boolean;
  v_gl_account_posting boolean;

begin

  if
    p_financial_account_id
      is null
  then
    raise exception
      'Financial account is required for General Ledger posting.';
  end if;


  select
    financial_account.gl_account_id,
    financial_account.account_name,
    financial_account.is_active,

    gl_account.is_active,
    gl_account.is_posting_account

  into
    v_gl_account_id,
    v_account_name,
    v_financial_account_active,
    v_gl_account_active,
    v_gl_account_posting

  from
    public.financial_accounts
      financial_account

  left join
    public.gl_accounts
      gl_account

    on
      gl_account.id =
        financial_account.gl_account_id

  where
    financial_account.id =
      p_financial_account_id;


  if not found then
    raise exception
      'Financial account % was not found.',
      p_financial_account_id;
  end if;


  if
    not v_financial_account_active
  then
    raise exception
      'Financial account "%" is inactive.',
      v_account_name;
  end if;


  if
    v_gl_account_id
      is null
  then
    raise exception
      'Financial account "%" is not mapped to a General Ledger account.',
      v_account_name;
  end if;


  if
    coalesce(
      v_gl_account_active,
      false
    ) =
      false
  then
    raise exception
      'The General Ledger account mapped to financial account "%" is inactive.',
      v_account_name;
  end if;


  if
    coalesce(
      v_gl_account_posting,
      false
    ) =
      false
  then
    raise exception
      'The General Ledger account mapped to financial account "%" is not a posting account.',
      v_account_name;
  end if;


  return
    v_gl_account_id;

end;
$$;


/* =========================================================
 * 2. Customer Receipt GL Posting Adapter
 *
 * Accounting:
 *
 *   Dr Selected Financial Account
 *
 *   Cr Accounts Receivable
 *      for allocated_amount
 *
 *   Cr Customer Advances
 *      for unallocated_amount
 *
 *
 * IMPORTANT
 * ---------
 *
 * The receipt must already be POSTED operationally.
 *
 * This function does not:
 *
 * - create the customer receipt
 * - allocate the receipt
 * - update Sales Order balances
 * - create account_transactions
 *
 * Those responsibilities remain in the existing operational
 * Customer Receipt workflow.
 * ========================================================= */

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


/* =========================================================
 * 3. Permissions
 *
 * Internal account-resolution helper is intentionally NOT
 * exposed to normal application users.
 *
 * Application calls only the controlled Customer Receipt GL
 * adapter.
 * ========================================================= */

revoke all
on function
  public.get_financial_account_gl_account(
    uuid
  )
from public;


revoke all
on function
  public.get_financial_account_gl_account(
    uuid
  )
from authenticated;


revoke all
on function
  public.post_customer_receipt_gl(
    uuid
  )
from public;


grant execute
on function
  public.post_customer_receipt_gl(
    uuid
  )
to authenticated;


/* =========================================================
 * 4. Documentation
 * ========================================================= */

comment on function
  public.get_financial_account_gl_account(
    uuid
  )
is
  'Resolves and validates the formal GL posting account mapped to an operational financial account.';


comment on function
  public.post_customer_receipt_gl(
    uuid
  )
is
  'Posts a posted Customer Receipt to the General Ledger. Debits the selected financial account, credits Accounts Receivable for allocated amounts and credits Customer Advances for unallocated amounts. Posting is idempotent through the ERP GL posting engine.';