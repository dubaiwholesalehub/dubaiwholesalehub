/*
 * =========================================================
 * 118 — Sales Returns & Credit Notes Foundation
 *
 * PURPOSE
 * -------
 *
 * Creates the controlled commercial foundation for:
 *
 *   - Customer sales returns
 *   - Partial returns
 *   - Customer credit notes
 *   - Original sales-line linkage
 *   - Original delivery-line linkage
 *   - Historical dispatch-cost snapshots
 *   - VAT / discount snapshots
 *   - Return quantity controls
 *   - Future Inventory + GL posting
 *
 *
 * IMPORTANT
 * ---------
 *
 * This migration DOES NOT yet:
 *
 *   - receive returned stock
 *   - update warehouse stock
 *   - reduce Accounts Receivable
 *   - create GL journals
 *   - create cash refunds
 *
 * Those controlled workflows will follow in migration 119+.
 *
 *
 * RETURN ACCOUNTING PRINCIPLE
 * ---------------------------
 *
 * Commercial credit:
 *
 *   Dr Sales Returns & Discounts
 *   Dr VAT Payable          when VAT exists
 *   Cr Accounts Receivable
 *
 *
 * Inventory restoration:
 *
 *   Dr Inventory
 *   Cr Cost of Goods Sold
 *
 *
 * Inventory restoration must use the historical cost of the
 * original sales_issue inventory transaction, not the current
 * warehouse average cost.
 * =========================================================
 */


/* =========================================================
 * 1. Sales Return Number Sequence
 *
 * Example:
 *
 *   SR-2026-000001
 * ========================================================= */

create sequence if not exists
  public.sales_return_number_seq

start with 1
increment by 1
minvalue 1
no maxvalue
cache 1;


/* =========================================================
 * 2. Sales Return Number Generator
 * ========================================================= */

create or replace function
  public.generate_sales_return_number(
    p_return_date date
      default current_date
  )
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_number bigint;

begin

  v_number :=
    nextval(
      'public.sales_return_number_seq'
    );


  return
    'SR-'
    ||
    extract(
      year
      from
      coalesce(
        p_return_date,
        current_date
      )
    )::integer
    ||
    '-'
    ||
    lpad(
      v_number::text,
      6,
      '0'
    );

end;
$$;


/* =========================================================
 * 3. Sales Returns
 * ========================================================= */

create table if not exists
  public.sales_returns
