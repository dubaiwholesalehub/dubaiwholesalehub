/* =========================================================
 * Migration 143
 * Goods Receipt AP Subledger Integration
 *
 * Purpose
 * -------
 * Extend the existing Supplier Payment / AP subledger so
 * completed normal Goods Receipts participate alongside
 * Quick Purchases.
 *
 * Existing Quick Purchase behaviour is preserved.
 *
 * Goods Receipt payable lifecycle:
 *
 *   completed Goods Receipt
 *          |
 *          v
 *   Supplier Payable
 *          |
 *          v
 *   Supplier Payment Allocation
 *          |
 *          v
 *   paid_amount / balance_due / payment_status
 *
 * Cancelled Supplier Payments are excluded from paid amount
 * calculations and affected Goods Receipts are resynchronised.
 * ========================================================= */
/* =========================================================
 * 1. Goods Receipt payable state
 * ========================================================= */
alter table
    public.goods_receipts
add
    column if not exists paid_amount numeric(18, 2) not null default 0;

alter table
    public.goods_receipts
add
    column if not exists balance_due numeric(18, 2) not null default 0;

alter table
    public.goods_receipts
add
    column if not exists payment_status text not null default 'unpaid';

alter table
    public.goods_receipts drop constraint if exists goods_receipts_paid_amount_nonnegative;

alter table
    public.goods_receipts
add
    constraint goods_receipts_paid_amount_nonnegative check (paid_amount >= 0);

alter table
    public.goods_receipts drop constraint if exists goods_receipts_balance_due_nonnegative;

alter table
    public.goods_receipts
add
    constraint goods_receipts_balance_due_nonnegative check (balance_due >= 0);

alter table
    public.goods_receipts drop constraint if exists goods_receipts_payment_status_check;

alter table
    public.goods_receipts
add
    constraint goods_receipts_payment_status_check check (
        payment_status in (
            'unpaid',
            'partially_paid',
            'paid'
        )
    );

comment on column public.goods_receipts.paid_amount is 'Total posted Supplier Payment allocations applied against this completed Goods Receipt.';

comment on column public.goods_receipts.balance_due is 'Remaining supplier payable balance for this completed Goods Receipt.';

comment on column public.goods_receipts.payment_status is 'Supplier payable settlement status for this Goods Receipt: unpaid, partially_paid or paid.';


/* =========================================================
 * Goods Receipt Payment-Term Snapshot
 *
 * Snapshot supplier terms onto the GRN so historical due
 * dates do not change when supplier master terms are edited.
 *
 * Existing completed GRNs receive the supplier's current
 * terms because GRN AP is being introduced by this migration.
 * ========================================================= */

alter table
    public.goods_receipts
add column if not exists
    payment_terms_days integer not null default 0;


alter table
    public.goods_receipts
drop constraint if exists
    goods_receipts_payment_terms_days_check;


alter table
    public.goods_receipts
add constraint
    goods_receipts_payment_terms_days_check
check (
    payment_terms_days >= 0
);


/*
 * Backfill existing Goods Receipts before installing the
 * snapshot trigger.
 */

update
    public.goods_receipts receipt

set
    payment_terms_days =
        coalesce(
            supplier.payment_terms_days,
            0
        )

from
    public.suppliers supplier

where
    supplier.id =
        receipt.supplier_id

    and receipt.payment_terms_days =
        0;


/*
 * Snapshot supplier payment terms when a new Goods Receipt
 * is created.
 */

create or replace function
    public.snapshot_goods_receipt_payment_terms()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

    if
        new.supplier_id is not null
    then

        select
            coalesce(
                supplier.payment_terms_days,
                0
            )

        into
            new.payment_terms_days

        from
            public.suppliers supplier

        where
            supplier.id =
                new.supplier_id;

    end if;


    new.payment_terms_days :=
        coalesce(
            new.payment_terms_days,
            0
        );


    return new;

end;
$$;


drop trigger if exists
    snapshot_goods_receipt_payment_terms
on
    public.goods_receipts;


create trigger
    snapshot_goods_receipt_payment_terms
before insert
on
    public.goods_receipts
for each row
execute function
    public.snapshot_goods_receipt_payment_terms();


revoke all
on function
    public.snapshot_goods_receipt_payment_terms()
from public;

/* =========================================================
 * 2. Extend Supplier Payment Allocations
 *
 * Existing:
 *   quick_purchase_id
 *
 * New:
 *   goods_receipt_id
 *
 * Exactly one payable source must be populated.
 * ========================================================= */
/*
 * Existing quick_purchase_id was originally NOT NULL.
 *
 * It must become nullable because a new allocation may point
 * to a Goods Receipt instead.
 */
