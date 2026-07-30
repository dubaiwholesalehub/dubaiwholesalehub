/*
 * Milestone 9.6
 * Inventory Transfer Foundation
 *
 * This migration creates:
 *
 *   1. Inventory transfer number sequence
 *   2. Inventory transfers table
 *   3. Inventory transfer items table
 *   4. Transfer number generation function
 *   5. Automatic transfer number trigger
 *   6. Automatic updated_at triggers
 *   7. Database indexes
 *   8. Row Level Security policies
 *   9. Function permissions
 *
 * Important:
 *
 * This migration does not update warehouse stock directly.
 *
 * Stock movement will later be handled atomically by:
 *
 *   public.dispatch_inventory_transfer(uuid)
 *   public.receive_inventory_transfer(uuid)
 *
 * Those functions will create inventory transactions and update
 * warehouse stock using the existing inventory posting architecture.
 */


/* =========================================================
 * Inventory Transfer Number Sequence
 * ========================================================= */

create sequence if not exists
  public.inventory_transfer_number_seq
start with 1
increment by 1;


/* =========================================================
 * Inventory Transfers
 * ========================================================= */

create table if not exists public.inventory_transfers (
  id uuid primary key default gen_random_uuid(),

  /*
   * Populated automatically by the
   * set_inventory_transfer_number trigger.
   */

  transfer_number text unique,

  source_warehouse_id uuid not null
    references public.warehouses(id)
    on delete restrict,

  destination_warehouse_id uuid not null
    references public.warehouses(id)
    on delete restrict,

  transfer_date date not null default current_date,

  expected_arrival_date date,

  status text not null default 'draft',

  reference_number text,

  reason text,

  internal_notes text,

  approved_at timestamptz,
  dispatched_at timestamptz,
  received_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,

  created_by uuid,
  approved_by uuid,
  dispatched_by uuid,
  received_by uuid,
  completed_by uuid,
  cancelled_by uuid,

  cancellation_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint inventory_transfers_number_not_empty
    check (
      transfer_number is null
      or length(trim(transfer_number)) > 0
    ),

  constraint inventory_transfers_different_warehouses
    check (
      source_warehouse_id
      <> destination_warehouse_id
    ),

  constraint inventory_transfers_status_check
    check (
      status in (
        'draft',
        'approved',
        'dispatched',
        'in_transit',
        'received',
        'completed',
        'cancelled'
      )
    ),

  constraint inventory_transfers_expected_date_check
    check (
      expected_arrival_date is null
      or expected_arrival_date >= transfer_date
    )
);


/* =========================================================
 * Inventory Transfer Items
 * ========================================================= */

create table if not exists public.inventory_transfer_items (
  id uuid primary key default gen_random_uuid(),

  inventory_transfer_id uuid not null
    references public.inventory_transfers(id)
    on delete cascade,

  product_id uuid not null
    references public.products(id)
    on delete restrict,

  line_number integer not null,

  requested_quantity numeric(18, 4) not null default 0,

  dispatched_quantity numeric(18, 4) not null default 0,

  received_quantity numeric(18, 4) not null default 0,

  /*
   * Cost captured from the source warehouse when the
   * transfer is dispatched.
   */

  unit_cost numeric(18, 4) not null default 0,

  line_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint inventory_transfer_items_line_number_positive
    check (line_number > 0),

  constraint inventory_transfer_items_requested_quantity_positive
    check (requested_quantity > 0),

  constraint inventory_transfer_items_dispatched_quantity_non_negative
    check (dispatched_quantity >= 0),

  constraint inventory_transfer_items_received_quantity_non_negative
    check (received_quantity >= 0),

  constraint inventory_transfer_items_unit_cost_non_negative
    check (unit_cost >= 0),

  constraint inventory_transfer_items_dispatched_limit
    check (
      dispatched_quantity
      <= requested_quantity
    ),

  constraint inventory_transfer_items_received_limit
    check (
      received_quantity
      <= dispatched_quantity
    ),

  constraint inventory_transfer_items_unique_product
    unique (
      inventory_transfer_id,
      product_id
    ),

  constraint inventory_transfer_items_unique_line_number
    unique (
      inventory_transfer_id,
      line_number
    )
);


/* =========================================================
 * Indexes — Inventory Transfers
 * ========================================================= */

create index if not exists
  inventory_transfers_source_warehouse_id_idx
