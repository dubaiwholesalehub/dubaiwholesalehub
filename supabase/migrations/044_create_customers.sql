/*
 * HM ERP
 * Customer Management Module
 *
 * Creates:
 *   1. Customer number sequence
 *   2. Customers
 *   3. Customer contacts
 *   4. Customer addresses
 *   5. Indexes
 *   6. Updated-at triggers
 *   7. Row-level security policies
 */


/* =========================================================
 * Customer Number Sequence
 * ========================================================= */

create sequence if not exists
  public.customer_number_seq
  start with 1
  increment by 1;


/* =========================================================
 * Customers
 * ========================================================= */

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),

  customer_number text not null unique,

  customer_type text not null default 'business',

  display_name text not null,

  company_name text,

  first_name text,
  last_name text,

  email text,
  phone text,
  whatsapp text,

  tax_registration_number text,

  currency_code text not null default 'AED',

  credit_limit numeric(18, 2)
    not null default 0,

  payment_terms_days integer
    not null default 0,

  status text not null default 'active',

  source text not null default 'internal',

  external_customer_id text,

  internal_notes text,

  created_by uuid,
  updated_by uuid,

  created_at timestamptz
    not null default now(),

  updated_at timestamptz
    not null default now(),

  constraint customers_number_not_empty
    check (
      length(trim(customer_number)) > 0
    ),

  constraint customers_display_name_not_empty
    check (
      length(trim(display_name)) > 0
    ),

  constraint customers_type_check
    check (
      customer_type in (
        'individual',
        'business'
      )
    ),

  constraint customers_status_check
    check (
      status in (
        'active',
        'inactive',
        'blocked'
      )
    ),

  constraint customers_source_check
    check (
      source in (
        'internal',
        'hmshoponline',
        'dubaiwholesalehub',
        'import'
      )
    ),

  constraint customers_credit_limit_check
    check (
      credit_limit >= 0
    ),

  constraint customers_payment_terms_check
    check (
      payment_terms_days >= 0
    ),

  constraint customers_business_name_check
    check (
      customer_type <> 'business'
      or company_name is not null
    )
);


/* =========================================================
 * Customer Contacts
 * ========================================================= */

create table if not exists
  public.customer_contacts (
    id uuid primary key default gen_random_uuid(),

    customer_id uuid not null
      references public.customers(id)
      on delete cascade,

    contact_name text not null,

    job_title text,

    email text,
    phone text,
    whatsapp text,

    is_primary boolean
      not null default false,

    is_active boolean
      not null default true,

    notes text,

    created_at timestamptz
      not null default now(),

    updated_at timestamptz
      not null default now(),

    constraint customer_contacts_name_not_empty
      check (
        length(trim(contact_name)) > 0
      )
  );


/* =========================================================
 * Customer Addresses
 * ========================================================= */

create table if not exists
  public.customer_addresses (
    id uuid primary key default gen_random_uuid(),

    customer_id uuid not null
      references public.customers(id)
      on delete cascade,

    address_type text
      not null default 'shipping',

    address_name text,

    contact_name text,
    phone text,

    address_line_1 text not null,
    address_line_2 text,

    city text,
    state text,
    country text,
    postal_code text,

    is_default boolean
      not null default false,

    is_active boolean
      not null default true,

    delivery_instructions text,

    created_at timestamptz
      not null default now(),

    updated_at timestamptz
      not null default now(),

    constraint customer_addresses_type_check
      check (
        address_type in (
          'billing',
          'shipping',
          'both'
        )
      ),

    constraint customer_addresses_line_1_not_empty
      check (
        length(trim(address_line_1)) > 0
      )
  );


/* =========================================================
 * Customer Number Generator
 * ========================================================= */

create or replace function
  public.generate_customer_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  return
    'CUS-'
    || to_char(current_date, 'YYYY')
    || '-'
    || lpad(
      nextval(
        'public.customer_number_seq'
      )::text,
      6,
      '0'
    );
end;
$$;


/* =========================================================
 * Customer Number Trigger
 * ========================================================= */

create or replace function
  public.set_customer_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.customer_number is null
    or length(trim(new.customer_number)) = 0
  then
    new.customer_number :=
      public.generate_customer_number();
  end if;

  return new;
end;
$$;

drop trigger if exists
  set_customer_number
on public.customers;

create trigger set_customer_number
before insert
on public.customers
for each row
execute function
  public.set_customer_number();


/* =========================================================
 * Created / Updated User Trigger
 * ========================================================= */

create or replace function
  public.set_customer_user_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by :=
      coalesce(
        new.created_by,
        auth.uid()
      );

    new.updated_by :=
      coalesce(
        new.updated_by,
        auth.uid()
      );
  else
    new.updated_by :=
      auth.uid();
  end if;

  return new;
end;
$$;

drop trigger if exists
  set_customer_user_fields
on public.customers;

create trigger set_customer_user_fields
before insert or update
on public.customers
for each row
execute function
  public.set_customer_user_fields();


/* =========================================================
 * Updated At Triggers
 * ========================================================= */

