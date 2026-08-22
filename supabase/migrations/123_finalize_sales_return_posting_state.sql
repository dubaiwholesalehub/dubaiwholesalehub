/*
 * =========================================================
 * 123 — Finalize Sales Return Posting State
 *
 * PURPOSE
 * -------
 *
 * Completes the Sales Return lifecycle after both formal GL
 * journals have been posted.
 *
 * Final workflow:
 *
 *   draft
 *     -> approved
 *     -> received
 *     -> posted
 *
 *
 * Stores:
 *
 *   credit_journal_entry_id
 *   inventory_journal_entry_id
 *   posted_at
 *   posted_by
 *
 *
 * Repeated calls remain idempotent because the underlying GL
 * posting functions are already idempotent.
 * =========================================================
 */


create or replace function
  public.post_sales_return_gl(
    p_sales_return_id uuid
  )
returns table
(
  credit_journal_id uuid,
  inventory_journal_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_return
    public.sales_returns%rowtype;

begin

  /* =======================================================
   * Authentication
   * ======================================================= */

  v_user_id :=
    auth.uid();


  if
    v_user_id is null
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
    p_sales_return_id is null
  then
    raise exception
      'Sales Return is required.';
  end if;


  /* =======================================================
   * Lock Return
   * ======================================================= */

  select
    *
  into
    v_return
  from
    public.sales_returns
  where
    id =
      p_sales_return_id
  for update;


  if not found then
    raise exception
      'Sales Return was not found.';
  end if;


  /* =======================================================
   * Idempotent Already-Posted State
   * ======================================================= */

  if
    v_return.status =
      'posted'
  then

    if
      v_return.credit_journal_entry_id is null
      or
      v_return.inventory_journal_entry_id is null
    then
      raise exception
        'Sales Return % is posted but journal references are incomplete.',
        v_return.return_number;
    end if;


    credit_journal_id :=
      v_return.credit_journal_entry_id;


    inventory_journal_id :=
      v_return.inventory_journal_entry_id;


    return next;

    return;

  end if;


  /* =======================================================
   * Must Be Received First
   * ======================================================= */

  if
    v_return.status <>
      'received'
  then
    raise exception
      'Sales Return % must be received before GL posting. Current status is %.',
      v_return.return_number,
      v_return.status;
  end if;


  if
    v_return.inventory_transaction_id is null
  then
    raise exception
      'Sales Return % does not have an Inventory Transaction.',
      v_return.return_number;
  end if;


  /* =======================================================
   * Post / Resolve Commercial Credit Journal
   * ======================================================= */

  credit_journal_id :=
    public.post_sales_return_credit_gl(
      p_sales_return_id
    );


  if
    credit_journal_id is null
  then
    raise exception
      'Sales Return % did not produce a commercial credit journal.',
      v_return.return_number;
  end if;


  /* =======================================================
   * Post / Resolve Inventory + COGS Journal
   * ======================================================= */

  inventory_journal_id :=
    public.post_sales_return_inventory_gl(
      p_sales_return_id
    );


  if
    inventory_journal_id is null
  then
    raise exception
      'Sales Return % did not produce an inventory journal.',
      v_return.return_number;
  end if;


  /* =======================================================
   * Finalize Sales Return Header
   * ======================================================= */

  perform
    set_config(
      'app.sales_return_internal_write',
      'on',
      true
    );


  update
    public.sales_returns
  set
    credit_journal_entry_id =
      credit_journal_id,

    inventory_journal_entry_id =
      inventory_journal_id,

    status =
      'posted',

    posted_at =
      now(),

    posted_by =
      v_user_id,

    updated_by =
      v_user_id,

    updated_at =
      now()

  where
    id =
      v_return.id;


  return next;

end;
$$;


/* =========================================================
 * Permissions
 * ========================================================= */

revoke all
on function
  public.post_sales_return_gl(
    uuid
  )
from public;


grant execute
on function
  public.post_sales_return_gl(
    uuid
  )
to authenticated;


/* =========================================================
 * Documentation
 * ========================================================= */

comment on function
  public.post_sales_return_gl(
    uuid
  )
is
  'Posts or resolves both Sales Return GL journals and finalizes the Sales Return header as posted with permanent journal references. Repeated calls are idempotent.';