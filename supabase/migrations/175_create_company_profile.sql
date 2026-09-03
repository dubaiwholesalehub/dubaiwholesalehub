/*
 * HM ERP
 * Company Profile Foundation
 *
 * Creates the authoritative company identity used by:
 *   - Sales invoices
 *   - Quotations
 *   - Delivery notes
 *   - Customer statements
 *   - Purchase documents
 *   - Other ERP print documents
 *
 * Important:
 *   Document visibility / invoice formatting is NOT stored here.
 *   Print templates decide which company fields are displayed.
 */


/* =========================================================
 * Company Profile
 * ========================================================= */

create table if not exists public.company_profile (
  id uuid primary key default gen_random_uuid(),

  legal_name text not null,
  trade_name text,
  arabic_name text,

  tax_registration_number text,
  trade_license_number text,

  phone text,
  whatsapp text,
  email text,
  website text,

  address_line_1 text,
  address_line_2 text,
  city text,
  state text,
  country text not null default 'United Arab Emirates',
  postal_code text,
  po_box text,

  logo_path text,

  document_footer text,

  bank_name text,
  bank_account_name text,
  bank_account_number text,
  bank_iban text,
  bank_swift_code text,

  created_by uuid,
  updated_by uuid,

  created_at timestamptz
    not null default now(),

  updated_at timestamptz
    not null default now(),

  constraint company_profile_legal_name_not_empty
    check (
      length(trim(legal_name)) > 0
    ),

  constraint company_profile_country_not_empty
    check (
      length(trim(country)) > 0
    )
);


/* =========================================================
 * Single Company Profile Guard
 *
 * HM ERP currently operates one legal company profile.
 * This unique expression index prevents multiple rows while
 * still allowing the table to grow later if architecture changes.
 * ========================================================= */

create unique index if not exists
  company_profile_single_row_idx
on public.company_profile ((true));


/* =========================================================
 * Updated At Function
 * ========================================================= */

create or replace function
  public.set_company_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();

  return new;
end;
$$;


/* =========================================================
 * Updated At Trigger
 * ========================================================= */

drop trigger if exists
  set_company_profile_updated_at
on public.company_profile;

create trigger set_company_profile_updated_at
before update
on public.company_profile
for each row
execute function
  public.set_company_profile_updated_at();


/* =========================================================
 * Row-Level Security
 * ========================================================= */

alter table public.company_profile
  enable row level security;


/* =========================================================
 * Company Profile Policies
 * ========================================================= */

drop policy if exists
  "Authenticated users can view company profile"
on public.company_profile;

create policy
  "Authenticated users can view company profile"
on public.company_profile
for select
to authenticated
using (true);


drop policy if exists
  "Authenticated users can create company profile"
on public.company_profile;

create policy
  "Authenticated users can create company profile"
on public.company_profile
for insert
to authenticated
with check (true);


drop policy if exists
  "Authenticated users can update company profile"
on public.company_profile;

create policy
  "Authenticated users can update company profile"
on public.company_profile
for update
to authenticated
using (true)
with check (true);


/* =========================================================
 * Function Permissions
 * ========================================================= */

revoke all
on function
  public.set_company_profile_updated_at()
from public;

grant execute
on function
  public.set_company_profile_updated_at()
to authenticated;