(
  id uuid
    primary key
    default gen_random_uuid(),

  return_number text
    not null,

  sales_order_id uuid
    not null
    references public.sales_orders(id)
    on delete restrict,

  customer_id uuid
    not null
    references public.customers(id)
    on delete restrict,

  return_date date
    not null,

  posting_date date
    not null,

  status text
    not null
    default 'draft',

  reason text
    not null,

  notes text,

  currency_code text
    not null
    default 'AED',

  exchange_rate numeric(18, 6)
    not null
    default 1,

  /*
   * Commercial return totals.
   *
   * subtotal
   *   Gross return value before discount and VAT.
   *
   * discount_amount
   *   Returned portion of the original discount.
   *
   * net_amount
   *   subtotal - discount_amount
   *
   * tax_amount
   *   VAT / tax being reversed.
   *
   * grand_total
   *   Customer credit amount.
   */
  subtotal numeric(18, 2)
    not null
    default 0,

  discount_amount numeric(18, 2)
    not null
    default 0,

  net_amount numeric(18, 2)
    not null
    default 0,

  tax_amount numeric(18, 2)
    not null
    default 0,

  grand_total numeric(18, 2)
    not null
    default 0,

  /*
   * Inventory / accounting references.
   *
   * Populated by later controlled posting workflows.
   */
  inventory_transaction_id uuid
    references public.inventory_transactions(id)
    on delete restrict,

  credit_journal_entry_id uuid
    references public.gl_journal_entries(id)
    on delete restrict,

  inventory_journal_entry_id uuid
    references public.gl_journal_entries(id)
    on delete restrict,

  approved_at timestamptz,

  approved_by uuid
    references public.profiles(id)
    on delete set null,

  received_at timestamptz,

  received_by uuid
    references public.profiles(id)
    on delete set null,

  posted_at timestamptz,

  posted_by uuid
    references public.profiles(id)
    on delete set null,

  cancelled_at timestamptz,

  cancelled_by uuid
    references public.profiles(id)
    on delete set null,

  cancellation_reason text,

  created_by uuid
    references public.profiles(id)
    on delete set null,

  updated_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  constraint
    sales_returns_number_unique
  unique (
    return_number
  ),

  constraint
    sales_returns_status_check
  check (
    status in (
      'draft',
      'approved',
      'received',
      'posted',
      'cancelled'
    )
  ),

  constraint
    sales_returns_reason_not_empty
  check (
    length(
      trim(
        reason
      )
    ) >
      0
  ),

  constraint
    sales_returns_currency_check
  check (
    currency_code ~
      '^[A-Z]{3}$'
  ),

  constraint
    sales_returns_exchange_rate_positive
  check (
    exchange_rate >
      0
  ),

  constraint
    sales_returns_subtotal_nonnegative
  check (
    subtotal >=
      0
  ),

  constraint
    sales_returns_discount_nonnegative
  check (
    discount_amount >=
      0
  ),

  constraint
    sales_returns_net_nonnegative
  check (
    net_amount >=
      0
  ),

  constraint
    sales_returns_tax_nonnegative
  check (
    tax_amount >=
      0
  ),

  constraint
    sales_returns_total_nonnegative
  check (
    grand_total >=
      0
  ),

  constraint
    sales_returns_discount_not_above_subtotal
  check (
    discount_amount <=
      subtotal
  ),

  constraint
    sales_returns_totals_consistent
  check (
    net_amount =
      round(
        subtotal
        -
        discount_amount,
        2
      )

    and

    grand_total =
      round(
        net_amount
        +
        tax_amount,
        2
      )
  ),

  constraint
    sales_returns_cancelled_fields
  check (
    status <>
      'cancelled'

    or

    (
      cancelled_at
        is not null

      and

      length(
        trim(
          coalesce(
            cancellation_reason,
            ''
          )
        )
      ) >=
        3
    )
  )
);


/* =========================================================
 * 4. Sales Return Items
 *
 * Every line points to:
 *
 *   original Sales Order Item
 *   original Delivery Order Item
 *
 * delivery_order_item_id is important because the original
 * sales_issue inventory transaction stores:
 *
 *   source_document_item_id = delivery_order_item.id
 *
 * This lets later workflows resolve exact historical cost.
 * ========================================================= */

create table if not exists
  public.sales_return_items
