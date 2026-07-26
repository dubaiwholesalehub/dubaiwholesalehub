-- ============================================================
-- PURCHASE ORDER MANAGEMENT
-- Milestone 6.1: Database foundation
-- ============================================================


-- ============================================================
-- 1. PURCHASE ORDER STATUS
-- ============================================================

create type public.purchase_order_status as enum (
    'draft',
    'approved',
    'sent',
    'partially_received',
    'received',
    'closed',
    'cancelled'
);


comment on type public.purchase_order_status is
'Lifecycle status of a supplier purchase order.';


-- ============================================================
-- 2. PURCHASE ORDER NUMBER COUNTERS
-- ============================================================

create table public.purchase_order_number_counters (

    counter_year integer primary key,

    last_number bigint
        not null
        default 0,

    updated_at timestamptz
        not null
        default now(),

    constraint purchase_order_number_counters_year_valid
        check (counter_year >= 2000),

    constraint purchase_order_number_counters_number_valid
        check (last_number >= 0)
);


comment on table public.purchase_order_number_counters is
'Stores the last Purchase Order sequence number used for each calendar year.';


-- ============================================================
-- 3. PURCHASE ORDER NUMBER GENERATOR
-- ============================================================

create or replace function public.generate_purchase_order_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
    target_year integer;
    next_number bigint;
begin
    target_year := extract(year from current_date)::integer;

    insert into public.purchase_order_number_counters (
        counter_year,
        last_number,
        updated_at
    )
    values (
        target_year,
        1,
        now()
    )
    on conflict (counter_year)
    do update
    set
        last_number =
            public.purchase_order_number_counters.last_number + 1,
        updated_at = now()
    returning last_number into next_number;

    return
        'PO-' ||
        target_year::text ||
        '-' ||
        lpad(next_number::text, 6, '0');
end;
$$;


revoke all
on function public.generate_purchase_order_number()
from public;


grant execute
on function public.generate_purchase_order_number()
to authenticated;


comment on function public.generate_purchase_order_number() is
'Generates a concurrency-safe yearly Purchase Order number such as PO-2026-000001.';


-- ============================================================
-- 4. PURCHASE ORDERS
-- ============================================================

create table public.purchase_orders (

    id uuid primary key
        default gen_random_uuid(),

    po_number text
        not null
        default public.generate_purchase_order_number(),

    status public.purchase_order_status
        not null
        default 'draft',

    rfq_id uuid
        references public.rfqs(id)
        on delete restrict,

    supplier_id uuid
        not null
        references public.suppliers(id)
        on delete restrict,

    supplier_quotation_id uuid
        references public.supplier_quotations(id)
        on delete restrict,

    order_date date
        not null
        default current_date,

    expected_delivery_date date,

    currency_code varchar(3)
        not null
        default 'AED',

    subtotal numeric(16, 4)
        not null
        default 0,

    discount_amount numeric(16, 4)
        not null
        default 0,

    shipping_amount numeric(16, 4)
        not null
        default 0,

    tax_amount numeric(16, 4)
        not null
        default 0,

    other_charges numeric(16, 4)
        not null
        default 0,

    total_amount numeric(16, 4)
        not null
        default 0,

    payment_terms text,

    incoterm text,

    loading_port text,

    delivery_location text,

    delivery_terms text,

    lead_time text,

    lead_time_days integer,

    packaging text,

    warranty text,

    supplier_notes text,

    internal_notes text,

    approved_at timestamptz,

    sent_at timestamptz,

    partially_received_at timestamptz,

    received_at timestamptz,

    closed_at timestamptz,

    cancelled_at timestamptz,

    created_by uuid
        references auth.users(id)
        on delete set null,

    updated_by uuid
        references auth.users(id)
        on delete set null,

    approved_by uuid
        references auth.users(id)
        on delete set null,

    cancelled_by uuid
        references auth.users(id)
        on delete set null,

    created_at timestamptz
        not null
        default now(),

    updated_at timestamptz
        not null
        default now(),

    constraint purchase_orders_po_number_unique
        unique (po_number),

    constraint purchase_orders_supplier_quotation_unique
        unique (supplier_quotation_id),

    constraint purchase_orders_currency_format
        check (
            currency_code = upper(currency_code)
            and char_length(currency_code) = 3
        ),

    constraint purchase_orders_subtotal_non_negative
        check (subtotal >= 0),

    constraint purchase_orders_discount_non_negative
        check (discount_amount >= 0),

    constraint purchase_orders_shipping_non_negative
        check (shipping_amount >= 0),

    constraint purchase_orders_tax_non_negative
        check (tax_amount >= 0),

    constraint purchase_orders_other_charges_non_negative
        check (other_charges >= 0),

    constraint purchase_orders_total_non_negative
        check (total_amount >= 0),

    constraint purchase_orders_lead_time_days_non_negative
        check (
            lead_time_days is null
            or lead_time_days >= 0
        ),

    constraint purchase_orders_delivery_date_valid
        check (
            expected_delivery_date is null
            or expected_delivery_date >= order_date
        ),

    constraint purchase_orders_source_consistency
        check (
            (
                supplier_quotation_id is null
                and rfq_id is null
            )
            or (
                supplier_quotation_id is not null
                and rfq_id is not null
            )
        )
);


