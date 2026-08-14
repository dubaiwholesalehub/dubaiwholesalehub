/* =========================================================
 * Customer Receipts & Receivable Allocations
 *
 * Purpose:
 * - Record actual customer money received.
 * - Support Cash / Bank / Card / Cheque / Other.
 * - Support one receipt allocated across multiple sales orders.
 * - Support multiple receipts against one sales order.
 * - Keep posted/cancelled audit history.
 * - Automatically synchronize sales_orders.paid_amount.
 *
 * Receipt format:
 * RCPT-2026-000001
 * ========================================================= */


/* =========================================================
 * Receipt Number Sequence
 * ========================================================= */

create sequence if not exists
  public.customer_receipt_number_seq
start with 1
increment by 1;


/* =========================================================
 * Customer Receipts
 * ========================================================= */

create table if not exists
  public.customer_receipts (
    id uuid primary key
      default gen_random_uuid(),

    receipt_number text
      not null
      unique,

    customer_id uuid
      not null
      references public.customers(id)
      on update cascade
      on delete restrict,

    receipt_date date
      not null
      default current_date,

    payment_method text
      not null
      default 'cash',

    currency_code text
      not null
      default 'AED',

    exchange_rate numeric(18, 6)
      not null
      default 1,

    amount numeric(18, 2)
      not null,

    allocated_amount numeric(18, 2)
      not null
      default 0,

    unallocated_amount numeric(18, 2)
      not null
      default 0,

    reference_number text,

    bank_name text,

    cheque_number text,

    cheque_date date,

    notes text,

    status text
      not null
      default 'draft',

    posted_at timestamptz,

    posted_by uuid
      references public.profiles(id)
      on delete set null,

    cancelled_at timestamptz,

    cancelled_by uuid
      references public.profiles(id)
      on delete set null,

    cancellation_reason text,

    created_by uuid
      references public.profiles(id)
      on delete set null,

    created_at timestamptz
      not null
      default now(),

    updated_at timestamptz
      not null
      default now(),

    constraint
      customer_receipts_amount_check
    check (
      amount > 0
    ),

    constraint
      customer_receipts_exchange_rate_check
    check (
      exchange_rate > 0
    ),

    constraint
      customer_receipts_allocated_check
    check (
      allocated_amount >= 0
      and allocated_amount <= amount
    ),

    constraint
      customer_receipts_unallocated_check
    check (
      unallocated_amount >= 0
      and unallocated_amount <= amount
    ),

    constraint
      customer_receipts_method_check
    check (
      payment_method in (
        'cash',
        'bank',
        'card',
        'cheque',
        'other'
      )
    ),

    constraint
      customer_receipts_status_check
    check (
      status in (
        'draft',
        'posted',
        'cancelled'
      )
    ),

    constraint
      customer_receipts_currency_check
    check (
      currency_code ~ '^[A-Z]{3}$'
    )
  );


/* =========================================================
 * Receipt Allocations
 * ========================================================= */

create table if not exists
  public.customer_receipt_allocations (
    id uuid primary key
      default gen_random_uuid(),

    receipt_id uuid
      not null
      references public.customer_receipts(id)
      on update cascade
      on delete restrict,

    sales_order_id uuid
      not null
      references public.sales_orders(id)
      on update cascade
      on delete restrict,

    amount numeric(18, 2)
      not null,

    created_at timestamptz
      not null
      default now(),

    constraint
      customer_receipt_allocations_amount_check
    check (
      amount > 0
    ),

    constraint
      customer_receipt_allocation_unique
    unique (
      receipt_id,
      sales_order_id
    )
  );


/* =========================================================
 * Indexes
 * ========================================================= */

create index if not exists
  customer_receipts_customer_idx
on public.customer_receipts (
  customer_id
);


create index if not exists
  customer_receipts_date_idx
on public.customer_receipts (
  receipt_date
);


create index if not exists
  customer_receipts_status_idx
on public.customer_receipts (
  status
);


create index if not exists
  customer_receipt_allocations_receipt_idx
on public.customer_receipt_allocations (
  receipt_id
);


create index if not exists
  customer_receipt_allocations_order_idx
on public.customer_receipt_allocations (
  sales_order_id
);


/* =========================================================
 * Updated At
 * ========================================================= */

drop trigger if exists
  set_customer_receipts_updated_at
on public.customer_receipts;

create trigger
  set_customer_receipts_updated_at
before update
on public.customer_receipts
for each row
execute function
  public.set_sales_updated_at();


/* =========================================================
 * Generate Receipt Number
 * ========================================================= */

create or replace function
  public.generate_customer_receipt_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  return
    'RCPT-'
    ||
    to_char(
      current_date,
      'YYYY'
    )
    ||
    '-'
    ||
    lpad(
      nextval(
        'public.customer_receipt_number_seq'
      )::text,
      6,
      '0'
    );
