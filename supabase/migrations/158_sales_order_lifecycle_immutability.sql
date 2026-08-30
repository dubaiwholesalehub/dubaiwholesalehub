/*
 * HM ERP — Sales Order Lifecycle Immutability
 *
 * Purpose
 * -------
 * A confirmed Sales Order has already posted:
 *
 *   Dr Accounts Receivable
 *      Cr Sales Revenue
 *      Cr VAT Output
 *
 * through the atomic Sales Order confirmation workflow.
 *
 * Therefore, once a Sales Order is confirmed, its commercial
 * facts must not be silently changed or directly cancelled.
 *
 * Legitimate post-confirmation changes remain allowed for:
 *
 *   - delivery / fulfilment progression;
 *   - stock reservation / allocation / fulfilment quantities;
 *   - customer receipt payment synchronization;
 *   - lifecycle timestamps;
 *   - audit timestamps/users.
 *
 * Draft Sales Orders remain fully editable.
 *
 * Corrections to financially posted Sales Orders must use
 * controlled Sales Return / accounting reversal workflows.
 */


/* =========================================================
 * 1. Sales Order Header Lifecycle Immutability
 * ========================================================= */

create or replace function
  public.enforce_sales_order_lifecycle_immutability()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_old_business jsonb;
  v_new_business jsonb;
begin

  /* =======================================================
   * DELETE
   * ======================================================= */

  if tg_op = 'DELETE' then

    /*
     * Draft orders have not posted accounting and may still
     * be removed if the application permits it.
     */
    if old.status = 'draft' then
      return old;
    end if;

    raise exception
      'Sales Order % cannot be deleted from status "%". Confirmed Sales Orders are historical accounting documents.',
      old.order_number,
      old.status
      using errcode = 'P0001';

  end if;


  /* =======================================================
   * Draft
   * ======================================================= */

  if old.status = 'draft' then

    /*
     * Draft rows are editable.
     *
     * Valid exits from Draft are:
     *
     *   draft -> confirmed
     *   draft -> cancelled
     *
     * Keeping draft -> draft allows ordinary editing.
     */
    if new.status not in (
      'draft',
      'confirmed',
      'cancelled'
    ) then
      raise exception
        'Draft Sales Order % cannot transition directly to status "%". Confirm or cancel the Sales Order through the controlled workflow.',
        old.order_number,
        new.status
        using errcode = 'P0001';
    end if;

    return new;

  end if;


  /* =======================================================
   * Cancelled
   * ======================================================= */

  if old.status = 'cancelled' then

    raise exception
      'Cancelled Sales Order % is immutable.',
      old.order_number
      using errcode = 'P0001';

  end if;


  /* =======================================================
   * Confirmed / Processing / Partially Fulfilled / Fulfilled
   * / Completed / Closed
   *
   * From this point the commercial Sales Order has already
   * generated AR / Revenue / VAT accounting.
   * ======================================================= */

  /*
   * Direct cancellation after confirmation is prohibited.
   *
   * The existing cancellation RPC only releases operational
   * reservations. It does not reverse the posted Sales Order
   * Revenue / AR / VAT journal.
   */
  if new.status = 'cancelled' then
    raise exception
      'Sales Order % has already been confirmed and cannot be cancelled directly. Use the controlled Sales Return / accounting reversal workflow.',
      old.order_number
      using errcode = 'P0001';
  end if;


  /*
   * Commercial/accounting facts are frozen.
   *
   * Remove only fields that are intentionally allowed to
   * change after confirmation.
   *
   * Allowed header fields:
   *
   *   status
   *   fulfilment_status
   *   payment_status
   *   paid_amount
   *   balance_due
   *   processing_at
   *   completed_at
   *   closed_at
   *   updated_by
   *   updated_at
   *
   * payment_status and balance_due are derived by the
   * existing calculate_sales_order_balance trigger when
   * paid_amount changes.
   */
  v_old_business :=
    to_jsonb(old)
      - 'status'
      - 'fulfilment_status'
      - 'payment_status'
      - 'paid_amount'
      - 'balance_due'
      - 'processing_at'
      - 'completed_at'
      - 'closed_at'
      - 'updated_by'
      - 'updated_at';

  v_new_business :=
    to_jsonb(new)
      - 'status'
      - 'fulfilment_status'
      - 'payment_status'
      - 'paid_amount'
      - 'balance_due'
      - 'processing_at'
      - 'completed_at'
      - 'closed_at'
      - 'updated_by'
      - 'updated_at';


  if v_old_business is distinct from v_new_business then
    raise exception
      'Confirmed Sales Order % commercial/accounting fields are immutable. Use controlled fulfilment, receipt, Sales Return, or accounting correction workflows.',
      old.order_number
      using errcode = 'P0001';
  end if;


  /* =======================================================
   * Lifecycle Status Protection
   * ======================================================= */

  /*
   * Confirmed Sales Orders may enter execution.
   */
  if old.status = 'confirmed'
     and new.status not in (
       'confirmed',
       'processing'
     )
  then
    raise exception
      'Confirmed Sales Order % cannot transition directly to status "%". Delivery execution must move the order through the controlled fulfilment workflow.',
      old.order_number,
      new.status
      using errcode = 'P0001';
  end if;


  /*
   * Processing orders may remain processing or progress
   * through fulfilment.
   */
  if old.status = 'processing'
     and new.status not in (
       'processing',
       'partially_fulfilled',
       'fulfilled',
       'completed',
       'closed'
     )
  then
    raise exception
      'Processing Sales Order % cannot transition to status "%".',
      old.order_number,
      new.status
      using errcode = 'P0001';
  end if;


  /*
   * Partially fulfilled orders may continue processing or
   * become fulfilled.
   *
   * "processing" is retained here because the existing
   * synchronizer derives the header status from the current
   * fulfilment state.
   */
  if old.status = 'partially_fulfilled'
     and new.status not in (
       'processing',
       'partially_fulfilled',
       'fulfilled',
       'completed',
       'closed'
     )
  then
    raise exception
      'Partially fulfilled Sales Order % cannot transition to status "%".',
      old.order_number,
      new.status
      using errcode = 'P0001';
  end if;


  /*
   * Fulfilled orders are financially and operationally
   * historical. Only terminal completion/closure progression
   * is permitted.
   */
  if old.status = 'fulfilled'
     and new.status not in (
       'fulfilled',
       'completed',
       'closed'
     )
  then
    raise exception
      'Fulfilled Sales Order % cannot transition to status "%".',
      old.order_number,
      new.status
      using errcode = 'P0001';
  end if;


  /*
   * Completed and Closed are terminal.
   *
   * Payment synchronization may still legitimately update
   * payment fields, so the row itself is not completely
   * UPDATE-blocked.
   */
  if old.status = 'completed'
     and new.status not in (
       'completed',
       'closed'
     )
  then
    raise exception
      'Completed Sales Order % cannot transition to status "%".',
      old.order_number,
      new.status
      using errcode = 'P0001';
  end if;


  if old.status = 'closed'
     and new.status <> 'closed'
  then
    raise exception
      'Closed Sales Order % is terminal and cannot transition to status "%".',
      old.order_number,
      new.status
      using errcode = 'P0001';
  end if;


  return new;

