/*
 * =========================================================
 * 160 — Customer Receipt Advance Cancellation Reversal
 *
 * Purpose
 * -------
 * Harden Customer Receipt cancellation when the receipt had
 * later Customer Advance applications.
 *
 * Existing cancellation already:
 *
 *   - cancels Customer Receipt
 *   - resynchronizes Sales Order paid balances
 *   - restores Cash / Bank
 *   - reverses original Customer Receipt GL journal
 *
 * This migration additionally reverses every GL journal whose
 * source is a Customer Advance application created from an
 * allocation belonging to the Customer Receipt being cancelled.
 *
 * Accounting reversal example:
 *
 * Original advance application:
 *
 *   Dr Customer Advances
 *      Cr Accounts Receivable
 *
 * Reversal:
 *
 *   Dr Accounts Receivable
 *      Cr Customer Advances
 *
 * All operations execute atomically in the same PostgreSQL
 * transaction.
 * ========================================================= */


/* =========================================================
 * 1. Harden Customer Receipt Cancellation + GL Reversal
 * ========================================================= */

create or replace function
  public.cancel_customer_receipt_with_gl(
    p_receipt_id uuid,
    p_reason text
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare

  v_receipt_status text;

  v_receipt_date date;

  v_allocation_id uuid;

  v_advance_reversal_id uuid;

  v_receipt_reversal_id uuid;

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
    p_receipt_id is null
  then
    raise exception
      'Customer Receipt ID is required.';
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
   * Lock Customer Receipt
   * ======================================================= */

  select
    status,
    receipt_date

  into
    v_receipt_status,
    v_receipt_date

  from
    public.customer_receipts

  where
    id =
      p_receipt_id

  for update;


  if not found
  then
    raise exception
      'Customer Receipt was not found.';
  end if;


  /* =======================================================
   * Reverse Customer Advance Application Journals
   *
   * Customer receipt allocations do not currently have an
   * allocation_source column.
   *
   * Therefore, each allocation belonging to this receipt is
   * inspected and reversed ONLY when an actual GL journal
   * exists with:
   *
   *   source_type = customer_advance_application
   *   source_id   = customer_receipt_allocations.id
   *
   * This safely excludes normal allocations created during
   * initial receipt posting.
   * ======================================================= */

  for
    v_allocation_id

  in

    select
      allocation.id

    from
      public.customer_receipt_allocations
        allocation

    where
      allocation.receipt_id =
        p_receipt_id

    order by
      allocation.created_at,
      allocation.id

  loop

    /*
     * Only reverse when the corresponding advance-
     * application journal exists.
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
          'customer_advance_application'

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
          'customer_advance_application',
          v_allocation_id,
          current_date,
          concat(
            v_reason,
            ' Customer Advance application reversed because originating Customer Receipt was cancelled.'
          )
        );

    end if;

  end loop;


  /* =======================================================
   * Cancel Customer Receipt + Restore Treasury
   *
   * Existing wrapper:
   *
   *   cancel_customer_receipt_with_account()
   *
   * handles:
   *
   *   - cancelling Customer Receipt
   *   - resynchronizing affected Sales Orders
   *   - restoring linked financial-account transaction
   * ======================================================= */

  if
    v_receipt_status <>
      'cancelled'
  then

    perform
      public.cancel_customer_receipt_with_account(
        p_receipt_id,
        v_reason
      );

  end if;


  /* =======================================================
   * Reverse Original Customer Receipt GL Journal
   * ======================================================= */

  v_receipt_reversal_id :=
    public.reverse_erp_source_gl_journal(
      'customer_receipt',
      p_receipt_id,
      coalesce(
        current_date,
        v_receipt_date
      ),
      v_reason
    );


  return
    v_receipt_reversal_id;

end;
$$;


/* =========================================================
 * 2. Permissions
 * ========================================================= */

revoke all
on function
  public.cancel_customer_receipt_with_gl(
    uuid,
    text
  )
from public;


grant execute
on function
  public.cancel_customer_receipt_with_gl(
    uuid,
    text
  )
to authenticated;


/* =========================================================
 * 3. Documentation
 * ========================================================= */

comment on function
  public.cancel_customer_receipt_with_gl(
    uuid,
    text
  )
is
  'Atomically cancels a Customer Receipt, reverses every Customer Advance application GL journal created from allocations belonging to that receipt, restores affected Sales Order balances, restores the financial-account transaction and reverses the original Customer Receipt General Ledger journal.';


/* =========================================================
 * End Migration 160
 * ========================================================= */