create or replace function
  public.set_customer_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();

  return new;
end;
$$;

drop trigger if exists
  set_customers_updated_at
on public.customers;

create trigger set_customers_updated_at
before update
on public.customers
for each row
execute function
  public.set_customer_updated_at();


drop trigger if exists
  set_customer_contacts_updated_at
on public.customer_contacts;

create trigger set_customer_contacts_updated_at
before update
on public.customer_contacts
for each row
execute function
  public.set_customer_updated_at();


drop trigger if exists
  set_customer_addresses_updated_at
on public.customer_addresses;

create trigger set_customer_addresses_updated_at
before update
on public.customer_addresses
for each row
execute function
  public.set_customer_updated_at();


/* =========================================================
 * Indexes
 * ========================================================= */

create index if not exists
  customers_display_name_idx
on public.customers (
  display_name
);

create index if not exists
  customers_company_name_idx
on public.customers (
  company_name
);

create index if not exists
  customers_email_idx
on public.customers (
  email
);

create index if not exists
  customers_phone_idx
on public.customers (
  phone
);

create index if not exists
  customers_status_idx
on public.customers (
  status
);

create index if not exists
  customers_customer_type_idx
on public.customers (
  customer_type
);

create index if not exists
  customers_source_idx
on public.customers (
  source
);

create index if not exists
  customers_created_at_idx
on public.customers (
  created_at desc
);


create index if not exists
  customer_contacts_customer_id_idx
on public.customer_contacts (
  customer_id
);

create index if not exists
  customer_contacts_is_primary_idx
on public.customer_contacts (
  customer_id,
  is_primary
);


create index if not exists
  customer_addresses_customer_id_idx
on public.customer_addresses (
  customer_id
);

create index if not exists
  customer_addresses_type_idx
on public.customer_addresses (
  customer_id,
  address_type
);

create index if not exists
  customer_addresses_default_idx
on public.customer_addresses (
  customer_id,
  is_default
);


/* =========================================================
 * Prevent Multiple Primary Contacts
 * ========================================================= */

create unique index if not exists
  customer_contacts_one_primary_idx
on public.customer_contacts (
  customer_id
)
where is_primary = true;


/* =========================================================
 * Row-Level Security
 * ========================================================= */

alter table public.customers
  enable row level security;

alter table public.customer_contacts
  enable row level security;

alter table public.customer_addresses
  enable row level security;


/* =========================================================
 * Customer Policies
 * ========================================================= */

drop policy if exists
  "Authenticated users can view customers"
on public.customers;

create policy
  "Authenticated users can view customers"
on public.customers
for select
to authenticated
using (true);


drop policy if exists
  "Authenticated users can create customers"
on public.customers;

create policy
  "Authenticated users can create customers"
on public.customers
for insert
to authenticated
with check (true);


drop policy if exists
  "Authenticated users can update customers"
on public.customers;

create policy
  "Authenticated users can update customers"
on public.customers
for update
to authenticated
using (true)
with check (true);


/* =========================================================
 * Customer Contact Policies
 * ========================================================= */

drop policy if exists
  "Authenticated users can view customer contacts"
on public.customer_contacts;

create policy
  "Authenticated users can view customer contacts"
on public.customer_contacts
for select
to authenticated
using (true);


drop policy if exists
  "Authenticated users can create customer contacts"
on public.customer_contacts;

create policy
  "Authenticated users can create customer contacts"
on public.customer_contacts
for insert
to authenticated
with check (true);


drop policy if exists
  "Authenticated users can update customer contacts"
on public.customer_contacts;

create policy
  "Authenticated users can update customer contacts"
on public.customer_contacts
for update
to authenticated
using (true)
with check (true);


drop policy if exists
  "Authenticated users can delete customer contacts"
on public.customer_contacts;

create policy
  "Authenticated users can delete customer contacts"
on public.customer_contacts
for delete
to authenticated
using (true);


/* =========================================================
 * Customer Address Policies
 * ========================================================= */

drop policy if exists
  "Authenticated users can view customer addresses"
on public.customer_addresses;

create policy
  "Authenticated users can view customer addresses"
on public.customer_addresses
for select
to authenticated
using (true);


drop policy if exists
  "Authenticated users can create customer addresses"
on public.customer_addresses;

create policy
  "Authenticated users can create customer addresses"
on public.customer_addresses
for insert
to authenticated
with check (true);


drop policy if exists
  "Authenticated users can update customer addresses"
on public.customer_addresses;

create policy
  "Authenticated users can update customer addresses"
on public.customer_addresses
for update
to authenticated
using (true)
with check (true);


drop policy if exists
  "Authenticated users can delete customer addresses"
on public.customer_addresses;

create policy
  "Authenticated users can delete customer addresses"
on public.customer_addresses
for delete
to authenticated
using (true);


/* =========================================================
 * Function Permissions
 * ========================================================= */

revoke all
on function
  public.generate_customer_number()
from public;

grant execute
on function
  public.generate_customer_number()
to authenticated;