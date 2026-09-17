/* Migration 202: Allow controlled Sales Order revisions to synchronize derived payment state.
 *
 * Receipt records and original receipt allocations remain immutable.
 * Historical Sales Order identity/customer/currency/date protections remain unchanged.
 */

create or replace function
  public.enforce_sales_order_lifecycle_immutability()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_old_business jsonb;
  v_new_business jsonb;

  v_revision_write boolean := false;
begin

  if tg_op = 'DELETE' then

    if old.status = 'draft' then
      return old;
    end if;

    raise exception
      'Sales Order % cannot be deleted from status "%". Confirmed Sales Orders are historical accounting documents.',
      old.order_number,
      old.status
      using errcode = 'P0001';

  end if;


  if old.status = 'draft' then

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


  if old.status = 'cancelled' then
    raise exception
      'Cancelled Sales Order % is immutable.',
      old.order_number
      using errcode = 'P0001';
  end if;


  /*
   * Closed Sales Orders remain outside the direct revision
   * workflow. They require formal accounting-period handling.
   */
  if old.status = 'closed' then
    raise exception
      'Closed Sales Order % is immutable.',
      old.order_number
      using errcode = 'P0001';
  end if;


  v_revision_write :=
    public.is_authorized_sales_order_revision_write(
      old.id
    );


  /*
   * Controlled revision writes may alter the commercial
   * state, but may NOT:
   *
   *   - change identity;
   *   - move the Sales Order to another customer;
   *   - change currency/exchange-rate history;
   *   - cancel it;
   *
   * paid_amount / balance_due / payment_status are derived current-state
   * fields. An authorized revision may synchronize them after immutable
   * receipt allocations are reconciled through append-only adjustments.
   */
  if v_revision_write then

    if
      new.id is distinct from old.id
      or
      new.order_number is distinct from old.order_number
      or
      new.customer_id is distinct from old.customer_id
      or
      new.currency_code is distinct from old.currency_code
      or
      new.exchange_rate is distinct from old.exchange_rate
      or
      new.order_date is distinct from old.order_date

    then
      raise exception
        'Controlled Sales Order revision attempted to change a protected historical identity/payment field.'
        using errcode = 'P0001';
    end if;


    if new.status = 'cancelled' then
      raise exception
        'A posted Sales Order cannot be cancelled through the modification workflow.'
        using errcode = 'P0001';
    end if;


    return new;

  end if;


  /*
   * Standard Migration-158 commercial immutability.
   */
  if new.status = 'cancelled' then
    raise exception
      'Sales Order % has already been confirmed and cannot be cancelled directly. Use the controlled Sales Return / accounting reversal workflow.',
      old.order_number
      using errcode = 'P0001';
  end if;


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
      'Confirmed Sales Order commercial fields are immutable. Use the controlled Sales Order modification workflow.'
      using errcode = 'P0001';
  end if;


  if
    old.status = 'confirmed'
    and new.status not in (
      'confirmed',
      'processing',
      'partially_fulfilled',
      'fulfilled',
      'completed',
      'closed'
    )
  then
    raise exception
      'Confirmed Sales Order % cannot transition to status "%".',
      old.order_number,
      new.status
      using errcode = 'P0001';
  end if;


  if
    old.status = 'processing'
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


  if
    old.status = 'partially_fulfilled'
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


  if
    old.status = 'fulfilled'
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


  if
    old.status = 'completed'
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


  return new;

end;
$$;
