/* =========================================================
 * 161 - Customer Receipt Lifecycle Hardening
 *
 * PURPOSE
 * -------
 * Protect Customer Receipt accounting history from direct
 * or unsafe mutation while preserving the controlled ERP
 * workflows already established by migrations:
 *
 *   138 - Customer Receipt + Treasury + GL
 *   159 - Customer Advance application + GL reclassification
 *   160 - Customer Receipt cancellation + GL reversals
 *
 * This migration also prevents Customer Receipts from being
 * allocated to Draft Sales Orders.
 *
 * CONTROLLED ENTRY POINTS
 * -----------------------
 *
 * Posting:
 *   post_customer_receipt_with_account(...)
 *
 * Advance application:
 *   apply_customer_advance_to_sales_order(uuid)
 *
 * Cancellation:
 *   cancel_customer_receipt_with_gl(uuid, text)
 *
 * Lower-level accounting helpers become internal-only.
 * ========================================================= */


/* =========================================================
 * 1. Rename Existing Controlled Workflow Functions
 *
 * We retain their proven implementation and place a thin
 * guarded wrapper around each one.
 * ========================================================= */


/* ---------------------------------------------------------
 * Customer Receipt posting workflow from migration 138
 * --------------------------------------------------------- */

alter function
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
rename to
  post_customer_receipt_with_account_internal_161;


/* ---------------------------------------------------------
 * Customer Advance application workflow from migration 159
 * --------------------------------------------------------- */

alter function
  public.apply_customer_advance_to_sales_order(
    uuid
  )
rename to
  apply_customer_advance_to_sales_order_internal_161;


/* ---------------------------------------------------------
 * Customer Receipt cancellation workflow from migration 160
 * --------------------------------------------------------- */

alter function
  public.cancel_customer_receipt_with_gl(
    uuid,
    text
  )
rename to
  cancel_customer_receipt_with_gl_internal_161;


/* =========================================================
 * 2. Remove Direct Access To Internal Workflow Functions
 * ========================================================= */