on public.inventory_transfers (
  source_warehouse_id
);

create index if not exists
  inventory_transfers_destination_warehouse_id_idx
on public.inventory_transfers (
  destination_warehouse_id
);

create index if not exists
  inventory_transfers_status_idx
on public.inventory_transfers (
  status
);

create index if not exists
  inventory_transfers_transfer_date_idx
on public.inventory_transfers (
  transfer_date desc
);

create index if not exists
  inventory_transfers_expected_arrival_date_idx
on public.inventory_transfers (
  expected_arrival_date
);

create index if not exists
  inventory_transfers_created_at_idx
on public.inventory_transfers (
  created_at desc
);


/* =========================================================
 * Indexes — Inventory Transfer Items
 * ========================================================= */

create index if not exists
  inventory_transfer_items_transfer_id_idx
on public.inventory_transfer_items (
  inventory_transfer_id
);

create index if not exists
  inventory_transfer_items_product_id_idx
on public.inventory_transfer_items (
  product_id
);


/* =========================================================
 * Generate Inventory Transfer Number
 *
 * Example:
 *
 *   TRF-2026-000001
 *   TRF-2026-000002
 * ========================================================= */

create or replace function
  public.generate_inventory_transfer_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sequence_number bigint;
begin
  v_sequence_number :=
    nextval(
      'public.inventory_transfer_number_seq'
    );

  return
    'TRF-'
    || to_char(current_date, 'YYYY')
    || '-'
    || lpad(
      v_sequence_number::text,
      6,
      '0'
    );
end;
$$;


/* =========================================================
 * Automatically Assign Transfer Number
 * ========================================================= */

create or replace function
  public.set_inventory_transfer_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.transfer_number is null
     or length(trim(new.transfer_number)) = 0 then

    new.transfer_number :=
      public.generate_inventory_transfer_number();

  end if;

  return new;
end;
$$;


drop trigger if exists
  set_inventory_transfer_number
on public.inventory_transfers;


create trigger
  set_inventory_transfer_number
before insert
on public.inventory_transfers
for each row
execute function
  public.set_inventory_transfer_number();


/* =========================================================
 * Automatically Set created_by
 *
 * This sets created_by from the logged-in Supabase user when
 * the application does not explicitly provide it.
 * ========================================================= */

create or replace function
  public.set_inventory_transfer_created_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;

  return new;
end;
$$;


drop trigger if exists
  set_inventory_transfer_created_by
on public.inventory_transfers;


create trigger
  set_inventory_transfer_created_by
before insert
on public.inventory_transfers
for each row
execute function
  public.set_inventory_transfer_created_by();


/* =========================================================
 * Updated At Trigger Functions
 *
 * These functions are specific to inventory transfers and do
 * not depend on another shared trigger function.
 * ========================================================= */

create or replace function
  public.set_inventory_transfer_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();

  return new;
end;
$$;


create or replace function
  public.set_inventory_transfer_item_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();

  return new;
end;
$$;


/* =========================================================
 * Updated At Triggers
 * ========================================================= */

drop trigger if exists
  set_inventory_transfers_updated_at
on public.inventory_transfers;


create trigger
  set_inventory_transfers_updated_at
before update
on public.inventory_transfers
for each row
execute function
  public.set_inventory_transfer_updated_at();


drop trigger if exists
  set_inventory_transfer_items_updated_at
on public.inventory_transfer_items;


create trigger
  set_inventory_transfer_items_updated_at
before update
on public.inventory_transfer_items
for each row
execute function
  public.set_inventory_transfer_item_updated_at();


/* =========================================================
 * Row Level Security
 * ========================================================= */

alter table public.inventory_transfers
enable row level security;

alter table public.inventory_transfer_items
enable row level security;


/* =========================================================
 * Inventory Transfer Policies
 * ========================================================= */

drop policy if exists
  "Authenticated users can view inventory transfers"
on public.inventory_transfers;


create policy
  "Authenticated users can view inventory transfers"
on public.inventory_transfers
for select
to authenticated
using (true);


drop policy if exists
  "Authenticated users can create inventory transfers"
on public.inventory_transfers;


create policy
  "Authenticated users can create inventory transfers"
on public.inventory_transfers
for insert
to authenticated
with check (true);


drop policy if exists
  "Authenticated users can update inventory transfers"
on public.inventory_transfers;


create policy
  "Authenticated users can update inventory transfers"
