/*
 * =========================================================
 * 069 — Supplier Payments & Payables
 *
 * Purpose:
 *
 * - Record real payments made to suppliers.
 * - Allocate one payment across multiple Quick Purchases.
 * - Allow multiple payments against one Quick Purchase.
 * - Support supplier advances / unallocated payments.
 * - Preserve posted / cancelled audit history.
 * - Synchronize Quick Purchase:
 *
 *     paid_amount
 *     balance_due
 *     payment_status
 *
 * - Preserve payment amounts already recorded before this
 *   supplier-payment ledger existed.
 *
 * Payment format:
 *
 *   SPAY-2026-000001
 *
 * =========================================================
 */


/* =========================================================
 * Preserve Existing Quick Purchase Payments
 *
 * Quick Purchase existed before Supplier Payments.
 *
 * Existing paid_amount values therefore become an opening
 * payment balance so that introducing the ledger does not
 * reset historical purchases to unpaid.
 *
 * Later, once Quick Purchase itself creates Supplier Payment
 * records automatically, this transitional opening-balance
 * mechanism can be retired.
 * ========================================================= */

alter table
  public.quick_purchases
add column if not exists
  payment_opening_amount numeric(18, 2)
  not null
  default 0;


update
  public.quick_purchases
set
  payment_opening_amount =
    paid_amount
where
  payment_opening_amount = 0
  and paid_amount > 0;


/*
 * Preserve current Quick Purchase behaviour until the
 * Quick Purchase screen is connected directly to
 * supplier_payments.
 */

create or replace function
  public.capture_quick_purchase_opening_payment()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if
    new.payment_opening_amount = 0
    and new.paid_amount > 0
  then
    new.payment_opening_amount :=
      new.paid_amount;
  end if;

  return new;
end;
$$;


drop trigger if exists
  capture_quick_purchase_opening_payment
on public.quick_purchases;


create trigger
  capture_quick_purchase_opening_payment
before insert
on public.quick_purchases
for each row
execute function
  public.capture_quick_purchase_opening_payment();


/* =========================================================
 * Supplier Payment Number Sequence
 * ========================================================= */

create sequence if not exists
  public.supplier_payment_number_seq
start with 1
increment by 1;


/* =========================================================
 * Supplier Payments
 * ========================================================= */

create table if not exists
  public.supplier_payments
(
  id uuid primary key
    default gen_random_uuid(),

  payment_number text
    not null
    unique,

  supplier_id uuid
    not null
    references public.suppliers(id)
    on update cascade
    on delete restrict,

  payment_date date
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
    references auth.users(id)
    on delete set null,

  cancelled_at timestamptz,

  cancelled_by uuid
    references auth.users(id)
    on delete set null,

  cancellation_reason text,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  constraint
    supplier_payments_amount_check
  check (
    amount > 0
  ),

  constraint
    supplier_payments_exchange_rate_check
  check (
    exchange_rate > 0
  ),

  constraint
    supplier_payments_allocated_check
  check (
    allocated_amount >= 0
    and allocated_amount <= amount
  ),

  constraint
    supplier_payments_unallocated_check
  check (
    unallocated_amount >= 0
    and unallocated_amount <= amount
  ),

  constraint
    supplier_payments_method_check
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
    supplier_payments_status_check
  check (
    status in (
      'draft',
      'posted',
      'cancelled'
    )
  ),

  constraint
    supplier_payments_currency_check
  check (
    currency_code ~ '^[A-Z]{3}$'
  )
);


/* =========================================================
 * Supplier Payment Allocations
 * ========================================================= */

create table if not exists
  public.supplier_payment_allocations
(
  id uuid primary key
    default gen_random_uuid(),

  supplier_payment_id uuid
    not null
    references public.supplier_payments(id)
    on update cascade
    on delete restrict,

  quick_purchase_id uuid
    not null
    references public.quick_purchases(id)
    on update cascade
    on delete restrict,

  amount numeric(18, 2)
    not null,

  created_at timestamptz
    not null
    default now(),

  constraint
    supplier_payment_allocations_amount_check
  check (
    amount > 0
  ),

  constraint
    supplier_payment_allocation_unique
  unique (
    supplier_payment_id,
    quick_purchase_id
  )
);