alter table
    public.supplier_payment_allocations
alter column
    quick_purchase_id drop not null;

alter table
    public.supplier_payment_allocations
add
    column if not exists goods_receipt_id uuid references public.goods_receipts(id) on update cascade on delete restrict;

/*
 * Every allocation must belong to exactly one source:
 *
 * Quick Purchase XOR Goods Receipt
 */
alter table
    public.supplier_payment_allocations drop constraint if exists supplier_payment_allocation_source_check;

alter table
    public.supplier_payment_allocations
add
    constraint supplier_payment_allocation_source_check check (
        (
            quick_purchase_id is not null
            and goods_receipt_id is null
        )
        or (
            quick_purchase_id is null
            and goods_receipt_id is not null
        )
    );

/*
 * Existing uniqueness constraint protects Quick Purchases.
 * PostgreSQL permits multiple NULL values, so it remains
 * valid after quick_purchase_id becomes nullable.
 *
 * Add equivalent protection for Goods Receipts.
 */
create unique index if not exists supplier_payment_allocation_goods_receipt_unique on public.supplier_payment_allocations (supplier_payment_id, goods_receipt_id)
where
    goods_receipt_id is not null;

create index if not exists supplier_payment_allocations_goods_receipt_idx on public.supplier_payment_allocations (goods_receipt_id)
where
    goods_receipt_id is not null;

/* =========================================================
 * 3. Canonical Goods Receipt payable calculation
 *
 * The commercial values come from Purchase Order lines.
 * Accepted GRN quantity determines the proportion recognised.
 *
 * Gross payable:
 *
 *   proportional line_subtotal
 *   +
 *   proportional tax_amount
 *
 * This intentionally matches the liability recognised by
 * Migration 142.
 * ========================================================= */
create
or replace function public.get_goods_receipt_payable_amount(p_goods_receipt_id uuid) returns numeric language plpgsql security definer stable
set
    search_path = public as $$ declare v_status text;

v_payable_amount numeric(18, 2);

begin if p_goods_receipt_id is null then raise exception 'Goods Receipt ID is required.';

end if;

select
    status into v_status
from
    public.goods_receipts
where
    id = p_goods_receipt_id;

if not found then raise exception 'Goods Receipt was not found.';

end if;

if v_status <> 'completed' then return 0;

end if;

select
    round(
        coalesce(
            sum(
                case
                    when poi.ordered_quantity > 0 then (
                        (
                            poi.line_subtotal + poi.tax_amount
                        ) * gri.accepted_quantity / poi.ordered_quantity
                    )
                    else 0
                end
            ),
            0
        ),
        2
    ) into v_payable_amount
from
    public.goods_receipt_items gri
    join public.purchase_order_items poi on poi.id = gri.purchase_order_item_id
where
    gri.goods_receipt_id = p_goods_receipt_id
    and gri.accepted_quantity > 0;

return greatest(
    coalesce(v_payable_amount, 0),
    0
);

end;

$$;

/* =========================================================
 * 4. Synchronize One Goods Receipt Payable
 *
 * paid_amount =
 *
 *   POSTED Supplier Payment allocations
 *
 * Cancelled payments are excluded.
 * ========================================================= */
create
or replace function public.sync_goods_receipt_paid_amount(p_goods_receipt_id uuid) returns void language plpgsql security definer
set
    search_path = public as $$ declare v_status text;

v_payable_amount numeric(18, 2);

v_allocated_amount numeric(18, 2);

v_paid_amount numeric(18, 2);

v_balance_due numeric(18, 2);

v_payment_status text;

begin
select
    status into v_status
from
    public.goods_receipts
where
    id = p_goods_receipt_id for
update
;

if not found then raise exception 'Goods Receipt was not found.';

end if;

if v_status <> 'completed' then
update
    public.goods_receipts
set
    paid_amount = 0,
    balance_due = 0,
    payment_status = 'unpaid'
where
    id = p_goods_receipt_id;

return;

end if;

v_payable_amount := public.get_goods_receipt_payable_amount(p_goods_receipt_id);

select
    coalesce(
        sum(allocation.amount),
        0
    ) into v_allocated_amount
from
    public.supplier_payment_allocations allocation
    join public.supplier_payments payment on payment.id = allocation.supplier_payment_id
where
    allocation.goods_receipt_id = p_goods_receipt_id
    and payment.status = 'posted';

v_paid_amount := round(
    coalesce(v_allocated_amount, 0),
    2
);

if v_paid_amount > v_payable_amount then raise exception 'Goods Receipt payment exceeds the Goods Receipt payable amount.';

end if;

v_balance_due := greatest(
    round(
        v_payable_amount - v_paid_amount,
        2
    ),
    0
);