comment on table public.purchase_orders is
'Supplier Purchase Orders created manually or from awarded supplier quotations.';

comment on column public.purchase_orders.supplier_quotation_id is
'The awarded supplier quotation from which this Purchase Order was generated.';

comment on column public.purchase_orders.total_amount is
'Final Purchase Order total including discounts, shipping, tax and other charges.';


-- ============================================================
-- 5. PURCHASE ORDER INDEXES
-- ============================================================

create index idx_purchase_orders_status
on public.purchase_orders(status);


create index idx_purchase_orders_supplier
on public.purchase_orders(supplier_id);


create index idx_purchase_orders_rfq
on public.purchase_orders(rfq_id);


create index idx_purchase_orders_supplier_quotation
on public.purchase_orders(supplier_quotation_id);


create index idx_purchase_orders_order_date
on public.purchase_orders(order_date desc);


create index idx_purchase_orders_created_at
on public.purchase_orders(created_at desc);


-- ============================================================
-- 6. PURCHASE ORDER ITEMS
-- ============================================================

create table public.purchase_order_items (

    id uuid primary key
        default gen_random_uuid(),

    purchase_order_id uuid
        not null
        references public.purchase_orders(id)
        on delete cascade,

    line_number integer
        not null,

    rfq_item_id uuid
        references public.rfq_items(id)
        on delete set null,

    supplier_quotation_item_id uuid
        references public.supplier_quotation_items(id)
        on delete set null,

    product_id uuid
        references public.products(id)
        on delete set null,

    item_name text
        not null,

    item_description text,

    product_sku text,

    supplier_sku text,

    ordered_quantity numeric(14, 3)
        not null,

    received_quantity numeric(14, 3)
        not null
        default 0,

    unit_id uuid
        references public.units(id)
        on delete set null,

    unit_price numeric(16, 4)
        not null,

    discount_percent numeric(7, 4)
        not null
        default 0,

    discount_amount numeric(16, 4)
        not null
        default 0,

    line_subtotal numeric(16, 4)
        not null
        default 0,

    tax_percent numeric(7, 4)
        not null
        default 0,

    tax_amount numeric(16, 4)
        not null
        default 0,

    line_total numeric(16, 4)
        not null
        default 0,

    country_of_origin_id uuid
        references public.countries(id)
        on delete set null,

    lead_time text,

    lead_time_days integer,

    packaging text,

    warranty text,

    item_notes text,

    created_at timestamptz
        not null
        default now(),

    updated_at timestamptz
        not null
        default now(),

    constraint purchase_order_items_line_unique
        unique (
            purchase_order_id,
            line_number
        ),

    constraint purchase_order_items_source_unique
        unique (
            purchase_order_id,
            supplier_quotation_item_id
        ),

    constraint purchase_order_items_line_number_positive
        check (line_number > 0),

    constraint purchase_order_items_quantity_positive
        check (ordered_quantity > 0),

    constraint purchase_order_items_received_quantity_valid
        check (
            received_quantity >= 0
            and received_quantity <= ordered_quantity
        ),

    constraint purchase_order_items_unit_price_non_negative
        check (unit_price >= 0),

    constraint purchase_order_items_discount_percent_valid
        check (
            discount_percent >= 0
            and discount_percent <= 100
        ),

    constraint purchase_order_items_discount_amount_non_negative
        check (discount_amount >= 0),

    constraint purchase_order_items_line_subtotal_non_negative
        check (line_subtotal >= 0),

    constraint purchase_order_items_tax_percent_valid
        check (
            tax_percent >= 0
            and tax_percent <= 100
        ),

    constraint purchase_order_items_tax_amount_non_negative
        check (tax_amount >= 0),

    constraint purchase_order_items_line_total_non_negative
        check (line_total >= 0),

    constraint purchase_order_items_lead_time_days_non_negative
        check (
            lead_time_days is null
            or lead_time_days >= 0
        )
);


