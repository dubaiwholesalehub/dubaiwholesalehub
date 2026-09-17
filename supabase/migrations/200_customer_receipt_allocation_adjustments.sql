/* =========================================================
 * Migration 200
 * Customer Receipt Allocation Adjustments
 *
 * Purpose:
 * - Preserve immutable posted receipt allocations.
 * - Support Sales Order revision payment reconciliation.
 * - Released allocation becomes Customer Advance.
 * - Original receipt / cash / bank movement remains untouched.
 * ========================================================= */


/* =========================================================
 * 1. Append-only allocation adjustment ledger
 * ========================================================= */

create table if not exists
  public.customer_receipt_allocation_adjustments (
    id uuid primary key default gen_random_uuid(),

    allocation_id uuid not null
      references public.customer_receipt_allocations(id)
      on update cascade
      on delete restrict,

    receipt_id uuid not null
      references public.customer_receipts(id)
      on update cascade
      on delete restrict,

    sales_order_id uuid not null
      references public.sales_orders(id)
      on update cascade
      on delete restrict,

    sales_order_revision_id uuid
      references public.sales_order_revisions(id)
      on update cascade
      on delete restrict,

    adjustment_type text not null,

    amount numeric(18,2) not null,

    reason text not null,

    gl_journal_entry_id uuid
      references public.gl_journal_entries(id)
      on update cascade
      on delete restrict,

    created_at timestamptz not null default now(),
    created_by uuid,

    constraint
      customer_receipt_allocation_adjustments_type_check
    check (
      adjustment_type in (
        'revision_release',
        'revision_reapplication'
      )
    ),

    constraint
      customer_receipt_allocation_adjustments_amount_check
    check (amount <> 0),

    constraint
      customer_receipt_allocation_adjustments_sign_check
    check (
      (
        adjustment_type = 'revision_release'
        and amount < 0
      )
      or
      (
        adjustment_type = 'revision_reapplication'
        and amount > 0
      )
    )
  );


create index if not exists
  customer_receipt_allocation_adjustments_allocation_idx
on public.customer_receipt_allocation_adjustments (
  allocation_id
);


create index if not exists
  customer_receipt_allocation_adjustments_receipt_idx
on public.customer_receipt_allocation_adjustments (
  receipt_id
);


create index if not exists
  customer_receipt_allocation_adjustments_order_idx
on public.customer_receipt_allocation_adjustments (
  sales_order_id
);


create index if not exists
  customer_receipt_allocation_adjustments_revision_idx
on public.customer_receipt_allocation_adjustments (
  sales_order_revision_id
);


/* =========================================================
 * 2. Effective allocation helper
 * ========================================================= */

create or replace function
  public.get_effective_customer_receipt_allocation(
    p_allocation_id uuid
  )
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select
    round(
      greatest(
        coalesce(a.amount,0)
        +
        coalesce(
          (
            select sum(adj.amount)
            from
              public.customer_receipt_allocation_adjustments adj
            where
              adj.allocation_id = a.id
          ),
          0
        ),
        0
      ),
      2
    )
  from
    public.customer_receipt_allocations a
  where
    a.id = p_allocation_id;
$$;


/* =========================================================
 * 3. Effective allocation view
 * ========================================================= */

create or replace view
  public.customer_receipt_effective_allocations
as
select
  a.id as allocation_id,
  a.receipt_id,
  a.sales_order_id,
  a.amount as original_amount,

  round(
    coalesce(
      sum(adj.amount),
      0
    ),
    2
  ) as adjustment_amount,

  round(
    greatest(
      a.amount
      +
      coalesce(
        sum(adj.amount),
        0
      ),
      0
    ),
    2
  ) as effective_amount,

  a.created_at

from
  public.customer_receipt_allocations a

left join
  public.customer_receipt_allocation_adjustments adj
    on adj.allocation_id = a.id

group by
  a.id,
  a.receipt_id,
  a.sales_order_id,
  a.amount,
  a.created_at;


