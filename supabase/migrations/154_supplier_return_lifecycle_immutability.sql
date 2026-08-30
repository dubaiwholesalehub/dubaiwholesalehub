/*
 * Migration 154
 * ============================================================
 * Supplier Return Lifecycle Immutability
 * ============================================================
 *
 * Purpose
 * -------
 * Protect Supplier Returns from unsafe historical mutation.
 *
 * Lifecycle:
 *
 *   draft
 *     -> approved
 *     -> dispatched
 *     -> posted
 *
 * Inventory is physically/accountingly affected at dispatch.
 * General Ledger / AP / Supplier Credit are affected at posting.
 *
 * Therefore:
 *
 *   - draft rows remain editable
 *   - approved commercial facts are frozen
 *   - approved -> dispatched is permitted only for the fields
 *     written by dispatch_supplier_return_inventory()
 *   - dispatched -> posted is permitted only for the fields
 *     written by post_supplier_return_gl()
 *   - posted rows are immutable except for supplier-credit
 *     consumption tracking and generic update audit fields
 *   - dispatched/posted returns cannot be directly cancelled
 *   - cancelled returns are immutable
 *
 * A future reversal workflow must create compensating inventory
 * and accounting records rather than rewriting history.
 */


/* ============================================================
 * 1. Supplier Return Header Lifecycle Protection
 * ============================================================ */