(
  id uuid
    primary key
    default gen_random_uuid(),

  sales_return_id uuid
    not null
    references public.sales_returns(id)
    on delete cascade,

  line_number integer
    not null,

  sales_order_item_id uuid
    not null
    references public.sales_order_items(id)
    on delete restrict,

  delivery_order_item_id uuid
    not null
    references public.delivery_order_items(id)
    on delete restrict,

  product_id uuid
    not null
    references public.products(id)
    on delete restrict,

  warehouse_id uuid
    not null
    references public.warehouses(id)
    on delete restrict,

  /*
   * Original commercial snapshot.
   */
  sku text,

  item_name text
    not null,

  unit_id uuid
    references public.units(id)
    on delete restrict,

  quantity_returned numeric(18, 4)
    not null,

  unit_price numeric(18, 4)
    not null,

  discount_percentage numeric(9, 4)
    not null
    default 0,

  discount_amount numeric(18, 2)
    not null
    default 0,

  tax_percentage numeric(9, 4)
    not null
    default 0,

  tax_amount numeric(18, 2)
    not null
    default 0,

  line_subtotal numeric(18, 2)
    not null
    default 0,

  line_net numeric(18, 2)
    not null
    default 0,

  line_total numeric(18, 2)
    not null
    default 0,

  /*
   * Historical inventory accounting cost.
   *
   * original_unit_cost will be resolved from the original
   * sales_issue inventory_transaction_item.
   */
  original_unit_cost numeric(18, 4)
    not null
    default 0,

  return_cost numeric(18, 4)
    generated always as (
      quantity_returned
      *
      original_unit_cost
    ) stored,

  condition text
    not null
    default 'resalable',

  return_reason text,

  notes text,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  constraint
    sales_return_items_unique_line
  unique (
    sales_return_id,
    line_number
  ),

  constraint
    sales_return_items_line_positive
  check (
    line_number >
      0
  ),

  constraint
    sales_return_items_quantity_positive
  check (
    quantity_returned >
      0
  ),

  constraint
    sales_return_items_unit_price_nonnegative
  check (
    unit_price >=
      0
  ),

  constraint
    sales_return_items_discount_percentage
  check (
    discount_percentage
      between
        0
        and
        100
  ),

  constraint
    sales_return_items_discount_nonnegative
  check (
    discount_amount >=
      0
  ),

  constraint
    sales_return_items_tax_percentage
  check (
    tax_percentage
      between
        0
        and
        100
  ),

  constraint
    sales_return_items_tax_nonnegative
  check (
    tax_amount >=
      0
  ),

  constraint
    sales_return_items_subtotal_nonnegative
  check (
    line_subtotal >=
      0
  ),

  constraint
    sales_return_items_net_nonnegative
  check (
    line_net >=
      0
  ),

  constraint
    sales_return_items_total_nonnegative
  check (
    line_total >=
      0
  ),

  constraint
    sales_return_items_cost_nonnegative
  check (
    original_unit_cost >=
      0
  ),

  constraint
    sales_return_items_condition_check
  check (
    condition in (
      'resalable',
      'damaged',
      'defective',
      'other'
    )
  ),

  constraint
    sales_return_items_totals_consistent
  check (
    line_net =
      round(
        line_subtotal
        -
        discount_amount,
        2
      )

    and

    line_total =
      round(
        line_net
        +
        tax_amount,
        2
      )
  )
);


/* =========================================================
 * 5. Indexes
 * ========================================================= */

create index if not exists
  sales_returns_sales_order_idx
on
  public.sales_returns (
    sales_order_id
  );


create index if not exists
  sales_returns_customer_idx
on
  public.sales_returns (
    customer_id
  );


create index if not exists
  sales_returns_date_idx
on
  public.sales_returns (
    return_date
  );


create index if not exists
  sales_returns_posting_date_idx
on
  public.sales_returns (
    posting_date
  );


create index if not exists
  sales_returns_status_idx
on
  public.sales_returns (
    status
  );


create index if not exists
  sales_return_items_return_idx
on
  public.sales_return_items (
    sales_return_id
  );


create index if not exists
  sales_return_items_sales_order_item_idx
on
  public.sales_return_items (
    sales_order_item_id
  );


create index if not exists
  sales_return_items_delivery_item_idx
on
  public.sales_return_items (
    delivery_order_item_id
  );


create index if not exists
  sales_return_items_product_idx
on
  public.sales_return_items (
    product_id
  );


create index if not exists
  sales_return_items_warehouse_idx
on
  public.sales_return_items (
    warehouse_id
  );


/* =========================================================
 * 6. Updated At Trigger
 *
 * Reuses public.set_updated_at() if already available.
 * ========================================================= */

drop trigger if exists
  set_sales_returns_updated_at
on
  public.sales_returns;


create trigger
  set_sales_returns_updated_at

before update
on
  public.sales_returns

for each row

execute function
  public.set_updated_at();


drop trigger if exists
  set_sales_return_items_updated_at
on
  public.sales_return_items;


create trigger
  set_sales_return_items_updated_at

before update
on
  public.sales_return_items

for each row

execute function
  public.set_updated_at();


/* =========================================================
 * 7. Protect Posted / Cancelled Returns
 *
 * Later controlled SECURITY DEFINER workflows will use a
 * transaction-local bypass.
 * ========================================================= */

create or replace function
  public.protect_final_sales_return()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  if
    current_setting(
      'app.sales_return_internal_write',
      true
    ) =
      'on'
  then
    return
      new;
  end if;


  if
    old.status in (
      'posted',
      'cancelled'
    )
  then
    raise exception
      'Posted or cancelled Sales Returns cannot be edited directly.';
  end if;


  return
    new;

