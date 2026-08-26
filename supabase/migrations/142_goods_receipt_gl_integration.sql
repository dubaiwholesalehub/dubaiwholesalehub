/* =========================================================
 * Migration 142
 * Goods Receipt -> General Ledger Integration
 *
 * Purpose
 * -------
 * Integrate the normal Purchase Order / Goods Receipt
 * workflow with the General Ledger.
 *
 * Accounting model
 * ----------------
 *
 * Recoverable VAT:
 *   Dr Inventory
 *   Dr VAT Recoverable
 *      Cr Accounts Payable
 *
 * Pending VAT:
 *   Dr Inventory
 *   Dr VAT Pending
 *      Cr Accounts Payable
 *
 * Non-recoverable VAT:
 *   Dr Inventory (including VAT)
 *      Cr Accounts Payable
 *
 * Only accepted Goods Receipt quantities are recognised.
 *
 * The managed Goods Receipt completion wrapper will:
 *
 *   1. complete the operational Goods Receipt
 *   2. post its GL journal
 *
 * Both operations execute in the same PostgreSQL transaction.
 * ========================================================= */


/* =========================================================
 * 1. Purchase Order accounting metadata
 * ========================================================= */

alter table public.purchase_orders
add column if not exists
  exchange_rate numeric(18, 6)
  not null
  default 1;


alter table public.purchase_orders
add column if not exists
  vat_recovery_status text
  not null
  default 'pending';


alter table public.purchase_orders
drop constraint if exists
  purchase_orders_exchange_rate_positive;


alter table public.purchase_orders
add constraint
  purchase_orders_exchange_rate_positive
  check (
    exchange_rate > 0
  );


alter table public.purchase_orders
drop constraint if exists
  purchase_orders_vat_recovery_status_check;


alter table public.purchase_orders
add constraint
  purchase_orders_vat_recovery_status_check
  check (
    vat_recovery_status in (
      'recoverable',
      'pending',
      'non_recoverable'
    )
  );


comment on column
  public.purchase_orders.exchange_rate
is
  'Exchange rate from Purchase Order currency to base currency AED.';


comment on column
  public.purchase_orders.vat_recovery_status
is
  'Input VAT accounting treatment for the Purchase Order: recoverable, pending or non_recoverable.';


/* =========================================================
 * 2. Goods Receipt -> GL Posting Adapter
 * ========================================================= */

