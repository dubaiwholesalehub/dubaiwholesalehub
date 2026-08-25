/*
 * =========================================================
 * 138 - Integrate Customer Receipt GL Posting Atomically
 *
 * PURPOSE
 * -------
 * Extend the existing customer receipt + financial account
 * workflow so every newly posted Customer Receipt also posts
 * its General Ledger journal in the same database transaction.
 *
 * Existing operational responsibilities remain unchanged:
 *
 *   post_customer_receipt(...)
 *   post_account_transaction(...)
 *
 * GL posting is delegated to:
 *
 *   post_customer_receipt_gl(uuid)
 *
 * If GL posting fails, PostgreSQL rolls back the entire receipt
 * transaction, preventing posted receipts without GL journals.
 * =========================================================
 */

create or replace function
  public.post_customer_receipt_with_account(
    p_customer_id uuid,
    p_receipt_date date,
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
  v_receipt_id uuid;
  v_receipt_number text;
  v_account_transaction_id uuid;
  v_gl_journal_id uuid;
begin

  /*
   * Validate selected treasury account first.
   */

  perform
    public.validate_payment_financial_account(
      p_financial_account_id,
      p_payment_method,
      p_currency_code
    );


  /*
   * Post operational Customer Receipt.
   */

  v_receipt_id :=
    public.post_customer_receipt(
      p_customer_id,
      p_receipt_date,
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


  select
    receipt_number
  into
    v_receipt_number
  from
    public.customer_receipts
  where
    id = v_receipt_id;


  /*
   * Post full receipt amount into selected Cash / Bank account.
   */

  v_account_transaction_id :=
    public.post_account_transaction(
      p_financial_account_id,
      p_receipt_date,
      'in',
      'customer_receipt',
      p_amount,
      p_currency_code,
      p_exchange_rate,
      'customer_receipt',
      v_receipt_id,
      v_receipt_number,
      concat(
        'Customer Receipt ',
        v_receipt_number
      ),
      p_notes
    );


  /*
   * Link operational treasury transaction to receipt.
   */

  update
    public.customer_receipts
  set
    financial_account_id =
      p_financial_account_id,
    account_transaction_id =
      v_account_transaction_id
  where
    id = v_receipt_id;


  /*
   * Post receipt to General Ledger.
   *
   * post_customer_receipt_gl() is idempotent and posts:
   *
   *   Debit  Cash / Bank
   *   Credit Accounts Receivable for allocated amount
   *   Credit Customer Advances for unallocated amount
   *
   * Because this runs inside the same PostgreSQL transaction,
   * any GL failure rolls back the receipt and treasury posting.
   */

  v_gl_journal_id :=
    public.post_customer_receipt_gl(
      v_receipt_id
    );


  if v_gl_journal_id is null then
    raise exception
      'Customer Receipt GL posting did not return a journal ID.';
  end if;


  return
    v_receipt_id;

end;
$$;


/* =========================================================
 * Permissions
 * ========================================================= */

revoke all
on function
  public.post_customer_receipt_with_account(
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
from public, anon;


grant execute
on function
  public.post_customer_receipt_with_account(
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
 * Documentation
 * ========================================================= */

comment on function
  public.post_customer_receipt_with_account(
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
'Atomically posts a Customer Receipt operationally, records the selected financial account movement, and posts the corresponding General Ledger journal.';