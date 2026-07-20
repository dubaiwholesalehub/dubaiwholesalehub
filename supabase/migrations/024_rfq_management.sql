-- ============================================================
-- Milestone 7.1A
-- RFQ Management Core Database
-- ============================================================


-- ============================================================
-- ENUM TYPES
-- ============================================================

create type public.rfq_status as enum (
    'draft',
    'ready',
    'sent',
    'partially_quoted',
    'quoted',
    'under_review',
    'awarded',
    'closed',
    'cancelled'
);


create type public.rfq_supplier_status as enum (
    'invited',
    'sent',
    'viewed',
    'declined',
    'partially_quoted',
    'quoted',
    'awarded',
    'rejected',
    'cancelled'
);


create type public.supplier_quotation_status as enum (
    'draft',
    'submitted',
    'under_review',
    'revised',
    'accepted',
    'rejected',
    'withdrawn'
);


create type public.rfq_priority as enum (
    'low',
    'normal',
    'high',
    'urgent'
);


-- ============================================================
-- RFQ NUMBER SEQUENCE
-- Example: RFQ-2026-000001
-- ============================================================

create sequence public.rfq_number_sequence
    start with 1
    increment by 1
    no minvalue
    no maxvalue
    cache 1;


create or replace function public.generate_rfq_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
    next_number bigint;
begin
    next_number := nextval('public.rfq_number_sequence');

    return
        'RFQ-' ||
        to_char(current_date, 'YYYY') ||
        '-' ||
        lpad(next_number::text, 6, '0');
end;
$$;


-- ============================================================
-- RFQ HEADER
-- ============================================================

create table public.rfqs (

    id uuid primary key default gen_random_uuid(),

    rfq_number text not null
        default public.generate_rfq_number(),

    title text not null,

    description text,

    status public.rfq_status
        not null
        default 'draft',

    priority public.rfq_priority
        not null
        default 'normal',

    currency_code varchar(3)
        not null
        default 'AED',

    required_delivery_date date,

    response_deadline timestamptz,

    delivery_location text,

    incoterm text,

    payment_terms text,

    packaging_requirements text,

    internal_notes text,

    supplier_notes text,

    awarded_supplier_id uuid
        references public.suppliers(id)
        on delete set null,

    awarded_quotation_id uuid,

    sent_at timestamptz,

    awarded_at timestamptz,

    closed_at timestamptz,

    cancelled_at timestamptz,

    created_by uuid
        references auth.users(id)
        on delete set null,

    updated_by uuid
        references auth.users(id)
        on delete set null,

    created_at timestamptz
        not null
        default now(),

    updated_at timestamptz
        not null
        default now(),

    constraint rfqs_rfq_number_unique
        unique (rfq_number),

    constraint rfqs_currency_code_format
        check (
            currency_code =
            upper(currency_code)
            and char_length(currency_code) = 3
        ),

    constraint rfqs_response_deadline_valid
        check (
            response_deadline is null
            or response_deadline >= created_at
        )
);


create index idx_rfqs_number
on public.rfqs(rfq_number);


create index idx_rfqs_status
on public.rfqs(status);


create index idx_rfqs_priority
on public.rfqs(priority);


create index idx_rfqs_response_deadline
on public.rfqs(response_deadline);


create index idx_rfqs_created_at
on public.rfqs(created_at desc);


create index idx_rfqs_created_by
on public.rfqs(created_by);


create index idx_rfqs_awarded_supplier
on public.rfqs(awarded_supplier_id);


create trigger rfqs_updated_at

before update on public.rfqs

for each row

execute function public.set_updated_at();


-- ============================================================
-- RFQ ITEMS
-- Products requested within an RFQ
-- ============================================================

create table public.rfq_items (

    id uuid primary key default gen_random_uuid(),

    rfq_id uuid not null
        references public.rfqs(id)
        on delete cascade,

    product_id uuid
        references public.products(id)
        on delete set null,

    line_number integer not null,

    item_name text not null,

    item_description text,

    product_sku text,

    requested_quantity numeric(14, 3)
        not null,

    unit_id uuid
        references public.units(id)
        on delete set null,

    target_unit_price numeric(14, 4),

    target_currency_code varchar(3),

    target_delivery_date date,

    specifications text,

    packaging_requirements text,

    notes text,

    created_at timestamptz
        not null
        default now(),

    updated_at timestamptz
        not null
        default now(),

    constraint rfq_items_line_unique
        unique (rfq_id, line_number),

    constraint rfq_items_quantity_positive
        check (requested_quantity > 0),

    constraint rfq_items_target_price_non_negative
        check (
            target_unit_price is null
            or target_unit_price >= 0
        ),

    constraint rfq_items_target_currency_format
        check (
            target_currency_code is null
            or (
                target_currency_code =
                upper(target_currency_code)
                and char_length(target_currency_code) = 3
            )
        )
);