create or replace function
  public.enforce_supplier_return_lifecycle_immutability()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  /* ---------------------------------------------------------
   * DELETE protection
   * --------------------------------------------------------- */

  if tg_op = 'DELETE' then

    if old.status in (
      'approved',
      'dispatched',
      'posted',
      'cancelled'
    ) then

      raise exception
        'Supplier Return % cannot be deleted from status "%". Historical Supplier Returns must be preserved.',
        old.return_number,
        old.status;

    end if;

    return old;

  end if;


  /* ---------------------------------------------------------
   * Draft
   *
   * Draft documents remain editable.
   *
   * The normal approval workflow may transition:
   *
   *   draft -> approved
   *
   * A future controlled cancellation workflow may also
   * transition a draft to cancelled.
   * --------------------------------------------------------- */

  if old.status = 'draft' then

    if new.status not in (
      'draft',
      'approved',
      'cancelled'
    ) then

      raise exception
        'Supplier Return % cannot transition directly from draft to "%".',
        old.return_number,
        new.status;

    end if;

    return new;

  end if;


  /* ---------------------------------------------------------
   * Approved
   *
   * Commercial facts are frozen.
   *
   * The dispatch workflow is allowed to change only:
   *
   *   status
   *   inventory_transaction_id
   *   dispatched_at
   *   dispatched_by
   *   updated_by
   *   updated_at
   *
   * Approved -> cancelled is reserved for a future controlled
   * cancellation workflow.
   * --------------------------------------------------------- */

  if old.status = 'approved' then

    if new.status not in (
      'approved',
      'dispatched',
      'cancelled'
    ) then

      raise exception
        'Supplier Return % cannot transition from approved to "%".',
        old.return_number,
        new.status;

    end if;


    if
      (
        to_jsonb(new)
        - 'status'
        - 'inventory_transaction_id'
        - 'dispatched_at'
        - 'dispatched_by'
        - 'cancelled_at'
        - 'cancelled_by'
        - 'cancellation_reason'
        - 'updated_by'
        - 'updated_at'
      )
      is distinct from
      (
        to_jsonb(old)
        - 'status'
        - 'inventory_transaction_id'
        - 'dispatched_at'
        - 'dispatched_by'
        - 'cancelled_at'
        - 'cancelled_by'
        - 'cancellation_reason'
        - 'updated_by'
        - 'updated_at'
      )
    then

      raise exception
        'Approved Supplier Return % has immutable commercial fields.',
        old.return_number;

    end if;


    /*
     * Do not allow inventory dispatch fields to be manipulated
     * while remaining merely approved.
     */

    if
      new.status = 'approved'
      and
      (
        new.inventory_transaction_id
          is distinct from old.inventory_transaction_id

        or new.dispatched_at
          is distinct from old.dispatched_at

        or new.dispatched_by
          is distinct from old.dispatched_by

        or new.cancelled_at
          is distinct from old.cancelled_at

        or new.cancelled_by
          is distinct from old.cancelled_by

        or new.cancellation_reason
          is distinct from old.cancellation_reason
      )
    then

      raise exception
        'Supplier Return % workflow fields cannot be modified without a valid status transition.',
        old.return_number;

    end if;


    /*
     * Approved -> dispatched must not populate cancellation
     * fields.
     */

    if
      new.status = 'dispatched'
      and
      (
        new.inventory_transaction_id is null

        or new.dispatched_at is null

        or new.cancelled_at is not null

        or new.cancelled_by is not null

        or new.cancellation_reason is not null
      )
    then

      raise exception
        'Supplier Return % has invalid dispatch lifecycle fields.',
        old.return_number;

    end if;


    /*
     * Approved -> cancelled is structurally allowed for the
     * future controlled cancellation workflow, but it must
     * contain the required cancellation facts and must not have
     * an inventory transaction.
     */

    if
      new.status = 'cancelled'
      and
      (
        new.inventory_transaction_id is not null

        or new.cancelled_at is null

        or length(
          trim(
            coalesce(
              new.cancellation_reason,
              ''
            )
          )
        ) < 3
      )
    then

      raise exception
        'Approved Supplier Return % cannot be cancelled after inventory effects or without valid cancellation details.',
        old.return_number;

    end if;


    return new;

  end if;


  /* ---------------------------------------------------------
   * Dispatched
   *
   * Inventory has already moved.
   *
   * Direct cancellation is forbidden.
   *
   * The only valid lifecycle progression is:
   *
   *   dispatched -> posted
   *
   * post_supplier_return_gl() writes:
   *
   *   status
   *   ap_reduction_amount
   *   supplier_credit_amount
   *   supplier_credit_applied_amount
   *   journal_entry_id
   *   posted_at
   *   posted_by
   *   updated_by
   *   updated_at
   * --------------------------------------------------------- */

  if old.status = 'dispatched' then

    if new.status not in (
      'dispatched',
      'posted'
    ) then

      raise exception
        'Supplier Return % has already affected inventory and cannot transition from dispatched to "%". Use a controlled reversal workflow.',
        old.return_number,
        new.status;

    end if;


    if
      (
        to_jsonb(new)
        - 'status'
        - 'ap_reduction_amount'
        - 'supplier_credit_amount'
        - 'supplier_credit_applied_amount'
        - 'journal_entry_id'
        - 'posted_at'
        - 'posted_by'
        - 'updated_by'
        - 'updated_at'
      )
      is distinct from
      (
        to_jsonb(old)
        - 'status'
        - 'ap_reduction_amount'
        - 'supplier_credit_amount'
        - 'supplier_credit_applied_amount'
        - 'journal_entry_id'
        - 'posted_at'
        - 'posted_by'
        - 'updated_by'
        - 'updated_at'
      )
    then

      raise exception
        'Dispatched Supplier Return % is immutable except for controlled GL posting fields.',
        old.return_number;

    end if;


    /*
     * While remaining dispatched, posting fields cannot be
     * manipulated independently.
     */

    if
      new.status = 'dispatched'
      and
      (
        new.ap_reduction_amount
          is distinct from old.ap_reduction_amount

        or new.supplier_credit_amount
          is distinct from old.supplier_credit_amount

        or new.supplier_credit_applied_amount
          is distinct from old.supplier_credit_applied_amount

        or new.journal_entry_id
          is distinct from old.journal_entry_id

        or new.posted_at
          is distinct from old.posted_at

        or new.posted_by
          is distinct from old.posted_by
      )
    then

      raise exception
        'Supplier Return % posting fields cannot be modified before the return is posted.',
        old.return_number;

    end if;


    if
      new.status = 'posted'
      and
      (
        new.journal_entry_id is null

        or new.posted_at is null
      )
    then

      raise exception
        'Supplier Return % cannot become posted without a General Ledger journal and posting timestamp.',
        old.return_number;

    end if;


    return new;

  end if;


  /* ---------------------------------------------------------
   * Posted
   *
   * Historical operational/accounting facts are immutable.
   *
   * supplier_credit_applied_amount remains mutable because
   * subsequent credit applications/refunds legitimately update
   * the consumption state of the Supplier Return credit.
   *
   * updated_by / updated_at are audit metadata associated with
   * those controlled updates.
   * --------------------------------------------------------- */

  if old.status = 'posted' then

    if new.status <> 'posted' then

      raise exception
        'Posted Supplier Return % is immutable and cannot transition to "%". Use a controlled reversal workflow.',
        old.return_number,
        new.status;

    end if;


    if
      (
        to_jsonb(new)
        - 'supplier_credit_applied_amount'
        - 'updated_by'
        - 'updated_at'
      )
      is distinct from
      (
        to_jsonb(old)
        - 'supplier_credit_applied_amount'
        - 'updated_by'
        - 'updated_at'
      )
    then

      raise exception
        'Posted Supplier Return % is immutable. Use controlled Supplier Credit or reversal workflows.',
        old.return_number;

    end if;


    return new;

  end if;


  /* ---------------------------------------------------------
   * Cancelled
   * --------------------------------------------------------- */

  if old.status = 'cancelled' then

    raise exception
      'Cancelled Supplier Return % is immutable.',
      old.return_number;

  end if;


  raise exception
    'Supplier Return % has unsupported lifecycle status "%".',
    old.return_number,
    old.status;