revoke all
on function
  public.post_customer_receipt_with_account_internal_161(
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
from public, anon, authenticated;


revoke all
on function
  public.apply_customer_advance_to_sales_order_internal_161(
    uuid
  )
from public, anon, authenticated;


revoke all
on function
  public.cancel_customer_receipt_with_gl_internal_161(
    uuid,
    text
  )
from public, anon, authenticated;


/* =========================================================
 * 3. Lifecycle Guard - Customer Receipt Header
 * ========================================================= */

create or replace function
  public.guard_customer_receipt_lifecycle()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_posting_guard boolean :=
    coalesce(
      current_setting(
        'erp.customer_receipt_posting',
        true
      ),
      ''
    ) = '1';

  v_advance_guard boolean :=
    coalesce(
      current_setting(
        'erp.customer_advance_application',
        true
      ),
      ''
    ) = '1';

  v_cancellation_guard boolean :=
    coalesce(
      current_setting(
        'erp.customer_receipt_cancellation',
        true
      ),
      ''
    ) = '1';
begin

  /* =======================================================
   * INSERT
   *
   * Customer Receipts must begin life as Draft.
   * ======================================================= */

  if tg_op = 'INSERT' then

    if new.status <> 'draft' then
      raise exception
        'Customer Receipts must be created in Draft status.';
    end if;

    return new;

  end if;


  /* =======================================================
   * DELETE
   *
   * Posted and Cancelled receipts are permanent accounting
   * audit records.
   * ======================================================= */

  if tg_op = 'DELETE' then

    if old.status in (
      'posted',
      'cancelled'
    ) then
      raise exception
        'Posted or Cancelled Customer Receipts cannot be deleted.';
    end if;

    return old;

  end if;


  /* =======================================================
   * UPDATE - Cancelled Receipt
   *
   * Cancelled accounting records are fully immutable.
   * ======================================================= */

  if old.status = 'cancelled' then

    raise exception
      'Cancelled Customer Receipts are immutable.';

  end if;


  /* =======================================================
   * UPDATE - Draft Receipt
   * ======================================================= */

  if old.status = 'draft' then

    /*
     * Ordinary Draft -> Draft changes remain possible for
     * trusted/internal workflows.
     *
     * Table DML is already unavailable to ordinary
     * authenticated application sessions.
     */

    if new.status = 'draft' then
      return new;
    end if;


    /*
     * Only the controlled Customer Receipt posting workflow
     * may transition Draft -> Posted.
     */

    if
      new.status = 'posted'
      and v_posting_guard
    then

      if new.posted_at is null then
        raise exception
          'A posted Customer Receipt requires posted_at.';
      end if;

      if new.posted_by is null then
        raise exception
          'A posted Customer Receipt requires posted_by.';
      end if;


      /*
       * Posting transition may only alter:
       *
       *   status
       *   posted_at
       *   posted_by
       *   updated_at
       */

      if
        (
          to_jsonb(new)
          -
          array[
            'status',
            'posted_at',
            'posted_by',
            'updated_at'
          ]::text[]
        )
        <>
        (
          to_jsonb(old)
          -
          array[
            'status',
            'posted_at',
            'posted_by',
            'updated_at'
          ]::text[]
        )
      then
        raise exception
          'Unexpected Customer Receipt fields changed during posting.';
      end if;

      return new;

    end if;


    raise exception
      'Invalid Customer Receipt status transition from Draft to %.',
      new.status;

  end if;


  /* =======================================================
   * UPDATE - Posted Receipt
   * ======================================================= */

  if old.status = 'posted' then

    /* -----------------------------------------------------
     * Controlled one-time Cash / Bank linkage
     *
     * Migration 138 posts the operational receipt first,
     * creates the treasury transaction and then links:
     *
     *   financial_account_id
     *   account_transaction_id
     * ----------------------------------------------------- */

    if
      new.status = 'posted'
      and v_posting_guard
      and old.financial_account_id is null
      and old.account_transaction_id is null
      and new.financial_account_id is not null
      and new.account_transaction_id is not null
      and
      (
        to_jsonb(new)
        -
        array[
          'financial_account_id',
          'account_transaction_id',
          'updated_at'
        ]::text[]
      )
      =
      (
        to_jsonb(old)
        -
        array[
          'financial_account_id',
          'account_transaction_id',
          'updated_at'
        ]::text[]
      )
    then

      return new;

    end if;


    /* -----------------------------------------------------
     * Controlled Customer Advance allocation synchronization
     *
     * Migration 159 may change only:
     *
     *   allocated_amount
     *   unallocated_amount
     *
     * on an already-posted receipt.
     * ----------------------------------------------------- */

    if
      new.status = 'posted'
      and v_advance_guard
      and
      (
        to_jsonb(new)
        -
        array[
          'allocated_amount',
          'unallocated_amount',
          'updated_at'
        ]::text[]
      )
      =
      (
        to_jsonb(old)
        -
        array[
          'allocated_amount',
          'unallocated_amount',
          'updated_at'
        ]::text[]
      )
    then

      if
        new.allocated_amount < 0
        or new.unallocated_amount < 0
      then
        raise exception
          'Customer Receipt allocation totals cannot be negative.';
      end if;


      if
        round(
          new.allocated_amount +
          new.unallocated_amount,
          2
        )
        <>
        round(
          new.amount,
          2
        )
      then
        raise exception
          'Customer Receipt amount must equal allocated plus unallocated amount.';
      end if;

      return new;

    end if;


    /* -----------------------------------------------------
     * Controlled Posted -> Cancelled transition
     *
     * Only migration 160 cancellation workflow may perform
     * this state transition.
     * ----------------------------------------------------- */

    if
      new.status = 'cancelled'
      and v_cancellation_guard
    then

      if new.cancelled_at is null then
        raise exception
          'A cancelled Customer Receipt requires cancelled_at.';
      end if;


      if new.cancelled_by is null then
        raise exception
          'A cancelled Customer Receipt requires cancelled_by.';
      end if;


      if
        nullif(
          trim(
            coalesce(
              new.cancellation_reason,
              ''
            )
          ),
          ''
        )
        is null
      then
        raise exception
          'A cancelled Customer Receipt requires a cancellation reason.';
      end if;


      if
        (
          to_jsonb(new)
          -
          array[
            'status',
            'cancelled_at',
            'cancelled_by',
            'cancellation_reason',
            'updated_at'
          ]::text[]
        )
        <>
        (
          to_jsonb(old)
          -
          array[
            'status',
            'cancelled_at',
            'cancelled_by',
            'cancellation_reason',
            'updated_at'
          ]::text[]
        )
      then
        raise exception
          'Unexpected Customer Receipt fields changed during cancellation.';
      end if;

      return new;

    end if;


    raise exception
      'Posted Customer Receipts are immutable outside controlled accounting workflows.';

  end if;


  raise exception
    'Unsupported Customer Receipt lifecycle operation.';

end;
$$;


/* =========================================================
 * 4. Lifecycle Guard - Customer Receipt Allocations
 *
 * Responsibilities:
 *
 *   - prohibit Draft Sales Order allocations
 *   - prohibit Cancelled Sales Order allocations
 *   - allow initial allocations while Receipt is Draft
 *   - allow later Posted-receipt allocations only through
 *     controlled Customer Advance application
 *   - prevent mutation/deletion of posted accounting history
 * ========================================================= */

create or replace function
  public.guard_customer_receipt_allocation_lifecycle()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_receipt_status text;
  v_sales_order_status text;

  v_advance_guard boolean :=
    coalesce(
      current_setting(
        'erp.customer_advance_application',
        true
      ),
      ''
    ) = '1';
begin

  /* =======================================================
   * INSERT
   * ======================================================= */

  if tg_op = 'INSERT' then

    select
      status
    into
      v_receipt_status
    from
      public.customer_receipts
    where
      id = new.receipt_id;


    if not found then
      raise exception
        'Customer Receipt was not found.';
    end if;


    select
      status
    into
      v_sales_order_status
    from
      public.sales_orders
    where
      id = new.sales_order_id;


    if not found then
      raise exception
        'Sales Order was not found.';
    end if;


    /*
     * Critical accounting rule:
     *
     * A Draft Sales Order has not entered the accounting
     * lifecycle and therefore cannot receive Customer money.
     */

    if
      v_sales_order_status in (
        'draft',
        'cancelled'
      )
    then
      raise exception
        'Customer Receipt allocations cannot be applied to Draft or Cancelled Sales Orders.';
    end if;


    /*
     * Initial receipt allocations are inserted while the
     * receipt itself is still Draft.
     */

    if v_receipt_status = 'draft' then
      return new;
    end if;


    /*
     * Later allocations against an already Posted receipt
     * are Customer Advance applications and must use the
     * controlled migration 159 workflow.
     */

    if
      v_receipt_status = 'posted'
      and v_advance_guard
    then
      return new;
    end if;


    if v_receipt_status = 'cancelled' then
      raise exception
        'Allocations cannot be added to a Cancelled Customer Receipt.';
    end if;


    raise exception
      'Allocations cannot be added to a Posted Customer Receipt outside the controlled Customer Advance workflow.';

  end if;


  /* =======================================================
   * UPDATE
   *
   * Once either the source or destination receipt is Posted
   * or Cancelled, the allocation audit record is immutable.
   * ======================================================= */

  if tg_op = 'UPDATE' then

    select
      status
    into
      v_receipt_status
    from
      public.customer_receipts
    where
      id = old.receipt_id;


    if not found then
      raise exception
        'Original Customer Receipt was not found.';
    end if;


    if
      v_receipt_status in (
        'posted',
        'cancelled'
      )
    then
      raise exception
        'Allocations belonging to Posted or Cancelled Customer Receipts are immutable.';
    end if;


    /*
     * If receipt_id is being changed, the destination receipt
     * must also still be Draft.
     */

    if new.receipt_id <> old.receipt_id then

      select
        status
      into
        v_receipt_status
      from
        public.customer_receipts
      where
        id = new.receipt_id;


      if not found then
        raise exception
          'Destination Customer Receipt was not found.';
      end if;


      if v_receipt_status <> 'draft' then
        raise exception
          'Allocations can only be moved to Draft Customer Receipts.';
      end if;

    end if;


    /*
     * A Draft or Cancelled Sales Order can never become the
     * destination of a Customer Receipt allocation.
     */

    select
      status
    into
      v_sales_order_status
    from
      public.sales_orders
    where
      id = new.sales_order_id;


    if not found then
      raise exception
        'Sales Order was not found.';
    end if;


    if
      v_sales_order_status in (
        'draft',
        'cancelled'
      )
    then
      raise exception
        'Customer Receipt allocations cannot be applied to Draft or Cancelled Sales Orders.';
    end if;


    return new;

  end if;


  /* =======================================================
   * DELETE
   * ======================================================= */

  if tg_op = 'DELETE' then

    select
      status
    into
      v_receipt_status
    from
      public.customer_receipts
    where
      id = old.receipt_id;


    if not found then
      raise exception
        'Customer Receipt was not found.';
    end if;


    if
      v_receipt_status in (
        'posted',
        'cancelled'
      )
    then
      raise exception
        'Allocations belonging to Posted or Cancelled Customer Receipts cannot be deleted.';
    end if;


    return old;

  end if;


  raise exception
    'Unsupported Customer Receipt Allocation lifecycle operation.';

end;
$$;


/* =========================================================
 * 5. Install Lifecycle Triggers
 * ========================================================= */

drop trigger if exists
  zz_customer_receipt_lifecycle_guard
on
  public.customer_receipts;


create trigger
  zz_customer_receipt_lifecycle_guard
before insert or update or delete
on
  public.customer_receipts
for each row
execute function
  public.guard_customer_receipt_lifecycle();


drop trigger if exists
  zz_customer_receipt_allocation_lifecycle_guard
on
  public.customer_receipt_allocations;


create trigger
  zz_customer_receipt_allocation_lifecycle_guard
before insert or update or delete
on
  public.customer_receipt_allocations
for each row
execute function
  public.guard_customer_receipt_allocation_lifecycle();


/* =========================================================
 * 6. Re-create Controlled Customer Receipt Posting Entry Point
 *
 * The proven migration 138 implementation remains untouched
 * inside:
 *
 *   post_customer_receipt_with_account_internal_161(...)
 *
 * This wrapper supplies the transaction-local lifecycle guard.
 * ========================================================= */

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
begin

  perform
    set_config(
      'erp.customer_receipt_posting',
      '1',
      true
    );


  v_receipt_id :=
    public.post_customer_receipt_with_account_internal_161(
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
      p_allocations,
      p_financial_account_id
    );


  perform
    set_config(
      'erp.customer_receipt_posting',
      '',
      true
    );


  return
    v_receipt_id;

end;
$$;


/* =========================================================
 * 7. Re-create Controlled Customer Advance Entry Point
 * ========================================================= */

create or replace function
  public.apply_customer_advance_to_sales_order(
    p_sales_order_id uuid
  )
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_applied numeric;
begin

  perform
    set_config(
      'erp.customer_advance_application',
      '1',
      true
    );


  v_total_applied :=
    public.apply_customer_advance_to_sales_order_internal_161(
      p_sales_order_id
    );


  perform
    set_config(
      'erp.customer_advance_application',
      '',
      true
    );


  return
    v_total_applied;

end;
$$;


/* =========================================================
 * 8. Re-create Controlled Cancellation Entry Point
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
  v_reversal_id uuid;
begin

  perform
    set_config(
      'erp.customer_receipt_cancellation',
      '1',
      true
    );


  v_reversal_id :=
    public.cancel_customer_receipt_with_gl_internal_161(
      p_receipt_id,
      p_reason
    );


  perform
    set_config(
      'erp.customer_receipt_cancellation',
      '',
      true
    );


  return
    v_reversal_id;

end;
$$;


/* =========================================================
 * 9. Lock Down Unsafe Lower-Level RPCs
 * ========================================================= */


/* ---------------------------------------------------------
 * Raw operational Customer Receipt posting
 *
 * Must now be reached only through:
 *
 *   post_customer_receipt_with_account(...)
 * --------------------------------------------------------- */

revoke all
on function
  public.post_customer_receipt(
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
    jsonb
  )
from public, anon, authenticated;


/* ---------------------------------------------------------
 * Lower-level Customer Receipt cancellation
 * --------------------------------------------------------- */

revoke all
on function
  public.cancel_customer_receipt(
    uuid,
    text
  )
from public, anon, authenticated;


revoke all
on function
  public.cancel_customer_receipt_with_account(
    uuid,
    text
  )
from public, anon, authenticated;


/* ---------------------------------------------------------
 * Customer Advance GL adapter
 *
 * This must never be manually called without creating the
 * corresponding controlled allocation.
 * --------------------------------------------------------- */

revoke all
on function
  public.post_customer_advance_application_gl(
    uuid
  )
from public, anon, authenticated;


/* ---------------------------------------------------------
 * Synchronization helpers remain internal-only.
 * --------------------------------------------------------- */

revoke all
on function
  public.sync_customer_receipt_totals(
    uuid
  )
from public, anon, authenticated;


revoke all
on function
  public.sync_sales_order_paid_amount(
    uuid
  )
from public, anon, authenticated;


/* =========================================================
 * 10. Permissions - Approved ERP Entry Points
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


revoke all
on function
  public.apply_customer_advance_to_sales_order(
    uuid
  )
from public, anon;


grant execute
on function
  public.apply_customer_advance_to_sales_order(
    uuid
  )
to authenticated;


revoke all
on function
  public.cancel_customer_receipt_with_gl(
    uuid,
    text
  )
from public, anon;


grant execute
on function
  public.cancel_customer_receipt_with_gl(
    uuid,
    text
  )
to authenticated;


/* =========================================================
 * 11. Trigger Function Permissions
 *
 * Trigger functions are not application RPCs.
 * ========================================================= */

revoke all
on function
  public.guard_customer_receipt_lifecycle()
from public, anon, authenticated;


revoke all
on function
  public.guard_customer_receipt_allocation_lifecycle()
from public, anon, authenticated;


/* =========================================================
 * 12. Documentation
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
  'Controlled Customer Receipt posting entry point. Atomically posts the operational receipt, treasury movement and General Ledger journal while enforcing Customer Receipt lifecycle protection.';


comment on function
  public.apply_customer_advance_to_sales_order(
    uuid
  )
is
  'Controlled Customer Advance application entry point. Applies available posted Customer Advances to an eligible non-draft Sales Order and posts the corresponding GL reclassification atomically.';


comment on function
  public.cancel_customer_receipt_with_gl(
    uuid,
    text
  )
is
  'Controlled Customer Receipt cancellation entry point. Reverses Customer Advance application GL, operational payment effect, treasury movement and original Customer Receipt GL while preserving immutable audit history.';


comment on function
  public.guard_customer_receipt_lifecycle()
is
  'Database lifecycle protection for Customer Receipt headers. Posted and Cancelled accounting history may change only through explicitly controlled ERP accounting workflows.';


comment on function
  public.guard_customer_receipt_allocation_lifecycle()
is
  'Database lifecycle protection for Customer Receipt allocations. Prevents Draft or Cancelled Sales Order allocations and protects Posted or Cancelled receipt allocation history from mutation.';


/* =========================================================
 * End Migration 161
 * ========================================================= */