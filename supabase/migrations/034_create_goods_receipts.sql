create table if not exists public.goods_receipts (
  id uuid primary key default gen_random_uuid(),

  receipt_number text not null unique,

  purchase_order_id uuid not null
    references public.purchase_orders(id)
    on delete restrict,

  supplier_id uuid not null
    references public.suppliers(id)
    on delete restrict,

  warehouse_id uuid not null
    references public.warehouses(id)
    on delete restrict,

  status text not null default 'draft',

  supplier_delivery_note_number text,
  supplier_invoice_number text,
  carrier_name text,
  vehicle_number text,
  tracking_number text,

  received_date date,
  received_at timestamptz,

  inspected_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,

  internal_notes text,
  supplier_notes text,

  created_by uuid,
  received_by uuid,
  inspected_by uuid,
  completed_by uuid,
  cancelled_by uuid,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint goods_receipts_number_not_empty
    check (length(trim(receipt_number)) > 0),

  constraint goods_receipts_status_check
    check (
      status in (
        'draft',
        'receiving',
        'partially_received',
        'received',
        'inspected',
        'completed',
        'cancelled'
      )
    )
);

create index if not exists goods_receipts_purchase_order_id_idx
  on public.goods_receipts (purchase_order_id);

create index if not exists goods_receipts_supplier_id_idx
  on public.goods_receipts (supplier_id);

create index if not exists goods_receipts_warehouse_id_idx
  on public.goods_receipts (warehouse_id);

create index if not exists goods_receipts_status_idx
  on public.goods_receipts (status);

create index if not exists goods_receipts_received_date_idx
  on public.goods_receipts (received_date);

create index if not exists goods_receipts_created_at_idx
  on public.goods_receipts (created_at desc);