/* =========================================================
 * Indexes
 * ========================================================= */

create index if not exists
  supplier_payments_supplier_idx
on public.supplier_payments (
  supplier_id
);


create index if not exists
  supplier_payments_date_idx
on public.supplier_payments (
  payment_date desc
);


create index if not exists
  supplier_payments_status_idx
on public.supplier_payments (
  status
);


create index if not exists
  supplier_payments_method_idx
on public.supplier_payments (
  payment_method
);


create index if not exists
  supplier_payment_allocations_payment_idx
on public.supplier_payment_allocations (
  supplier_payment_id
);


create index if not exists
  supplier_payment_allocations_purchase_idx
on public.supplier_payment_allocations (
  quick_purchase_id
);


/* =========================================================
 * Updated At
 * ========================================================= */

drop trigger if exists
  set_supplier_payments_updated_at
on public.supplier_payments;


create trigger
  set_supplier_payments_updated_at
before update
on public.supplier_payments
for each row
execute function
  public.set_sales_updated_at();


/* =========================================================
 * Generate Supplier Payment Number
 * ========================================================= */

create or replace function
  public.generate_supplier_payment_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  return
    'SPAY-'
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
        'public.supplier_payment_number_seq'
      )::text,
      6,
      '0'
    );
end;
$$;


/* =========================================================
 * Synchronize One Quick Purchase
 *
 * paid_amount =
 *
 *   payment_opening_amount
 *   +
 *   POSTED supplier payment allocations
 *
 * Cancelled payments are excluded.
 * ========================================================= */

create or replace function
  public.sync_quick_purchase_paid_amount(
    p_quick_purchase_id uuid
  )
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grand_total
    numeric(18, 2);

  v_opening_amount
    numeric(18, 2);

  v_allocated_amount
    numeric(18, 2);

  v_paid_amount
    numeric(18, 2);

  v_balance_due
    numeric(18, 2);

  v_payment_status
    text;
begin

  select
    grand_total,
    payment_opening_amount

  into
    v_grand_total,
    v_opening_amount

  from
    public.quick_purchases

  where
    id =
      p_quick_purchase_id

  for update;


  if not found then
    raise exception
      'Quick Purchase was not found.';
  end if;


  select
    coalesce(
      sum(
        allocation.amount
      ),
      0
    )

  into
    v_allocated_amount

  from
    public.supplier_payment_allocations
      allocation

  join
    public.supplier_payments
      payment

    on
      payment.id =
        allocation.supplier_payment_id

  where
    allocation.quick_purchase_id =
      p_quick_purchase_id

    and payment.status =
      'posted';


  v_paid_amount :=
    round(
      coalesce(
        v_opening_amount,
        0
      )
      +
      coalesce(
        v_allocated_amount,
        0
      ),
      2
    );


  if
    v_paid_amount >
    v_grand_total
  then
    raise exception
      'Quick Purchase payment exceeds the purchase total.';
  end if;


  v_balance_due :=
    greatest(
      round(
        v_grand_total -
        v_paid_amount,
        2
      ),
      0
    );


  if
    v_paid_amount <= 0
  then
    v_payment_status :=
      'unpaid';

  elsif
    v_paid_amount <
    v_grand_total
  then
    v_payment_status :=
      'partially_paid';

  else
    v_payment_status :=
      'paid';
  end if;


  update
    public.quick_purchases

  set
    paid_amount =
      v_paid_amount,

    balance_due =
      v_balance_due,

    payment_status =
      v_payment_status

  where
    id =
      p_quick_purchase_id;

end;
$$;


/* =========================================================
 * Synchronize Supplier Payment Totals
 * ========================================================= */

create or replace function
  public.sync_supplier_payment_totals(
    p_supplier_payment_id uuid
  )
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount
    numeric(18, 2);

  v_allocated
    numeric(18, 2);
