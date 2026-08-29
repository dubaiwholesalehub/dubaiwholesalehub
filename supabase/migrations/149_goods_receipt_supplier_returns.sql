/* =========================================================
 * Migration 149
 * Goods Receipt Supplier Returns
 *
 * Extends Supplier Returns so a return can originate from:
 *   1) Quick Purchase
 *   2) Completed Goods Receipt / Purchase Order
 *
 * Existing Quick Purchase workflow remains supported.
 * ========================================================= */


/* =========================================================
 * 1. Supplier Return Header Origin
 * ========================================================= */

alter table public.supplier_returns
  alter column quick_purchase_id drop not null;

alter table public.supplier_returns
  add column if not exists goods_receipt_id uuid
    references public.goods_receipts(id)
    on delete restrict;

create index if not exists
  supplier_returns_goods_receipt_idx
on public.supplier_returns (
  goods_receipt_id
);

alter table public.supplier_returns
  drop constraint if exists
    supplier_returns_origin_check;

alter table public.supplier_returns
  add constraint
    supplier_returns_origin_check
  check (
    (
      quick_purchase_id is not null
      and goods_receipt_id is null
    )
    or
    (
      quick_purchase_id is null
      and goods_receipt_id is not null
    )
  );


/* =========================================================
 * 2. Supplier Return Item Origin
 * ========================================================= */

alter table public.supplier_return_items
  alter column quick_purchase_item_id drop not null;

alter table public.supplier_return_items
  add column if not exists goods_receipt_item_id uuid
    references public.goods_receipt_items(id)
    on delete restrict;

create index if not exists
  supplier_return_items_goods_receipt_item_idx
on public.supplier_return_items (
  goods_receipt_item_id
);

alter table public.supplier_return_items
  drop constraint if exists
    supplier_return_items_origin_check;

alter table public.supplier_return_items
  add constraint
    supplier_return_items_origin_check
  check (
    (
      quick_purchase_item_id is not null
      and goods_receipt_item_id is null
    )
    or
    (
      quick_purchase_item_id is null
      and goods_receipt_item_id is not null
    )
  );

alter table public.supplier_return_items
  drop constraint if exists
    supplier_return_items_purchase_item_unique;

alter table public.supplier_return_items
  add constraint
    supplier_return_items_quick_purchase_item_unique
  unique (
    supplier_return_id,
    quick_purchase_item_id
  );

alter table public.supplier_return_items
  add constraint
    supplier_return_items_goods_receipt_item_unique
  unique (
    supplier_return_id,
    goods_receipt_item_id
  );


/* =========================================================
 * 3. Create Supplier Return From Goods Receipt
 * ========================================================= */