end;
$$;


drop trigger if exists
  protect_final_sales_return
on
  public.sales_returns;


create trigger
  protect_final_sales_return

before update
on
  public.sales_returns

for each row

execute function
  public.protect_final_sales_return();


/* =========================================================
 * 8. Prevent Line Changes After Return Is Final
 * ========================================================= */

create or replace function
  public.protect_final_sales_return_item()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_return_id uuid;

  v_status text;

begin

  if
    current_setting(
      'app.sales_return_internal_write',
      true
    ) =
      'on'
  then

    if
      tg_op =
        'DELETE'
    then
      return
        old;
    end if;

    return
      new;
  end if;


  if
    tg_op =
      'DELETE'
  then
    v_return_id :=
      old.sales_return_id;
  else
    v_return_id :=
      new.sales_return_id;
  end if;


  select
    status
  into
    v_status
  from
    public.sales_returns
  where
    id =
      v_return_id;


  if
    v_status in (
      'posted',
      'cancelled'
    )
  then
    raise exception
      'Items belonging to posted or cancelled Sales Returns cannot be changed.';
  end if;


  if
    tg_op =
      'DELETE'
  then
    return
      old;
  end if;


  return
    new;

end;
$$;


drop trigger if exists
  protect_final_sales_return_item
on
  public.sales_return_items;


create trigger
  protect_final_sales_return_item

before update or delete
on
  public.sales_return_items

for each row

execute function
  public.protect_final_sales_return_item();


/* =========================================================
 * 9. RLS
 * ========================================================= */

alter table
  public.sales_returns
enable row level security;


alter table
  public.sales_return_items
enable row level security;


/* =========================================================
 * 10. Sales Return Policies
 * ========================================================= */

drop policy if exists
  sales_returns_admin_select
on
  public.sales_returns;


create policy
  sales_returns_admin_select

on
  public.sales_returns

for select

to authenticated

using (
  public.is_admin()
);


drop policy if exists
  sales_returns_admin_manage
on
  public.sales_returns;


create policy
  sales_returns_admin_manage

on
  public.sales_returns

for all

to authenticated

using (
  public.is_admin()
)

with check (
  public.is_admin()
);


/* =========================================================
 * 11. Sales Return Item Policies
 * ========================================================= */

drop policy if exists
  sales_return_items_admin_select
on
  public.sales_return_items;


create policy
  sales_return_items_admin_select

on
  public.sales_return_items

for select

to authenticated

using (
  public.is_admin()
);


drop policy if exists
  sales_return_items_admin_manage
on
  public.sales_return_items;


create policy
  sales_return_items_admin_manage

on
  public.sales_return_items

for all

to authenticated

using (
  public.is_admin()
)

with check (
  public.is_admin()
);


/* =========================================================
 * 12. Grants
 * ========================================================= */

grant select,
      insert,
      update,
      delete
on
  public.sales_returns
to authenticated;


grant select,
      insert,
      update,
      delete
on
  public.sales_return_items
to authenticated;


revoke all
on function
  public.generate_sales_return_number(
    date
  )
from public;


grant execute
on function
  public.generate_sales_return_number(
    date
  )
to authenticated;


/* =========================================================
 * 13. Documentation
 * ========================================================= */

comment on table
  public.sales_returns
is
  'Customer Sales Return / Credit Note headers linked to the original Sales Order. Financial and inventory effects are posted later through controlled workflows.';


comment on table
  public.sales_return_items
is
  'Sales Return lines linked to original Sales Order and Delivery Order items. Historical original_unit_cost supports exact inventory/COGS restoration.';


comment on column
  public.sales_return_items.delivery_order_item_id
is
  'Original Delivery Order item. The original sales_issue inventory_transaction_item points to this ID through source_document_item_id.';


comment on column
  public.sales_return_items.original_unit_cost
is
  'Historical inventory cost of the original sales_issue. Return accounting must restore inventory using this amount rather than current warehouse average cost.';


comment on function
  public.generate_sales_return_number(
    date
  )
is
  'Generates the next Sales Return / Credit Note number in SR-YYYY-NNNNNN format.';