create or replace function
  public.post_goods_receipt_gl(
    p_goods_receipt_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare

  v_receipt
    public.goods_receipts%rowtype;

  v_order
    public.purchase_orders%rowtype;


  v_inventory_account_id uuid;

  v_vat_recoverable_account_id uuid;

  v_vat_pending_account_id uuid;

  v_accounts_payable_account_id uuid;


  v_inventory_amount
    numeric(18, 2);

  v_tax_amount
    numeric(18, 2);

  v_recoverable_vat_amount
    numeric(18, 2);

  v_pending_vat_amount
    numeric(18, 2);

  v_payable_amount
    numeric(18, 2);


  v_base_inventory_amount
    numeric(18, 2);

  v_base_recoverable_vat_amount
    numeric(18, 2);

  v_base_pending_vat_amount
    numeric(18, 2);

  v_base_payable_amount
    numeric(18, 2);


  v_lines jsonb;

  v_journal_id uuid;

begin

  /* =======================================================
   * Authentication / authorization
   * ======================================================= */

  if
    auth.uid() is null
  then
    raise exception
      'Authentication is required.';
  end if;


  if
    not public.is_admin()
  then
    raise exception
      'Administrator or manager access is required to post Goods Receipt General Ledger journals.';
  end if;


  if
    p_goods_receipt_id is null
  then
    raise exception
      'Goods Receipt ID is required.';
  end if;


  /* =======================================================
   * Lock Goods Receipt
   * ======================================================= */

  select
    *
  into
    v_receipt
  from
    public.goods_receipts
  where
    id = p_goods_receipt_id
  for update;


  if not found then
    raise exception
      'Goods Receipt was not found.';
  end if;


  if
    v_receipt.status <> 'completed'
  then
    raise exception
      'Goods Receipt % must be completed before General Ledger posting.',
      v_receipt.receipt_number;
  end if;


  /* =======================================================
   * Lock Purchase Order
   * ======================================================= */

  select
    *
  into
    v_order
  from
    public.purchase_orders
  where
    id = v_receipt.purchase_order_id
  for update;


  if not found then
    raise exception
      'Purchase Order for Goods Receipt % was not found.',
      v_receipt.receipt_number;
  end if;


  if
    v_order.currency_code is null
    or
    trim(v_order.currency_code) = ''
  then
    raise exception
      'Purchase Order % does not have a valid currency.',
      v_order.po_number;
  end if;


  if
    v_order.exchange_rate is null
    or
    v_order.exchange_rate <= 0
  then
    raise exception
      'Purchase Order % does not have a valid exchange rate.',
      v_order.po_number;
  end if;


  /* =======================================================
   * Calculate accepted Goods Receipt value
   *
   * The PO line is the commercial/tax authority.
   * The GRN accepted quantity determines how much of that
   * PO line is recognised by this receipt.
   *
   * Net amount:
   *   PO line_subtotal proportion attributable to accepted qty
   *
   * Tax:
   *   PO tax_amount proportion attributable to accepted qty
   * ======================================================= */

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
                gri.accepted_quantity
                /
                poi.ordered_quantity
              )
            else 0
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
                gri.accepted_quantity
                /
                poi.ordered_quantity
              )
            else 0
          end
        ),
        0
      ),
      2
    )

  into
    v_inventory_amount,
    v_tax_amount

  from
    public.goods_receipt_items gri

  join
    public.purchase_order_items poi
      on poi.id =
         gri.purchase_order_item_id

  where
    gri.goods_receipt_id =
      v_receipt.id

    and
    gri.accepted_quantity > 0;


  v_inventory_amount :=
    round(
      coalesce(
        v_inventory_amount,
        0
      ),
      2
    );


  v_tax_amount :=
    round(
      coalesce(
        v_tax_amount,
        0
      ),
      2
    );


  /* =======================================================
   * VAT treatment
   * ======================================================= */

  v_recoverable_vat_amount := 0;

  v_pending_vat_amount := 0;


  if
    v_order.vat_recovery_status =
      'recoverable'
  then

    v_recoverable_vat_amount :=
      v_tax_amount;

  elsif
    v_order.vat_recovery_status =
      'pending'
  then

    v_pending_vat_amount :=
      v_tax_amount;

  elsif
    v_order.vat_recovery_status =
      'non_recoverable'
  then

    /*
     * Non-recoverable VAT becomes part of inventory cost.
     */

    v_inventory_amount :=
      round(
        v_inventory_amount
        +
        v_tax_amount,
        2
      );

  else

    raise exception
      'Purchase Order % has an invalid VAT recovery status.',
      v_order.po_number;

  end if;


  v_payable_amount :=
    round(
      v_inventory_amount
      +
      v_recoverable_vat_amount
      +
      v_pending_vat_amount,
      2
    );


  /* =======================================================
   * Validate accounting amounts
   * ======================================================= */

  if
    v_payable_amount <= 0
  then
    raise exception
      'Goods Receipt % has zero or negative accounting value.',
      v_receipt.receipt_number;
  end if;


  if
    v_inventory_amount < 0
    or
    v_recoverable_vat_amount < 0
    or
    v_pending_vat_amount < 0
  then
    raise exception
      'Goods Receipt % contains invalid accounting amounts.',
      v_receipt.receipt_number;
  end if;


  /* =======================================================
   * Base Currency = AED
   * ======================================================= */

  v_base_inventory_amount :=
    round(
      v_inventory_amount
      *
      v_order.exchange_rate,
      2
    );


  v_base_recoverable_vat_amount :=
    round(
      v_recoverable_vat_amount
      *
      v_order.exchange_rate,
      2
    );


  v_base_pending_vat_amount :=
    round(
      v_pending_vat_amount
      *
      v_order.exchange_rate,
      2
    );


  /*
   * Derive AP base value from debit components to prevent
   * FX rounding differences from creating an unbalanced
   * base-currency journal.
   */

  v_base_payable_amount :=
    round(
      v_base_inventory_amount
      +
      v_base_recoverable_vat_amount
      +
      v_base_pending_vat_amount,
      2
    );


  /* =======================================================
   * Resolve GL mappings
   * ======================================================= */

  v_inventory_account_id :=
    public.get_mapped_gl_account(
      'inventory'
    );


  v_accounts_payable_account_id :=
    public.get_mapped_gl_account(
      'accounts_payable'
    );


  if
    v_recoverable_vat_amount > 0
  then

    v_vat_recoverable_account_id :=
      public.get_mapped_gl_account(
        'vat_recoverable'
      );

  end if;


  if
    v_pending_vat_amount > 0
  then

    v_vat_pending_account_id :=
      public.get_mapped_gl_account(
        'vat_pending'
      );

  end if;