comment on table public.purchase_order_items is
'Individual product or service lines belonging to a supplier Purchase Order.';

comment on column public.purchase_order_items.received_quantity is
'Quantity received through Goods Receipt Notes. It cannot exceed the ordered quantity.';

comment on column public.purchase_order_items.supplier_quotation_item_id is
'Original supplier quotation item used to generate this Purchase Order line.';


-- ============================================================
-- 7. PURCHASE ORDER ITEM INDEXES
-- ============================================================

create index idx_purchase_order_items_purchase_order
on public.purchase_order_items(purchase_order_id);


create index idx_purchase_order_items_product
on public.purchase_order_items(product_id);


create index idx_purchase_order_items_rfq_item
on public.purchase_order_items(rfq_item_id);


create index idx_purchase_order_items_quotation_item
on public.purchase_order_items(supplier_quotation_item_id);


-- ============================================================
-- 8. UPDATED_AT TRIGGERS
-- ============================================================

create trigger set_purchase_orders_updated_at
before update
on public.purchase_orders
for each row
execute function public.set_updated_at();


create trigger set_purchase_order_items_updated_at
before update
on public.purchase_order_items
for each row
execute function public.set_updated_at();


-- ============================================================
-- 9. ROW LEVEL SECURITY
-- ============================================================

alter table public.purchase_order_number_counters
enable row level security;


alter table public.purchase_orders
enable row level security;


alter table public.purchase_order_items
enable row level security;


-- Counter table must only be accessed through the number generator.
-- No direct authenticated-user policies are intentionally created.


create policy "Authenticated users can view purchase orders"
on public.purchase_orders
for select
to authenticated
using (
    auth.uid() is not null
);


create policy "RFQ managers can create purchase orders"
on public.purchase_orders
for insert
to authenticated
with check (
    public.can_manage_rfqs()
);


create policy "RFQ managers can update purchase orders"
on public.purchase_orders
for update
to authenticated
using (
    public.can_manage_rfqs()
)
with check (
    public.can_manage_rfqs()
);


create policy "RFQ managers can delete purchase orders"
on public.purchase_orders
for delete
to authenticated
using (
    public.can_manage_rfqs()
);


create policy "Authenticated users can view purchase order items"
on public.purchase_order_items
for select
to authenticated
using (
    auth.uid() is not null
);


create policy "RFQ managers can create purchase order items"
on public.purchase_order_items
for insert
to authenticated
with check (
    public.can_manage_rfqs()
);


create policy "RFQ managers can update purchase order items"
on public.purchase_order_items
for update
to authenticated
using (
    public.can_manage_rfqs()
)
with check (
    public.can_manage_rfqs()
);


create policy "RFQ managers can delete purchase order items"
on public.purchase_order_items
for delete
to authenticated
using (
    public.can_manage_rfqs()
);


-- ============================================================
-- 10. TABLE PERMISSIONS
-- ============================================================

revoke all
on table public.purchase_order_number_counters
from anon, authenticated;


revoke all
on table public.purchase_orders
from anon;


revoke all
on table public.purchase_order_items
from anon;


grant select, insert, update, delete
on table public.purchase_orders
to authenticated;


grant select, insert, update, delete
on table public.purchase_order_items
to authenticated;


-- ============================================================
-- 11. AUDIT COMMENTS
-- ============================================================

comment on column public.purchase_orders.created_by is
'Authenticated user who created the Purchase Order.';

comment on column public.purchase_orders.updated_by is
'Authenticated user who most recently updated the Purchase Order.';

comment on column public.purchase_orders.approved_by is
'Authenticated user who approved the Purchase Order.';

comment on column public.purchase_orders.cancelled_by is
'Authenticated user who cancelled the Purchase Order.';