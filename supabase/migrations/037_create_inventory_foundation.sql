/*
 * Milestone 8.1
 * Inventory Foundation
 *
 * Tables:
 *   1. warehouse_stock
 *   2. inventory_transactions
 *   3. inventory_transaction_items
 *
 * The inventory transaction table is the permanent audit trail.
 * The warehouse_stock table stores the current stock balance.
 */


/* =========================================================
 * Inventory transaction number sequence
 * Example: INV-2026-000001
 * ========================================================= */

create sequence if not exists public.inventory_transaction_number_seq
  start with 1
  increment by 1
  minvalue 1
  no maxvalue
  cache 1;


/* =========================================================
 * Warehouse Stock
 *
 * One row for each warehouse + product combination.
 * ========================================================= */

create table if not exists public.warehouse_stock (
  id uuid primary key default gen_random_uuid(),

  warehouse_id uuid not null
    references public.warehouses(id)
    on delete restrict,

  product_id uuid not null
    references public.products(id)
    on delete restrict,

  quantity_on_hand numeric(18, 4) not null default 0,

  quantity_reserved numeric(18, 4) not null default 0,

  quantity_available numeric(18, 4)
    generated always as (
      quantity_on_hand - quantity_reserved
    ) stored,

  average_unit_cost numeric(18, 4) not null default 0,

  last_transaction_at timestamptz,
  last_counted_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint warehouse_stock_unique_product
    unique (
      warehouse_id,
      product_id
    ),

  constraint warehouse_stock_quantity_on_hand_nonnegative
    check (
      quantity_on_hand >= 0
    ),

  constraint warehouse_stock_quantity_reserved_nonnegative
    check (
      quantity_reserved >= 0
    ),

  constraint warehouse_stock_reserved_not_above_on_hand
    check (
      quantity_reserved <= quantity_on_hand
    ),

  constraint warehouse_stock_average_unit_cost_nonnegative
    check (
      average_unit_cost >= 0
    )
);

create index if not exists warehouse_stock_warehouse_id_idx
  on public.warehouse_stock (
    warehouse_id
  );

create index if not exists warehouse_stock_product_id_idx
  on public.warehouse_stock (
    product_id
  );

create index if not exists warehouse_stock_available_quantity_idx
  on public.warehouse_stock (
    quantity_available
  );

create index if not exists warehouse_stock_last_transaction_idx
  on public.warehouse_stock (
    last_transaction_at desc
  );


/* =========================================================
 * Inventory Transaction Header
 *
 * Every inventory movement must have one transaction header.
 * Posted transactions should never be edited or deleted.
 * ========================================================= */

create table if not exists public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),

  transaction_number text not null unique,

  transaction_type text not null,

  status text not null default 'draft',

  transaction_date date not null default current_date,

  warehouse_id uuid not null
    references public.warehouses(id)
    on delete restrict,

  related_warehouse_id uuid
    references public.warehouses(id)
    on delete restrict,

  reference_type text,
  reference_id uuid,
  reference_number text,

  description text,
  internal_notes text,

  posted_at timestamptz,
  reversed_at timestamptz,
  cancelled_at timestamptz,

  created_by uuid
    references auth.users(id)
    on delete set null,

  posted_by uuid
    references auth.users(id)
    on delete set null,

  reversed_by uuid
    references auth.users(id)
    on delete set null,

  cancelled_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint inventory_transactions_number_not_empty
    check (
      length(trim(transaction_number)) > 0
    ),

  constraint inventory_transactions_type_check
    check (
      transaction_type in (
        'goods_receipt',
        'sales_issue',
        'transfer_out',
        'transfer_in',
        'adjustment_in',
        'adjustment_out',
        'customer_return',
        'supplier_return',
        'opening_balance',
        'stock_count'
      )
    ),

  constraint inventory_transactions_status_check
    check (
      status in (
        'draft',
        'posted',
        'reversed',
        'cancelled'
      )
    ),

  constraint inventory_transactions_reference_consistency
    check (
      (
        reference_type is null
        and reference_id is null
      )
      or
      (
        reference_type is not null
        and reference_id is not null
      )
    ),

  constraint inventory_transactions_related_warehouse_valid
    check (
      related_warehouse_id is null
      or related_warehouse_id <> warehouse_id
    ),

  constraint inventory_transactions_posted_fields
    check (
      status <> 'posted'
      or posted_at is not null
    ),

  constraint inventory_transactions_reversed_fields
    check (
      status <> 'reversed'
      or reversed_at is not null
    ),

  constraint inventory_transactions_cancelled_fields
    check (
      status <> 'cancelled'
      or cancelled_at is not null
    )
);