/* =========================================================
 * 3. Build Goods Receipt GL journal lines
 * ========================================================= */

  v_lines :=
    jsonb_build_array(

      jsonb_build_object(
        'glAccountId',
          v_inventory_account_id,

        'debit',
          v_inventory_amount,

        'credit',
          0,

        'baseDebit',
          v_base_inventory_amount,

        'baseCredit',
          0,

        'description',
          'Inventory Receipt - '
          ||
          v_receipt.receipt_number,

        'supplierId',
          v_receipt.supplier_id
      )
    );


  /* =======================================================
   * Recoverable VAT Debit
   * ======================================================= */

  if
    v_recoverable_vat_amount > 0
  then

    v_lines :=
      v_lines
      ||
      jsonb_build_array(

        jsonb_build_object(
          'glAccountId',
            v_vat_recoverable_account_id,

          'debit',
            v_recoverable_vat_amount,

          'credit',
            0,

          'baseDebit',
            v_base_recoverable_vat_amount,

          'baseCredit',
            0,

          'description',
            'Recoverable Input VAT - '
            ||
            v_receipt.receipt_number,

          'supplierId',
            v_receipt.supplier_id
        )
      );

  end if;


  /* =======================================================
   * Pending VAT Debit
   * ======================================================= */

  if
    v_pending_vat_amount > 0
  then

    v_lines :=
      v_lines
      ||
      jsonb_build_array(

        jsonb_build_object(
          'glAccountId',
            v_vat_pending_account_id,

          'debit',
            v_pending_vat_amount,

          'credit',
            0,

          'baseDebit',
            v_base_pending_vat_amount,

          'baseCredit',
            0,

          'description',
            'Input VAT Pending - '
            ||
            v_receipt.receipt_number,

          'supplierId',
            v_receipt.supplier_id
        )
      );

  end if;


  /* =======================================================
   * Accounts Payable Credit
   * ======================================================= */

  v_lines :=
    v_lines
    ||
    jsonb_build_array(

      jsonb_build_object(
        'glAccountId',
          v_accounts_payable_account_id,

        'debit',
          0,

        'credit',
          v_payable_amount,

        'baseDebit',
          0,

        'baseCredit',
          v_base_payable_amount,

        'description',
          'Accounts Payable - '
          ||
          v_receipt.receipt_number,

        'supplierId',
          v_receipt.supplier_id
      )
    );


  /* =======================================================
   * Post Through Controlled GL Engine
   *
   * post_erp_gl_journal() provides:
   *
   * - open-period validation
   * - GL account validation
   * - duplicate-source protection
   * - journal balancing
   * - immutable posting
   * - idempotent ERP source handling
   * ======================================================= */

  v_journal_id :=
    public.post_erp_gl_journal(
      'goods_receipt',
      v_receipt.id,
      v_receipt.receipt_number,

      coalesce(
        v_receipt.received_date,
        v_receipt.completed_at::date,
        current_date
      ),

      coalesce(
        v_receipt.received_date,
        v_receipt.completed_at::date,
        current_date
      ),

      'Goods Receipt liability recognition - '
      ||
      v_receipt.receipt_number,

      v_order.currency_code,
      v_order.exchange_rate,
      v_lines
    );


  return
    v_journal_id;

end;
$$;


/* =========================================================
 * 4. Goods Receipt GL Adapter Permissions
 * ========================================================= */

revoke all
on function
  public.post_goods_receipt_gl(
    uuid
  )
from public;


grant execute
on function
  public.post_goods_receipt_gl(
    uuid
  )
to authenticated;


/* =========================================================
 * 5. Integrate GL posting into managed completion workflow
 *
 * Important:
 *
 * complete_goods_receipt() remains the canonical operational
 * workflow.
 *
 * The management wrapper now performs:
 *
 *   complete_goods_receipt()
 *          +
 *   post_goods_receipt_gl()
 *
 * Because both execute inside this function invocation,
 * failure of GL posting rolls back Goods Receipt completion.
 * ========================================================= */

create or replace function
  public.complete_goods_receipt_managed(
    p_goods_receipt_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare

  v_user_id uuid;

  v_inventory_transaction_id uuid;

  v_journal_id uuid;

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
      'Administrator or manager access is required to complete Goods Receipts.';
  end if;


  if
    p_goods_receipt_id is null
  then
    raise exception
      'Goods Receipt ID is required.';
  end if;


  /* =======================================================
   * Operational completion
   * ======================================================= */

  v_inventory_transaction_id :=
    public.complete_goods_receipt(
      p_goods_receipt_id
    );


  if
    v_inventory_transaction_id is null
  then
    raise exception
      'Goods Receipt completion did not return an inventory transaction.';
  end if;


  /* =======================================================
   * General Ledger posting
   * ======================================================= */

  v_journal_id :=
    public.post_goods_receipt_gl(
      p_goods_receipt_id
    );


  if
    v_journal_id is null
  then
    raise exception
      'Goods Receipt General Ledger posting did not return a journal.';
  end if;


  /*
   * Preserve the existing managed wrapper contract.
   *
   * Application repositories already expect the Inventory
   * Transaction UUID from complete_goods_receipt_managed().
   */

  return
    v_inventory_transaction_id;

end;
$$;


/* =========================================================
 * 6. Managed Wrapper Permissions
 * ========================================================= */

revoke all
on function
  public.complete_goods_receipt_managed(
    uuid
  )
from public;


grant execute
on function
  public.complete_goods_receipt_managed(
    uuid
  )
to authenticated;


/* =========================================================
 * 7. Documentation
 * ========================================================= */

comment on function
  public.post_goods_receipt_gl(
    uuid
  )
is
  'Posts the General Ledger journal for a completed Goods Receipt. Recognises only accepted quantities and posts Inventory, Recoverable/Pending VAT where applicable, and Accounts Payable through the controlled ERP GL posting engine.';


comment on function
  public.complete_goods_receipt_managed(
    uuid
  )
is
  'Management-only atomic Goods Receipt completion workflow. Completes the operational Goods Receipt and posts the corresponding Inventory, VAT and Accounts Payable General Ledger journal through post_goods_receipt_gl().';


/* =========================================================
 * End Migration 142
 * ========================================================= */