end;
$$;


drop trigger if exists
  trg_enforce_sales_order_lifecycle_immutability
on public.sales_orders;


create trigger
  trg_enforce_sales_order_lifecycle_immutability
before update or delete
on public.sales_orders
for each row
execute function
  public.enforce_sales_order_lifecycle_immutability();


comment on function
  public.enforce_sales_order_lifecycle_immutability()
is
'Protects confirmed Sales Orders from commercial mutation, direct cancellation, or deletion after AR/Revenue/VAT accounting has been posted. Allows controlled fulfilment and customer receipt synchronization.';


/* =========================================================
 * 2. Sales Order Item Lifecycle Immutability
 * ========================================================= */

create or replace function
  public.enforce_sales_order_item_lifecycle_immutability()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_old_parent_status text;
  v_new_parent_status text;

  v_old_business jsonb;
  v_new_business jsonb;
begin

  /* =======================================================
   * INSERT
   * ======================================================= */

  if tg_op = 'INSERT' then

    select
      status
    into
      v_new_parent_status
    from public.sales_orders
    where id = new.sales_order_id;


    if not found then
      raise exception
        'Parent Sales Order was not found.'
        using errcode = 'P0001';
    end if;


    if v_new_parent_status <> 'draft' then
      raise exception
        'Items cannot be added to a Sales Order in status "%". Confirmed Sales Order commercial lines are immutable.',
        v_new_parent_status
        using errcode = 'P0001';
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
      v_old_parent_status
    from public.sales_orders
    where id = old.sales_order_id;


    if not found then
      return old;
    end if;


    if v_old_parent_status <> 'draft' then
      raise exception
        'Items cannot be deleted from Sales Order % while it is in status "%". Confirmed Sales Order lines are historical accounting facts.',
        old.sales_order_id,
        v_old_parent_status
        using errcode = 'P0001';
    end if;


    return old;

  end if;


  /* =======================================================
   * UPDATE
   * ======================================================= */

  select
    status
  into
    v_old_parent_status
  from public.sales_orders
  where id = old.sales_order_id;


  if not found then
    raise exception
      'Original parent Sales Order was not found.'
      using errcode = 'P0001';
  end if;


  select
    status
  into
    v_new_parent_status
  from public.sales_orders
  where id = new.sales_order_id;


  if not found then
    raise exception
      'Target parent Sales Order was not found.'
      using errcode = 'P0001';
  end if;


  /*
   * Draft items remain editable.
   *
   * Moving an item from a Draft order into an already
   * confirmed order is not allowed.
   */
  if v_old_parent_status = 'draft' then

    if v_new_parent_status <> 'draft' then
      raise exception
        'Sales Order items cannot be moved into a non-draft Sales Order.'
        using errcode = 'P0001';
    end if;

    return new;

  end if;


  /*
   * Once confirmed, an item cannot be moved to a different
   * Sales Order.
   */
  if new.sales_order_id is distinct from old.sales_order_id then
    raise exception
      'Confirmed Sales Order items cannot be moved between Sales Orders.'
      using errcode = 'P0001';
  end if;


  /*
   * Commercial line facts are frozen.
   *
   * These operational fulfilment fields remain mutable:
   *
   *   warehouse_id
   *   fulfilment_status
   *   quantity_reserved
   *   quantity_allocated
   *   quantity_fulfilled
   *   shortage_quantity
   *   procurement_required
   *   updated_at
   *
   * warehouse_id is operational rather than commercial and
   * may be assigned by stock/procurement fulfilment flows.
   */
  v_old_business :=
    to_jsonb(old)
      - 'warehouse_id'
      - 'fulfilment_status'
      - 'quantity_reserved'
      - 'quantity_allocated'
      - 'quantity_fulfilled'
      - 'shortage_quantity'
      - 'procurement_required'
      - 'updated_at';

  v_new_business :=
    to_jsonb(new)
      - 'warehouse_id'
      - 'fulfilment_status'
      - 'quantity_reserved'
      - 'quantity_allocated'
      - 'quantity_fulfilled'
      - 'shortage_quantity'
      - 'procurement_required'
      - 'updated_at';


  if v_old_business is distinct from v_new_business then
    raise exception
      'Confirmed Sales Order item commercial fields are immutable. Use the controlled fulfilment or Sales Return workflow.'
      using errcode = 'P0001';
  end if;


  /*
   * Protect historical fulfilled quantity.
   *
   * Fulfilment may increase through controlled Delivery
   * dispatch, but it must never silently decrease.
   */
  if new.quantity_fulfilled < old.quantity_fulfilled then
    raise exception
      'Sales Order fulfilled quantity cannot be reduced directly. Use the controlled Sales Return workflow.'
      using errcode = 'P0001';
  end if;


  /*
   * A confirmed line quantity itself is commercial and is
   * already protected by the JSONB comparison above.
   *
   * Operational quantities must remain non-negative.
   */
  if new.quantity_reserved < 0
     or new.quantity_allocated < 0
     or new.quantity_fulfilled < 0
     or new.quantity_cancelled < 0
     or new.shortage_quantity < 0
  then
    raise exception
      'Sales Order operational quantities cannot be negative.'
      using errcode = 'P0001';
  end if;


  return new;

end;
$$;


drop trigger if exists
  trg_enforce_sales_order_item_lifecycle_immutability
on public.sales_order_items;


create trigger
  trg_enforce_sales_order_item_lifecycle_immutability
before insert or update or delete
on public.sales_order_items
for each row
execute function
  public.enforce_sales_order_item_lifecycle_immutability();


comment on function
  public.enforce_sales_order_item_lifecycle_immutability()
is
'Protects confirmed Sales Order commercial line facts while allowing controlled reservation, procurement and Delivery fulfilment quantities to synchronize.';


/* =========================================================
 * 3. Documentation
 * ========================================================= */

comment on trigger
  trg_enforce_sales_order_lifecycle_immutability
on public.sales_orders
is
'Prevents direct mutation, cancellation or deletion of financially posted Sales Orders while preserving controlled fulfilment/payment synchronization.';


comment on trigger
  trg_enforce_sales_order_item_lifecycle_immutability
on public.sales_order_items
is
'Prevents commercial changes to confirmed Sales Order lines while preserving controlled inventory reservation and fulfilment updates.';