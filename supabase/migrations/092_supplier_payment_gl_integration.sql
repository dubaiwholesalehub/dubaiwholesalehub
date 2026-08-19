/*
 * =========================================================
 * 092 — Supplier Payment General Ledger Integration
 *
 * PURPOSE
 * -------
 *
 * Connects posted Supplier Payments to the formal
 * General Ledger.
 *
 *
 * ACCOUNTING EVENT
 * ----------------
 *
 * Fully allocated payment:
 *
 *   Dr Accounts Payable
 *      Cr Cash / Bank / Card / Gateway
 *
 *
 * Fully unallocated supplier advance:
 *
 *   Dr Supplier Advances
 *      Cr Cash / Bank / Card / Gateway
 *
 *
 * Mixed payment:
 *
 *   Dr Accounts Payable
 *   Dr Supplier Advances
 *      Cr Cash / Bank / Card / Gateway
 *
 *
 * IMPORTANT ARCHITECTURE
 * ----------------------
 *
 * supplier_payments remains the operational source of truth.
 *
 * account_transactions remains the treasury / financial
 * account operational ledger.
 *
 * This migration does NOT create another account transaction.
 *
 * It creates only the formal double-entry GL representation
 * of an already-posted Supplier Payment.
 *
 *
 * FUTURE ADVANCE APPLICATION
 * --------------------------
 *
 * A Supplier Payment may originally be unallocated:
 *
 *   Dr Supplier Advances
 *      Cr Bank
 *
 * If that advance is later allocated against a Quick Purchase,
 * that later economic event requires:
 *
 *   Dr Accounts Payable
 *      Cr Supplier Advances
 *
 * That reclassification is intentionally NOT performed here.
 * It will be integrated as a separate supplier-advance
 * application accounting event.
 *
 *
 * SOURCE
 * ------
 *
 *   source_type = supplier_payment
 *   source_id   = supplier_payments.id
 *
 * Repeated posting therefore remains idempotent through:
 *
 *   public.post_erp_gl_journal(...)
 * =========================================================
 */


/* =========================================================
 * 1. Supplier Payment → GL Posting Adapter
 * ========================================================= */

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
   * Validate Input
   * ======================================================= */

  if
    p_supplier_payment_id is null
  then
    raise exception
      'Supplier Payment ID is required.';
  end if;


  /* =======================================================
   * Lock Supplier Payment
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


  if not found then
    raise exception
      'Supplier Payment was not found.';
  end if;


  /* =======================================================
   * Payment Must Be Posted
   * ======================================================= */

  if
    v_payment.status <>
      'posted'
  then
    raise exception
      'Supplier Payment % must be posted before General Ledger posting.',
      v_payment.payment_number;
  end if;


  /* =======================================================
   * Financial Account Required
   * ======================================================= */

  if
    v_payment.financial_account_id is null
  then
    raise exception
      'Supplier Payment % does not have a financial account.',
      v_payment.payment_number;
  end if;


  /*
   * A financially-integrated Supplier Payment should also
   * have the operational treasury transaction created by
   * post_supplier_payment_with_account().
   */

  if
    v_payment.account_transaction_id is null
  then
    raise exception
      'Supplier Payment % does not have an account transaction.',
      v_payment.payment_number;
  end if;


  /* =======================================================
   * Validate Currency
   * ======================================================= */

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
    v_payment.exchange_rate <=
      0
  then
    raise exception
      'Supplier Payment % does not have a valid exchange rate.',
      v_payment.payment_number;
  end if;


  /* =======================================================
   * Accounting Amounts
   * ======================================================= */

  v_payment_amount :=
    round(
      coalesce(
        v_payment.amount,
        0
      ),
      2
    );


  v_allocated_amount :=
    round(
      coalesce(
        v_payment.allocated_amount,
        0
      ),
      2
    );


  v_unallocated_amount :=
    round(
      coalesce(
        v_payment.unallocated_amount,
        0
      ),
      2
    );


  /* =======================================================
   * Validate Accounting Totals
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
      'Supplier Payment % contains invalid allocation totals.',
      v_payment.payment_number;
  end if;


  /*
   * Operational payment invariant:
   *
   * amount =
   *   allocated_amount
   *   +
   *   unallocated_amount
   */

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
      'Supplier Payment % accounting totals are inconsistent. Payment %, allocated %, unallocated %.',
      v_payment.payment_number,
      v_payment_amount,
      v_allocated_amount,
      v_unallocated_amount;
  end if;


  /* =======================================================
   * Base Currency = AED
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


  /*
   * Cash / Bank credit is derived from debit components.
   *
   * This guarantees base-currency balance after component
   * rounding.
   */

  v_base_payment_amount :=
    round(
      v_base_allocated_amount
      +
      v_base_unallocated_amount,
      2
    );


  /* =======================================================
   * Resolve Financial Account GL
   * ======================================================= */

  v_financial_gl_account_id :=
    public.get_financial_account_gl_account(
      v_payment.financial_account_id
    );


  /* =======================================================
   * Resolve Accounts Payable
   * ======================================================= */

  if
    v_allocated_amount > 0
  then

    v_accounts_payable_account_id :=
      public.get_mapped_gl_account(
        'accounts_payable'
      );

  end if;


  /* =======================================================
   * Resolve Supplier Advances
   * ======================================================= */

  if
    v_unallocated_amount > 0
  then

    v_supplier_advance_account_id :=
      public.get_mapped_gl_account(
        'supplier_advances'
      );

  end if;


  /* =======================================================
   * Build Lines
   * ======================================================= */

  v_lines :=
    '[]'::jsonb;


  /* =======================================================
   * Accounts Payable Debit
   * ======================================================= */

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


  /* =======================================================
   * Supplier Advance Debit
   * ======================================================= */

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


  /* =======================================================
   * Financial Account Credit
   *
   * Entire Supplier Payment leaves Cash / Bank / Card /
   * Gateway regardless of how much is allocated.
   * ======================================================= */

  v_lines :=
    v_lines
    ||
    jsonb_build_array(

      jsonb_build_object(
        'glAccountId',
          v_financial_gl_account_id,

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


  /* =======================================================
   * Post Through Controlled GL Engine
   * ======================================================= */

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


/* =========================================================
 * 2. Permissions
 * ========================================================= */

revoke all
on function
  public.post_supplier_payment_gl(
    uuid
  )
from public;


grant execute
on function
  public.post_supplier_payment_gl(
    uuid
  )
to authenticated;


/* =========================================================
 * 3. Documentation
 * ========================================================= */

comment on function
  public.post_supplier_payment_gl(
    uuid
  )
is
  'Posts a posted Supplier Payment to the General Ledger. Debits Accounts Payable for allocated amounts, debits Supplier Advances for unallocated amounts and credits the selected financial account for the full payment. Future application of an existing Supplier Advance requires a separate GL reclassification event.';