on public.inventory_transfers
for update
to authenticated
using (true)
with check (true);


drop policy if exists
  "Authenticated users can delete draft inventory transfers"
on public.inventory_transfers;


create policy
  "Authenticated users can delete draft inventory transfers"
on public.inventory_transfers
for delete
to authenticated
using (
  status = 'draft'
);


/* =========================================================
 * Inventory Transfer Item Policies
 * ========================================================= */

drop policy if exists
  "Authenticated users can view inventory transfer items"
on public.inventory_transfer_items;


create policy
  "Authenticated users can view inventory transfer items"
on public.inventory_transfer_items
for select
to authenticated
using (true);


drop policy if exists
  "Authenticated users can create inventory transfer items"
on public.inventory_transfer_items;


create policy
  "Authenticated users can create inventory transfer items"
on public.inventory_transfer_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.inventory_transfers transfer
    where transfer.id =
      inventory_transfer_id
      and transfer.status = 'draft'
  )
);


drop policy if exists
  "Authenticated users can update inventory transfer items"
on public.inventory_transfer_items;


create policy
  "Authenticated users can update inventory transfer items"
on public.inventory_transfer_items
for update
to authenticated
using (
  exists (
    select 1
    from public.inventory_transfers transfer
    where transfer.id =
      inventory_transfer_id
      and transfer.status = 'draft'
  )
)
with check (
  exists (
    select 1
    from public.inventory_transfers transfer
    where transfer.id =
      inventory_transfer_id
      and transfer.status = 'draft'
  )
);


drop policy if exists
  "Authenticated users can delete inventory transfer items"
on public.inventory_transfer_items;


create policy
  "Authenticated users can delete inventory transfer items"
on public.inventory_transfer_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.inventory_transfers transfer
    where transfer.id =
      inventory_transfer_id
      and transfer.status = 'draft'
  )
);


/* =========================================================
 * Table Permissions
 * ========================================================= */

revoke all
on table public.inventory_transfers
from public;

revoke all
on table public.inventory_transfer_items
from public;


grant select, insert, update, delete
on table public.inventory_transfers
to authenticated;

grant select, insert, update, delete
on table public.inventory_transfer_items
to authenticated;


/* =========================================================
 * Sequence Permissions
 *
 * The number-generation function is SECURITY DEFINER, but
 * granting sequence usage also supports authenticated calls
 * where required by the project configuration.
 * ========================================================= */

revoke all
on sequence public.inventory_transfer_number_seq
from public;

grant usage, select
on sequence public.inventory_transfer_number_seq
to authenticated;


/* =========================================================
 * Function Permissions
 * ========================================================= */

revoke all
on function
  public.generate_inventory_transfer_number()
from public;

revoke all
on function
  public.set_inventory_transfer_number()
from public;

revoke all
on function
  public.set_inventory_transfer_created_by()
from public;

revoke all
on function
  public.set_inventory_transfer_updated_at()
from public;

revoke all
on function
  public.set_inventory_transfer_item_updated_at()
from public;


/*
 * The application does not need to call the trigger functions
 * directly.
 *
 * Only the transfer number generator may be called by an
 * authenticated user if needed for preview purposes.
 */

grant execute
on function
  public.generate_inventory_transfer_number()
to authenticated;


/* =========================================================
 * Documentation
 * ========================================================= */

comment on table public.inventory_transfers is
'Warehouse-to-warehouse inventory transfer documents.';


comment on table public.inventory_transfer_items is
'Products and quantities included in warehouse inventory transfers.';


comment on column
  public.inventory_transfers.transfer_number
is
'Automatically generated transfer document number.';


comment on column
  public.inventory_transfers.source_warehouse_id
is
'Warehouse from which stock will be dispatched.';


comment on column
  public.inventory_transfers.destination_warehouse_id
is
'Warehouse that will receive the transferred stock.';


comment on column
  public.inventory_transfer_items.requested_quantity
is
'Quantity requested for transfer.';


comment on column
  public.inventory_transfer_items.dispatched_quantity
is
'Quantity physically dispatched from the source warehouse.';


comment on column
  public.inventory_transfer_items.received_quantity
is
'Quantity confirmed as received by the destination warehouse.';


comment on column
  public.inventory_transfer_items.unit_cost
is
'Inventory cost captured from the source warehouse during dispatch.';


/* =========================================================
 * Migration Complete
 * ========================================================= */