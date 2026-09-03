-- ============================================================
-- 176_create_sales_invoice_documents.sql
--
-- Sales Invoice document identity / presentation layer.
--
-- IMPORTANT:
-- - Sales Orders remain the authoritative commercial/accounting source.
-- - This table does NOT create revenue, receivables, VAT, inventory,
--   payment, delivery, or General Ledger postings.
-- - One invoice document per Sales Order.
-- ============================================================


-- ============================================================
-- 1. Invoice number sequence
-- ============================================================

create sequence if not exists
  public.sales_invoice_number_seq
  start with 1
  increment by 1
  minvalue 1
  no maxvalue
  cache 1;


-- ============================================================
-- 2. Sales invoice documents
-- ============================================================

create table if not exists
  public.sales_invoice_documents
(
  id uuid primary key
    default gen_random_uuid(),

  sales_order_id uuid not null
    references public.sales_orders(id)
    on delete restrict,

  invoice_number text not null,

  invoice_date date not null
    default current_date,

  template_type text not null
    default 'uae_tax',

  status text not null
    default 'issued',

  display_settings jsonb not null
    default '{}'::jsonb,

  created_by uuid,
  updated_by uuid,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint sales_invoice_documents_sales_order_unique
    unique (sales_order_id),

  constraint sales_invoice_documents_invoice_number_unique
    unique (invoice_number),

  constraint sales_invoice_documents_invoice_number_not_blank
    check (
      length(trim(invoice_number)) > 0
    ),

  constraint sales_invoice_documents_template_type_check
    check (
      template_type in (
        'uae_tax',
        'simple',
        'export'
      )
    ),

  constraint sales_invoice_documents_status_check
    check (
      status in (
        'issued',
        'cancelled'
      )
    ),

  constraint sales_invoice_documents_display_settings_object_check
    check (
      jsonb_typeof(display_settings) = 'object'
    )
);


-- ============================================================
-- 3. Generate invoice number
--
-- Format:
-- INV-2026-000001
--
-- Sequence is intentionally independent from Sales Orders.
-- ============================================================

create or replace function
  public.generate_sales_invoice_number()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_number bigint;
begin
  v_number :=
    nextval(
      'public.sales_invoice_number_seq'
    );

  return
    'INV-' ||
    to_char(
      current_date,
      'YYYY'
    ) ||
    '-' ||
    lpad(
      v_number::text,
      6,
      '0'
    );
end;
$$;


-- ============================================================
-- 4. Automatically assign invoice number
-- ============================================================

create or replace function
  public.set_sales_invoice_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.invoice_number is null
     or length(trim(new.invoice_number)) = 0
  then
    new.invoice_number :=
      public.generate_sales_invoice_number();
  end if;

  return new;
end;
$$;


drop trigger if exists
  set_sales_invoice_number
on public.sales_invoice_documents;

create trigger
  set_sales_invoice_number
before insert
on public.sales_invoice_documents
for each row
execute function
  public.set_sales_invoice_number();


-- ============================================================
-- 5. updated_at maintenance
-- ============================================================

create or replace function
  public.set_sales_invoice_document_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();

  return new;
end;
$$;


drop trigger if exists
  set_sales_invoice_document_updated_at
on public.sales_invoice_documents;

create trigger
  set_sales_invoice_document_updated_at
before update
on public.sales_invoice_documents
for each row
execute function
  public.set_sales_invoice_document_updated_at();


-- ============================================================
-- 6. Protect document identity
--
-- Once created:
-- - linked Sales Order cannot change
-- - invoice number cannot change
--
-- Presentation settings/date/status may still be updated.
-- ============================================================

create or replace function
  public.protect_sales_invoice_document_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.sales_order_id
       is distinct from old.sales_order_id
  then
    raise exception
      'Sales invoice sales order cannot be changed.';
  end if;

  if new.invoice_number
       is distinct from old.invoice_number
  then
    raise exception
      'Sales invoice number cannot be changed.';
  end if;

  return new;
end;
$$;


drop trigger if exists
  protect_sales_invoice_document_identity
on public.sales_invoice_documents;

create trigger
  protect_sales_invoice_document_identity
before update
on public.sales_invoice_documents
for each row
execute function
  public.protect_sales_invoice_document_identity();


-- ============================================================
-- 7. Indexes
-- ============================================================

create index if not exists
  sales_invoice_documents_invoice_date_idx
on public.sales_invoice_documents (
  invoice_date desc
);

create index if not exists
  sales_invoice_documents_status_idx
on public.sales_invoice_documents (
  status
);


-- ============================================================
-- 8. Row Level Security
-- ============================================================

alter table
  public.sales_invoice_documents
enable row level security;


drop policy if exists
  "Authenticated users can view sales invoice documents"
on public.sales_invoice_documents;

create policy
  "Authenticated users can view sales invoice documents"
on public.sales_invoice_documents
for select
to authenticated
using (true);


drop policy if exists
  "Authenticated users can create sales invoice documents"
on public.sales_invoice_documents;

create policy
  "Authenticated users can create sales invoice documents"
on public.sales_invoice_documents
for insert
to authenticated
with check (true);


drop policy if exists
  "Authenticated users can update sales invoice documents"
on public.sales_invoice_documents;

create policy
  "Authenticated users can update sales invoice documents"
on public.sales_invoice_documents
for update
to authenticated
using (true)
with check (true);


-- Intentionally no DELETE policy.
-- Issued invoice documents should not be casually deleted.


-- ============================================================
-- 9. Function permissions
-- ============================================================

revoke all on function
  public.generate_sales_invoice_number()
from public;

grant execute on function
  public.generate_sales_invoice_number()
to authenticated;


revoke all on function
  public.set_sales_invoice_number()
from public;

grant execute on function
  public.set_sales_invoice_number()
to authenticated;


revoke all on function
  public.set_sales_invoice_document_updated_at()
from public;

grant execute on function
  public.set_sales_invoice_document_updated_at()
to authenticated;


revoke all on function
  public.protect_sales_invoice_document_identity()
from public;

grant execute on function
  public.protect_sales_invoice_document_identity()
to authenticated;


-- ============================================================
-- 10. Sequence permissions
-- ============================================================

grant usage, select
on sequence
  public.sales_invoice_number_seq
to authenticated;