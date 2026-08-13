/*
 * =========================================================
 * 062 — Harden Production RLS
 *
 * Purpose:
 * - Enable RLS on remaining exposed public tables
 * - Preserve public catalog reads where required
 * - Restrict internal ERP data to admins
 *
 * This migration does NOT modify data.
 * =========================================================
 */


/* =========================================================
 * Countries
 *
 * Public catalog needs country names/origin information.
 * Admin may manage full country records.
 * ========================================================= */

alter table public.countries
enable row level security;

drop policy if exists
  "Public can view active countries"
on public.countries;

create policy
  "Public can view active countries"
on public.countries
for select
to anon, authenticated
using (
  is_active = true
);

drop policy if exists
  "Admins can manage countries"
on public.countries;

create policy
  "Admins can manage countries"
on public.countries
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


/* =========================================================
 * Units
 *
 * Public catalog needs unit names such as PCS / CTN.
 * ========================================================= */

alter table public.units
enable row level security;

drop policy if exists
  "Public can view active units"
on public.units;

create policy
  "Public can view active units"
on public.units
for select
to anon, authenticated
using (
  is_active = true
);

drop policy if exists
  "Admins can manage units"
on public.units;

create policy
  "Admins can manage units"
on public.units
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


/* =========================================================
 * Subcategories
 *
 * Public category pages need active subcategories.
 * ========================================================= */

alter table public.subcategories
enable row level security;

drop policy if exists
  "Public can view active subcategories"
on public.subcategories;

create policy
  "Public can view active subcategories"
on public.subcategories
for select
to anon, authenticated
using (
  is_active = true
);

drop policy if exists
  "Admins can manage subcategories"
on public.subcategories;

create policy
  "Admins can manage subcategories"
on public.subcategories
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


/* =========================================================
 * Warehouses
 *
 * Internal ERP only.
 * ========================================================= */

alter table public.warehouses
enable row level security;

drop policy if exists
  "Admins can manage warehouses"
on public.warehouses;

create policy
  "Admins can manage warehouses"
on public.warehouses
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


/* =========================================================
 * Warehouse Stock
 *
 * Sensitive inventory information.
 * Never expose publicly.
 * ========================================================= */

alter table public.warehouse_stock
enable row level security;

drop policy if exists
  "Admins can manage warehouse stock"
on public.warehouse_stock;

create policy
  "Admins can manage warehouse stock"
on public.warehouse_stock
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


/* =========================================================
 * Goods Receipts
 *
 * Internal purchasing / receiving records.
 * ========================================================= */

alter table public.goods_receipts
enable row level security;

drop policy if exists
  "Admins can manage goods receipts"
on public.goods_receipts;

create policy
  "Admins can manage goods receipts"
on public.goods_receipts
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


/* =========================================================
 * Goods Receipt Items
 * ========================================================= */

alter table public.goods_receipt_items
enable row level security;

drop policy if exists
  "Admins can manage goods receipt items"
on public.goods_receipt_items;

create policy
  "Admins can manage goods receipt items"
on public.goods_receipt_items
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


/* =========================================================
 * Inventory Transactions
 *
 * Contains stock movement / costing information.
 * ========================================================= */

alter table public.inventory_transactions
enable row level security;

drop policy if exists
  "Admins can manage inventory transactions"
on public.inventory_transactions;

create policy
  "Admins can manage inventory transactions"
on public.inventory_transactions
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


/* =========================================================
 * Inventory Transaction Items
 * ========================================================= */

alter table public.inventory_transaction_items
enable row level security;

drop policy if exists
  "Admins can manage inventory transaction items"
on public.inventory_transaction_items;

create policy
  "Admins can manage inventory transaction items"
on public.inventory_transaction_items
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


/* =========================================================
 * Remove dangerous anonymous write privileges
 *
 * RLS remains the primary security boundary, but anonymous
 * users do not need direct write privileges on ERP tables.
 * ========================================================= */

revoke insert, update, delete, truncate
on all tables in schema public
from anon;


/* =========================================================
 * Remove unnecessary high-risk privileges
 *
 * Application clients do not need TRUNCATE or TRIGGER.
 * ========================================================= */

revoke truncate, trigger
on all tables in schema public
from authenticated;


/* =========================================================
 * End
 * ========================================================= */