end;
$$;


/* ============================================================
 * 2. Install Header Trigger
 * ============================================================ */

drop trigger if exists
  trg_enforce_supplier_return_lifecycle_immutability
on
  public.supplier_returns;


create trigger
  trg_enforce_supplier_return_lifecycle_immutability
before update or delete
on
  public.supplier_returns
for each row
execute function
  public.enforce_supplier_return_lifecycle_immutability();


/* ============================================================
 * 3. Supplier Return Item Immutability
 * ============================================================
 *
 * Items may only be changed while the parent Supplier Return
 * remains draft.
 *
 * Once approved, the item set becomes historical.
 * ============================================================ */

create or replace function
  public.enforce_supplier_return_item_immutability()
returns trigger
language plpgsql
set search_path = public
as $$
declare

  v_supplier_return_id uuid;

  v_return_number text;

  v_return_status text;

begin

  if tg_op = 'INSERT' then

    v_supplier_return_id :=
      new.supplier_return_id;

  else

    v_supplier_return_id :=
      old.supplier_return_id;

  end if;


  select
    return_number,
    status
  into
    v_return_number,
    v_return_status
  from
    public.supplier_returns
  where
    id =
      v_supplier_return_id;


  if not found then

    raise exception
      'Supplier Return for Supplier Return Item was not found.';

  end if;


  if v_return_status <> 'draft' then

    raise exception
      'Items belonging to Supplier Return % are immutable after approval.',
      v_return_number;

  end if;


  /*
   * Prevent moving an item from one draft return into a
   * non-draft return.
   */

  if
    tg_op = 'UPDATE'
    and
    new.supplier_return_id
      is distinct from old.supplier_return_id
  then

    select
      return_number,
      status
    into
      v_return_number,
      v_return_status
    from
      public.supplier_returns
    where
      id =
        new.supplier_return_id;


    if not found then

      raise exception
        'Target Supplier Return for Supplier Return Item was not found.';

    end if;


    if v_return_status <> 'draft' then

      raise exception
        'Cannot move an item into non-draft Supplier Return %.',
        v_return_number;

    end if;

  end if;


  if tg_op = 'DELETE' then
    return old;
  end if;


  return new;

end;
$$;


/* ============================================================
 * 4. Install Item Trigger
 * ============================================================ */

drop trigger if exists
  trg_enforce_supplier_return_item_immutability
on
  public.supplier_return_items;


create trigger
  trg_enforce_supplier_return_item_immutability
before insert or update or delete
on
  public.supplier_return_items
for each row
execute function
  public.enforce_supplier_return_item_immutability();


/* ============================================================
 * 5. Documentation
 * ============================================================ */

comment on function
  public.enforce_supplier_return_lifecycle_immutability()
is
'Protects Supplier Return lifecycle integrity. Approved commercial facts are frozen, dispatched returns cannot be cancelled because inventory has moved, and posted returns cannot be rewritten or cancelled. supplier_credit_applied_amount remains mutable for controlled downstream Supplier Credit activity.';


comment on function
  public.enforce_supplier_return_item_immutability()
is
'Allows Supplier Return item changes only while the parent Supplier Return remains draft. Items are immutable after approval.';