create index idx_rfq_items_rfq
on public.rfq_items(rfq_id);


create index idx_rfq_items_product
on public.rfq_items(product_id);


create index idx_rfq_items_unit
on public.rfq_items(unit_id);


create trigger rfq_items_updated_at

before update on public.rfq_items

for each row

execute function public.set_updated_at();


-- ============================================================
-- RFQ SUPPLIERS
-- Suppliers invited to quote for an RFQ
-- ============================================================

create table public.rfq_suppliers (

    id uuid primary key default gen_random_uuid(),

    rfq_id uuid not null
        references public.rfqs(id)
        on delete cascade,

    supplier_id uuid not null
        references public.suppliers(id)
        on delete restrict,

    status public.rfq_supplier_status
        not null
        default 'invited',

    contact_name text,

    contact_email text,

    contact_phone text,

    contact_whatsapp text,

    supplier_reference text,

    invitation_message text,

    sent_at timestamptz,

    viewed_at timestamptz,

    responded_at timestamptz,

    declined_at timestamptz,

    decline_reason text,

    awarded_at timestamptz,

    notes text,

    created_at timestamptz
        not null
        default now(),

    updated_at timestamptz
        not null
        default now(),

    constraint rfq_suppliers_unique
        unique (rfq_id, supplier_id)
);


create index idx_rfq_suppliers_rfq
on public.rfq_suppliers(rfq_id);


create index idx_rfq_suppliers_supplier
on public.rfq_suppliers(supplier_id);


create index idx_rfq_suppliers_status
on public.rfq_suppliers(status);


create trigger rfq_suppliers_updated_at

before update on public.rfq_suppliers

for each row

execute function public.set_updated_at();


-- ============================================================
-- SUPPLIER QUOTATION HEADER
-- One supplier may submit revised versions
-- ============================================================

create table public.supplier_quotations (

    id uuid primary key default gen_random_uuid(),

    rfq_id uuid not null
        references public.rfqs(id)
        on delete cascade,

    rfq_supplier_id uuid not null
        references public.rfq_suppliers(id)
        on delete cascade,

    supplier_id uuid not null
        references public.suppliers(id)
        on delete restrict,

    quotation_number text,

    revision_number integer
        not null
        default 1,

    status public.supplier_quotation_status
        not null
        default 'draft',

    currency_code varchar(3)
        not null
        default 'AED',

    quotation_date date
        not null
        default current_date,

    valid_until date,

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

    lead_time text,

    lead_time_days integer,

    packaging text,

    warranty text,

    supplier_notes text,

    internal_notes text,

    submitted_at timestamptz,

    reviewed_at timestamptz,

    accepted_at timestamptz,

    rejected_at timestamptz,

    created_by uuid
        references auth.users(id)
        on delete set null,

    updated_by uuid
        references auth.users(id)
        on delete set null,

    created_at timestamptz
        not null
        default now(),

    updated_at timestamptz
        not null
        default now(),

    constraint supplier_quotations_revision_unique
        unique (
            rfq_supplier_id,
            revision_number
        ),

    constraint supplier_quotations_currency_format
        check (
            currency_code =
            upper(currency_code)
            and char_length(currency_code) = 3
        ),

    constraint supplier_quotations_revision_positive
        check (revision_number > 0),

    constraint supplier_quotations_validity
        check (
            valid_until is null
            or valid_until >= quotation_date
        ),

    constraint supplier_quotations_lead_time_non_negative
        check (
            lead_time_days is null
            or lead_time_days >= 0
        ),

    constraint supplier_quotations_amounts_non_negative
        check (
            subtotal >= 0
            and discount_amount >= 0
            and shipping_amount >= 0
            and tax_amount >= 0
            and other_charges >= 0
            and total_amount >= 0
        )
);


create index idx_supplier_quotations_rfq
on public.supplier_quotations(rfq_id);


create index idx_supplier_quotations_rfq_supplier
on public.supplier_quotations(rfq_supplier_id);