end;
$$;


/* =========================================================
 * Synchronize One Sales Order Payment
 *
 * Receipt allocations are the source of truth.
 *
 * Only POSTED receipts count toward paid_amount.
 *
 * Existing sales order trigger automatically derives:
 * - balance_due
 * - unpaid
 * - partially_paid
 * - paid
 * - overpaid
 * ========================================================= */

create or replace function
  public.sync_sales_order_paid_amount(
    p_sales_order_id uuid
  )
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paid_amount numeric(18, 2);
begin
  select
    coalesce(
      sum(a.amount),
      0
    )
  into
    v_paid_amount
  from
    public.customer_receipt_allocations a
  join
    public.customer_receipts r
      on r.id = a.receipt_id
  where
    a.sales_order_id =
      p_sales_order_id
    and r.status = 'posted';

  update public.sales_orders
  set
    paid_amount =
      round(
        v_paid_amount,
        2
      )
  where
    id =
      p_sales_order_id;

  if not found then
    raise exception
      'Sales order was not found.';
  end if;
end;
$$;


/* =========================================================
 * Recalculate Receipt Allocation Totals
 * ========================================================= */

create or replace function
  public.sync_customer_receipt_totals(
    p_receipt_id uuid
  )
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount numeric(18, 2);
  v_allocated numeric(18, 2);
begin
  select
    amount
  into
    v_amount
  from
    public.customer_receipts
  where
    id = p_receipt_id;

  if not found then
    raise exception
      'Customer receipt was not found.';
  end if;

  select
    coalesce(
      sum(amount),
      0
    )
  into
    v_allocated
  from
    public.customer_receipt_allocations
  where
    receipt_id =
      p_receipt_id;

  if
    v_allocated >
    v_amount
  then
    raise exception
      'Receipt allocations cannot exceed the receipt amount.';
  end if;

  update
    public.customer_receipts
  set
    allocated_amount =
      round(
        v_allocated,
        2
      ),

    unallocated_amount =
      round(
        v_amount -
        v_allocated,
        2
      )

  where
    id =
      p_receipt_id;
end;
$$;


/* =========================================================
 * Create & Post Customer Receipt
 *
 * p_allocations JSON format:
 *
 * [
 *   {
 *     "sales_order_id": "uuid",
 *     "amount": 500
 *   }
 * ]
 *
 * Empty allocations are allowed.
 * This supports customer advances/unallocated credit.
 * ========================================================= */