if v_paid_amount <= 0 then v_payment_status := 'unpaid';

elsif v_paid_amount < v_payable_amount then v_payment_status := 'partially_paid';

else v_payment_status := 'paid';

end if;

update
    public.goods_receipts
set
    paid_amount = v_paid_amount,
    balance_due = v_balance_due,
    payment_status = v_payment_status
where
    id = p_goods_receipt_id;

end;

$$;

/* =========================================================
 * 5. Backfill Existing Completed Goods Receipts
 *
 * This immediately brings Goods Receipts completed before
 * Migration 143 into the AP subledger.
 *
 * This includes GRN-2026-000010 from the Migration 142
 * end-to-end test.
 * ========================================================= */
do $$ declare v_goods_receipt_id uuid;

begin for v_goods_receipt_id in
select
    id
from
    public.goods_receipts
where
    status = 'completed' loop perform public.sync_goods_receipt_paid_amount(v_goods_receipt_id);

end loop;

end;

$$;

/* =========================================================
 * 6. Function Permissions
 * ========================================================= */
revoke all on function public.get_goods_receipt_payable_amount(uuid)
from
    public;

grant execute on function public.get_goods_receipt_payable_amount(uuid) to authenticated;

revoke all on function public.sync_goods_receipt_paid_amount(uuid)
from
    public;

/*
 * Synchronisation is an internal accounting operation.
 * Do not grant direct application execution here.
 */
/* =========================================================
 * End Part A
 * ========================================================= */
/* =========================================================
 * 7. Extend Supplier Payment Posting
 *
 * Supported allocation payloads:
 *
 * Quick Purchase:
 * {
 *   "quick_purchase_id": "uuid",
 *   "amount": 500
 * }
 *
 * Goods Receipt:
 * {
 *   "goods_receipt_id": "uuid",
 *   "amount": 500
 * }
 *
 * A payment may contain allocations from both source types.
 * Each allocation must identify exactly one source.
 * ========================================================= */
create
or replace function public.post_supplier_payment(
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
) returns uuid language plpgsql security definer
set
    search_path = public as $$ declare v_user_id uuid;

v_payment_id uuid;

v_payment_number text;

v_allocation jsonb;

v_quick_purchase_id uuid;

v_goods_receipt_id uuid;

v_allocation_amount numeric(18, 2);

v_source_type text;

v_source_key text;

v_purchase_supplier_id uuid;

v_purchase_currency text;

v_purchase_grand_total numeric(18, 2);

v_purchase_opening_amount numeric(18, 2);

v_receipt_supplier_id uuid;

v_receipt_currency text;

v_receipt_status text;

v_receipt_payable_amount numeric(18, 2);

v_existing_allocations numeric(18, 2);

v_current_paid numeric(18, 2);

v_total_allocated numeric(18, 2) := 0;

begin
/* =======================================================
 * Security
 * ======================================================= */
v_user_id := auth.uid();

if v_user_id is null then raise exception 'Authentication is required.';

end if;

if not public.is_admin() then raise exception 'You are not authorized to post supplier payments.';

end if;

/* =======================================================
 * Supplier
 * ======================================================= */
perform 1
from
    public.suppliers
where
    id = p_supplier_id
    and is_active = true;

if not found then raise exception 'The selected supplier was not found or is inactive.';

end if;

/* =======================================================
 * Payment Validation
 * ======================================================= */
if p_amount is null
or p_amount <= 0 then raise exception 'Supplier payment amount must be greater than zero.';

end if;

if p_exchange_rate is null
or p_exchange_rate <= 0 then raise exception 'Exchange rate must be greater than zero.';

end if;

if upper(
    trim(
        coalesce(
            p_currency_code,
            ''
        )
    )
) !~ '^[A-Z]{3}$' then raise exception 'A valid three-letter currency code is required.';

end if;

if p_payment_method not in (
    'cash',
    'bank',
    'card',
    'cheque',
    'other'
) then raise exception 'Invalid payment method.';

end if;

if p_payment_method = 'cheque'
and nullif(
    trim(
        coalesce(
            p_cheque_number,
            ''
        )
    ),
    ''
) is null then raise exception 'Cheque number is required for cheque payments.';

end if;

/* =======================================================
 * Allocation Array Validation
 * ======================================================= */
if p_allocations is null then p_allocations := '[]' :: jsonb;

end if;

if jsonb_typeof(p_allocations) <> 'array' then raise exception 'Supplier payment allocations must be an array.';

end if;

/*
 * Every allocation must contain exactly one payable source.
 */
for v_allocation in
select
    *