create index idx_supplier_quotations_supplier
on public.supplier_quotations(supplier_id);


create index idx_supplier_quotations_status
on public.supplier_quotations(status);


create index idx_supplier_quotations_created_at
on public.supplier_quotations(created_at desc);


create trigger supplier_quotations_updated_at

before update on public.supplier_quotations

for each row

execute function public.set_updated_at();


-- ============================================================
-- SUPPLIER QUOTATION ITEMS
-- Supplier pricing for each requested RFQ item
-- ============================================================

create table public.supplier_quotation_items (

    id uuid primary key default gen_random_uuid(),

    quotation_id uuid not null
        references public.supplier_quotations(id)
        on delete cascade,

    rfq_item_id uuid not null
        references public.rfq_items(id)
        on delete cascade,

    supplier_sku text,

    quoted_quantity numeric(14, 3)
        not null,

    moq numeric(14, 3),

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

    available_quantity numeric(14, 3),

    lead_time text,

    lead_time_days integer,

    packaging text,

    country_of_origin_id uuid
        references public.countries(id)
        on delete set null,

    warranty text,

    item_notes text,

    is_compliant boolean
        not null
        default true,

    compliance_notes text,

    created_at timestamptz
        not null
        default now(),

    updated_at timestamptz
        not null
        default now(),

    constraint supplier_quotation_items_unique
        unique (quotation_id, rfq_item_id),

    constraint supplier_quotation_items_quantity_positive
        check (quoted_quantity > 0),

    constraint supplier_quotation_items_moq_positive
        check (
            moq is null
            or moq > 0
        ),

    constraint supplier_quotation_items_price_non_negative
        check (unit_price >= 0),

    constraint supplier_quotation_items_discount_percent
        check (
            discount_percent >= 0
            and discount_percent <= 100
        ),

    constraint supplier_quotation_items_tax_percent
        check (
            tax_percent >= 0
            and tax_percent <= 100
        ),

    constraint supplier_quotation_items_amounts_non_negative
        check (
            discount_amount >= 0
            and line_subtotal >= 0
            and tax_amount >= 0
            and line_total >= 0
        ),

    constraint supplier_quotation_items_available_quantity
        check (
            available_quantity is null
            or available_quantity >= 0
        ),

    constraint supplier_quotation_items_lead_time
        check (
            lead_time_days is null
            or lead_time_days >= 0
        )
);


create index idx_supplier_quotation_items_quotation
on public.supplier_quotation_items(quotation_id);


create index idx_supplier_quotation_items_rfq_item
on public.supplier_quotation_items(rfq_item_id);


create index idx_supplier_quotation_items_origin
on public.supplier_quotation_items(country_of_origin_id);


create trigger supplier_quotation_items_updated_at

before update on public.supplier_quotation_items

for each row

execute function public.set_updated_at();


-- ============================================================
-- Add quotation foreign key after supplier_quotations exists
-- ============================================================

alter table public.rfqs
add constraint rfqs_awarded_quotation_fk
foreign key (awarded_quotation_id)
references public.supplier_quotations(id)
on delete set null;


create index idx_rfqs_awarded_quotation
on public.rfqs(awarded_quotation_id);


-- ============================================================
-- RFQ STATUS HISTORY
-- Provides a permanent audit trail
-- ============================================================

create table public.rfq_status_history (

    id uuid primary key default gen_random_uuid(),

    rfq_id uuid not null
        references public.rfqs(id)
        on delete cascade,

    previous_status public.rfq_status,

    new_status public.rfq_status
        not null,

    reason text,

    notes text,

    changed_by uuid
        references auth.users(id)
        on delete set null,

    changed_at timestamptz
        not null
        default now()
);


create index idx_rfq_status_history_rfq
on public.rfq_status_history(rfq_id);


create index idx_rfq_status_history_changed_at
on public.rfq_status_history(changed_at desc);


-- ============================================================
-- AUTOMATIC STATUS HISTORY
-- ============================================================

create or replace function public.record_rfq_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if tg_op = 'INSERT' then

        insert into public.rfq_status_history (
            rfq_id,
            previous_status,
            new_status,
            changed_by
        )
        values (
            new.id,
            null,
            new.status,
            new.created_by
        );

    elsif old.status is distinct from new.status then

        insert into public.rfq_status_history (
            rfq_id,
            previous_status,
            new_status,
            changed_by
        )
        values (
            new.id,
            old.status,
            new.status,
            new.updated_by
        );

    end if;

    return new;