create or replace function
  public.post_customer_receipt(
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
    p_allocations jsonb
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_receipt_id uuid;

  v_receipt_number text;

  v_allocation jsonb;

  v_sales_order_id uuid;

  v_allocation_amount
    numeric(18, 2);

  v_order_customer_id uuid;

  v_order_currency text;

  v_order_grand_total
    numeric(18, 2);

  v_order_paid_amount
    numeric(18, 2);

  v_existing_other_allocations
    numeric(18, 2);

  v_total_allocated
    numeric(18, 2) := 0;
begin

  /* =======================================================
   * Security
   * ======================================================= */

  v_user_id :=
    auth.uid();

  if v_user_id is null then
    raise exception
      'Authentication is required.';
  end if;

  if not public.is_admin() then
    raise exception
      'You are not authorized to post customer receipts.';
  end if;


  /* =======================================================
   * Validate Customer
   * ======================================================= */

  perform 1
  from public.customers
  where
    id = p_customer_id
    and status = 'active';

  if not found then
    raise exception
      'The selected customer was not found or is inactive.';
  end if;


  /* =======================================================
   * Validate Receipt
   * ======================================================= */

  if
    p_amount is null
    or p_amount <= 0
  then
    raise exception
      'Receipt amount must be greater than zero.';
  end if;


  if
    p_exchange_rate is null
    or p_exchange_rate <= 0
  then
    raise exception
      'Exchange rate must be greater than zero.';
  end if;


  if
    upper(
      trim(
        coalesce(
          p_currency_code,
          ''
        )
      )
    )
    !~ '^[A-Z]{3}$'
  then
    raise exception
      'A valid three-letter currency code is required.';
  end if;


  if
    p_payment_method not in (
      'cash',
      'bank',
      'card',
      'cheque',
      'other'
    )
  then
    raise exception
      'Invalid payment method.';
  end if;


  /* =======================================================
   * Validate Allocations
   * ======================================================= */

  if
    p_allocations is null
  then
    p_allocations :=
      '[]'::jsonb;
  end if;


  if
    jsonb_typeof(
      p_allocations
    ) <> 'array'
  then
    raise exception
      'Receipt allocations must be an array.';
  end if;


  if (
    select count(*)
    from
      jsonb_array_elements(
        p_allocations
      )
  ) <> (
    select count(
      distinct
        allocation ->> 'sales_order_id'
    )
    from
      jsonb_array_elements(
        p_allocations
      )
      as allocation
  ) then
    raise exception
      'The same sales order cannot appear more than once in one receipt.';
  end if;


  /* =======================================================
   * Lock & Validate Sales Orders
   * ======================================================= */

  for v_allocation in
    select *
    from
      jsonb_array_elements(
        p_allocations
      )
  loop

    begin
      v_sales_order_id :=
        (
          v_allocation ->> 'sales_order_id'
        )::uuid;

    exception
      when others then
        raise exception
          'A valid sales order ID is required.';
    end;


    begin
      v_allocation_amount :=
        (
          v_allocation ->> 'amount'
        )::numeric;

    exception
      when others then
        raise exception
          'A valid allocation amount is required.';
    end;


    if
      v_allocation_amount <= 0
    then
      raise exception
        'Allocation amount must be greater than zero.';
    end if;


    select
      customer_id,
      currency_code,
      grand_total,
      paid_amount
    into
      v_order_customer_id,
      v_order_currency,
      v_order_grand_total,
      v_order_paid_amount
    from
      public.sales_orders
    where
      id =
        v_sales_order_id
      and status <>
        'cancelled'
    for update;


    if not found then
      raise exception
        'The selected sales order was not found or is cancelled.';
    end if;


    if
      v_order_customer_id <>
      p_customer_id
    then
      raise exception
        'All receipt allocations must belong to the same customer.';
    end if;


    if
      upper(
        v_order_currency
      ) <>
      upper(
        p_currency_code
      )
    then
      raise exception
        'Receipt currency must match the sales order currency.';
    end if;


    /*
     * Existing posted allocations on this order.
     */

    select
      coalesce(
        sum(a.amount),
        0
      )
    into
      v_existing_other_allocations
    from
      public.customer_receipt_allocations a
    join
      public.customer_receipts r
        on r.id =
          a.receipt_id
    where
      a.sales_order_id =
        v_sales_order_id
      and r.status =
        'posted';


    if
      v_existing_other_allocations +
      v_allocation_amount >
      v_order_grand_total
    then
      raise exception
        'Receipt allocation exceeds the outstanding sales order balance.';
    end if;


    v_total_allocated :=
      v_total_allocated +
      v_allocation_amount;

  end loop;


  if
    v_total_allocated >
    p_amount
  then
    raise exception
      'Total allocations cannot exceed the receipt amount.';
  end if;


  /* =======================================================
   * Receipt Header
   * ======================================================= */

  v_receipt_number :=
    public.generate_customer_receipt_number();


  insert into
    public.customer_receipts (
      receipt_number,

      customer_id,

      receipt_date,

      payment_method,

      currency_code,

      exchange_rate,

      amount,

      allocated_amount,

      unallocated_amount,

      reference_number,

      bank_name,

      cheque_number,

      cheque_date,

      notes,

      status,

      posted_at,

      posted_by,

      created_by
    )
  values (
    v_receipt_number,

    p_customer_id,

    coalesce(
      p_receipt_date,
      current_date
    ),

    p_payment_method,

    upper(
      p_currency_code
    ),

    p_exchange_rate,

    round(
      p_amount,
      2
    ),

    0,

    round(
      p_amount,
      2
    ),

    nullif(
      trim(
        coalesce(
          p_reference_number,
          ''
        )
      ),
      ''
    ),

    nullif(
      trim(
        coalesce(
          p_bank_name,
          ''
        )
      ),
      ''
    ),

    nullif(
      trim(
        coalesce(
          p_cheque_number,
          ''
        )
      ),
      ''
    ),

    p_cheque_date,

    nullif(
      trim(
        coalesce(
          p_notes,
          ''
        )
      ),
      ''
    ),

    'draft',

    null,

    null,

    v_user_id
  )
  returning
    id
  into
    v_receipt_id;


  /* =======================================================
   * Insert Allocations
   * ======================================================= */

  for v_allocation in
    select *
    from
      jsonb_array_elements(
        p_allocations
      )
  loop

    v_sales_order_id :=
      (
        v_allocation ->> 'sales_order_id'
      )::uuid;

    v_allocation_amount :=
      (
        v_allocation ->> 'amount'
      )::numeric;


    insert into
      public.customer_receipt_allocations (
        receipt_id,
        sales_order_id,
        amount
      )
    values (
      v_receipt_id,
      v_sales_order_id,
      round(
        v_allocation_amount,
        2
      )
    );

  end loop;


  perform
    public.sync_customer_receipt_totals(
      v_receipt_id
    );


  /* =======================================================
   * Post Receipt
   * ======================================================= */

  update
    public.customer_receipts
  set
    status =
      'posted',

    posted_at =
      now(),

    posted_by =
      v_user_id

  where
    id =
      v_receipt_id;


  /* =======================================================
   * Synchronize Sales Orders
   * ======================================================= */

  for v_allocation in
    select *
    from
      jsonb_array_elements(
        p_allocations
      )
  loop

    v_sales_order_id :=
      (
        v_allocation ->> 'sales_order_id'
      )::uuid;


    perform
      public.sync_sales_order_paid_amount(
        v_sales_order_id
      );

  end loop;


  return
    v_receipt_id;

end;
$$;


/* =========================================================
 * Cancel Customer Receipt
 *
 * Posted receipts are NEVER deleted.
 * Cancellation removes their financial effect while
 * retaining the audit trail.
 * ========================================================= */

create or replace function
  public.cancel_customer_receipt(
    p_receipt_id uuid,
    p_reason text
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_status text;

  v_order_id uuid;
begin

  v_user_id :=
    auth.uid();

  if v_user_id is null then
    raise exception
      'Authentication is required.';
  end if;


  if not public.is_admin() then
    raise exception
      'You are not authorized to cancel customer receipts.';
  end if;


  select
    status
  into
    v_status
  from
    public.customer_receipts
  where
    id =
      p_receipt_id
  for update;


  if not found then
    raise exception
      'Customer receipt was not found.';
  end if;


  if
    v_status =
    'cancelled'
  then
    raise exception
      'Customer receipt is already cancelled.';
  end if;


  if
    v_status <>
    'posted'
  then
    raise exception
      'Only posted customer receipts can be cancelled.';
  end if;


  if
    nullif(
      trim(
        coalesce(
          p_reason,
          ''
        )
      ),
      ''
    ) is null
  then
    raise exception
      'Cancellation reason is required.';
  end if;


  update
    public.customer_receipts
  set
    status =
      'cancelled',

    cancelled_at =
      now(),

    cancelled_by =
      v_user_id,

    cancellation_reason =
      trim(
        p_reason
      )

  where
    id =
      p_receipt_id;


  /*
   * Recalculate every affected order.
   */

  for v_order_id in
    select distinct
      sales_order_id
    from
      public.customer_receipt_allocations
    where
      receipt_id =
        p_receipt_id
  loop

    perform
      public.sync_sales_order_paid_amount(
        v_order_id
      );

  end loop;


  return
    p_receipt_id;

end;
$$;


/* =========================================================
 * Row Level Security
 * ========================================================= */

alter table
  public.customer_receipts
enable row level security;


alter table
  public.customer_receipt_allocations
enable row level security;


create policy
  "Management can view customer receipts"
on
  public.customer_receipts
for select
to authenticated
using (
  public.is_admin()
);


create policy
  "Management can view customer receipt allocations"
on
  public.customer_receipt_allocations
for select
to authenticated
using (
  public.is_admin()
);


/*
 * Direct INSERT / UPDATE / DELETE access is intentionally
 * NOT provided.
 *
 * Financial mutations must go through the secured RPCs.
 */


/* =========================================================
 * Permissions — Tables
 * ========================================================= */

revoke all
on
  public.customer_receipts
from
  anon;


revoke all
on
  public.customer_receipt_allocations
from
  anon;


revoke
  insert,
  update,
  delete
on
  public.customer_receipts
from
  authenticated;


revoke
  insert,
  update,
  delete
on
  public.customer_receipt_allocations
from
  authenticated;


/* =========================================================
 * Permissions — Functions
 * ========================================================= */

revoke all
on function
  public.generate_customer_receipt_number()
from public;


revoke all
on function
  public.sync_sales_order_paid_amount(uuid)
from public;


revoke all
on function
  public.sync_customer_receipt_totals(uuid)
from public;


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
from public;


revoke all
on function
  public.cancel_customer_receipt(
    uuid,
    text
  )
from public;


/*
 * Internal helper functions are intentionally not
 * executable by ordinary authenticated sessions.
 */


grant execute
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
to authenticated;


grant execute
on function
  public.cancel_customer_receipt(
    uuid,
    text
  )
to authenticated;


/* =========================================================
 * Documentation
 * ========================================================= */

comment on table
  public.customer_receipts
is
  'Customer money receipts. Posted records form the basis of accounts receivable payment history.';


comment on table
  public.customer_receipt_allocations
is
  'Allocates customer receipt amounts to one or more sales orders.';


comment on function
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
is
  'Creates and posts a customer receipt and allocates it to sales orders, automatically synchronizing sales order paid amounts and balances.';


comment on function
  public.cancel_customer_receipt(
    uuid,
    text
  )
is
  'Cancels a posted customer receipt without deleting the audit record and reverses its effect from allocated sales orders.';