/*
 * =========================================================
 * 068 — Quick Purchases
 *
 * Fast purchase-entry foundation for:
 * - local supplier purchases
 * - purchases without formal supplier registration
 * - VAT / no-VAT / pending-document cases
 * - paid / partial / credit purchases
 * - linkage to inventory transaction
 *
 * Inventory quantities continue to be posted through the
 * existing post_local_purchase_inventory() workflow.
 * =========================================================
 */


/* =========================================================
 * Quick Purchase Number Sequence
 * ========================================================= */

create sequence if not exists
  public.quick_purchase_number_seq;


/* =========================================================
 * Quick Purchases
 * ========================================================= */

create table if not exists
  public.quick_purchases
(
  id uuid primary key
    default gen_random_uuid(),

  purchase_number text not null unique,

  purchase_date date not null
    default current_date,

  supplier_id uuid
    references public.suppliers(id)
    on delete restrict,

  store_name text,

  warehouse_id uuid not null
    references public.warehouses(id)
    on delete restrict,

  inventory_transaction_id uuid
    references public.inventory_transactions(id)
    on delete restrict,

  supplier_invoice_number text,

  supplier_invoice_date date,

  supplier_trn text,

  currency_code text not null
    default 'AED',

  exchange_rate numeric(18, 6)
    not null
    default 1,

  /*
   * VAT treatment:
   *
   * standard_vat
   *   VAT charged with acceptable supporting document.
   *
   * no_vat
   *   Supplier did not charge VAT.
   *
   * vat_pending
   *   VAT was charged but supporting evidence/document
   *   is still pending review.
   *
   * reverse_charge
   *   Import / reverse-charge transaction requiring
   *   separate VAT accounting treatment.
   *
   * review_required
   *   Tax treatment has not yet been determined.
   */

  tax_treatment text not null
    default 'no_vat',

  tax_invoice_verified boolean not null
    default false,

  tax_invoice_verified_at
    timestamptz,

  subtotal numeric(18, 2)
    not null
    default 0,

  discount_amount numeric(18, 2)
    not null
    default 0,

  tax_amount numeric(18, 2)
    not null
    default 0,

  recoverable_tax_amount numeric(18, 2)
    not null
    default 0,

  pending_tax_amount numeric(18, 2)
    not null
    default 0,

  grand_total numeric(18, 2)
    not null
    default 0,

  paid_amount numeric(18, 2)
    not null
    default 0,

  balance_due numeric(18, 2)
    not null
    default 0,

  payment_status text not null
    default 'unpaid',

  payment_method text,

  payment_reference text,

  notes text,

  status text not null
    default 'posted',

  posted_at timestamptz
    default now(),

  cancelled_at timestamptz,

  cancellation_reason text,

  created_by uuid
    references auth.users(id)
    on delete set null,

  updated_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint quick_purchases_tax_treatment_check
    check (
      tax_treatment in (
        'standard_vat',
        'no_vat',
        'vat_pending',
        'reverse_charge',
        'review_required'
      )
    ),

  constraint quick_purchases_status_check
    check (
      status in (
        'posted',
        'cancelled'
      )
    ),

  constraint quick_purchases_payment_status_check
    check (
      payment_status in (
        'unpaid',
        'partially_paid',
        'paid'
      )
    ),

  constraint quick_purchases_subtotal_check
    check (
      subtotal >= 0
    ),

  constraint quick_purchases_discount_check
    check (
      discount_amount >= 0
    ),

  constraint quick_purchases_tax_check
    check (
      tax_amount >= 0
    ),

  constraint quick_purchases_recoverable_tax_check
    check (
      recoverable_tax_amount >= 0
    ),

  constraint quick_purchases_pending_tax_check
    check (
      pending_tax_amount >= 0
    ),

  constraint quick_purchases_total_check
    check (
      grand_total >= 0
    ),

  constraint quick_purchases_paid_check
    check (
      paid_amount >= 0
    ),

  constraint quick_purchases_balance_check
    check (
      balance_due >= 0
    ),

  constraint quick_purchases_exchange_rate_check
    check (
      exchange_rate > 0
    )
);


/* =========================================================
 * Quick Purchase Items
 * ========================================================= */

create table if not exists
  public.quick_purchase_items
