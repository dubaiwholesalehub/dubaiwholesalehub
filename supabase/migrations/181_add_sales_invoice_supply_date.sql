-- ============================================================
-- Migration 181
-- Add Date of Supply to Sales Invoice Documents
--
-- Purpose:
--   Store the invoice's Date of Supply independently from the
--   invoice issue date for invoice presentation/compliance.
--
-- Important:
--   - Document/presentation field only.
--   - No accounting postings.
--   - No VAT journal changes.
--   - No inventory changes.
--   - No Sales Order changes.
-- ============================================================


-- ============================================================
-- 1. Add supply date
-- ============================================================

alter table public.sales_invoice_documents
add column if not exists supply_date date;


-- ============================================================
-- 2. Backfill existing invoice documents
--
-- Existing invoices use invoice_date as the safe historical
-- default when no separate supply date was previously stored.
-- ============================================================

update public.sales_invoice_documents
set supply_date = invoice_date
where supply_date is null;


-- ============================================================
-- 3. Require supply date for every invoice document
-- ============================================================

alter table public.sales_invoice_documents
alter column supply_date set not null;


-- ============================================================
-- 4. Default for direct/new inserts
--
-- Application code will explicitly choose the appropriate
-- supply date. This default protects other insert paths.
-- ============================================================

alter table public.sales_invoice_documents
alter column supply_date set default current_date;


-- ============================================================
-- 5. Documentation
-- ============================================================

comment on column public.sales_invoice_documents.supply_date
is
'Date of supply shown on the sales invoice. Document/presentation field only; does not independently create or modify accounting, VAT, inventory, payment, or delivery postings.';