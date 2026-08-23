/*
 * =========================================================
 * 125 — Supplier Returns / Debit Notes Foundation
 *
 * PURPOSE
 * -------
 *
 * Creates the controlled Supplier Return document foundation
 * for registered-supplier Quick Purchases.
 *
 *
 * ARCHITECTURE
 * ------------
 *
 * Original Quick Purchase
 *        ↓
 * Quick Purchase Item
 *        ↓
 * Original Inventory Transaction Item
 *        ↓
 * Supplier Return Item
 *
 *
 * This migration provides:
 *
 *   1. Supplier Return number sequence
 *   2. Supplier Return header
 *   3. Supplier Return items
 *   4. Controlled Supplier Return creation
 *   5. Remaining-returnable quantity validation
 *   6. Exact original inventory-cost lineage validation
 *   7. Controlled approval
 *
 *
 * INVENTORY
 * ---------
 *
 * Inventory is NOT moved in this migration.
 *
 * Migration 126 will dispatch approved returns and create:
 *
 *   inventory_transactions.transaction_type = supplier_return
 *
 *
 * ACCOUNTING
 * ----------
 *
 * GL is NOT posted in this migration.
 *
 * Migration 127 will reverse:
 *
 *   Accounts Payable
 *   Inventory
 *   Recoverable / Pending VAT
 *
 * and calculate Supplier Credit where the purchase has already
 * been paid beyond its return-adjusted value.
 *
 *
 * IMPORTANT
 * ---------
 *
 * Original Quick Purchase payment allocations remain immutable
 * historical payment/application records.
 *
 * Supplier Returns do NOT rewrite payment history.
 * =========================================================
 */


/* =========================================================
 * 1. Supplier Return Number Sequence
 * ========================================================= */

create sequence if not exists
  public.supplier_return_number_seq

start with 1
increment by 1
minvalue 1
no maxvalue
cache 1;


/* =========================================================
 * 2. Supplier Return Number Generator
 * ========================================================= */

create or replace function
  public.next_supplier_return_number(
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
      'public.supplier_return_number_seq'
    );


  return
    'SPR-'
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
 * 3. Supplier Returns
 * ========================================================= */

create table if not exists
  public.supplier_returns
