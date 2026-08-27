/*
 * =========================================================
 * 145 — Backfill Missing Supplier Payment GL Journals
 *
 * Purpose
 * -------
 * Provide an authenticated admin-only helper that repairs
 * posted Supplier Payments which have:
 *
 *   - financial_account_id
 *   - account_transaction_id
 *   - no existing Supplier Payment GL journal
 *
 * The helper delegates accounting to:
 *
 *   public.post_supplier_payment_gl(uuid)
 *
 * It does NOT execute automatically during migration because
 * post_supplier_payment_gl() requires an authenticated admin
 * application session.
 * ========================================================= */

create or replace function
  public.backfill_missing_supplier_payment_gl()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare

  v_payment_id uuid;

  v_journal_id uuid;

  v_count integer := 0;

  v_results jsonb :=
    '[]'::jsonb;

begin

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


  for
    v_payment_id

  in

    select
      payment.id

    from
      public.supplier_payments
        payment

    where
      payment.status =
        'posted'

      and
      payment.financial_account_id
        is not null

      and
      payment.account_transaction_id
        is not null

      and not exists (

        select
          1

        from
          public.gl_journal_entries
            journal

        where
          journal.source_type =
            'supplier_payment'

          and
          journal.source_id =
            payment.id
      )

    order by
      payment.payment_date,
      payment.created_at,
      payment.id

  loop

    v_journal_id :=
      public.post_supplier_payment_gl(
        v_payment_id
      );


    v_count :=
      v_count + 1;


    v_results :=
      v_results
      ||
      jsonb_build_array(
        jsonb_build_object(
          'paymentId',
            v_payment_id,

          'journalId',
            v_journal_id
        )
      );

  end loop;


  return
    jsonb_build_object(
      'processed',
        v_count,

      'results',
        v_results
    );

end;
$$;


/* =========================================================
 * Permissions
 * ========================================================= */

revoke all
on function
  public.backfill_missing_supplier_payment_gl()
from public;


grant execute
on function
  public.backfill_missing_supplier_payment_gl()
to authenticated;


/* =========================================================
 * Documentation
 * ========================================================= */

comment on function
  public.backfill_missing_supplier_payment_gl()
is
  'Admin-only repair helper that posts missing Supplier Payment General Ledger journals for posted payments that already have their financial-account transaction.';


/* =========================================================
 * End Migration 145
 * ========================================================= */