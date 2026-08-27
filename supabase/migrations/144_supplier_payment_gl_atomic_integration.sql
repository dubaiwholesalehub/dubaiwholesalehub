/*
 * =========================================================
 * 144 — Atomic Supplier Payment General Ledger Integration
 *
 * Purpose
 * -------
 * Complete the Supplier Payment accounting workflow by
 * connecting the existing operational payment wrapper to the
 * existing Supplier Payment General Ledger adapter.
 *
 * Before this migration:
 *
 *   Supplier Payment
 *       -> Supplier payable allocation
 *       -> Cash / Bank account transaction
 *       -> NO General Ledger journal
 *
 * After this migration:
 *
 *   Supplier Payment
 *       -> Supplier payable allocation
 *       -> Cash / Bank account transaction
 *       -> Supplier Payment GL journal
 *
 * All operations execute within the same PostgreSQL
 * transaction. If GL posting fails, the Supplier Payment,
 * allocation and financial-account transaction also roll
 * back.
 *
 * Accounting:
 *
 * Allocated payment:
 *
 *   Dr Accounts Payable
 *      Cr Cash / Bank
 *
 * Unallocated supplier advance:
 *
 *   Dr Supplier Advances
 *      Cr Cash / Bank
 *
 * Existing public.post_supplier_payment_gl() remains the
 * authoritative GL adapter.
 * ========================================================= */


/* =========================================================
 * 1. Atomic Supplier Payment Posting Wrapper
 * ========================================================= */

create or replace function
  public.post_supplier_payment_with_account(
    p_supplier_id uuid,
    p_payment_date date,
    p_payment_method text,
    p_currency_code text,
    p_exchange_rate numeric,
    p_amount numeric,
    p_reference_number text,
    p_bank_name text,
    p_cheque_number text,
    p_cheque_date date,
    p_notes text,
    p_allocations jsonb,
    p_financial_account_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare

  v_payment_id uuid;

  v_payment_number text;

  v_account_transaction_id uuid;

  v_gl_journal_id uuid;

begin

  /* =======================================================
   * Validate Financial Account
   * ======================================================= */

  perform
    public.validate_payment_financial_account(
      p_financial_account_id,
      p_payment_method,
      p_currency_code
    );


  /* =======================================================
   * Create Supplier Payment
   *
   * Migration 143 extends this workflow so allocations may
   * belong to either:
   *
   *   - Quick Purchase
   *   - Goods Receipt
   * ======================================================= */

  v_payment_id :=
    public.post_supplier_payment(
      p_supplier_id,
      p_payment_date,
      p_payment_method,
      p_currency_code,
      p_exchange_rate,
      p_amount,
      p_reference_number,
      p_bank_name,
      p_cheque_number,
      p_cheque_date,
      p_notes,
      p_allocations
    );


  /* =======================================================
   * Resolve Payment Number
   * ======================================================= */

  select
    payment_number

  into
    v_payment_number

  from
    public.supplier_payments

  where
    id =
      v_payment_id;


  if not found
  then
    raise exception
      'Supplier Payment was created but could not be reloaded.';
  end if;


  /* =======================================================
   * Treasury / Financial Account Posting
   *
   * Full Supplier Payment amount leaves Cash / Bank.
   * ======================================================= */

  v_account_transaction_id :=
    public.post_account_transaction(
      p_financial_account_id,

      p_payment_date,

      'out',

      'supplier_payment',

      p_amount,

      p_currency_code,

      p_exchange_rate,

      'supplier_payment',

      v_payment_id,

      v_payment_number,

      concat(
        'Supplier Payment ',
        v_payment_number
      ),

      p_notes
    );


  /* =======================================================
   * Link Treasury Transaction to Supplier Payment
   *
   * post_supplier_payment_gl() requires both:
   *
   *   financial_account_id
   *   account_transaction_id
   * ======================================================= */

  update
    public.supplier_payments

  set
    financial_account_id =
      p_financial_account_id,

    account_transaction_id =
      v_account_transaction_id

  where
    id =
      v_payment_id;


  if not found
  then
    raise exception
      'Unable to connect Supplier Payment to its financial account transaction.';
  end if;


  /* =======================================================
   * General Ledger Posting
   *
   * Existing Migration 093 GL adapter determines:
   *
   *   payment_posting allocations
   *       -> Dr Accounts Payable
   *
   *   unallocated payment
   *       -> Dr Supplier Advances
   *
   *   full payment
   *       -> Cr Financial Account
   *
   * post_erp_gl_journal() provides controlled posting and
   * duplicate-source protection.
   * ======================================================= */

  v_gl_journal_id :=
    public.post_supplier_payment_gl(
      v_payment_id
    );


  if
    v_gl_journal_id is null
  then
    raise exception
      'Supplier Payment General Ledger posting did not return a journal.';
  end if;


  return
    v_payment_id;

end;
$$;


/* =========================================================
 * 2. Permissions
 * ========================================================= */

revoke all
on function
  public.post_supplier_payment_with_account(
    uuid,
    date,
    text,
    text,
    numeric,
    numeric,
    text,
    text,
    text,
    date,
    text,
    jsonb,
    uuid
  )
from public;


grant execute
on function
  public.post_supplier_payment_with_account(
    uuid,
    date,
    text,
    text,
    numeric,
    numeric,
    text,
    text,
    text,
    date,
    text,
    jsonb,
    uuid
  )
to authenticated;


/* =========================================================
 * 3. Documentation
 * ========================================================= */

comment on function
  public.post_supplier_payment_with_account(
    uuid,
    date,
    text,
    text,
    numeric,
    numeric,
    text,
    text,
    text,
    date,
    text,
    jsonb,
    uuid
  )
is
  'Atomic Supplier Payment workflow. Creates and allocates the Supplier Payment, posts the Cash/Bank account transaction, links the treasury transaction to the payment and posts the corresponding General Ledger journal through post_supplier_payment_gl(). Quick Purchase and Goods Receipt allocations are supported.';


/* =========================================================
 * End Migration 144
 * ========================================================= */