(
  id uuid primary key
    default gen_random_uuid(),

  quick_purchase_id uuid not null
    references public.quick_purchases(id)
    on delete restrict,

  line_number integer not null,

  product_id uuid not null
    references public.products(id)
    on delete restrict,

  quantity numeric(18, 4)
    not null,

  unit_cost numeric(18, 4)
    not null,

  line_subtotal numeric(18, 2)
    not null,

  tax_percentage numeric(8, 4)
    not null
    default 0,

  tax_amount numeric(18, 2)
    not null
    default 0,

  line_total numeric(18, 2)
    not null,

  notes text,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint quick_purchase_items_line_unique
    unique (
      quick_purchase_id,
      line_number
    ),

  constraint quick_purchase_items_product_unique
    unique (
      quick_purchase_id,
      product_id
    ),

  constraint quick_purchase_items_quantity_check
    check (
      quantity > 0
    ),

  constraint quick_purchase_items_unit_cost_check
    check (
      unit_cost >= 0
    ),

  constraint quick_purchase_items_subtotal_check
    check (
      line_subtotal >= 0
    ),

  constraint quick_purchase_items_tax_percentage_check
    check (
      tax_percentage >= 0
      and tax_percentage <= 100
    ),

  constraint quick_purchase_items_tax_check
    check (
      tax_amount >= 0
    ),

  constraint quick_purchase_items_total_check
    check (
      line_total >= 0
    )
);


/* =========================================================
 * Indexes
 * ========================================================= */

create index if not exists
  quick_purchases_supplier_idx
on public.quick_purchases (
  supplier_id
);


create index if not exists
  quick_purchases_warehouse_idx
on public.quick_purchases (
  warehouse_id
);


create index if not exists
  quick_purchases_date_idx
on public.quick_purchases (
  purchase_date desc
);


create index if not exists
  quick_purchases_payment_status_idx
on public.quick_purchases (
  payment_status
);


create index if not exists
  quick_purchases_tax_treatment_idx
on public.quick_purchases (
  tax_treatment
);


create index if not exists
  quick_purchase_items_purchase_idx
on public.quick_purchase_items (
  quick_purchase_id
);


create index if not exists
  quick_purchase_items_product_idx
on public.quick_purchase_items (
  product_id
);


/* =========================================================
 * Updated At Trigger
 * ========================================================= */

drop trigger if exists
  set_quick_purchases_updated_at
on public.quick_purchases;

create trigger
  set_quick_purchases_updated_at
before update
on public.quick_purchases
for each row
execute function
  public.set_sales_updated_at();


drop trigger if exists
  set_quick_purchase_items_updated_at
on public.quick_purchase_items;

create trigger
  set_quick_purchase_items_updated_at
before update
on public.quick_purchase_items
for each row
execute function
  public.set_sales_updated_at();


/* =========================================================
 * RLS
 * ========================================================= */

alter table
  public.quick_purchases
enable row level security;


alter table
  public.quick_purchase_items
enable row level security;


drop policy if exists
  "Management can manage quick purchases"
on public.quick_purchases;

create policy
  "Management can manage quick purchases"
on public.quick_purchases
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


drop policy if exists
  "Management can manage quick purchase items"
on public.quick_purchase_items;

create policy
  "Management can manage quick purchase items"
on public.quick_purchase_items
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


/* =========================================================
 * Grants
 * ========================================================= */

grant select,
      insert,
      update
on public.quick_purchases
to authenticated;


grant select,
      insert,
      update
on public.quick_purchase_items
to authenticated;


/* =========================================================
 * Comments
 * ========================================================= */

comment on table
  public.quick_purchases
is
  'Fast operational purchase documents linked to inventory transactions and designed for supplier payable and VAT accounting.';


comment on column
  public.quick_purchases.tax_treatment
is
  'Purchase VAT classification: standard_vat, no_vat, vat_pending, reverse_charge or review_required.';


comment on column
  public.quick_purchases.recoverable_tax_amount
is
  'Input VAT currently classified by the ERP as recoverable based on the selected treatment and verification state.';


comment on column
  public.quick_purchases.pending_tax_amount
is
  'VAT amount held pending document or tax-treatment verification and not yet classified as recoverable input VAT.';