end;
$$;


create trigger rfq_status_history_trigger

after insert or update of status
on public.rfqs

for each row

execute function public.record_rfq_status_change();


-- ============================================================
-- QUOTATION CONSISTENCY VALIDATION
-- Ensures quotation belongs to the same RFQ/supplier invitation
-- ============================================================

create or replace function public.validate_supplier_quotation()
returns trigger
language plpgsql
set search_path = public
as $$
declare
    linked_rfq_id uuid;
    linked_supplier_id uuid;
begin
    select
        rfq_id,
        supplier_id
    into
        linked_rfq_id,
        linked_supplier_id
    from public.rfq_suppliers
    where id = new.rfq_supplier_id;

    if linked_rfq_id is null then
        raise exception
            'The selected RFQ supplier invitation does not exist.';
    end if;

    if linked_rfq_id <> new.rfq_id then
        raise exception
            'Quotation RFQ does not match the supplier invitation RFQ.';
    end if;

    if linked_supplier_id <> new.supplier_id then
        raise exception
            'Quotation supplier does not match the supplier invitation.';
    end if;

    return new;
end;
$$;


create trigger validate_supplier_quotation_trigger

before insert or update of
    rfq_id,
    rfq_supplier_id,
    supplier_id
on public.supplier_quotations

for each row

execute function public.validate_supplier_quotation();


-- ============================================================
-- QUOTATION ITEM CONSISTENCY VALIDATION
-- Ensures quotation item belongs to the same RFQ
-- ============================================================

create or replace function public.validate_supplier_quotation_item()
returns trigger
language plpgsql
set search_path = public
as $$
declare
    quotation_rfq_id uuid;
    item_rfq_id uuid;
begin
    select rfq_id
    into quotation_rfq_id
    from public.supplier_quotations
    where id = new.quotation_id;

    select rfq_id
    into item_rfq_id
    from public.rfq_items
    where id = new.rfq_item_id;

    if quotation_rfq_id is null then
        raise exception
            'The selected supplier quotation does not exist.';
    end if;

    if item_rfq_id is null then
        raise exception
            'The selected RFQ item does not exist.';
    end if;

    if quotation_rfq_id <> item_rfq_id then
        raise exception
            'Quotation item must belong to the same RFQ as the quotation.';
    end if;

    return new;
end;
$$;


create trigger validate_supplier_quotation_item_trigger

before insert or update of
    quotation_id,
    rfq_item_id
on public.supplier_quotation_items

for each row

execute function public.validate_supplier_quotation_item();


-- ============================================================
-- PREVENT INVALID AWARD REFERENCES
-- ============================================================

create or replace function public.validate_rfq_award()
returns trigger
language plpgsql
set search_path = public
as $$
declare
    quotation_rfq_id uuid;
    quotation_supplier_id uuid;
begin
    if new.awarded_quotation_id is null then
        return new;
    end if;

    select
        rfq_id,
        supplier_id
    into
        quotation_rfq_id,
        quotation_supplier_id
    from public.supplier_quotations
    where id = new.awarded_quotation_id;

    if quotation_rfq_id is null then
        raise exception
            'The selected awarded quotation does not exist.';
    end if;

    if quotation_rfq_id <> new.id then
        raise exception
            'The awarded quotation must belong to this RFQ.';
    end if;

    if new.awarded_supplier_id is null then
        new.awarded_supplier_id :=
            quotation_supplier_id;
    elsif new.awarded_supplier_id <>
          quotation_supplier_id then
        raise exception
            'The awarded supplier must match the awarded quotation supplier.';
    end if;

    return new;
end;
$$;


create trigger validate_rfq_award_trigger

before update of
    awarded_supplier_id,
    awarded_quotation_id
on public.rfqs

for each row

execute function public.validate_rfq_award();


-- ============================================================
-- COMMENTS
-- ============================================================

comment on table public.rfqs is
'RFQ header records used to request quotations from multiple suppliers.';


comment on table public.rfq_items is
'Products or custom items requested within an RFQ.';


comment on table public.rfq_suppliers is
'Suppliers invited to respond to an RFQ.';


comment on table public.supplier_quotations is
'Supplier quotation headers, including revisions and commercial terms.';


comment on table public.supplier_quotation_items is
'Supplier prices and terms for individual RFQ items.';


comment on table public.rfq_status_history is
'Audit history of RFQ status changes.';