from
    jsonb_array_elements(p_allocations) loop if (
        nullif(
            trim(
                coalesce(
                    v_allocation ->> 'quick_purchase_id',
                    ''
                )
            ),
            ''
        ) is null
    ) = (
        nullif(
            trim(
                coalesce(
                    v_allocation ->> 'goods_receipt_id',
                    ''
                )
            ),
            ''
        ) is null
    ) then raise exception 'Each supplier payment allocation must contain exactly one Quick Purchase ID or Goods Receipt ID.';

end if;

end loop;

/*
 * Prevent duplicate sources within one payment.
 *
 * Prefix the UUID with its source type so a Quick Purchase
 * and Goods Receipt can never collide logically.
 */
if (
    select
        count(*)
    from
        jsonb_array_elements(p_allocations)
) <> (
    select
        count(
            distinct case
                when nullif(
                    allocation ->> 'quick_purchase_id',
                    ''
                ) is not null then 'quick_purchase:' || (
                    allocation ->> 'quick_purchase_id'
                )
                else 'goods_receipt:' || (
                    allocation ->> 'goods_receipt_id'
                )
            end
        )
    from
        jsonb_array_elements(p_allocations) as allocation
) then raise exception 'The same payable source cannot appear more than once in one supplier payment.';

end if;

/* =======================================================
 * Validate Every Allocation
 * ======================================================= */
for v_allocation in
select
    *
from
    jsonb_array_elements(p_allocations) loop v_quick_purchase_id := null;

v_goods_receipt_id := null;

v_source_type := null;

v_source_key := null;

begin v_allocation_amount := (
    v_allocation ->> 'amount'
) :: numeric;

exception
when others then raise exception 'A valid supplier payment allocation amount is required.';

end;

if v_allocation_amount is null
or v_allocation_amount <= 0 then raise exception 'Supplier payment allocation must be greater than zero.';

end if;

/* =====================================================
 * Quick Purchase allocation
 * ===================================================== */
if nullif(
    trim(
        coalesce(
            v_allocation ->> 'quick_purchase_id',
            ''
        )
    ),
    ''
) is not null then v_source_type := 'quick_purchase';

begin v_quick_purchase_id := (
    v_allocation ->> 'quick_purchase_id'
) :: uuid;

exception
when others then raise exception 'A valid Quick Purchase ID is required.';

end;

select
    supplier_id,
    currency_code,
    grand_total,
    payment_opening_amount into v_purchase_supplier_id,
    v_purchase_currency,
    v_purchase_grand_total,
    v_purchase_opening_amount
from
    public.quick_purchases
where
    id = v_quick_purchase_id
    and status = 'posted' for
update
;

if not found then raise exception 'The selected Quick Purchase was not found or is cancelled.';

end if;

if v_purchase_supplier_id is null then raise exception 'Quick Purchases without a registered supplier cannot be allocated to a Supplier Payment.';

end if;

if v_purchase_supplier_id <> p_supplier_id then raise exception 'All allocations must belong to the selected supplier.';

end if;

if upper(v_purchase_currency) <> upper(p_currency_code) then raise exception 'Supplier payment currency must match the Quick Purchase currency.';

end if;

select
    coalesce(
        sum(allocation.amount),
        0
    ) into v_existing_allocations
from
    public.supplier_payment_allocations allocation
    join public.supplier_payments payment on payment.id = allocation.supplier_payment_id
where
    allocation.quick_purchase_id = v_quick_purchase_id
    and payment.status = 'posted';

v_current_paid := coalesce(
    v_purchase_opening_amount,
    0
) + coalesce(
    v_existing_allocations,
    0
);

if v_current_paid + v_allocation_amount > v_purchase_grand_total then raise exception 'Supplier payment allocation exceeds the outstanding Quick Purchase balance.';

end if;

v_source_key := v_quick_purchase_id :: text;

/* =====================================================
 * Goods Receipt allocation
 * ===================================================== */
else v_source_type := 'goods_receipt';

begin v_goods_receipt_id := (
    v_allocation ->> 'goods_receipt_id'
) :: uuid;

exception
when others then raise exception 'A valid Goods Receipt ID is required.';

end;

select
    receipt.supplier_id,
    receipt.status,
    purchase_order.currency_code into v_receipt_supplier_id,
    v_receipt_status,
    v_receipt_currency
from
    public.goods_receipts receipt
    join public.purchase_orders purchase_order on purchase_order.id = receipt.purchase_order_id
where
    receipt.id = v_goods_receipt_id for
update
    of receipt;

if not found then raise exception 'The selected Goods Receipt was not found.';

end if;

if v_receipt_status <> 'completed' then raise exception 'Only completed Goods Receipts can be allocated to Supplier Payments.';

end if;

if v_receipt_supplier_id <> p_supplier_id then raise exception 'All allocations must belong to the selected supplier.';

