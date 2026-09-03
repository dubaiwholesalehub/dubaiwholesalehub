-- ============================================================
-- 179_add_sales_invoice_historical_snapshots.sql
--
-- Historical seller / buyer snapshots for Sales Invoice.
--
-- IMPORTANT:
-- - Sales Orders remain the authoritative commercial/accounting source.
-- - These snapshots are document-history only.
-- - They do NOT create or modify:
--   revenue, receivables, VAT accounting, GL,
--   inventory, delivery, payments, or customer/company master data.
-- ============================================================


-- ============================================================
-- 1. Snapshot columns
-- ============================================================

alter table public.sales_invoice_documents
add column if not exists seller_snapshot jsonb,
add column if not exists buyer_snapshot jsonb;


-- ============================================================
-- 2. Snapshot validation
-- ============================================================

alter table public.sales_invoice_documents
drop constraint if exists
  sales_invoice_documents_seller_snapshot_object_check;

alter table public.sales_invoice_documents
add constraint
  sales_invoice_documents_seller_snapshot_object_check
check (
  seller_snapshot is null
  or jsonb_typeof(seller_snapshot) = 'object'
);


alter table public.sales_invoice_documents
drop constraint if exists
  sales_invoice_documents_buyer_snapshot_object_check;

alter table public.sales_invoice_documents
add constraint
  sales_invoice_documents_buyer_snapshot_object_check
check (
  buyer_snapshot is null
  or jsonb_typeof(buyer_snapshot) = 'object'
);


-- ============================================================
-- 3. Protect historical snapshots
--
-- Once either snapshot has been written, it cannot be changed
-- or cleared through normal UPDATE operations.
--
-- This ensures old invoices do not change when Company Profile
-- or Customer Master is later edited.
-- ============================================================

create or replace function
  public.protect_sales_invoice_historical_snapshots()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.seller_snapshot is not null
     and new.seller_snapshot
       is distinct from old.seller_snapshot
  then
    raise exception
      'Sales invoice seller snapshot cannot be changed once captured.';
  end if;

  if old.buyer_snapshot is not null
     and new.buyer_snapshot
       is distinct from old.buyer_snapshot
  then
    raise exception
      'Sales invoice buyer snapshot cannot be changed once captured.';
  end if;

  return new;
end;
$$;


drop trigger if exists
  protect_sales_invoice_historical_snapshots
on public.sales_invoice_documents;

create trigger
  protect_sales_invoice_historical_snapshots
before update
on public.sales_invoice_documents
for each row
execute function
  public.protect_sales_invoice_historical_snapshots();


-- ============================================================
-- 4. Documentation
-- ============================================================

comment on column
  public.sales_invoice_documents.seller_snapshot
is
  'Immutable historical seller/company presentation snapshot captured when the invoice document is first created.';


comment on column
  public.sales_invoice_documents.buyer_snapshot
is
  'Immutable historical buyer/customer presentation snapshot captured when the invoice document is first created.';


comment on function
  public.protect_sales_invoice_historical_snapshots()
is
  'Prevents seller_snapshot and buyer_snapshot from being modified after their initial capture.';


-- ============================================================
-- 5. Function permissions
-- ============================================================

revoke all on function
  public.protect_sales_invoice_historical_snapshots()
from public;

grant execute on function
  public.protect_sales_invoice_historical_snapshots()
to authenticated;