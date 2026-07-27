create table if not exists public.goods_receipt_items (
  id uuid primary key default gen_random_uuid(),

  goods_receipt_id uuid not null
    references public.goods_receipts(id)
    on delete cascade,

  purchase_order_item_id uuid not null
    references public.purchase_order_items(id)
    on delete restrict,

  product_id uuid not null
    references public.products(id)
    on delete restrict,

  line_number integer not null,

  ordered_quantity numeric(18, 4) not null default 0,
  previously_received_quantity numeric(18, 4) not null default 0,
  receiving_quantity numeric(18, 4) not null default 0,

  accepted_quantity numeric(18, 4) not null default 0,
  rejected_quantity numeric(18, 4) not null default 0,
  damaged_quantity numeric(18, 4) not null default 0,

  unit_cost numeric(18, 4) not null default 0,

  batch_number text,
  lot_number text,
  serial_number text,

  manufacturing_date date,
  expiry_date date,

  inspection_status text not null default 'pending',
  rejection_reason text,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint goods_receipt_items_line_number_positive
    check (line_number > 0),

  constraint goods_receipt_items_ordered_quantity_nonnegative
    check (ordered_quantity >= 0),

  constraint goods_receipt_items_previously_received_nonnegative
    check (previously_received_quantity >= 0),

  constraint goods_receipt_items_receiving_quantity_nonnegative
    check (receiving_quantity >= 0),

  constraint goods_receipt_items_accepted_quantity_nonnegative
    check (accepted_quantity >= 0),

  constraint goods_receipt_items_rejected_quantity_nonnegative
    check (rejected_quantity >= 0),

  constraint goods_receipt_items_damaged_quantity_nonnegative
    check (damaged_quantity >= 0),

  constraint goods_receipt_items_unit_cost_nonnegative
    check (unit_cost >= 0),

  constraint goods_receipt_items_inspection_status_check
    check (
      inspection_status in (
        'pending',
        'accepted',
        'partially_accepted',
        'rejected'
      )
    ),

  constraint goods_receipt_items_quantity_breakdown_check
    check (
      accepted_quantity
      + rejected_quantity
      + damaged_quantity
      <= receiving_quantity
    ),

  constraint goods_receipt_items_unique_line
    unique (goods_receipt_id, line_number),

  constraint goods_receipt_items_unique_po_item
    unique (goods_receipt_id, purchase_order_item_id)
);

create index if not exists goods_receipt_items_receipt_id_idx
  on public.goods_receipt_items (goods_receipt_id);

create index if not exists goods_receipt_items_po_item_id_idx
  on public.goods_receipt_items (purchase_order_item_id);

create index if not exists goods_receipt_items_product_id_idx
  on public.goods_receipt_items (product_id);

create index if not exists goods_receipt_items_inspection_status_idx
  on public.goods_receipt_items (inspection_status);