end if;

if upper(v_receipt_currency) <> upper(p_currency_code) then raise exception 'Supplier payment currency must match the Goods Receipt Purchase Order currency.';

end if;

v_receipt_payable_amount := public.get_goods_receipt_payable_amount(v_goods_receipt_id);

select
    coalesce(
        sum(allocation.amount),
        0
    ) into v_existing_allocations
from
    public.supplier_payment_allocations allocation
    join public.supplier_payments payment on payment.id = allocation.supplier_payment_id
where
    allocation.goods_receipt_id = v_goods_receipt_id
    and payment.status = 'posted';

v_current_paid := coalesce(
    v_existing_allocations,
    0
);

if v_current_paid + v_allocation_amount > v_receipt_payable_amount then raise exception 'Supplier payment allocation exceeds the outstanding Goods Receipt balance.';

end if;

v_source_key := v_goods_receipt_id :: text;

end if;

if v_source_key is null then raise exception 'Unable to resolve Supplier Payment allocation source.';

end if;

v_total_allocated := v_total_allocated + v_allocation_amount;

end loop;

if v_total_allocated > p_amount then raise exception 'Total allocations cannot exceed the supplier payment amount.';

end if;

/* =======================================================
 * Payment Header
 * ======================================================= */
v_payment_number := public.generate_supplier_payment_number();

insert into
    public.supplier_payments (
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
        upper(p_currency_code),
        p_exchange_rate,
        round(p_amount, 2),
        0,
        round(p_amount, 2),
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
                coalesce(p_bank_name, '')
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
                coalesce(p_notes, '')
            ),
            ''
        ),
        'draft',
        null,
        null,
        v_user_id
    ) returning id into v_payment_id;

/* =======================================================
 * Allocation Rows
 * ======================================================= */
for v_allocation in
select
    *
from
    jsonb_array_elements(p_allocations) loop v_quick_purchase_id := null;

v_goods_receipt_id := null;

v_allocation_amount := (
    v_allocation ->> 'amount'
) :: numeric;

if nullif(
    trim(
        coalesce(
            v_allocation ->> 'quick_purchase_id',
            ''
        )
    ),
    ''
) is not null then v_quick_purchase_id := (
    v_allocation ->> 'quick_purchase_id'
) :: uuid;

else v_goods_receipt_id := (
    v_allocation ->> 'goods_receipt_id'
) :: uuid;

end if;

insert into
    public.supplier_payment_allocations (
        supplier_payment_id,
        quick_purchase_id,
        goods_receipt_id,
        amount,
        allocation_source
    )
values
    (
        v_payment_id,
        v_quick_purchase_id,
        v_goods_receipt_id,
        round(v_allocation_amount, 2),
        'payment_posting'
    );

end loop;

perform public.sync_supplier_payment_totals(v_payment_id);

/* =======================================================
 * Post Payment
 * ======================================================= */
update
    public.supplier_payments
set
    status = 'posted',
    posted_at = now(),
    posted_by = v_user_id
where
    id = v_payment_id;

/* =======================================================
 * Synchronize Allocated Payables
 * ======================================================= */
for v_allocation in
select
    *
from
    jsonb_array_elements(p_allocations) loop if nullif(
        trim(
            coalesce(
                v_allocation ->> 'quick_purchase_id',
                ''
            )
        ),
        ''
    ) is not null then perform public.sync_quick_purchase_paid_amount(
        (
            v_allocation ->> 'quick_purchase_id'
        ) :: uuid
    );

else perform public.sync_goods_receipt_paid_amount(
    (
        v_allocation ->> 'goods_receipt_id'
    ) :: uuid
);

end if;

end loop;

return v_payment_id;

end;

$$;

/* =========================================================
 * 8. Extend Supplier Payment Cancellation
 * ========================================================= */
create
or replace function public.cancel_supplier_payment(
    p_supplier_payment_id uuid,
    p_reason text
) returns uuid language plpgsql security definer
set
    search_path = public as $$ declare v_user_id uuid;

v_status text;

v_quick_purchase_id uuid;

v_goods_receipt_id uuid;

begin v_user_id := auth.uid();

if v_user_id is null then raise exception 'Authentication is required.';

end if;

if not public.is_admin() then raise exception 'You are not authorized to cancel supplier payments.';

end if;

select
    status into v_status
from
    public.supplier_payments
where
    id = p_supplier_payment_id for
update
;

if not found then raise exception 'Supplier payment was not found.';

end if;

if v_status = 'cancelled' then raise exception 'Supplier payment is already cancelled.';

end if;

if v_status <> 'posted' then raise exception 'Only posted supplier payments can be cancelled.';

end if;