create index if not exists inventory_transactions_type_idx
  on public.inventory_transactions (
    transaction_type
  );

create index if not exists inventory_transactions_status_idx
  on public.inventory_transactions (
    status
  );

create index if not exists inventory_transactions_warehouse_idx
  on public.inventory_transactions (
    warehouse_id
  );

create index if not exists inventory_transactions_date_idx
  on public.inventory_transactions (
    transaction_date desc
  );

create index if not exists inventory_transactions_reference_idx
  on public.inventory_transactions (
    reference_type,
    reference_id
  );

create index if not exists inventory_transactions_created_at_idx
  on public.inventory_transactions (
    created_at desc
  );

/*
 * Prevent the same source document from being posted twice.
 *
 * Example:
 * One posted goods_receipt transaction for each GRN.
 */
create unique index if not exists
  inventory_transactions_posted_reference_unique
on public.inventory_transactions (
  transaction_type,
  reference_type,
  reference_id
)
where
  status = 'posted'
  and reference_type is not null
  and reference_id is not null;


/* =========================================================
 * Inventory Transaction Items
 *
 * quantity_change is signed:
 *
 *   Positive number = stock enters the warehouse
 *   Negative number = stock leaves the warehouse
 *
 * Examples:
 *
 *   Goods receipt:      +36
 *   Sales issue:        -10
 *   Customer return:     +2
 *   Supplier return:     -3
 * ========================================================= */

create table if not exists public.inventory_transaction_items (
  id uuid primary key default gen_random_uuid(),

  inventory_transaction_id uuid not null
    references public.inventory_transactions(id)
    on delete restrict,

  warehouse_id uuid not null
    references public.warehouses(id)
    on delete restrict,

  product_id uuid not null
    references public.products(id)
    on delete restrict,

  line_number integer not null,

  quantity_change numeric(18, 4) not null,

  unit_cost numeric(18, 4) not null default 0,

  total_cost numeric(18, 4)
    generated always as (
      abs(quantity_change) * unit_cost
    ) stored,

  source_document_item_id uuid,

  batch_number text,
  lot_number text,
  serial_number text,

  manufacturing_date date,
  expiry_date date,

  notes text,

  created_at timestamptz not null default now(),

  constraint inventory_transaction_items_line_positive
    check (
      line_number > 0
    ),

  constraint inventory_transaction_items_quantity_not_zero
    check (
      quantity_change <> 0
    ),

  constraint inventory_transaction_items_unit_cost_nonnegative
    check (
      unit_cost >= 0
    ),

  constraint inventory_transaction_items_date_valid
    check (
      manufacturing_date is null
      or expiry_date is null
      or expiry_date >= manufacturing_date
    ),

  constraint inventory_transaction_items_unique_line
    unique (
      inventory_transaction_id,
      line_number
    )
);

create index if not exists inventory_transaction_items_transaction_idx
  on public.inventory_transaction_items (
    inventory_transaction_id
  );

create index if not exists inventory_transaction_items_warehouse_idx
  on public.inventory_transaction_items (
    warehouse_id
  );

create index if not exists inventory_transaction_items_product_idx
  on public.inventory_transaction_items (
    product_id
  );

create index if not exists inventory_transaction_items_source_item_idx
  on public.inventory_transaction_items (
    source_document_item_id
  );

create index if not exists inventory_transaction_items_batch_idx
  on public.inventory_transaction_items (
    batch_number
  )
  where batch_number is not null;

create index if not exists inventory_transaction_items_expiry_idx
  on public.inventory_transaction_items (
    expiry_date
  )
  where expiry_date is not null;