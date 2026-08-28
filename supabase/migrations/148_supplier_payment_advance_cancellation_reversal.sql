/*
 * =========================================================
 * 148 — Supplier Payment Advance Cancellation Reversal
 *
 * Purpose
 * -------
 * Harden Supplier Payment cancellation when the payment had
 * later Supplier Advance applications.
 *
 * Existing cancellation already:
 *
 *   - cancels Supplier Payment
 *   - restores Quick Purchase / Goods Receipt balances
 *   - restores Cash / Bank
 *   - reverses original Supplier Payment GL journal
 *
 * This migration additionally reverses every GL journal whose
 * source is a Supplier Advance application created from the
 * Supplier Payment being cancelled.
 *
 * Accounting reversal example:
 *
 * Original advance application:
 *
 *   Dr Accounts Payable
 *      Cr Supplier Advances
 *
 * Reversal:
 *
 *   Dr Supplier Advances
 *      Cr Accounts Payable
 *
 * All operations execute atomically in the same PostgreSQL
 * transaction.
 * ========================================================= */


/* =========================================================
 * 1. Harden Supplier Payment Cancellation + GL Reversal
 * ========================================================= */

create or replace function
  public.cancel_supplier_payment_with_gl(
    p_supplier_payment_id uuid,
    p_reason text
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare

  v_payment_status text;

  v_payment_date date;

  v_allocation_id uuid;

  v_advance_reversal_id uuid;

  v_payment_reversal_id uuid;

  v_reason text;

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


  if
    p_supplier_payment_id is null
  then
    raise exception
      'Supplier Payment ID is required.';
  end if;


  v_reason :=
    nullif(
      btrim(
        coalesce(
          p_reason,
          ''
        )
      ),
      ''
    );


  if
    v_reason is null
  then
    raise exception
      'Cancellation reason is required.';
  end if;


  /* =======================================================
   * Lock Supplier Payment
   * ======================================================= */

  select
    status,
    payment_date

  into
    v_payment_status,
    v_payment_date

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


  /* =======================================================
   * Reverse Supplier Advance Application Journals
   *
   * Each later advance application has:
   *
   *   source_type = supplier_advance_application
   *   source_id   = supplier_payment_allocations.id
   *
   * Reverse these BEFORE cancelling the Supplier Payment.
   * ======================================================= */

  for
    v_allocation_id

  in

    select
      allocation.id

    from
      public.supplier_payment_allocations
        allocation

    where
      allocation.supplier_payment_id =
        p_supplier_payment_id

      and
      allocation.allocation_source =
        'supplier_advance_application'

    order by
      allocation.created_at,
      allocation.id

  loop

    /*
     * Only reverse if the corresponding journal exists.
     *
     * Historical allocations may predate GL integration.
     */

    if exists (

      select
        1

      from
        public.gl_journal_entries
          journal

      where
        journal.source_type =
          'supplier_advance_application'

        and
        journal.source_id =
          v_allocation_id

        and
        journal.status in (
          'posted',
          'reversed'
        )
    )
    then

      v_advance_reversal_id :=
        public.reverse_erp_source_gl_journal(
          'supplier_advance_application',
          v_allocation_id,
          current_date,
          concat(
            v_reason,
            ' Supplier Advance application reversed because originating Supplier Payment was cancelled.'
          )
        );

    end if;

  end loop;


  /* =======================================================
   * Cancel Supplier Payment + Restore Treasury
   *
   * This calls:
   *
   *   cancel_supplier_payment_with_account()
   *
   * which in turn:
   *
   *   - cancel_supplier_payment()
   *   - resynchronizes Quick Purchases
   *   - resynchronizes Goods Receipts
   *   - restores Cash / Bank account transaction
   * ======================================================= */

  if
    v_payment_status <>
      'cancelled'
  then

    perform
      public.cancel_supplier_payment_with_account(
        p_supplier_payment_id,
        v_reason
      );

  end if;


  /* =======================================================
   * Reverse Original Supplier Payment GL Journal
   * ======================================================= */

  v_payment_reversal_id :=
    public.reverse_erp_source_gl_journal(
      'supplier_payment',
      p_supplier_payment_id,
      current_date,
      v_reason
    );


  return
    v_payment_reversal_id;

end;
$$;


/* =========================================================
 * 2. Permissions
 * ========================================================= */

revoke all
on function
  public.cancel_supplier_payment_with_gl(
    uuid,
    text
  )
from public;


grant execute
on function
  public.cancel_supplier_payment_with_gl(
    uuid,
    text
  )
to authenticated;


/* =========================================================
 * 3. Documentation
 * ========================================================= */

comment on function
  public.cancel_supplier_payment_with_gl(
    uuid,
    text
  )
is
  'Atomically cancels a Supplier Payment, reverses every Supplier Advance application GL journal created from that payment, restores Quick Purchase and Goods Receipt payable balances, restores the financial-account transaction and reverses the original Supplier Payment General Ledger journal.';


/* =========================================================
 * End Migration 148
 * ========================================================= */