if nullif(
    trim(
        coalesce(p_reason, '')
    ),
    ''
) is null then raise exception 'Cancellation reason is required.';

end if;

update
    public.supplier_payments
set
    status = 'cancelled',
    cancelled_at = now(),
    cancelled_by = v_user_id,
    cancellation_reason = trim(p_reason)
where
    id = p_supplier_payment_id;

/* =======================================================
 * Recalculate affected Quick Purchases
 * ======================================================= */
for v_quick_purchase_id in
select
    distinct quick_purchase_id
from
    public.supplier_payment_allocations
where
    supplier_payment_id = p_supplier_payment_id
    and quick_purchase_id is not null loop perform public.sync_quick_purchase_paid_amount(v_quick_purchase_id);

end loop;

/* =======================================================
 * Recalculate affected Goods Receipts
 * ======================================================= */
for v_goods_receipt_id in
select
    distinct goods_receipt_id
from
    public.supplier_payment_allocations
where
    supplier_payment_id = p_supplier_payment_id
    and goods_receipt_id is not null loop perform public.sync_goods_receipt_paid_amount(v_goods_receipt_id);

end loop;

return p_supplier_payment_id;

end;

$$;

/* =========================================================
 * 9. Preserve Function Permissions
 * ========================================================= */
revoke all on function public.post_supplier_payment(
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
from
    public;

grant execute on function public.post_supplier_payment(
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
) to authenticated;

revoke all on function public.cancel_supplier_payment(uuid, text)
from
    public;

grant execute on function public.cancel_supplier_payment(uuid, text) to authenticated;

/* =========================================================
 * 10. Documentation
 * ========================================================= */
comment on function public.get_goods_receipt_payable_amount(uuid) is 'Returns the gross supplier payable amount recognised by a completed Goods Receipt using accepted quantities and proportional Purchase Order commercial values.';

comment on function public.sync_goods_receipt_paid_amount(uuid) is 'Synchronizes Goods Receipt paid amount, outstanding balance and payment status from posted Supplier Payment allocations. Cancelled payments are excluded.';

comment on function public.post_supplier_payment(
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
) is 'Posts a Supplier Payment with allocations against Quick Purchases, completed Goods Receipts, or both. Preserves supplier, currency, outstanding-balance and over-allocation controls.';

comment on function public.cancel_supplier_payment(uuid, text) is 'Cancels a posted Supplier Payment and resynchronizes all affected Quick Purchase and Goods Receipt payable balances.';

/* =========================================================
 * End Part B
 * ========================================================= */

/* =========================================================
 * 11. Generalized Supplier Payable Open Items
 *
 * Preserve:
 *   public.payable_open_items
 *
 * That existing view remains Quick-Purchase-specific.
 *
 * New generalized view combines:
 *
 *   - posted Quick Purchases
 *   - completed Goods Receipts
 *
 * for consolidated Supplier AP / Aging reporting.
 * ========================================================= */

create or replace view
  public.supplier_payable_open_items

with (
  security_invoker = true
)

as


/* =======================================================
 * Quick Purchase Payables
 * ======================================================= */

select

  'quick_purchase'::text
    as source_type,

  purchase.id
    as source_id,

  purchase.id
    as quick_purchase_id,

  null::uuid
    as goods_receipt_id,

  purchase.purchase_number
    as document_number,

  purchase.purchase_date
    as document_date,

  purchase.supplier_id,

  supplier.company_name
    as supplier_name,

  purchase.store_name,

  purchase.supplier_invoice_number,

  purchase.supplier_invoice_date,

  purchase.payment_terms_days,

  (
    purchase.purchase_date
    +
    purchase.payment_terms_days
  )
    as due_date,

  greatest(
    current_date
    -
    (
      purchase.purchase_date
      +
      purchase.payment_terms_days
    ),
    0
  )
    as days_overdue,

  case

    when
      (
        purchase.purchase_date
        +
        purchase.payment_terms_days
      )
      >=
      current_date
    then
      'current'

    when
      current_date
      -
      (
        purchase.purchase_date
        +
        purchase.payment_terms_days
      )
      between 1 and 30
    then
      '1_30'

    when
      current_date
      -
      (
        purchase.purchase_date
        +
        purchase.payment_terms_days
      )
      between 31 and 60
    then
      '31_60'

    when
      current_date
      -
      (
        purchase.purchase_date
        +
        purchase.payment_terms_days
      )
      between 61 and 90
    then
      '61_90'

    else
      '90_plus'

  end
    as aging_bucket,

  purchase.currency_code,

  purchase.exchange_rate,

  round(
    purchase.grand_total,
    2
  )
    as gross_amount,

  round(
    purchase.paid_amount,
    2
  )
    as paid_amount,

  round(
    purchase.balance_due,
    2
  )
    as outstanding_amount,

  round(
    purchase.balance_due
    *
    purchase.exchange_rate,
    2
  )
    as base_outstanding_amount,

  purchase.payment_status,

  purchase.status,

  purchase.warehouse_id

from
  public.quick_purchases
    purchase

left join
  public.suppliers
    supplier

on
  supplier.id =
    purchase.supplier_id

where
  purchase.status =
    'posted'

  and
  purchase.balance_due >
    0


union all


/* =======================================================
 * Goods Receipt Payables
 * ======================================================= */

select

  'goods_receipt'::text
    as source_type,

  receipt.id
    as source_id,

  null::uuid
    as quick_purchase_id,

  receipt.id
    as goods_receipt_id,

  receipt.receipt_number
    as document_number,

  coalesce(
    receipt.received_date,
    receipt.completed_at::date,
    receipt.created_at::date
  )
    as document_date,

  receipt.supplier_id,

  supplier.company_name
    as supplier_name,

  null::text
    as store_name,

  receipt.supplier_invoice_number,

  null::date
    as supplier_invoice_date,

  receipt.payment_terms_days,

  (
    coalesce(
      receipt.received_date,
      receipt.completed_at::date,
      receipt.created_at::date
    )
    +
    receipt.payment_terms_days
  )
    as due_date,

  greatest(
    current_date
    -
    (
      coalesce(
        receipt.received_date,
        receipt.completed_at::date,
        receipt.created_at::date
      )
      +
      receipt.payment_terms_days
    ),
    0
  )
    as days_overdue,

  case

    when
      (
        coalesce(
          receipt.received_date,
          receipt.completed_at::date,
          receipt.created_at::date
        )
        +
        receipt.payment_terms_days
      )
      >=
      current_date
    then
      'current'

    when
      current_date
      -
      (
        coalesce(
          receipt.received_date,
          receipt.completed_at::date,
          receipt.created_at::date
        )
        +
        receipt.payment_terms_days
      )
      between 1 and 30
    then
      '1_30'

    when
      current_date
      -
      (
        coalesce(
          receipt.received_date,
          receipt.completed_at::date,
          receipt.created_at::date
        )
        +
        receipt.payment_terms_days
      )
      between 31 and 60
    then
      '31_60'

    when
      current_date
      -
      (
        coalesce(
          receipt.received_date,
          receipt.completed_at::date,
          receipt.created_at::date
        )
        +
        receipt.payment_terms_days
      )
      between 61 and 90
    then
      '61_90'

    else
      '90_plus'

  end
    as aging_bucket,

  purchase_order.currency_code,

  purchase_order.exchange_rate,

  round(
    public.get_goods_receipt_payable_amount(
      receipt.id
    ),
    2
  )
    as gross_amount,

  round(
    receipt.paid_amount,
    2
  )
    as paid_amount,

  round(
    receipt.balance_due,
    2
  )
    as outstanding_amount,

  round(
    receipt.balance_due
    *
    purchase_order.exchange_rate,
    2
  )
    as base_outstanding_amount,

  receipt.payment_status,

  receipt.status,

  receipt.warehouse_id

from
  public.goods_receipts
    receipt

join
  public.purchase_orders
    purchase_order

on
  purchase_order.id =
    receipt.purchase_order_id

left join
  public.suppliers
    supplier

on
  supplier.id =
    receipt.supplier_id

where
  receipt.status =
    'completed'

  and
  receipt.balance_due >
    0;


/* =========================================================
 * Documentation
 * ========================================================= */

comment on view
  public.supplier_payable_open_items
is
  'Generalized Supplier AP open-item view combining posted Quick Purchases and completed Goods Receipts while preserving the existing Quick-Purchase-specific payable_open_items view.';


/* =========================================================
 * 12. Supplier Payable Summary
 *
 * Preserve the existing public column contract introduced
 * by migrations 086/130.
 *
 * Only the payable source changes:
 *
 *   payable_open_items
 *
 * becomes
 *
 *   supplier_payable_open_items
 * ========================================================= */

create or replace view
  public.supplier_payable_summary

with (
  security_invoker = true
)

as

with payable as (

  select

    open_item.supplier_id,

    count(*)
      as open_purchase_count,

    sum(
      open_item.base_outstanding_amount
    )
      as total_payable,

    sum(
      case
        when
          open_item.aging_bucket =
            'current'
        then
          open_item.base_outstanding_amount
        else
          0
      end
    )
      as current_amount,

    sum(
      case
        when
          open_item.aging_bucket =
            '1_30'
        then
          open_item.base_outstanding_amount
        else
          0
      end
    )
      as days_1_30_amount,

    sum(
      case
        when
          open_item.aging_bucket =
            '31_60'
        then
          open_item.base_outstanding_amount
        else
          0
      end
    )
      as days_31_60_amount,

    sum(
      case
        when
          open_item.aging_bucket =
            '61_90'
        then
          open_item.base_outstanding_amount
        else
          0
      end
    )
      as days_61_90_amount,

    sum(
      case
        when
          open_item.aging_bucket =
            '90_plus'
        then
          open_item.base_outstanding_amount
        else
          0
      end
    )
      as days_90_plus_amount,

    sum(
      case
        when
          open_item.days_overdue > 0
        then
          open_item.base_outstanding_amount
        else
          0
      end
    )
      as overdue_amount,

    max(
      open_item.days_overdue
    )
      as maximum_days_overdue,

    min(
      open_item.due_date
    )
      as oldest_due_date

  from
    public.supplier_payable_open_items
      open_item

  where
    open_item.supplier_id
      is not null

  group by
    open_item.supplier_id
),


payment_advance as (

  select

    payment.supplier_id,

    sum(
      round(
        payment.unallocated_amount
        *
        payment.exchange_rate,
        2
      )
    )
      as supplier_advance

  from
    public.supplier_payments
      payment

  where
    payment.status =
      'posted'

    and
    payment.unallocated_amount >
      0

  group by
    payment.supplier_id
),


supplier_return_credit as (

  select

    credit.supplier_id,

    sum(
      round(
        credit.supplier_credit_available
        *
        credit.exchange_rate,
        2
      )
    )
      as supplier_return_credit

  from
    public.available_supplier_return_credits
      credit

  where
    credit.supplier_id
      is not null

    and
    coalesce(
      credit.supplier_credit_available,
      0
    ) > 0

  group by
    credit.supplier_id
)


select

  supplier.id
    as supplier_id,

  supplier.company_name
    as supplier_name,

  supplier.contact_name,

  supplier.phone,

  supplier.email,

  supplier.payment_terms_days,

  coalesce(
    payable.open_purchase_count,
    0
  )
    as open_purchase_count,

  round(
    coalesce(
      payable.total_payable,
      0
    ),
    2
  )
    as total_payable,

  round(
    coalesce(
      payable.current_amount,
      0
    ),
    2
  )
    as current_amount,

  round(
    coalesce(
      payable.days_1_30_amount,
      0
    ),
    2
  )
    as days_1_30_amount,

  round(
    coalesce(
      payable.days_31_60_amount,
      0
    ),
    2
  )
    as days_31_60_amount,

  round(
    coalesce(
      payable.days_61_90_amount,
      0
    ),
    2
  )
    as days_61_90_amount,

  round(
    coalesce(
      payable.days_90_plus_amount,
      0
    ),
    2
  )
    as days_90_plus_amount,

  round(
    coalesce(
      payable.overdue_amount,
      0
    ),
    2
  )
    as overdue_amount,

  coalesce(
    payable.maximum_days_overdue,
    0
  )
    as maximum_days_overdue,

  payable.oldest_due_date,

  round(
    coalesce(
      payment_advance.supplier_advance,
      0
    ),
    2
  )
    as supplier_advance,

  round(
    greatest(
      coalesce(
        payable.total_payable,
        0
      )
      -
      coalesce(
        payment_advance.supplier_advance,
        0
      )
      -
      coalesce(
        supplier_return_credit.supplier_return_credit,
        0
      ),
      0
    ),
    2
  )
    as net_payable_exposure,

  round(
    coalesce(
      supplier_return_credit.supplier_return_credit,
      0
    ),
    2
  )
    as supplier_return_credit,

  round(
    coalesce(
      payment_advance.supplier_advance,
      0
    )
    +
    coalesce(
      supplier_return_credit.supplier_return_credit,
      0
    ),
    2
  )
    as total_supplier_credit

from
  public.suppliers
    supplier

left join
  payable

on
  payable.supplier_id =
    supplier.id

left join
  payment_advance

on
  payment_advance.supplier_id =
    supplier.id

left join
  supplier_return_credit

on
  supplier_return_credit.supplier_id =
    supplier.id

where
  coalesce(
    payable.total_payable,
    0
  ) > 0

  or
  coalesce(
    payment_advance.supplier_advance,
    0
  ) > 0

  or
  coalesce(
    supplier_return_credit.supplier_return_credit,
    0
  ) > 0;


comment on view
  public.supplier_payable_summary
is
  'Current consolidated supplier payable aging across Quick Purchases and completed Goods Receipts, including Supplier Payment advances, Supplier Return credits, total supplier credit and net payable exposure.';


/* =========================================================
 * End Part C
 * ========================================================= */