create or replace function
  public.create_supplier_return_from_goods_receipt(
    p_goods_receipt_id uuid,
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

  v_receipt
    public.goods_receipts%rowtype;

  v_purchase_order
    public.purchase_orders%rowtype;

  v_receipt_item
    public.goods_receipt_items%rowtype;

  v_purchase_item
    public.purchase_order_items%rowtype;

  v_inventory_item
    public.inventory_transaction_items%rowtype;

  v_item jsonb;

  v_return_id uuid;

  v_return_number text;

  v_goods_receipt_item_id uuid;

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
   * Validate Header
   * ======================================================= */

  if
    p_goods_receipt_id is null
  then
    raise exception
      'Goods Receipt ID is required.';
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
   * Lock Completed Goods Receipt
   * ======================================================= */

  select
    *
  into
    v_receipt
  from
    public.goods_receipts
  where
    id =
      p_goods_receipt_id
  for update;

  if not found then
    raise exception
      'Goods Receipt was not found.';
  end if;

  if
    v_receipt.status <>
      'completed'
  then
    raise exception
      'Goods Receipt % must be completed before a Supplier Return can be created.',
      v_receipt.receipt_number;
  end if;

  if
    v_receipt.supplier_id is null
  then
    raise exception
      'Supplier Return requires a registered supplier.';
  end if;


  /* =======================================================
   * Lock Purchase Order
   * ======================================================= */

  select
    *
  into
    v_purchase_order
  from
    public.purchase_orders
  where
    id =
      v_receipt.purchase_order_id
  for update;

  if not found then
    raise exception
      'Purchase Order for Goods Receipt % was not found.',
      v_receipt.receipt_number;
  end if;

  if
    v_purchase_order.supplier_id <>
      v_receipt.supplier_id
  then
    raise exception
      'Goods Receipt % and Purchase Order % do not belong to the same supplier.',
      v_receipt.receipt_number,
      v_purchase_order.po_number;
  end if;


  /* =======================================================
   * Prevent Duplicate GRN Items
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
              'goodsReceiptItemId'
        )
      from
        jsonb_array_elements(
          p_items
        )
          item
    )
  then
    raise exception
      'The same Goods Receipt item cannot appear more than once in one Supplier Return.';
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
    goods_receipt_id,
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
    null,
    v_receipt.id,
    v_receipt.supplier_id,
    v_receipt.warehouse_id,
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
    v_purchase_order.currency_code,
    v_purchase_order.exchange_rate,
    case
      when v_purchase_order.vat_recovery_status = 'recoverable'
        and coalesce(v_purchase_order.tax_amount, 0) > 0
        then 'standard_vat'

      when v_purchase_order.vat_recovery_status = 'pending'
        and coalesce(v_purchase_order.tax_amount, 0) > 0
        then 'vat_pending'

      else
        'no_vat'
    end,
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
   * Process Return Items
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
      v_line_number + 1;

    begin

      v_goods_receipt_item_id :=
        nullif(
          v_item ->>
            'goodsReceiptItemId',
          ''
        )::uuid;

    exception
      when others then
        raise exception
          'Supplier Return line % requires a valid Goods Receipt item.',
          v_line_number;
    end;

    if
      v_goods_receipt_item_id
        is null
    then
      raise exception
        'Supplier Return line % requires a Goods Receipt item.',
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
     * Lock Original GRN Item
     * ----------------------------------------------------- */

    select
      *
    into
      v_receipt_item
    from
      public.goods_receipt_items
    where
      id =
        v_goods_receipt_item_id
      and
      goods_receipt_id =
        v_receipt.id
    for update;

    if not found then
      raise exception
        'Supplier Return line % does not belong to Goods Receipt %.',
        v_line_number,
        v_receipt.receipt_number;
    end if;

    if
      v_receipt_item.accepted_quantity <=
        0
    then
      raise exception
        'Goods Receipt % line % has no accepted quantity to return.',
        v_receipt.receipt_number,
        v_receipt_item.line_number;
    end if;


    /* -----------------------------------------------------
     * Lock Purchase Order Item
     * ----------------------------------------------------- */

    select
      *
    into
      v_purchase_item
    from
      public.purchase_order_items
    where
      id =
        v_receipt_item.purchase_order_item_id
      and
      purchase_order_id =
        v_purchase_order.id
    for update;

    if not found then
      raise exception
        'Purchase Order item for Goods Receipt % line % was not found.',
        v_receipt.receipt_number,
        v_receipt_item.line_number;
    end if;


    /* -----------------------------------------------------
     * Resolve Exact Original Inventory Item
     * ----------------------------------------------------- */

    select
      inventory_item.*
    into
      v_inventory_item
    from
      public.inventory_transaction_items
        inventory_item
    inner join
      public.inventory_transactions
        inventory_transaction
      on
        inventory_transaction.id =
          inventory_item.inventory_transaction_id
    where
      inventory_transaction.reference_type =
        'goods_receipt'
      and
      inventory_transaction.reference_id =
        v_receipt.id
      and
      inventory_transaction.status =
        'posted'
      and
      inventory_item.source_document_item_id =
        v_receipt_item.id;

    if not found then
      raise exception
        'Goods Receipt % line % does not have valid posted inventory lineage.',
        v_receipt.receipt_number,
        v_receipt_item.line_number;
    end if;

    if
      v_inventory_item.product_id <>
        v_receipt_item.product_id
    then
      raise exception
        'Goods Receipt % line % inventory lineage points to a different product.',
        v_receipt.receipt_number,
        v_receipt_item.line_number;
    end if;

    if
      v_inventory_item.warehouse_id <>
        v_receipt.warehouse_id
    then
      raise exception
        'Goods Receipt % line % inventory warehouse does not match the receipt warehouse.',
        v_receipt.receipt_number,
        v_receipt_item.line_number;
    end if;

    if
      v_inventory_item.quantity_change <=
        0
    then
      raise exception
        'Goods Receipt % line % does not point to a positive inventory receipt.',
        v_receipt.receipt_number,
        v_receipt_item.line_number;
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
      supplier_return_item.goods_receipt_item_id =
        v_receipt_item.id
      and
      supplier_return.status <>
        'cancelled';

    v_remaining_returnable :=
      greatest(
        v_receipt_item.accepted_quantity
        -
        v_already_returned,
        0
      );

    if
      v_quantity_returned >
        v_remaining_returnable
    then
      raise exception
        'Return quantity % exceeds remaining returnable quantity % for Goods Receipt line %.',
        v_quantity_returned,
        v_remaining_returnable,
        v_receipt_item.line_number;
    end if;


    /* -----------------------------------------------------
     * Commercial Return Amount
     *
     * PO line amounts represent ordered quantity.
     * Only the quantity being returned from this GRN is
     * reversed.
     * ----------------------------------------------------- */

    if
      v_purchase_item.ordered_quantity <=
        0
    then
      raise exception
        'Purchase Order line % has an invalid ordered quantity.',
        v_purchase_item.line_number;
    end if;

    v_ratio :=
      v_quantity_returned
      /
      v_purchase_item.ordered_quantity;

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
      goods_receipt_item_id,
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
      null,
      v_receipt_item.id,
      v_inventory_item.id,
      v_receipt_item.product_id,
      v_receipt.warehouse_id,
      v_quantity_returned,
      v_inventory_item.unit_cost,
      v_line_return_cost,
      v_line_subtotal,
      v_purchase_item.tax_percent,
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
   * VAT Split
   * ======================================================= */

    v_recoverable_tax :=
    0;

  v_pending_tax :=
    0;

  if
    coalesce(v_tax_amount, 0) >
      0
  then

    if
      v_purchase_order.vat_recovery_status =
        'recoverable'
    then

      v_recoverable_tax :=
        v_tax_amount;

    elsif
      v_purchase_order.vat_recovery_status =
        'pending'
    then

      v_pending_tax :=
        v_tax_amount;

    end if;

  end if;


  /* =======================================================
   * Update Header Totals
   * ======================================================= */

  update
    public.supplier_returns
  set
    subtotal =
      round(
        v_subtotal,
        2
      ),
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


  return
    v_return_id;

end;
$$;


/* =========================================================
 * 4. Permissions
 * ========================================================= */

revoke all on function
  public.create_supplier_return_from_goods_receipt(
    uuid,
    date,
    date,
    text,
    jsonb,
    text
  )
from public;

grant execute on function
  public.create_supplier_return_from_goods_receipt(
    uuid,
    date,
    date,
    text,
    jsonb,
    text
  )
to authenticated;


comment on function
  public.create_supplier_return_from_goods_receipt(
    uuid,
    date,
    date,
    text,
    jsonb,
    text
  )
is
  'Creates a draft Supplier Return against one completed Goods Receipt using exact GRN inventory lineage and proportional Purchase Order commercial/VAT values.';

/* =========================================================
 * Supplier Return GL Posting
 *
 * Extends the existing Supplier Return posting workflow so a
 * Supplier Return may originate from either:
 *
 *   1. Quick Purchase
 *   2. Completed Goods Receipt / Purchase Order
 *
 * Physical inventory dispatch continues to use the historical
 * inventory acquisition cost recorded on supplier_return_items.
 *
 * For Goods Receipt returns, the GL Inventory reversal mirrors
 * the original Goods Receipt accounting basis:
 *
 *   proportional PO line_subtotal
 *
 * plus non-recoverable VAT where applicable.
 * ========================================================= */

create or replace function
  public.post_supplier_return_gl(
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

  v_purchase
    public.quick_purchases%rowtype;

  v_receipt
    public.goods_receipts%rowtype;

  v_order
    public.purchase_orders%rowtype;

  v_inventory_transaction
    public.inventory_transactions%rowtype;


  /* Source */

  v_is_quick_purchase boolean := false;

  v_is_goods_receipt boolean := false;

  v_source_balance_due
    numeric(18, 2);


  /* GL Accounts */

  v_inventory_account_id uuid;

  v_vat_recoverable_account_id uuid;

  v_vat_pending_account_id uuid;

  v_accounts_payable_account_id uuid;

  v_supplier_advance_account_id uuid;


  /* Transaction Currency */

  v_return_total
    numeric(18, 2);

  v_inventory_amount
    numeric(18, 2);

  v_recoverable_vat_amount
    numeric(18, 2);

  v_pending_vat_amount
    numeric(18, 2);

  v_ap_reduction_amount
    numeric(18, 2);

  v_supplier_credit_amount
    numeric(18, 2);

  v_grn_net_inventory_amount
    numeric(18, 2);

  v_grn_tax_amount
    numeric(18, 2);


  /* AED Base Currency */

  v_base_inventory_amount
    numeric(18, 2);

  v_base_recoverable_vat_amount
    numeric(18, 2);

  v_base_pending_vat_amount
    numeric(18, 2);

  v_base_total_credit
    numeric(18, 2);

  v_base_ap_reduction_amount
    numeric(18, 2);

  v_base_supplier_credit_amount
    numeric(18, 2);


  v_lines jsonb;

  v_journal_id uuid;

begin

  /* =======================================================
   * Authentication
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


  if
    p_supplier_return_id is null
  then
    raise exception
      'Supplier Return ID is required.';
  end if;


  /* =======================================================
   * Lock Supplier Return
   * ======================================================= */

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


  /* =======================================================
   * Idempotency
   * ======================================================= */

  if
    v_return.status =
      'posted'

    and

    v_return.journal_entry_id
      is not null
  then

    return
      v_return.journal_entry_id;

  end if;


  /* =======================================================
   * Must Already Be Dispatched
   * ======================================================= */

  if
    v_return.status <>
      'dispatched'
  then
    raise exception
      'Supplier Return % must be dispatched before General Ledger posting. Current status is "%".',
      v_return.return_number,
      v_return.status;
  end if;


  if
    v_return.inventory_transaction_id
      is null
  then
    raise exception
      'Supplier Return % does not have an inventory transaction.',
      v_return.return_number;
  end if;


  /* =======================================================
   * Validate Inventory Transaction
   * ======================================================= */

  select
    *
  into
    v_inventory_transaction
  from
    public.inventory_transactions
  where
    id =
      v_return.inventory_transaction_id;


  if not found then
    raise exception
      'Inventory transaction for Supplier Return % was not found.',
      v_return.return_number;
  end if;


  if
    v_inventory_transaction.status <>
      'posted'
  then
    raise exception
      'Supplier Return % inventory transaction must be posted before GL posting.',
      v_return.return_number;
  end if;


  if
    v_inventory_transaction.transaction_type <>
      'supplier_return'
  then
    raise exception
      'Supplier Return % references an invalid inventory transaction type.',
      v_return.return_number;
  end if;


  /* =======================================================
   * Determine Purchase Origin
   * ======================================================= */

  v_is_quick_purchase :=
    v_return.quick_purchase_id is not null;

  v_is_goods_receipt :=
    v_return.goods_receipt_id is not null;


  if
    v_is_quick_purchase =
      v_is_goods_receipt
  then
    raise exception
      'Supplier Return % must reference exactly one purchase origin.',
      v_return.return_number;
  end if;


  /* =======================================================
   * Quick Purchase Origin
   * ======================================================= */

  if
    v_is_quick_purchase
  then

    select
      *
    into
      v_purchase
    from
      public.quick_purchases
    where
      id =
        v_return.quick_purchase_id
    for update;


    if not found then
      raise exception
        'Original Quick Purchase for Supplier Return % was not found.',
        v_return.return_number;
    end if;


    if
      v_purchase.status <>
        'posted'
    then
      raise exception
        'Original Quick Purchase % must remain posted.',
        v_purchase.purchase_number;
    end if;


    if
      v_purchase.supplier_id is null

      or

      v_purchase.supplier_id <>
        v_return.supplier_id
    then
      raise exception
        'Supplier Return % and Quick Purchase % do not belong to the same supplier.',
        v_return.return_number,
        v_purchase.purchase_number;
    end if;


    if
      upper(
        v_return.currency_code
      )
      <>
      upper(
        v_purchase.currency_code
      )
    then
      raise exception
        'Supplier Return % currency does not match Quick Purchase %.',
        v_return.return_number,
        v_purchase.purchase_number;
    end if;


    if
      v_return.exchange_rate is null

      or

      v_return.exchange_rate <=
        0
    then
      raise exception
        'Supplier Return % does not have a valid exchange rate.',
        v_return.return_number;
    end if;


    if
      v_return.tax_treatment not in (
        'standard_vat',
        'vat_pending',
        'no_vat'
      )
    then
      raise exception
        'Supplier Return % tax treatment "%" is not supported for GL posting.',
        v_return.return_number,
        v_return.tax_treatment;
    end if;


    perform
      public.sync_quick_purchase_paid_amount(
        v_purchase.id
      );


    select
      *
    into
      v_purchase
    from
      public.quick_purchases
    where
      id =
        v_purchase.id
    for update;


    v_source_balance_due :=
      greatest(
        coalesce(
          v_purchase.balance_due,
          0
        ),
        0
      );

  end if;


  /* =======================================================
   * Goods Receipt Origin
   * ======================================================= */

  if
    v_is_goods_receipt
  then

    select
      *
    into
      v_receipt
    from
      public.goods_receipts
    where
      id =
        v_return.goods_receipt_id
    for update;


    if not found then
      raise exception
        'Original Goods Receipt for Supplier Return % was not found.',
        v_return.return_number;
    end if;


    if
      v_receipt.status <>
        'completed'
    then
      raise exception
        'Original Goods Receipt % must remain completed.',
        v_receipt.receipt_number;
    end if;


    if
      v_receipt.supplier_id is null

      or

      v_receipt.supplier_id <>
        v_return.supplier_id
    then
      raise exception
        'Supplier Return % and Goods Receipt % do not belong to the same supplier.',
        v_return.return_number,
        v_receipt.receipt_number;
    end if;


    select
      *
    into
      v_order
    from
      public.purchase_orders
    where
      id =
        v_receipt.purchase_order_id
    for update;


    if not found then
      raise exception
        'Purchase Order for Goods Receipt % was not found.',
        v_receipt.receipt_number;
    end if;


    if
      upper(
        v_return.currency_code
      )
      <>
      upper(
        v_order.currency_code
      )
    then
      raise exception
        'Supplier Return % currency does not match Purchase Order %.',
        v_return.return_number,
        v_order.po_number;
    end if;


    if
      v_order.exchange_rate is null

      or

      v_order.exchange_rate <=
        0
    then
      raise exception
        'Purchase Order % does not have a valid exchange rate.',
        v_order.po_number;
    end if;


    if
      abs(
        v_return.exchange_rate
        -
        v_order.exchange_rate
      ) >
        0.000001
    then
      raise exception
        'Supplier Return % exchange rate does not match Purchase Order %.',
        v_return.return_number,
        v_order.po_number;
    end if;


    if
      v_order.vat_recovery_status not in (
        'recoverable',
        'pending',
        'non_recoverable'
      )
    then
      raise exception
        'Purchase Order % has an invalid VAT recovery status.',
        v_order.po_number;
    end if;


    perform
      public.sync_goods_receipt_paid_amount(
        v_receipt.id
      );


    select
      *
    into
      v_receipt
    from
      public.goods_receipts
    where
      id =
        v_receipt.id
    for update;


    v_source_balance_due :=
      greatest(
        coalesce(
          v_receipt.balance_due,
          0
        ),
        0
      );

  end if;


  /* =======================================================
   * Accounting Amounts
   * ======================================================= */

  v_return_total :=
    round(
      coalesce(
        v_return.grand_total,
        0
      ),
      2
    );


  if
    v_return_total <=
      0
  then
    raise exception
      'Supplier Return % has zero or negative accounting value.',
      v_return.return_number;
  end if;


  /* -------------------------------------------------------
   * Existing Quick Purchase accounting
   * ------------------------------------------------------- */

  if
    v_is_quick_purchase
  then

    v_inventory_amount :=
      round(
        coalesce(
          v_return.inventory_cost,
          0
        ),
        2
      );


    v_recoverable_vat_amount :=
      round(
        coalesce(
          v_return.recoverable_tax_amount,
          0
        ),
        2
      );


    v_pending_vat_amount :=
      round(
        coalesce(
          v_return.pending_tax_amount,
          0
        ),
        2
      );

  end if;


  /* -------------------------------------------------------
   * Goods Receipt accounting
   *
   * Do NOT use historical physical inventory return_cost as
   * the GL Inventory value.
   *
   * The original GRN GL used the proportional PO
   * line_subtotal as its Inventory accounting value.
   * ------------------------------------------------------- */

  if
    v_is_goods_receipt
  then

    select
      round(
        coalesce(
          sum(
            case
              when poi.ordered_quantity > 0
              then
                (
                  poi.line_subtotal
                  *
                  sri.quantity_returned
                  /
                  poi.ordered_quantity
                )
              else
                0
            end
          ),
          0
        ),
        2
      ),

      round(
        coalesce(
          sum(
            case
              when poi.ordered_quantity > 0
              then
                (
                  poi.tax_amount
                  *
                  sri.quantity_returned
                  /
                  poi.ordered_quantity
                )
              else
                0
            end
          ),
          0
        ),
        2
      )

    into
      v_grn_net_inventory_amount,
      v_grn_tax_amount

    from
      public.supplier_return_items sri

    join
      public.goods_receipt_items gri
        on gri.id =
           sri.goods_receipt_item_id

    join
      public.purchase_order_items poi
        on poi.id =
           gri.purchase_order_item_id

    where
      sri.supplier_return_id =
        v_return.id;


    v_grn_net_inventory_amount :=
      round(
        coalesce(
          v_grn_net_inventory_amount,
          0
        ),
        2
      );


    v_grn_tax_amount :=
      round(
        coalesce(
          v_grn_tax_amount,
          0
        ),
        2
      );


    v_inventory_amount :=
      v_grn_net_inventory_amount;


    v_recoverable_vat_amount :=
      0;


    v_pending_vat_amount :=
      0;


    if
      v_order.vat_recovery_status =
        'recoverable'
    then

      v_recoverable_vat_amount :=
        v_grn_tax_amount;


    elsif
      v_order.vat_recovery_status =
        'pending'
    then

      v_pending_vat_amount :=
        v_grn_tax_amount;


    elsif
      v_order.vat_recovery_status =
        'non_recoverable'
    then

      /*
       * Mirror Migration 142:
       *
       * non-recoverable VAT was originally capitalised into
       * Inventory, therefore the Supplier Return credits the
       * same Inventory account.
       */

      v_inventory_amount :=
        round(
          v_inventory_amount
          +
          v_grn_tax_amount,
          2
        );

    end if;

  end if;


  if
    v_inventory_amount <
      0

    or

    v_recoverable_vat_amount <
      0

    or

    v_pending_vat_amount <
      0
  then
    raise exception
      'Supplier Return % contains invalid accounting amounts.',
      v_return.return_number;
  end if;


  /* =======================================================
   * Accounting Reconciliation
   * ======================================================= */

  if
    abs(
      v_return_total
      -
      (
        v_inventory_amount
        +
        v_recoverable_vat_amount
        +
        v_pending_vat_amount
      )
    ) >
      0.01
  then
    raise exception
      'Supplier Return % accounting value does not reconcile to Inventory plus VAT reversal.',
      v_return.return_number;
  end if;


  /* =======================================================
   * Split Return Between AP Reduction and Supplier Credit
   * ======================================================= */

  v_ap_reduction_amount :=
    least(
      v_return_total,
      v_source_balance_due
    );


  v_supplier_credit_amount :=
    round(
      v_return_total
      -
      v_ap_reduction_amount,
      2
    );


  /* =======================================================
   * Resolve GL Accounts
   * ======================================================= */

  v_inventory_account_id :=
    public.get_mapped_gl_account(
      'inventory'
    );


  if
    v_ap_reduction_amount >
      0
  then

    v_accounts_payable_account_id :=
      public.get_mapped_gl_account(
        'accounts_payable'
      );

  end if;


  if
    v_supplier_credit_amount >
      0
  then

    v_supplier_advance_account_id :=
      public.get_mapped_gl_account(
        'supplier_advances'
      );

  end if;


  if
    v_recoverable_vat_amount >
      0
  then

    v_vat_recoverable_account_id :=
      public.get_mapped_gl_account(
        'vat_recoverable'
      );

  end if;


  if
    v_pending_vat_amount >
      0
  then

    v_vat_pending_account_id :=
      public.get_mapped_gl_account(
        'vat_pending'
      );

  end if;


  /* =======================================================
   * Base Currency - AED
   * ======================================================= */

  v_base_inventory_amount :=
    round(
      v_inventory_amount
      *
      v_return.exchange_rate,
      2
    );


  v_base_recoverable_vat_amount :=
    round(
      v_recoverable_vat_amount
      *
      v_return.exchange_rate,
      2
    );


  v_base_pending_vat_amount :=
    round(
      v_pending_vat_amount
      *
      v_return.exchange_rate,
      2
    );


  v_base_total_credit :=
    round(
      v_base_inventory_amount
      +
      v_base_recoverable_vat_amount
      +
      v_base_pending_vat_amount,
      2
    );


  if
    v_supplier_credit_amount >
      0
  then

    v_base_ap_reduction_amount :=
      round(
        v_ap_reduction_amount
        *
        v_return.exchange_rate,
        2
      );


    v_base_supplier_credit_amount :=
      round(
        v_base_total_credit
        -
        v_base_ap_reduction_amount,
        2
      );

  else

    v_base_ap_reduction_amount :=
      v_base_total_credit;


    v_base_supplier_credit_amount :=
      0;

  end if;


  /* =======================================================
   * Build Journal Lines
   * ======================================================= */

  v_lines :=
    '[]'::jsonb;


  if
    v_ap_reduction_amount >
      0
  then

    v_lines :=
      v_lines
      ||
      jsonb_build_array(
        jsonb_build_object(
          'glAccountId',
            v_accounts_payable_account_id,

          'debit',
            v_ap_reduction_amount,

          'credit',
            0,

          'baseDebit',
            v_base_ap_reduction_amount,

          'baseCredit',
            0,

          'description',
            'Supplier Return AP reduction - '
            ||
            v_return.return_number,

          'supplierId',
            v_return.supplier_id,

          'sourceLineType',
            'supplier_return',

          'sourceLineId',
            v_return.id
        )
      );

  end if;


  if
    v_supplier_credit_amount >
      0
  then

    v_lines :=
      v_lines
      ||
      jsonb_build_array(
        jsonb_build_object(
          'glAccountId',
            v_supplier_advance_account_id,

          'debit',
            v_supplier_credit_amount,

          'credit',
            0,

          'baseDebit',
            v_base_supplier_credit_amount,

          'baseCredit',
            0,

          'description',
            'Supplier Credit from '
            ||
            v_return.return_number,

          'supplierId',
            v_return.supplier_id,

          'sourceLineType',
            'supplier_return',

          'sourceLineId',
            v_return.id
        )
      );

  end if;


  if
    v_inventory_amount >
      0
  then

    v_lines :=
      v_lines
      ||
      jsonb_build_array(
        jsonb_build_object(
          'glAccountId',
            v_inventory_account_id,

          'debit',
            0,

          'credit',
            v_inventory_amount,

          'baseDebit',
            0,

          'baseCredit',
            v_base_inventory_amount,

          'description',
            'Inventory returned to supplier - '
            ||
            v_return.return_number,

          'supplierId',
            v_return.supplier_id,

          'sourceLineType',
            'supplier_return',

          'sourceLineId',
            v_return.id
        )
      );

  end if;


  if
    v_recoverable_vat_amount >
      0
  then

    v_lines :=
      v_lines
      ||
      jsonb_build_array(
        jsonb_build_object(
          'glAccountId',
            v_vat_recoverable_account_id,

          'debit',
            0,

          'credit',
            v_recoverable_vat_amount,

          'baseDebit',
            0,

          'baseCredit',
            v_base_recoverable_vat_amount,

          'description',
            'Recoverable Input VAT reversal - '
            ||
            v_return.return_number,

          'supplierId',
            v_return.supplier_id,

          'sourceLineType',
            'supplier_return',

          'sourceLineId',
            v_return.id
        )
      );

  end if;


  if
    v_pending_vat_amount >
      0
  then

    v_lines :=
      v_lines
      ||
      jsonb_build_array(
        jsonb_build_object(
          'glAccountId',
            v_vat_pending_account_id,

          'debit',
            0,

          'credit',
            v_pending_vat_amount,

          'baseDebit',
            0,

          'baseCredit',
            v_base_pending_vat_amount,

          'description',
            'Pending Input VAT reversal - '
            ||
            v_return.return_number,

          'supplierId',
            v_return.supplier_id,

          'sourceLineType',
            'supplier_return',

          'sourceLineId',
            v_return.id
        )
      );

  end if;


  /* =======================================================
   * Controlled GL Posting
   * ======================================================= */

  v_journal_id :=
    public.post_erp_gl_journal(
      'supplier_return',

      v_return.id,

      v_return.return_number,

      v_return.return_date,

      v_return.posting_date,

      'Supplier Return / Debit Note - '
      ||
      v_return.return_number,

      v_return.currency_code,

      v_return.exchange_rate,

      v_lines
    );


  /* =======================================================
   * Finalize Supplier Return
   * ======================================================= */

  update
    public.supplier_returns

  set
    status =
      'posted',

    ap_reduction_amount =
      v_ap_reduction_amount,

    supplier_credit_amount =
      v_supplier_credit_amount,

    supplier_credit_applied_amount =
      0,

    journal_entry_id =
      v_journal_id,

    posted_at =
      now(),

    posted_by =
      v_user_id,

    updated_by =
      v_user_id,

    updated_at =
      now()

  where
    id =
      v_return.id;


  /* =======================================================
   * Final Operational AP Synchronization
   * ======================================================= */

  if
    v_is_quick_purchase
  then

    perform
      public.sync_quick_purchase_paid_amount(
        v_purchase.id
      );

  else

    perform
      public.sync_goods_receipt_paid_amount(
        v_receipt.id
      );

  end if;


  return
    v_journal_id;

end;
$$;


/* =========================================================
 * Permissions
 * ========================================================= */

revoke all
on function
  public.post_supplier_return_gl(
    uuid
  )
from public;


grant execute
on function
  public.post_supplier_return_gl(
    uuid
  )
to authenticated;


comment on function
  public.post_supplier_return_gl(
    uuid
  )
is
  'Posts a dispatched Supplier Return from either a Quick Purchase or completed Goods Receipt to the General Ledger. Goods Receipt returns reverse the same proportional Purchase Order Inventory and VAT accounting basis used by the original Goods Receipt while physical stock continues to use exact historical inventory cost.';