begin

  select
    amount

  into
    v_amount

  from
    public.supplier_payments

  where
    id =
      p_supplier_payment_id

  for update;


  if not found then
    raise exception
      'Supplier payment was not found.';
  end if;


  select
    coalesce(
      sum(
        amount
      ),
      0
    )

  into
    v_allocated

  from
    public.supplier_payment_allocations

  where
    supplier_payment_id =
      p_supplier_payment_id;


  if
    v_allocated >
    v_amount
  then
    raise exception
      'Supplier payment allocations cannot exceed the payment amount.';
  end if;


  update
    public.supplier_payments

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
      p_supplier_payment_id;

end;
$$;


/* =========================================================
 * Post Supplier Payment
 *
 * p_allocations example:
 *
 * [
 *   {
 *     "quick_purchase_id": "uuid",
 *     "amount": 500
 *   }
 * ]
 *
 * Empty allocation array is allowed.
 *
 * This allows supplier advances:
 *
 * Payment AED 5,000
 * Allocated AED 3,500
 * Supplier Advance AED 1,500
 * ========================================================= */

create or replace function
  public.post_supplier_payment(
    p_supplier_id uuid,
    p_payment_date date,
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

  v_payment_id uuid;

  v_payment_number text;

  v_allocation jsonb;

  v_quick_purchase_id uuid;

  v_allocation_amount
    numeric(18, 2);

  v_purchase_supplier_id uuid;

  v_purchase_currency text;

  v_purchase_grand_total
    numeric(18, 2);

  v_purchase_opening_amount
    numeric(18, 2);

  v_existing_allocations
    numeric(18, 2);

  v_current_paid
    numeric(18, 2);

  v_total_allocated
    numeric(18, 2) := 0;

begin

  /* =======================================================
   * Security
   * ======================================================= */

  v_user_id :=
    auth.uid();


  if
    v_user_id is null
  then
    raise exception
      'Authentication is required.';
  end if;


  if not public.is_admin() then
    raise exception
      'You are not authorized to post supplier payments.';
  end if;


  /* =======================================================
   * Supplier
   * ======================================================= */

  perform 1

  from
    public.suppliers

  where
    id =
      p_supplier_id

    and is_active =
      true;


  if not found then
    raise exception
      'The selected supplier was not found or is inactive.';
  end if;


  /* =======================================================
   * Payment Validation
   * ======================================================= */

  if
    p_amount is null
    or p_amount <= 0
  then
    raise exception
      'Supplier payment amount must be greater than zero.';
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


  if
    p_payment_method =
      'cheque'

    and nullif(
      trim(
        coalesce(
          p_cheque_number,
          ''
        )
      ),
      ''
    ) is null
  then
    raise exception
      'Cheque number is required for cheque payments.';
  end if;


  /* =======================================================
   * Allocations
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
      'Supplier payment allocations must be an array.';
  end if;


  /*
   * Same Quick Purchase cannot appear twice.
   */

  if (
    select
      count(*)

    from
      jsonb_array_elements(
        p_allocations
      )
  ) <> (
    select
      count(
        distinct
          allocation
          ->>
          'quick_purchase_id'
      )

    from
      jsonb_array_elements(
        p_allocations
      )
      as allocation
  )
  then
    raise exception
      'The same Quick Purchase cannot appear more than once in one supplier payment.';
  end if;


  /* =======================================================
   * Validate Every Allocation
   * ======================================================= */

  for
    v_allocation
  in

    select *
    from
      jsonb_array_elements(
        p_allocations
      )

  loop

    begin

      v_quick_purchase_id :=
        (
          v_allocation
          ->>
          'quick_purchase_id'
        )::uuid;

    exception
      when others then
        raise exception
          'A valid Quick Purchase ID is required.';
    end;


    begin

      v_allocation_amount :=
        (
          v_allocation
          ->>
          'amount'
        )::numeric;

    exception
      when others then
        raise exception
          'A valid supplier payment allocation amount is required.';
    end;


    if
      v_allocation_amount <= 0
    then
      raise exception
        'Supplier payment allocation must be greater than zero.';
    end if;


    select
      supplier_id,
      currency_code,
      grand_total,
      payment_opening_amount

    into
      v_purchase_supplier_id,
      v_purchase_currency,
      v_purchase_grand_total,
      v_purchase_opening_amount

    from
      public.quick_purchases

    where
      id =
        v_quick_purchase_id

      and status =
        'posted'

    for update;


    if not found then
      raise exception
        'The selected Quick Purchase was not found or is cancelled.';
    end if;


    if
      v_purchase_supplier_id
      is null
    then
      raise exception
        'Quick Purchases without a registered supplier cannot be allocated to a Supplier Payment.';
    end if;


    if
      v_purchase_supplier_id <>
      p_supplier_id
    then
      raise exception
        'All allocations must belong to the selected supplier.';
    end if;


    if
      upper(
        v_purchase_currency
      ) <>
      upper(
        p_currency_code
      )
    then
      raise exception
        'Supplier payment currency must match the Quick Purchase currency.';
    end if;


    /*
     * Existing posted supplier-payment allocations.
     */

    select
      coalesce(
        sum(
          allocation.amount
        ),
        0
      )

    into
      v_existing_allocations

    from
      public.supplier_payment_allocations
        allocation

    join
      public.supplier_payments
        payment

      on
        payment.id =
          allocation.supplier_payment_id

    where
      allocation.quick_purchase_id =
        v_quick_purchase_id

      and payment.status =
        'posted';


    v_current_paid :=
      coalesce(
        v_purchase_opening_amount,
        0
      )
      +
      coalesce(
        v_existing_allocations,
        0
      );


    if
      v_current_paid +
      v_allocation_amount >
      v_purchase_grand_total
    then
      raise exception
        'Supplier payment allocation exceeds the outstanding Quick Purchase balance.';
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
      'Total allocations cannot exceed the supplier payment amount.';
  end if;


  /* =======================================================
   * Payment Header
   * ======================================================= */

  v_payment_number :=
    public.generate_supplier_payment_number();


  insert into
    public.supplier_payments
  (
    payment_number,

    supplier_id,

    payment_date,

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

  values
  (
    v_payment_number,

    p_supplier_id,

    coalesce(
      p_payment_date,
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
    v_payment_id;


  /* =======================================================
   * Allocation Rows
   * ======================================================= */

  for
    v_allocation

  in

    select *
    from
      jsonb_array_elements(
        p_allocations
      )

  loop

    v_quick_purchase_id :=
      (
        v_allocation
        ->>
        'quick_purchase_id'
      )::uuid;


    v_allocation_amount :=
      (
        v_allocation
        ->>
        'amount'
      )::numeric;


    insert into
      public.supplier_payment_allocations
    (
      supplier_payment_id,

      quick_purchase_id,

      amount
    )

    values
    (
      v_payment_id,

      v_quick_purchase_id,

      round(
        v_allocation_amount,
        2
      )
    );

  end loop;


  perform
    public.sync_supplier_payment_totals(
      v_payment_id
    );


  /* =======================================================
   * Post Payment
   * ======================================================= */

  update
    public.supplier_payments

  set
    status =
      'posted',

    posted_at =
      now(),

    posted_by =
      v_user_id

  where
    id =
      v_payment_id;


  /* =======================================================
   * Synchronize Quick Purchases
   * ======================================================= */

  for
    v_allocation

  in

    select *
    from
      jsonb_array_elements(
        p_allocations
      )

  loop

    v_quick_purchase_id :=
      (
        v_allocation
        ->>
        'quick_purchase_id'
      )::uuid;


    perform
      public.sync_quick_purchase_paid_amount(
        v_quick_purchase_id
      );

  end loop;


  return
    v_payment_id;

end;
$$;


/* =========================================================
 * Cancel Supplier Payment
 *
 * Posted supplier payments are NEVER deleted.
 *
 * Cancellation:
 *
 * - keeps the payment
 * - changes status to cancelled
 * - stores reason/user/time
 * - removes its financial effect from Quick Purchases
 * ========================================================= */

create or replace function
  public.cancel_supplier_payment(
    p_supplier_payment_id uuid,
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

  v_quick_purchase_id uuid;

begin

  v_user_id :=
    auth.uid();


  if
    v_user_id is null
  then
    raise exception
      'Authentication is required.';
  end if;


  if not public.is_admin() then
    raise exception
      'You are not authorized to cancel supplier payments.';
  end if;


  select
    status

  into
    v_status

  from
    public.supplier_payments

  where
    id =
      p_supplier_payment_id

  for update;


  if not found then
    raise exception
      'Supplier payment was not found.';
  end if;


  if
    v_status =
      'cancelled'
  then
    raise exception
      'Supplier payment is already cancelled.';
  end if;


  if
    v_status <>
      'posted'
  then
    raise exception
      'Only posted supplier payments can be cancelled.';
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
    )
    is null
  then
    raise exception
      'Cancellation reason is required.';
  end if;


  update
    public.supplier_payments

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
      p_supplier_payment_id;


  /*
   * Recalculate every affected Quick Purchase.
   */

  for
    v_quick_purchase_id

  in

    select distinct
      quick_purchase_id

    from
      public.supplier_payment_allocations

    where
      supplier_payment_id =
        p_supplier_payment_id

  loop

    perform
      public.sync_quick_purchase_paid_amount(
        v_quick_purchase_id
      );

  end loop;


  return
    p_supplier_payment_id;

end;
$$;


/* =========================================================
 * Row Level Security
 * ========================================================= */

alter table
  public.supplier_payments
enable row level security;


alter table
  public.supplier_payment_allocations
enable row level security;


/* ---------------------------------------------------------
 * Read Access
 * --------------------------------------------------------- */

drop policy if exists
  "Management can view supplier payments"
on public.supplier_payments;


create policy
  "Management can view supplier payments"
on public.supplier_payments
for select
to authenticated
using (
  public.is_admin()
);


drop policy if exists
  "Management can view supplier payment allocations"
on public.supplier_payment_allocations;


create policy
  "Management can view supplier payment allocations"
on public.supplier_payment_allocations
for select
to authenticated
using (
  public.is_admin()
);


/*
 * No direct INSERT / UPDATE / DELETE policy.
 *
 * Financial mutations must pass through secured RPCs.
 */


/* =========================================================
 * Permissions — Tables
 * ========================================================= */

revoke all
on
  public.supplier_payments
from anon;


revoke all
on
  public.supplier_payment_allocations
from anon;


revoke
  insert,
  update,
  delete
on
  public.supplier_payments
from authenticated;


revoke
  insert,
  update,
  delete
on
  public.supplier_payment_allocations
from authenticated;


/* =========================================================
 * Permissions — Functions
 * ========================================================= */

revoke all
on function
  public.generate_supplier_payment_number()
from public;


revoke all
on function
  public.sync_quick_purchase_paid_amount(uuid)
from public;


revoke all
on function
  public.sync_supplier_payment_totals(uuid)
from public;


revoke all
on function
  public.post_supplier_payment(
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
  public.cancel_supplier_payment(
    uuid,
    text
  )
from public;


/* ---------------------------------------------------------
 * User-facing financial RPC permissions
 * --------------------------------------------------------- */

grant execute
on function
  public.post_supplier_payment(
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
  public.cancel_supplier_payment(
    uuid,
    text
  )
to authenticated;


/* =========================================================
 * Documentation
 * ========================================================= */

comment on table
  public.supplier_payments
is
  'Payments made to registered suppliers. Posted payments form the supplier payable payment ledger.';


comment on table
  public.supplier_payment_allocations
is
  'Allocates supplier payments against one or more Quick Purchases.';


comment on column
  public.quick_purchases.payment_opening_amount
is
  'Transitional payment baseline preserving Quick Purchase amounts recorded before the Supplier Payment ledger was introduced.';


comment on function
  public.post_supplier_payment(
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
  'Creates and posts a supplier payment, allocates it against Quick Purchases and synchronizes Quick Purchase payable balances.';


comment on function
  public.cancel_supplier_payment(
    uuid,
    text
  )
is
  'Cancels a posted supplier payment without deleting its audit record and reverses its effect from allocated Quick Purchases.';