/* =========================================================
 * 4. Synchronize Sales Order using EFFECTIVE allocations
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
  v_paid_amount numeric(18,2);
begin

  select
    coalesce(
      sum(ea.effective_amount),
      0
    )
  into
    v_paid_amount
  from
    public.customer_receipt_effective_allocations ea
  join
    public.customer_receipts r
      on r.id = ea.receipt_id
  where
    ea.sales_order_id = p_sales_order_id
    and r.status = 'posted';

  update
    public.sales_orders
  set
    paid_amount =
      round(
        v_paid_amount,
        2
      )
  where
    id = p_sales_order_id;

  if not found then
    raise exception
      'Sales order was not found.';
  end if;

end;
$$;


/* =========================================================
 * 5. Synchronize Receipt using EFFECTIVE allocations
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
  v_amount numeric(18,2);
  v_allocated numeric(18,2);
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
      sum(effective_amount),
      0
    )
  into
    v_allocated
  from
    public.customer_receipt_effective_allocations
  where
    receipt_id = p_receipt_id;

  if v_allocated > v_amount then
    raise exception
      'Effective receipt allocations cannot exceed the receipt amount.';
  end if;

  if v_allocated < 0 then
    raise exception
      'Effective receipt allocations cannot be negative.';
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
        v_amount - v_allocated,
        2
      )

  where
    id = p_receipt_id;

end;
$$;


/* =========================================================
 * 6. Adjustment ledger immutability
 * ========================================================= */

create or replace function
  public.guard_customer_receipt_allocation_adjustment()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  if tg_op = 'UPDATE' then
    raise exception
      'Customer Receipt Allocation Adjustments are immutable and cannot be updated.';
  end if;

  if tg_op = 'DELETE' then
    raise exception
      'Customer Receipt Allocation Adjustments are immutable and cannot be deleted.';
  end if;

  return new;

end;
$$;


drop trigger if exists
  zz_customer_receipt_allocation_adjustment_guard
on
  public.customer_receipt_allocation_adjustments;


create trigger
  zz_customer_receipt_allocation_adjustment_guard
before update or delete
on
  public.customer_receipt_allocation_adjustments
for each row
execute function
  public.guard_customer_receipt_allocation_adjustment();


/* =========================================================
 * 7. RLS
 * ========================================================= */

alter table
  public.customer_receipt_allocation_adjustments
enable row level security;


drop policy if exists
  "Management can view customer receipt allocation adjustments"
on
  public.customer_receipt_allocation_adjustments;


create policy
  "Management can view customer receipt allocation adjustments"
on
  public.customer_receipt_allocation_adjustments
for select
to authenticated
using (
  public.is_admin()
);


/* No direct application INSERT / UPDATE / DELETE policy.
 * Writes occur only inside controlled SECURITY DEFINER
 * accounting workflows.
 */


/* =========================================================
 * 8. Permissions
 * ========================================================= */

revoke all
on table
  public.customer_receipt_allocation_adjustments
from public, anon;


revoke insert, update, delete
on table
  public.customer_receipt_allocation_adjustments
from authenticated;


grant select
on table
  public.customer_receipt_allocation_adjustments
to authenticated;


revoke all
on function
  public.guard_customer_receipt_allocation_adjustment()
from public, anon, authenticated;


revoke all
on function
  public.get_effective_customer_receipt_allocation(uuid)
from public, anon;


grant execute
on function
  public.get_effective_customer_receipt_allocation(uuid)
to authenticated;


/* =========================================================
 * 9. Documentation
 * ========================================================= */

comment on table
  public.customer_receipt_allocation_adjustments
is
  'Append-only accounting ledger for corrections to immutable Customer Receipt Allocations. Negative revision_release entries release previously allocated receipt value back to Customer Advance; positive revision_reapplication entries reapply previously released value. Original posted receipt allocations remain unchanged.';


comment on view
  public.customer_receipt_effective_allocations
is
  'Current effective Customer Receipt allocation after immutable allocation adjustments.';


comment on function
  public.sync_sales_order_paid_amount(uuid)
is
  'Synchronizes Sales Order paid_amount from effective posted Customer Receipt allocations, including append-only allocation adjustments.';


comment on function
  public.sync_customer_receipt_totals(uuid)
is
  'Synchronizes Customer Receipt allocated and unallocated totals from effective immutable allocations and append-only adjustments.';


/* =========================================================
 * End Migration 200
 * ========================================================= */