(
  id uuid
    primary key
    default gen_random_uuid(),

  return_number text
    not null,

  quick_purchase_id uuid
    not null
    references public.quick_purchases(id)
    on delete restrict,

  supplier_id uuid
    not null
    references public.suppliers(id)
    on delete restrict,

  warehouse_id uuid
    not null
    references public.warehouses(id)
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

  tax_treatment text
    not null,

  /*
   * Commercial debit-note amounts.
   */

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

  /*
   * Inventory accounting value.
   *
   * This is deliberately separate from commercial return value.
   */

  inventory_cost numeric(18, 2)
    not null
    default 0,

  /*
   * Populated by later controlled workflows.
   */

  inventory_transaction_id uuid
    references public.inventory_transactions(id)
    on delete restrict,

  journal_entry_id uuid
    references public.gl_journal_entries(id)
    on delete restrict,

  approved_at timestamptz,

  approved_by uuid
    references public.profiles(id)
    on delete set null,

  dispatched_at timestamptz,

  dispatched_by uuid
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
    supplier_returns_number_unique
  unique (
    return_number
  ),

  constraint
    supplier_returns_status_check
  check (
    status in (
      'draft',
      'approved',
      'dispatched',
      'posted',
      'cancelled'
    )
  ),

  constraint
    supplier_returns_reason_not_empty
  check (
    length(
      trim(
        reason
      )
    ) >
      0
  ),

  constraint
    supplier_returns_currency_check
  check (
    currency_code ~
      '^[A-Z]{3}$'
  ),

  constraint
    supplier_returns_exchange_rate_positive
  check (
    exchange_rate >
      0
  ),

  constraint
    supplier_returns_tax_treatment_check
  check (
    tax_treatment in (
      'standard_vat',
      'no_vat',
      'vat_pending',
      'reverse_charge',
      'review_required'
    )
  ),

  constraint
    supplier_returns_subtotal_nonnegative
  check (
    subtotal >= 0
  ),

  constraint
    supplier_returns_discount_nonnegative
  check (
    discount_amount >= 0
  ),

  constraint
    supplier_returns_tax_nonnegative
  check (
    tax_amount >= 0
  ),

  constraint
    supplier_returns_recoverable_tax_nonnegative
  check (
    recoverable_tax_amount >= 0
  ),

  constraint
    supplier_returns_pending_tax_nonnegative
  check (
    pending_tax_amount >= 0
  ),

  constraint
    supplier_returns_total_nonnegative
  check (
    grand_total >= 0
  ),

  constraint
    supplier_returns_inventory_cost_nonnegative
  check (
    inventory_cost >= 0
  ),

  constraint
    supplier_returns_cancelled_fields
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
 * 4. Supplier Return Items
 * ========================================================= */

create table if not exists
  public.supplier_return_items
(
  id uuid
    primary key
    default gen_random_uuid(),

  supplier_return_id uuid
    not null
    references public.supplier_returns(id)
    on delete cascade,

  line_number integer
    not null,

  quick_purchase_item_id uuid
    not null
    references public.quick_purchase_items(id)
    on delete restrict,

  original_inventory_item_id uuid
    not null
    references public.inventory_transaction_items(id)
    on delete restrict,

  product_id uuid
    not null
    references public.products(id)
    on delete restrict,

  warehouse_id uuid
    not null
    references public.warehouses(id)
    on delete restrict,

  quantity_returned numeric(18, 4)
    not null,

  /*
   * Historical acquisition cost from the original inventory
   * receipt item.
   */

  original_unit_cost numeric(18, 4)
    not null,

  return_cost numeric(18, 4)
    not null,

  /*
   * Commercial supplier debit-note values.
   */

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

  reason text,

  notes text,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  constraint
    supplier_return_items_line_unique
  unique (
    supplier_return_id,
    line_number
  ),

  constraint
    supplier_return_items_purchase_item_unique
  unique (
    supplier_return_id,
    quick_purchase_item_id
  ),

  constraint
    supplier_return_items_quantity_positive
  check (
    quantity_returned >
      0
  ),

  constraint
    supplier_return_items_original_cost_nonnegative
  check (
    original_unit_cost >=
      0
  ),

  constraint
    supplier_return_items_return_cost_nonnegative
  check (
    return_cost >=
      0
  ),

  constraint
    supplier_return_items_subtotal_nonnegative
  check (
    line_subtotal >=
      0
  ),

  constraint
    supplier_return_items_tax_percentage_check
  check (
    tax_percentage >=
      0

    and

    tax_percentage <=
      100
  ),

  constraint
    supplier_return_items_tax_nonnegative
  check (
    tax_amount >=
      0
  ),

  constraint
    supplier_return_items_total_nonnegative
  check (
    line_total >=
      0
  )
);


/* =========================================================
 * 5. Indexes
 * ========================================================= */

create index if not exists
  supplier_returns_quick_purchase_idx

on public.supplier_returns (
  quick_purchase_id
);


create index if not exists
  supplier_returns_supplier_idx

on public.supplier_returns (
  supplier_id
);


create index if not exists
  supplier_returns_date_idx

on public.supplier_returns (
  return_date desc
);


create index if not exists
  supplier_returns_status_idx

on public.supplier_returns (
  status
);


create index if not exists
  supplier_return_items_return_idx

on public.supplier_return_items (
  supplier_return_id
);


create index if not exists
  supplier_return_items_purchase_item_idx

on public.supplier_return_items (
  quick_purchase_item_id
);


create index if not exists
  supplier_return_items_inventory_item_idx

on public.supplier_return_items (
  original_inventory_item_id
);


/* =========================================================
 * 6. Updated-At Trigger
 * ========================================================= */

drop trigger if exists
  set_supplier_returns_updated_at
on
  public.supplier_returns;


create trigger
  set_supplier_returns_updated_at

before update
on
  public.supplier_returns

for each row

execute function
  public.set_updated_at();


drop trigger if exists
  set_supplier_return_items_updated_at
on
  public.supplier_return_items;


create trigger
  set_supplier_return_items_updated_at

before update
on
  public.supplier_return_items

for each row

execute function
  public.set_updated_at();


/* =========================================================
 * 7. Controlled Supplier Return Creation
 *
 * p_items example:
 *
 * [
 *   {
 *     "quickPurchaseItemId": "...",
 *     "quantityReturned": 2,
 *     "reason": "Damaged shipment",
 *     "notes": null
 *   }
 * ]
 * ========================================================= */

create or replace function
  public.create_supplier_return(
    p_quick_purchase_id uuid,
    p_return_date date,
    p_posting_date date,
    p_reason text,
    p_items jsonb,
    p_notes text
      default null
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_purchase
    public.quick_purchases%rowtype;

  v_purchase_item
    public.quick_purchase_items%rowtype;

  v_inventory_item
    public.inventory_transaction_items%rowtype;

  v_item jsonb;

  v_return_id uuid;

  v_return_number text;

  v_quick_purchase_item_id uuid;

  v_quantity_returned
    numeric(18, 4);

  v_already_returned
    numeric(18, 4);

  v_remaining_returnable
    numeric(18, 4);

  v_ratio numeric;

  v_line_subtotal
    numeric(18, 2);

  v_line_tax
    numeric(18, 2);

  v_line_total
    numeric(18, 2);

  v_line_return_cost
    numeric(18, 4);

  v_line_reason text;

  v_line_notes text;

  v_line_number integer := 0;

  v_subtotal
    numeric(18, 2) := 0;

  v_tax_amount
    numeric(18, 2) := 0;

  v_grand_total
    numeric(18, 2) := 0;

  v_inventory_cost
    numeric(18, 4) := 0;

  v_recoverable_tax
    numeric(18, 2) := 0;

  v_pending_tax
    numeric(18, 2) := 0;

begin

  /* =======================================================
   * Security
   * ======================================================= */

  v_user_id :=
    auth.uid();


  if
    v_user_id is null
  then
    raise exception
      'Authentication is required.';
  end if;


  if
    not public.is_admin()
  then
    raise exception
      'Administrator access is required.';
  end if;


  /* =======================================================
   * Validate Header Input
   * ======================================================= */

  if
    p_quick_purchase_id is null
  then
    raise exception
      'Quick Purchase ID is required.';
  end if;


  if
    p_return_date is null
  then
    raise exception
      'Supplier Return date is required.';
  end if;


  if
    p_posting_date is null
  then
    raise exception
      'Supplier Return posting date is required.';
  end if;


  if
    length(
      trim(
        coalesce(
          p_reason,
          ''
        )
      )
    ) <
      3
  then
    raise exception
      'A meaningful Supplier Return reason is required.';
  end if;


  if
    p_items is null

    or

    jsonb_typeof(
      p_items
    ) <>
      'array'

    or

    jsonb_array_length(
      p_items
    ) =
      0
  then
    raise exception
      'At least one Supplier Return item is required.';
  end if;


  /* =======================================================
   * Lock Original Quick Purchase
   * ======================================================= */

  select
    *
  into
    v_purchase
  from
    public.quick_purchases
  where
    id =
      p_quick_purchase_id
  for update;


  if not found then
    raise exception
      'Quick Purchase was not found.';
  end if;


  if
    v_purchase.status <>
      'posted'
  then
    raise exception
      'Quick Purchase % is not posted.',
      v_purchase.purchase_number;
  end if;


  if
    v_purchase.supplier_id is null
  then
    raise exception
      'Supplier Returns require a registered supplier. Quick Purchase % does not have one.',
      v_purchase.purchase_number;
  end if;


  if
    v_purchase.inventory_transaction_id
      is null
  then
    raise exception
      'Quick Purchase % does not have an inventory transaction.',
      v_purchase.purchase_number;
  end if;


  /*
   * Reverse-charge and review-required purchases need a
   * dedicated VAT-accounting implementation before Supplier
   * Return posting can safely be supported.
   */

  if
    v_purchase.tax_treatment in (
      'reverse_charge',
      'review_required'
    )
  then
    raise exception
      'Supplier Returns for Quick Purchase tax treatment "%" are not yet supported.',
      v_purchase.tax_treatment;
  end if;


  /* =======================================================
   * Prevent Duplicate Purchase Items in Request
   * ======================================================= */

  if
    (
      select
        count(*)

      from
        jsonb_array_elements(
          p_items
        )
    )
    <>
    (
      select
        count(
          distinct
            item ->>
              'quickPurchaseItemId'
        )

      from
        jsonb_array_elements(
          p_items
        )
          item
    )
  then
    raise exception
      'The same Quick Purchase item cannot appear more than once in one Supplier Return.';
  end if;


  /* =======================================================
   * Create Header
   * ======================================================= */

  v_return_number :=
    public.next_supplier_return_number(
      p_return_date
    );


  insert into
    public.supplier_returns
  (
    return_number,

    quick_purchase_id,

    supplier_id,

    warehouse_id,

    return_date,

    posting_date,

    status,

    reason,

    notes,

    currency_code,

    exchange_rate,

    tax_treatment,

    subtotal,

    discount_amount,

    tax_amount,

    recoverable_tax_amount,

    pending_tax_amount,

    grand_total,

    inventory_cost,

    created_by,

    updated_by
  )
  values
  (
    v_return_number,

    v_purchase.id,

    v_purchase.supplier_id,

    v_purchase.warehouse_id,

    p_return_date,

    p_posting_date,

    'draft',

    trim(
      p_reason
    ),

    nullif(
      trim(
        coalesce(
          p_notes,
          ''
        )
      ),
      ''
    ),

    v_purchase.currency_code,

    v_purchase.exchange_rate,

    v_purchase.tax_treatment,

    0,

    0,

    0,

    0,

    0,

    0,

    0,

    v_user_id,

    v_user_id
  )
  returning
    id
  into
    v_return_id;


  /* =======================================================
   * Process Requested Return Items
   * ======================================================= */

  for
    v_item
  in

    select
      value

    from
      jsonb_array_elements(
        p_items
      )

  loop

    v_line_number :=
      v_line_number +
      1;


    begin

      v_quick_purchase_item_id :=
        nullif(
          v_item ->>
            'quickPurchaseItemId',
          ''
        )::uuid;

    exception
      when others then

        raise exception
          'Supplier Return line % requires a valid Quick Purchase item.',
          v_line_number;

    end;


    if
      v_quick_purchase_item_id
        is null
    then
      raise exception
        'Supplier Return line % requires a Quick Purchase item.',
        v_line_number;
    end if;


    begin

      v_quantity_returned :=
        coalesce(
          nullif(
            v_item ->>
              'quantityReturned',
            ''
          )::numeric,
          0
        );

    exception
      when others then

        raise exception
          'Supplier Return line % contains an invalid return quantity.',
          v_line_number;

    end;


    if
      v_quantity_returned <=
        0
    then
      raise exception
        'Supplier Return line % requires a quantity greater than zero.',
        v_line_number;
    end if;


    /* -----------------------------------------------------
     * Lock Original Purchase Item
     * ----------------------------------------------------- */

    select
      *
    into
      v_purchase_item
    from
      public.quick_purchase_items
    where
      id =
        v_quick_purchase_item_id

      and
      quick_purchase_id =
        v_purchase.id
    for update;


    if not found then
      raise exception
        'Supplier Return line % does not belong to Quick Purchase %.',
        v_line_number,
        v_purchase.purchase_number;
    end if;


    /* -----------------------------------------------------
     * Resolve Exact Original Inventory Item
     * ----------------------------------------------------- */

    select
      *
    into
      v_inventory_item
    from
      public.inventory_transaction_items
    where
      inventory_transaction_id =
        v_purchase.inventory_transaction_id

      and
      source_document_item_id =
        v_purchase_item.id;


    if not found then
      raise exception
        'Quick Purchase % line % does not have valid inventory lineage.',
        v_purchase.purchase_number,
        v_purchase_item.line_number;
    end if;


    if
      v_inventory_item.product_id <>
        v_purchase_item.product_id
    then
      raise exception
        'Quick Purchase % line % inventory lineage points to a different product.',
        v_purchase.purchase_number,
        v_purchase_item.line_number;
    end if;


    if
      v_inventory_item.warehouse_id <>
        v_purchase.warehouse_id
    then
      raise exception
        'Quick Purchase % line % inventory warehouse does not match the purchase warehouse.',
        v_purchase.purchase_number,
        v_purchase_item.line_number;
    end if;


    if
      v_inventory_item.quantity_change <=
        0
    then
      raise exception
        'Quick Purchase % line % does not point to a positive inventory receipt.',
        v_purchase.purchase_number,
        v_purchase_item.line_number;
    end if;


    /* -----------------------------------------------------
     * Already Returned Quantity
     * ----------------------------------------------------- */

    select
      coalesce(
        sum(
          supplier_return_item.quantity_returned
        ),
        0
      )

    into
      v_already_returned

    from
      public.supplier_return_items
        supplier_return_item

    inner join
      public.supplier_returns
        supplier_return

      on
        supplier_return.id =
          supplier_return_item.supplier_return_id

    where
      supplier_return_item.quick_purchase_item_id =
        v_purchase_item.id

      and
      supplier_return.status <>
        'cancelled';


    v_remaining_returnable :=
      greatest(
        v_purchase_item.quantity
        -
        v_already_returned,
        0
      );


    if
      v_quantity_returned >
        v_remaining_returnable
    then
      raise exception
        'Return quantity % exceeds remaining returnable quantity % for Quick Purchase line %.',
        v_quantity_returned,
        v_remaining_returnable,
        v_purchase_item.line_number;
    end if;


    /* -----------------------------------------------------
     * Commercial Return Amount
     *
     * Reverse original commercial line proportionally.
     * ----------------------------------------------------- */

    v_ratio :=
      v_quantity_returned
      /
      v_purchase_item.quantity;


    v_line_subtotal :=
      round(
        v_purchase_item.line_subtotal
        *
        v_ratio,
        2
      );


    v_line_tax :=
      round(
        v_purchase_item.tax_amount
        *
        v_ratio,
        2
      );


    v_line_total :=
      round(
        v_purchase_item.line_total
        *
        v_ratio,
        2
      );


    /* -----------------------------------------------------
     * Historical Inventory Cost
     * ----------------------------------------------------- */

    v_line_return_cost :=
      round(
        v_quantity_returned
        *
        v_inventory_item.unit_cost,
        4
      );


    v_line_reason :=
      nullif(
        trim(
          coalesce(
            v_item ->>
              'reason',
            ''
          )
        ),
        ''
      );


    v_line_notes :=
      nullif(
        trim(
          coalesce(
            v_item ->>
              'notes',
            ''
          )
        ),
        ''
      );


    /* -----------------------------------------------------
     * Insert Supplier Return Item
     * ----------------------------------------------------- */

    insert into
      public.supplier_return_items
    (
      supplier_return_id,

      line_number,

      quick_purchase_item_id,

      original_inventory_item_id,

      product_id,

      warehouse_id,

      quantity_returned,

      original_unit_cost,

      return_cost,

      line_subtotal,

      tax_percentage,

      tax_amount,

      line_total,

      reason,

      notes
    )
    values
    (
      v_return_id,

      v_line_number,

      v_purchase_item.id,

      v_inventory_item.id,

      v_purchase_item.product_id,

      v_purchase.warehouse_id,

      v_quantity_returned,

      v_inventory_item.unit_cost,

      v_line_return_cost,

      v_line_subtotal,

      v_purchase_item.tax_percentage,

      v_line_tax,

      v_line_total,

      v_line_reason,

      v_line_notes
    );


    v_subtotal :=
      v_subtotal
      +
      v_line_subtotal;


    v_tax_amount :=
      v_tax_amount
      +
      v_line_tax;


    v_grand_total :=
      v_grand_total
      +
      v_line_total;


    v_inventory_cost :=
      v_inventory_cost
      +
      v_line_return_cost;

  end loop;


  /* =======================================================
   * Determine VAT Reversal Bucket
   * ======================================================= */

  if
    v_purchase.tax_treatment =
      'standard_vat'
  then

    v_recoverable_tax :=
      v_tax_amount;

    v_pending_tax :=
      0;


  elsif
    v_purchase.tax_treatment =
      'vat_pending'
  then

    v_recoverable_tax :=
      0;

    v_pending_tax :=
      v_tax_amount;


  else

    /*
     * no_vat
     */

    v_recoverable_tax :=
      0;

    v_pending_tax :=
      0;

  end if;


  /* =======================================================
   * Final Header Totals
   * ======================================================= */

  update
    public.supplier_returns

  set
    subtotal =
      round(
        v_subtotal,
        2
      ),

    /*
     * Current Quick Purchase production workflow always uses
     * zero header discount.
     */

    discount_amount =
      0,

    tax_amount =
      round(
        v_tax_amount,
        2
      ),

    recoverable_tax_amount =
      round(
        v_recoverable_tax,
        2
      ),

    pending_tax_amount =
      round(
        v_pending_tax,
        2
      ),

    grand_total =
      round(
        v_grand_total,
        2
      ),

    inventory_cost =
      round(
        v_inventory_cost,
        2
      ),

    updated_by =
      v_user_id,

    updated_at =
      now()

  where
    id =
      v_return_id;


  if
    v_grand_total <=
      0
  then
    raise exception
      'Supplier Return % has zero commercial value.',
      v_return_number;
  end if;


  return
    v_return_id;

end;
$$;


/* =========================================================
 * 8. Approve Supplier Return
 * ========================================================= */

create or replace function
  public.approve_supplier_return(
    p_supplier_return_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_return
    public.supplier_returns%rowtype;

begin

  v_user_id :=
    auth.uid();


  if
    v_user_id is null
  then
    raise exception
      'Authentication is required.';
  end if;


  if
    not public.is_admin()
  then
    raise exception
      'Administrator access is required.';
  end if;


  if
    p_supplier_return_id is null
  then
    raise exception
      'Supplier Return ID is required.';
  end if;


  select
    *
  into
    v_return
  from
    public.supplier_returns
  where
    id =
      p_supplier_return_id
  for update;


  if not found then
    raise exception
      'Supplier Return was not found.';
  end if;


  /*
   * Idempotent approval.
   */

  if
    v_return.status =
      'approved'
  then
    return
      v_return.id;
  end if;


  if
    v_return.status <>
      'draft'
  then
    raise exception
      'Supplier Return % cannot be approved from status "%".',
      v_return.return_number,
      v_return.status;
  end if;


  if not exists (
    select
      1
    from
      public.supplier_return_items
    where
      supplier_return_id =
        v_return.id
  )
  then
    raise exception
      'Supplier Return % does not contain any items.',
      v_return.return_number;
  end if;


  update
    public.supplier_returns

  set
    status =
      'approved',

    approved_at =
      now(),

    approved_by =
      v_user_id,

    updated_by =
      v_user_id,

    updated_at =
      now()

  where
    id =
      v_return.id;


  return
    v_return.id;

end;
$$;


/* =========================================================
 * 9. Returnable Quick Purchase Item View
 *
 * Useful later for repository/UI.
 * ========================================================= */

create or replace view
  public.supplier_returnable_purchase_items

with (
  security_invoker = true
)

as

select
  purchase.id
    as quick_purchase_id,

  purchase.purchase_number,

  purchase.purchase_date,

  purchase.supplier_id,

  purchase.warehouse_id,

  purchase.currency_code,

  purchase.exchange_rate,

  purchase.tax_treatment,

  purchase_item.id
    as quick_purchase_item_id,

  purchase_item.line_number,

  purchase_item.product_id,

  purchase_item.quantity
    as purchased_quantity,

  purchase_item.unit_cost
    as purchase_unit_cost,

  purchase_item.line_subtotal,

  purchase_item.tax_percentage,

  purchase_item.tax_amount,

  purchase_item.line_total,

  inventory_item.id
    as original_inventory_item_id,

  inventory_item.unit_cost
    as original_inventory_unit_cost,

  coalesce(
    returned.quantity_returned,
    0
  )::numeric(18, 4)
    as quantity_already_returned,

  greatest(
    purchase_item.quantity
    -
    coalesce(
      returned.quantity_returned,
      0
    ),
    0
  )::numeric(18, 4)
    as quantity_returnable

from
  public.quick_purchases
    purchase

inner join
  public.quick_purchase_items
    purchase_item

  on
    purchase_item.quick_purchase_id =
      purchase.id

inner join
  public.inventory_transaction_items
    inventory_item

  on
    inventory_item.inventory_transaction_id =
      purchase.inventory_transaction_id

    and
    inventory_item.source_document_item_id =
      purchase_item.id

left join
(
  select
    supplier_return_item.quick_purchase_item_id,

    sum(
      supplier_return_item.quantity_returned
    )
      as quantity_returned

  from
    public.supplier_return_items
      supplier_return_item

  inner join
    public.supplier_returns
      supplier_return

    on
      supplier_return.id =
        supplier_return_item.supplier_return_id

  where
    supplier_return.status <>
      'cancelled'

  group by
    supplier_return_item.quick_purchase_item_id

)
  returned

on
  returned.quick_purchase_item_id =
    purchase_item.id

where
  purchase.status =
    'posted'

  and
  purchase.supplier_id
    is not null

  and
  greatest(
    purchase_item.quantity
    -
    coalesce(
      returned.quantity_returned,
      0
    ),
    0
  ) >
    0;


/* =========================================================
 * 10. Permissions
 * ========================================================= */

revoke all
on function
  public.next_supplier_return_number(
    date
  )
from public;


revoke all
on function
  public.create_supplier_return(
    uuid,
    date,
    date,
    text,
    jsonb,
    text
  )
from public;


revoke all
on function
  public.approve_supplier_return(
    uuid
  )
from public;


grant execute
on function
  public.create_supplier_return(
    uuid,
    date,
    date,
    text,
    jsonb,
    text
  )
to authenticated;


grant execute
on function
  public.approve_supplier_return(
    uuid
  )
to authenticated;


/* =========================================================
 * 11. Documentation
 * ========================================================= */

comment on table
  public.supplier_returns
is
  'Controlled supplier-return / supplier-debit-note document linked to an original registered-supplier Quick Purchase. Inventory and GL posting occur through later workflow stages.';


comment on table
  public.supplier_return_items
is
  'Supplier Return lines linked to the exact original Quick Purchase item and original inventory receipt item. Stores both commercial debit-note amounts and historical inventory cost.';


comment on function
  public.create_supplier_return(
    uuid,
    date,
    date,
    text,
    jsonb,
    text
  )
is
  'Creates a validated draft Supplier Return from returnable Quick Purchase items using exact inventory lineage and original commercial/tax amounts.';


comment on function
  public.approve_supplier_return(
    uuid
  )
is
  'Approves one draft Supplier Return for later controlled inventory dispatch.';


comment on view
  public.supplier_returnable_purchase_items
is
  'Returns registered-supplier Quick Purchase items with exact original inventory lineage and remaining Supplier Return quantity.';