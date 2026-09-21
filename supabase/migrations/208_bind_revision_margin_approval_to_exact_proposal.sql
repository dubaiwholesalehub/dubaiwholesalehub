/*
 * 205 - Posted Sale Revision Margin Protection
 *
 * Posted-sale modifications must comply with the active Sales Margin
 * Policy before the revision can become applied.
 *
 * Historical Sales Order margin approvals are deliberately not reused.
 * Existing approvals are order-level and are not bound to the revised
 * commercial state.
 */

 alter table public.sales_order_revisions
  add column if not exists approval_snapshot_hash text;

comment on column
  public.sales_order_revisions.approval_snapshot_hash
is
  'Hash of the exact proposed after_snapshot submitted to the posted-sale Apply workflow and used to bind revision-specific margin approval.';

create or replace function
  public.validate_sales_order_revision_margin(
    p_sales_order_id uuid
  )
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_policy
    public.sales_margin_policy%rowtype;

  v_line record;

  v_revision_id uuid;

  v_revision
    public.sales_order_revisions%rowtype;

  v_approval
    public.sales_order_revision_margin_approvals%rowtype;

  v_current_hash text;

  v_warning_count integer := 0;

  v_blocked_count integer := 0;

  v_missing_cost_count integer := 0;

  v_lowest_margin numeric(18,4);

  v_requires_approval boolean := false;

begin

  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception
      'Authentication is required.';
  end if;

  if not public.is_admin() then
    raise exception
      'You are not authorized to validate revision margins.';
  end if;


  select *
  into v_policy
  from public.sales_margin_policy
  where is_active = true
  order by updated_at desc
  limit 1;

  if not found then
    raise exception
      'No active sales margin policy exists.';
  end if;


  /*
   * Apply has already created the draft revision inside the
   * same transaction. Find that exact current revision.
   */

  select
    sor.id
  into
    v_revision_id
  from public.sales_order_revisions sor
  where
    sor.sales_order_id =
      p_sales_order_id
    and
    sor.status = 'draft'
    and
    sor.created_by =
      v_user_id
  order by
    sor.created_at desc
  limit 1;


  if v_revision_id is null then
    raise exception
      'Active Sales Order revision context was not found.';
  end if;


  select *
  into v_revision
  from public.sales_order_revisions
  where id = v_revision_id
  for update;


  /*
   * after_snapshot is the exact proposed snapshot captured by
   * the Apply engine before transactional changes were made.
   */

  /*
 * Approval was requested against the canonical commercial proposal
 * supplied by Modify Sale.
 *
 * The revision engine enriches after_snapshot with calculated header
 * values before this validator runs. Those derived values must not
 * change the identity of the proposal that was approved.
 */
if v_revision.after_snapshot is null then
  raise exception
    'Sales Order revision does not contain an after snapshot.';
end if;


/*
 * Approval identity comes from the exact proposal submitted
 * to Apply, before after_snapshot is normalized or enriched.
 */
if v_revision.approval_snapshot_hash is null
   or btrim(v_revision.approval_snapshot_hash) = ''
then
  raise exception
    'Sales Order revision does not contain an approval snapshot hash.';
end if;

v_current_hash :=
  v_revision.approval_snapshot_hash;


  /*
   * Validate FINAL transactional margin state.
   */

  for v_line in

    select *
    from public.sales_order_margin_analysis
    where
      sales_order_id =
        p_sales_order_id
      and
      fulfilment_method =
        'stock'
    order by
      line_number

  loop

    if
      v_line.current_unit_cost is null
      or
      v_line.current_unit_cost <= 0
    then

      v_missing_cost_count :=
        v_missing_cost_count + 1;

      if v_policy.block_when_cost_missing then
        v_requires_approval := true;
      end if;

      continue;

    end if;


    if
      v_lowest_margin is null
      or
      (
        v_line.estimated_margin_percentage
          is not null
        and
        v_line.estimated_margin_percentage <
          v_lowest_margin
      )
    then

      v_lowest_margin :=
        v_line.estimated_margin_percentage;

    end if;


    if
      v_line.estimated_margin_percentage
        is not null
      and
      v_line.estimated_margin_percentage <
        v_policy.minimum_margin_percentage
    then

      v_blocked_count :=
        v_blocked_count + 1;

      if v_policy.block_below_minimum then
        v_requires_approval := true;
      end if;

    elsif
      v_line.estimated_margin_percentage
        is not null
      and
      v_line.estimated_margin_percentage <
        v_policy.warning_margin_percentage
    then

      v_warning_count :=
        v_warning_count + 1;

    end if;

  end loop;


  /*
   * Healthy/warning state requires no exception approval.
   */

  if not v_requires_approval then

    return jsonb_build_object(
      'salesOrderId',
        p_sales_order_id,

      'revisionId',
        v_revision_id,

      'snapshotHash',
        v_current_hash,

      'warningMarginPercentage',
        v_policy.warning_margin_percentage,

      'minimumMarginPercentage',
        v_policy.minimum_margin_percentage,

      'warningCount',
        v_warning_count,

      'blockedCount',
        v_blocked_count,

      'missingCostCount',
        v_missing_cost_count,

      'lowestMarginPercentage',
        v_lowest_margin,

      'approvalRequired',
        false,

      'hasApproval',
        false
    );

  end if;


  /*
   * Below-minimum/missing-cost state:
   * require APPROVED approval for this exact snapshot.
   */

  select *
  into v_approval
  from public.sales_order_revision_margin_approvals a
  where
    a.sales_order_id =
      p_sales_order_id
    and
    a.snapshot_hash =
      v_current_hash
    and
    a.status =
      'approved'
  order by
    a.approved_at desc
  limit 1
  for update;


  if not found then
    raise exception
      'Admin approval required for this exact posted-sale modification. Request margin approval before applying the revision.';
  end if;


  /*
   * Consume approval atomically.
   *
   * If anything later in Apply fails, PostgreSQL rolls this
   * update back together with the entire revision.
   */

  update
    public.sales_order_revision_margin_approvals
  set
    status =
      'consumed',

    consumed_by_revision_id =
      v_revision_id,

    consumed_at =
      now(),

    updated_at =
      now()

  where
    id =
      v_approval.id
    and
    status =
      'approved';


  if not found then
    raise exception
      'The revision margin approval could not be consumed.';
  end if;


  return jsonb_build_object(
    'salesOrderId',
      p_sales_order_id,

    'revisionId',
      v_revision_id,

    'approvalId',
      v_approval.id,

    'snapshotHash',
      v_current_hash,

    'warningMarginPercentage',
      v_policy.warning_margin_percentage,

    'minimumMarginPercentage',
      v_policy.minimum_margin_percentage,

    'warningCount',
      v_warning_count,

    'blockedCount',
      v_blocked_count,

    'missingCostCount',
      v_missing_cost_count,

    'lowestMarginPercentage',
      v_lowest_margin,

    'approvalRequired',
      true,

    'hasApproval',
      true,

    'approvalConsumed',
      true
  );

end;
$$;

revoke all
on function public.validate_sales_order_revision_margin(uuid)
from public;

grant execute
on function public.validate_sales_order_revision_margin(uuid)
to authenticated;

comment on function
  public.validate_sales_order_revision_margin(uuid)
is
  'Validates a posted Sales Order revision against the active margin policy without reusing historical order-level margin approvals.';

/*
 * 204 - Harden Posted Sale Revision Warehouse Validation
 *
 * Requires revision-added Sales Order lines to use an active warehouse.
 * Final apply remains the authoritative integrity boundary.
 * Existing stock locking, availability checks, valuation and GL behavior
 * remain unchanged.
 */
create or replace function
  public.apply_sales_order_modification(
    p_sales_order_id uuid,
    p_after_snapshot jsonb,
    p_modification_type text,
    p_reason text,
    p_idempotency_key text,
    p_notes text default null
  )
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_order public.sales_orders%rowtype;
  v_item public.sales_order_items%rowtype;
  v_stock public.warehouse_stock%rowtype;

  v_preview jsonb;
  v_before_snapshot jsonb;
  v_normalized_after jsonb;
  v_difference_snapshot jsonb;

  v_revision_id uuid;
  v_existing_revision public.sales_order_revisions%rowtype;
  v_revision_number integer;

  v_header jsonb;
  v_items jsonb;
  v_proposed jsonb;

  v_existing_count integer;
  v_proposed_count integer;
  v_match_count integer;

  v_invoice_discount numeric(18,2);
  v_shipping numeric(18,2);
  v_round_off numeric(18,2);

  v_gross_subtotal numeric(18,2) := 0;
  v_item_discount_total numeric(18,2) := 0;
  v_net_item_total numeric(18,2) := 0;
  v_tax_total numeric(18,2) := 0;
  v_grand_total numeric(18,2) := 0;
  v_balance_due numeric(18,2) := 0;
  v_customer_credit numeric(18,2) := 0;
  v_additional_due numeric(18,2) := 0;

  v_line_subtotal numeric(18,2);
  v_line_discount numeric(18,2);
  v_line_net numeric(18,2);
  v_line_tax numeric(18,2);
  v_line_total numeric(18,2);
  v_allocated_invoice_discount numeric(18,2);
  v_adjusted_taxable numeric(18,2);

  v_new_quantity numeric(18,4);
  v_new_unit_price numeric(18,4);
  v_new_discount_percentage numeric(9,4);
  v_new_tax_percentage numeric(9,4);

  v_old_tax numeric(18,2);
  v_old_total numeric(18,2);
  v_old_revenue numeric(18,2);
  v_new_revenue numeric(18,2);
  v_delta_tax numeric(18,2);
  v_delta_total numeric(18,2);
  v_delta_revenue numeric(18,2);

  v_ar_account_id uuid;
  v_revenue_account_id uuid;
  v_vat_account_id uuid;
  v_inventory_account_id uuid;
  v_cogs_account_id uuid;

  v_gl_lines jsonb := '[]'::jsonb;
  v_inventory_gl_lines jsonb := '[]'::jsonb;
  v_commercial_journal_id uuid;
  v_inventory_journal_id uuid;

  v_restore_transaction_id uuid;
  v_issue_transaction_id uuid;
  v_inventory_transaction_number text;
  v_inventory_sequence bigint;

  v_restore_total numeric(20,8) := 0;
  v_issue_total numeric(20,8) := 0;
  v_qty_difference numeric(18,4);
  v_historical_unit_cost numeric(18,4);
  v_historical_valuation_cost numeric(20,8);
  v_current_average_cost numeric(20,8);
  v_new_stock_quantity numeric(18,4);
  v_new_average_cost numeric(20,8);
  v_current_stock_value numeric(28,8);
  v_change_value numeric(28,8);

  v_line_number integer;
  v_restore_line_number integer := 0;
  v_issue_line_number integer := 0;
  v_effect_sequence integer := 0;

  v_warehouse_id uuid;
  v_order_warehouse_count integer;
  v_delivery_item_id uuid;
  v_issue_match_count integer;

  v_payment_status text;
  v_result jsonb;

  /* Paid-sale revision reconciliation. */
  v_original_paid_amount numeric(18,2) := 0;
  v_effective_paid_amount numeric(18,2) := 0;
  v_original_posted_allocation_total numeric(18,2) := 0;
  v_target_paid_amount numeric(18,2) := 0;
  v_payment_adjustment_needed numeric(18,2) := 0;
  v_payment_adjustment_remaining numeric(18,2) := 0;
  v_adjustment_amount numeric(18,2) := 0;
  v_effective_allocation_amount numeric(18,2) := 0;
  v_released_allocation_amount numeric(18,2) := 0;

  v_receipt_allocation record;

  v_customer_advances_account_id uuid;
  v_payment_reclass_journal_id uuid;
  v_payment_reclass_lines jsonb := '[]'::jsonb;
  v_allocation_adjustment_id uuid;
  v_new_item_id uuid;
  v_next_line_number integer;
  v_new_product_id uuid;
  v_new_unit_id uuid;
  v_new_warehouse_id uuid;
  v_new_item_name text;
  v_new_sku text;
  v_new_description text;
  v_new_fulfilment_method text;
  v_new_line_notes text;
begin
  /* ---------------- Security ---------------- */
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  if not public.is_admin() then
    raise exception 'Administrator access is required to apply Sales Order modifications.';
  end if;

  if p_sales_order_id is null then
    raise exception 'Sales Order ID is required.';
  end if;

  if p_after_snapshot is null or jsonb_typeof(p_after_snapshot) <> 'object' then
    raise exception 'After snapshot must be a JSON object.';
  end if;

  if p_modification_type not in ('entry_correction','commercial_adjustment') then
    raise exception 'Modification type must be entry_correction or commercial_adjustment in phase 193.';
  end if;

  if length(trim(coalesce(p_reason,''))) < 3 then
    raise exception 'Modification reason must contain at least 3 characters.';
  end if;

  if length(trim(coalesce(p_idempotency_key,''))) < 8 then
    raise exception 'A stable idempotency key of at least 8 characters is required.';
  end if;

  /* ---------------- Idempotency ---------------- */
  select *
  into v_existing_revision
  from public.sales_order_revisions
  where idempotency_key = p_idempotency_key
  limit 1;

  if found then
    if v_existing_revision.sales_order_id is distinct from p_sales_order_id then
      raise exception 'Idempotency key already belongs to another Sales Order.';
    end if;

    if v_existing_revision.status = 'applied' then
      return jsonb_build_object(
        'revisionId', v_existing_revision.id,
        'revisionNumber', v_existing_revision.revision_number,
        'status', v_existing_revision.status,
        'salesOrderId', v_existing_revision.sales_order_id,
        'originalGrandTotal', v_existing_revision.original_grand_total,
        'revisedGrandTotal', v_existing_revision.revised_grand_total,
        'totalDifference', v_existing_revision.total_difference,
        'revisedBalanceDue', v_existing_revision.revised_balance_due,
        'customerCreditAmount', v_existing_revision.customer_credit_amount,
        'additionalAmountDue', v_existing_revision.additional_amount_due,
        'commercialJournalId', v_existing_revision.commercial_journal_entry_id,
        'inventoryJournalId', v_existing_revision.inventory_journal_entry_id,
        'inventoryTransactionId', v_existing_revision.inventory_transaction_id,
        'idempotentReplay', true
      );
    end if;

    raise exception 'Idempotency key already exists with revision status "%".', v_existing_revision.status;
  end if;

  /* ---------------- Lock order ---------------- */
  select *
  into v_order
  from public.sales_orders
  where id = p_sales_order_id
  for update;

  if not found then
    raise exception 'Sales Order was not found.';
  end if;

  if v_order.status not in ('fulfilled','completed') then
    raise exception
      'Posted Sales Order modification supports fulfilled/completed Sales Orders only. Current status is "%".',
      v_order.status;
  end if;

  /* Validate accounting period before any correction work. */
  perform public.get_gl_accounting_period(current_date, true);

  /* ---------------- Canonical preview validation ---------------- */
  v_preview := public.preview_sales_order_modification(
    p_sales_order_id,
    p_after_snapshot,
    p_modification_type,
    p_reason
  );

  if v_preview is null then
    raise exception 'Sales Order modification preview returned no result.';
  end if;

  /* We preserve the canonical preview as the difference audit payload. */
  v_difference_snapshot := v_preview;

  v_header := coalesce(p_after_snapshot -> 'header', '{}'::jsonb);
  v_items := p_after_snapshot -> 'items';

  if jsonb_typeof(v_items) <> 'array' then
    raise exception 'After snapshot items must be a JSON array.';
  end if;

  /* Migration 195: active existing lines may be omitted (removal), and
     null/missing IDs represent newly added lines. Removed historical rows are
     never treated as active invoice lines again. */
  select count(*) into v_existing_count
  from public.sales_order_items
  where sales_order_id = v_order.id
    and coalesce(is_revision_removed,false) = false;

  select jsonb_array_length(v_items) into v_proposed_count;

  if exists (
    select 1
    from jsonb_array_elements(v_items) p
    where nullif(p ->> 'id','') is not null
      and not exists (
        select 1 from public.sales_order_items soi
        where soi.id = nullif(p ->> 'id','')::uuid
          and soi.sales_order_id = v_order.id
          and coalesce(soi.is_revision_removed,false) = false
      )
  ) then
    raise exception 'One or more proposed existing Sales Order lines are not active lines of this Sales Order.';
  end if;

  if exists (
    select 1 from (
      select nullif(p ->> 'id','')::uuid as id, count(*) c
      from jsonb_array_elements(v_items) p
      where nullif(p ->> 'id','') is not null
      group by nullif(p ->> 'id','')::uuid
    ) d where d.c <> 1
  ) then
    raise exception 'Duplicate existing Sales Order item IDs are not allowed.';
  end if;

  /* One warehouse keeps phase-193 inventory correction atomic and explicit. */
  select count(distinct coalesce(soi.warehouse_id, v_order.warehouse_id))
  into v_order_warehouse_count
  from public.sales_order_items soi
  where soi.sales_order_id = v_order.id
    and coalesce(soi.is_revision_removed,false) = false
    and soi.product_id is not null;

  if v_order_warehouse_count > 1 then
    raise exception 'Posted Sales Order inventory correction currently supports one warehouse per Sales Order.';
  end if;

  /* ---------------- Recalculate corrected totals ---------------- */
  v_invoice_discount := round(coalesce(nullif(v_header ->> 'invoice_discount_amount','')::numeric, v_order.invoice_discount_amount, 0),2);
  v_shipping := round(coalesce(nullif(v_header ->> 'shipping_amount','')::numeric, v_order.shipping_amount, 0),2);
  v_round_off := round(coalesce(nullif(v_header ->> 'round_off_amount','')::numeric, v_order.round_off_amount, 0),2);

  if v_invoice_discount < 0 then
    raise exception 'Invoice discount cannot be negative.';
  end if;
  if v_shipping < 0 then
    raise exception 'Delivery charge cannot be negative.';
  end if;
  if v_round_off < -10 or v_round_off > 10 then
    raise exception 'Round off must be between -10 and 10.';
  end if;

  for v_proposed in
    select value from jsonb_array_elements(v_items)
  loop
    v_item := null;
    if nullif(v_proposed ->> 'id','') is not null then
      select * into v_item
      from public.sales_order_items
      where id = nullif(v_proposed ->> 'id','')::uuid
        and sales_order_id = v_order.id
        and coalesce(is_revision_removed,false) = false
      for update;
      if not found then
        raise exception 'Existing Sales Order line is not active.';
      end if;
    end if;

    v_new_quantity := nullif(v_proposed ->> 'quantity','')::numeric;
    v_new_unit_price := nullif(v_proposed ->> 'unit_price','')::numeric;
    v_new_discount_percentage := coalesce(nullif(v_proposed ->> 'discount_percentage','')::numeric,0);
    v_new_tax_percentage := coalesce(nullif(v_proposed ->> 'tax_percentage','')::numeric,0);

    if v_new_quantity is null or v_new_quantity <= 0 then
      raise exception 'Quantity must be greater than zero.';
    end if;
    if v_new_unit_price is null or v_new_unit_price < 0 then
      raise exception 'Unit price cannot be negative.';
    end if;
    if v_new_discount_percentage < 0 or v_new_discount_percentage > 100 then
      raise exception 'Discount percentage must be between 0 and 100.';
    end if;
    if v_new_tax_percentage < 0 or v_new_tax_percentage > 100 then
      raise exception 'Tax percentage must be between 0 and 100.';
    end if;

    if nullif(v_proposed ->> 'id','') is not null
       and v_item.product_id is distinct from nullif(v_proposed ->> 'product_id','')::uuid then
      raise exception 'Existing product identity cannot be replaced in-place. Remove the old line and add a new line.';
    end if;

    v_line_subtotal := round(v_new_quantity * v_new_unit_price, 2);
    v_line_discount := round(v_line_subtotal * v_new_discount_percentage / 100, 2);
    v_line_net := round(v_line_subtotal - v_line_discount, 2);

    v_gross_subtotal := v_gross_subtotal + v_line_subtotal;
    v_item_discount_total := v_item_discount_total + v_line_discount;
    v_net_item_total := v_net_item_total + v_line_net;
  end loop;

  if v_invoice_discount > v_net_item_total then
    raise exception 'Invoice discount cannot exceed merchandise value after item discounts.';
  end if;

  /* Header VAT after proportional invoice-level discount allocation. */
  for v_proposed in
    select value from jsonb_array_elements(v_items)
  loop
    v_new_quantity := nullif(v_proposed ->> 'quantity','')::numeric;
    v_new_unit_price := nullif(v_proposed ->> 'unit_price','')::numeric;
    v_new_discount_percentage := coalesce(nullif(v_proposed ->> 'discount_percentage','')::numeric,0);
    v_new_tax_percentage := coalesce(nullif(v_proposed ->> 'tax_percentage','')::numeric,0);

    v_line_subtotal := round(v_new_quantity * v_new_unit_price, 2);
    v_line_discount := round(v_line_subtotal * v_new_discount_percentage / 100, 2);
    v_line_net := round(v_line_subtotal - v_line_discount, 2);

    v_allocated_invoice_discount := case
      when v_net_item_total > 0
      then round(v_invoice_discount * v_line_net / v_net_item_total, 2)
      else 0
    end;

    v_adjusted_taxable := greatest(round(v_line_net - v_allocated_invoice_discount,2),0);
    v_tax_total := v_tax_total + round(v_adjusted_taxable * v_new_tax_percentage / 100,2);
  end loop;

  v_gross_subtotal := round(v_gross_subtotal,2);
  v_item_discount_total := round(v_item_discount_total,2);
  v_net_item_total := round(v_net_item_total,2);
  v_tax_total := round(v_tax_total,2);
  v_grand_total := greatest(round(v_net_item_total - v_invoice_discount + v_tax_total + v_shipping + v_round_off,2),0);

  /*
   * Preserve the payment position that existed before this revision.
   *
   * paid_amount is the CURRENT EFFECTIVE allocation amount after
   * Migration 200 adjustments.  Original posted allocation rows remain
   * immutable and are used to determine how much previously released
   * value may be reapplied to this same Sales Order.
   */
  v_original_paid_amount := round(coalesce(v_order.paid_amount,0),2);
  v_effective_paid_amount := v_original_paid_amount;

  select
    round(coalesce(sum(a.amount),0),2)
  into
    v_original_posted_allocation_total
  from
    public.customer_receipt_allocations a
  join
    public.customer_receipts r
      on r.id = a.receipt_id
  where
    a.sales_order_id = v_order.id
    and r.status = 'posted';

  /*
   * Never allocate more than the revised invoice total.
   * Never automatically consume unrelated customer advances.
   *
   * The ceiling is only the immutable receipt allocations that were
   * historically attached to this Sales Order.
   */
  v_target_paid_amount :=
    least(
      v_grand_total,
      v_original_posted_allocation_total
    );

  v_customer_credit :=
    greatest(
      round(v_effective_paid_amount - v_target_paid_amount,2),
      0
    );

  v_payment_adjustment_needed :=
    round(v_target_paid_amount - v_effective_paid_amount,2);

  /*
   * Temporary values used by the revision snapshot.
   * The authoritative values are synchronized again after allocation
   * adjustments have been written.
   */
  v_balance_due :=
    greatest(
      round(v_grand_total - v_target_paid_amount,2),
      0
    );

  v_additional_due :=
    greatest(
      round(v_balance_due - coalesce(v_order.balance_due,0),2),
      0
    );

  /* ---------------- Immutable before snapshot ---------------- */
  select jsonb_build_object(
    'header', jsonb_build_object(
      'id', v_order.id,
      'order_number', v_order.order_number,
      'status', v_order.status,
      'fulfilment_status', v_order.fulfilment_status,
      'payment_status', v_order.payment_status,
      'customer_id', v_order.customer_id,
      'order_date', v_order.order_date,
      'currency_code', v_order.currency_code,
      'exchange_rate', v_order.exchange_rate,
      'subtotal', v_order.subtotal,
      'discount_amount', v_order.discount_amount,
      'invoice_discount_amount', coalesce(v_order.invoice_discount_amount,0),
      'tax_amount', v_order.tax_amount,
      'shipping_amount', v_order.shipping_amount,
      'round_off_amount', coalesce(v_order.round_off_amount,0),
      'grand_total', v_order.grand_total,
      'paid_amount', v_order.paid_amount,
      'balance_due', v_order.balance_due,
      'customer_notes', v_order.customer_notes,
      'internal_notes', v_order.internal_notes
    ),
    'items', coalesce((
      select jsonb_agg(to_jsonb(soi) order by soi.line_number)
      from public.sales_order_items soi
      where soi.sales_order_id = v_order.id
        and coalesce(soi.is_revision_removed,false) = false
    ), '[]'::jsonb)
  ) into v_before_snapshot;

  v_normalized_after := jsonb_build_object(
    'header', jsonb_build_object(
      'invoice_discount_amount', v_invoice_discount,
      'shipping_amount', v_shipping,
      'round_off_amount', v_round_off,
      'customer_notes', coalesce(v_header ->> 'customer_notes', v_order.customer_notes),
      'internal_notes', coalesce(v_header ->> 'internal_notes', v_order.internal_notes),
      'subtotal', v_gross_subtotal,
      'discount_amount', v_item_discount_total,
      'tax_amount', v_tax_total,
      'grand_total', v_grand_total,
      'paid_amount', v_target_paid_amount,
      'balance_due', v_balance_due
    ),
    'items', v_items
  );

  /* ---------------- Create draft revision ---------------- */
  perform pg_advisory_xact_lock(hashtext(v_order.id::text));

  select coalesce(max(revision_number),0) + 1
  into v_revision_number
  from public.sales_order_revisions
  where sales_order_id = v_order.id;

  insert into public.sales_order_revisions (
    sales_order_id,
    revision_number,
    modification_type,
    reason,
    notes,
    status,
    before_snapshot,
    after_snapshot,
    difference_snapshot,
    original_grand_total,
    revised_grand_total,
    total_difference,
    original_paid_amount,
    revised_balance_due,
    customer_credit_amount,
    additional_amount_due,
    idempotency_key,
    approval_snapshot_hash,
    created_by,
    created_at
  ) values (
    v_order.id,
    v_revision_number,
    p_modification_type,
    trim(p_reason),
    p_notes,
    'draft',
    v_before_snapshot,
    v_normalized_after,
    v_difference_snapshot,
    round(v_order.grand_total,2),
    v_grand_total,
    round(v_grand_total - v_order.grand_total,2),
    coalesce(v_order.paid_amount,0),
    v_balance_due,
    v_customer_credit,
    v_additional_due,
    p_idempotency_key,
    public.sales_order_revision_snapshot_hash(
      p_after_snapshot
    ),
    v_user_id,
    now()
  ) returning id into v_revision_id;

  /* Transaction-local authorization for the lifecycle guards. */
  perform set_config(
    'app.sales_order_revision_internal_write',
    v_revision_id::text,
    true
  );

  /* ---------------- Inventory corrections ----------------
   * Quantity corrections on fulfilled documents mean the physical issue
   * itself was entered incorrectly. Genuine later customer returns belong
   * to Sales Return, not this RPC.
   */
  if p_modification_type <> 'entry_correction' and (
    exists (
      select 1 from jsonb_array_elements(v_items) p
      left join public.sales_order_items soi
        on soi.id = nullif(p ->> 'id','')::uuid
       and soi.sales_order_id = v_order.id
       and coalesce(soi.is_revision_removed,false) = false
      where nullif(p ->> 'id','') is null
         or round((p ->> 'quantity')::numeric,4) <> round(soi.quantity,4)
    )
    or exists (
      select 1 from public.sales_order_items soi
      where soi.sales_order_id = v_order.id
        and coalesce(soi.is_revision_removed,false) = false
        and not exists (
          select 1 from jsonb_array_elements(v_items) p
          where nullif(p ->> 'id','')::uuid = soi.id
        )
    )
  ) then
    raise exception 'Adding, removing or changing quantity on fulfilled Sales Orders requires modification_type = entry_correction.';
  end if;

  /* Resolve the single warehouse used by physical lines. */
  select coalesce(min(coalesce(soi.warehouse_id, v_order.warehouse_id)::text)::uuid, v_order.warehouse_id)
  into v_warehouse_id
  from public.sales_order_items soi
  where soi.sales_order_id = v_order.id
    and coalesce(soi.is_revision_removed,false) = false
    and soi.product_id is not null;

  /* Create restore header only if required. */
  if exists (
    select 1
    from public.sales_order_items soi
    where soi.sales_order_id = v_order.id
      and coalesce(soi.is_revision_removed,false) = false
      and coalesce(soi.quantity_fulfilled,0) > 0
      and (
        not exists (select 1 from jsonb_array_elements(v_items) p where nullif(p ->> 'id','')::uuid = soi.id)
        or exists (select 1 from jsonb_array_elements(v_items) p where nullif(p ->> 'id','')::uuid = soi.id and (p ->> 'quantity')::numeric < soi.quantity)
      )
  ) then
    v_inventory_sequence := nextval('public.inventory_transaction_number_seq');
    v_inventory_transaction_number := 'INV-' || extract(year from current_date)::integer || '-' || lpad(v_inventory_sequence::text,6,'0');

    insert into public.inventory_transactions (
      transaction_number, transaction_type, status, transaction_date,
      warehouse_id, reference_type, reference_id, reference_number,
      description, internal_notes, posted_at, created_by, posted_by,
      created_at, updated_at
    ) values (
      v_inventory_transaction_number, 'adjustment_in', 'posted', current_date,
      v_warehouse_id, 'sales_order_revision', v_revision_id, v_order.order_number,
      'Sales Order entry correction - stock restoration - ' || v_order.order_number,
      trim(p_reason), now(), v_user_id, v_user_id, now(), now()
    ) returning id into v_restore_transaction_id;
  end if;

  /* Create issue header only if required. */
  if exists (
    select 1
    from jsonb_array_elements(v_items) p
    left join public.sales_order_items soi
      on soi.id = nullif(p ->> 'id','')::uuid
     and soi.sales_order_id = v_order.id
     and coalesce(soi.is_revision_removed,false) = false
    where (nullif(p ->> 'id','') is null and coalesce(p ->> 'fulfilment_method','stock') = 'stock')
       or (soi.id is not null and (p ->> 'quantity')::numeric > soi.quantity)
  ) then
    v_inventory_sequence := nextval('public.inventory_transaction_number_seq');
    v_inventory_transaction_number := 'INV-' || extract(year from current_date)::integer || '-' || lpad(v_inventory_sequence::text,6,'0');

    insert into public.inventory_transactions (
      transaction_number, transaction_type, status, transaction_date,
      warehouse_id, reference_type, reference_id, reference_number,
      description, internal_notes, posted_at, created_by, posted_by,
      created_at, updated_at
    ) values (
      v_inventory_transaction_number, 'adjustment_out', 'posted', current_date,
      v_warehouse_id, 'sales_order_revision', v_revision_id, v_order.order_number,
      'Sales Order entry correction - additional stock issue - ' || v_order.order_number,
      trim(p_reason), now(), v_user_id, v_user_id, now(), now()
    ) returning id into v_issue_transaction_id;
  end if;

  /* Apply each existing line and its physical difference. */
  for v_proposed in
    select value from jsonb_array_elements(v_items)
    where nullif(value ->> 'id','') is not null
  loop
    select * into v_item
    from public.sales_order_items
    where id = (v_proposed ->> 'id')::uuid
      and sales_order_id = v_order.id
      and coalesce(is_revision_removed,false) = false
    for update;

    v_new_quantity := (v_proposed ->> 'quantity')::numeric;
    v_new_unit_price := (v_proposed ->> 'unit_price')::numeric;
    v_new_discount_percentage := coalesce(nullif(v_proposed ->> 'discount_percentage','')::numeric,0);
    v_new_tax_percentage := coalesce(nullif(v_proposed ->> 'tax_percentage','')::numeric,0);
    v_qty_difference := round(v_new_quantity - v_item.quantity,4);

    v_line_subtotal := round(v_new_quantity * v_new_unit_price,2);
    v_line_discount := round(v_line_subtotal * v_new_discount_percentage / 100,2);
    v_line_net := round(v_line_subtotal - v_line_discount,2);
    /* Item tax/line_total remain pre invoice-discount for compatibility;
       header VAT is the authoritative invoice-discount-adjusted VAT. */
    v_line_tax := round(v_line_net * v_new_tax_percentage / 100,2);
    v_line_total := round(v_line_net + v_line_tax,2);

    if v_qty_difference < 0 then
      if exists (
        select 1
        from public.sales_return_items sri
        join public.sales_returns sr on sr.id = sri.sales_return_id
        where sri.sales_order_item_id = v_item.id
          and sr.status <> 'cancelled'
      ) then
        raise exception
          'Sales Order line % already has Sales Return history. Quantity reduction must continue through the Sales Return workflow.',
          v_item.line_number;
      end if;

      /*
       * Resolve the exact historical inventory issue being partially reversed.
       *
       * Original fulfilled line:
       *   delivery_order_item -> posted sales_issue
       *
       * Revision-added fulfilled line:
       *   sales_order_item -> posted sales_order_revision adjustment_out
       *
       * Never fall back to current weighted-average cost.
       */
    v_delivery_item_id := null;
    v_issue_match_count := 0;
    v_historical_unit_cost := null;
    v_historical_valuation_cost := null;

    select count(*), min(doi.id::text)::uuid
    into v_issue_match_count, v_delivery_item_id
    from public.delivery_order_items doi
    join public.inventory_transaction_items iti
      on iti.source_document_item_id = doi.id
      and iti.product_id = v_item.product_id
      and iti.warehouse_id =
        coalesce(v_item.warehouse_id, v_order.warehouse_id)
      and iti.quantity_change < 0
    join public.inventory_transactions it
      on it.id = iti.inventory_transaction_id
      and it.transaction_type = 'sales_issue'
      and it.status = 'posted'
    where doi.sales_order_item_id = v_item.id;

    if v_issue_match_count = 1 then

      select
        iti.unit_cost,
        iti.valuation_unit_cost
      into
        v_historical_unit_cost,
        v_historical_valuation_cost
      from public.inventory_transaction_items iti
      join public.inventory_transactions it
        on it.id = iti.inventory_transaction_id
      where iti.source_document_item_id = v_delivery_item_id
        and iti.product_id = v_item.product_id
        and iti.warehouse_id =
          coalesce(v_item.warehouse_id, v_order.warehouse_id)
        and iti.quantity_change < 0
        and it.transaction_type = 'sales_issue'
        and it.status = 'posted'
      limit 1;

    elsif v_issue_match_count = 0 then

      /*
        * Revision-added lines have no delivery_order_item.
        * Resolve the inventory issue created by the applied
        * Sales Order revision that introduced/issued this line.
        */
      select count(*)
      into v_issue_match_count
      from public.inventory_transaction_items iti
      join public.inventory_transactions it
        on it.id = iti.inventory_transaction_id
      join public.sales_order_revision_effects e
        on e.inventory_transaction_id = it.id
        and e.sales_order_item_id = v_item.id
        and e.effect_type = 'inventory_issue'
      join public.sales_order_revisions r
        on r.id = e.revision_id
        and r.sales_order_id = v_order.id
        and r.status = 'applied'
      where iti.source_document_item_id = v_item.id
        and iti.product_id = v_item.product_id
        and iti.warehouse_id =
          coalesce(v_item.warehouse_id, v_order.warehouse_id)
        and iti.quantity_change < 0
        and it.transaction_type = 'adjustment_out'
        and it.reference_type = 'sales_order_revision'
        and it.status = 'posted';

      if v_issue_match_count <> 1 then
        raise exception
          'Sales Order line % has no delivery sales_issue and % applied revision inventory issue sources. Quantity reduction requires exactly one historical issue source.',
          v_item.line_number,
          v_issue_match_count;
      end if;

      select
        iti.unit_cost,
        iti.valuation_unit_cost
      into
        v_historical_unit_cost,
        v_historical_valuation_cost
      from public.inventory_transaction_items iti
      join public.inventory_transactions it
        on it.id = iti.inventory_transaction_id
      join public.sales_order_revision_effects e
        on e.inventory_transaction_id = it.id
        and e.sales_order_item_id = v_item.id
        and e.effect_type = 'inventory_issue'
      join public.sales_order_revisions r
        on r.id = e.revision_id
        and r.sales_order_id = v_order.id
        and r.status = 'applied'
      where iti.source_document_item_id = v_item.id
        and iti.product_id = v_item.product_id
        and iti.warehouse_id =
          coalesce(v_item.warehouse_id, v_order.warehouse_id)
        and iti.quantity_change < 0
        and it.transaction_type = 'adjustment_out'
        and it.reference_type = 'sales_order_revision'
        and it.status = 'posted'
      limit 1;

      v_delivery_item_id := null;

    else
      raise exception
        'Sales Order line % has % historical sales_issue sources. Quantity reduction requires exactly one unambiguous historical issue source.',
        v_item.line_number,
        v_issue_match_count;
    end if;

    if v_historical_unit_cost is null
        or v_historical_valuation_cost is null then
      raise exception
        'Historical inventory cost could not be resolved for Sales Order line %.',
        v_item.line_number;
    end if;

      v_restore_line_number := v_restore_line_number + 1;

      insert into public.inventory_transaction_items (
        inventory_transaction_id, warehouse_id, product_id, line_number,
        quantity_change, unit_cost, valuation_unit_cost,
        source_document_item_id, notes, created_at
      ) values (
        v_restore_transaction_id,
        coalesce(v_item.warehouse_id, v_order.warehouse_id),
        v_item.product_id,
        v_restore_line_number,
        abs(v_qty_difference),
        v_historical_unit_cost,
        v_historical_valuation_cost,
        v_item.id,
        'Entry correction restore for ' || v_order.order_number || ' line ' || v_item.line_number,
        now()
      );

      select * into v_stock
      from public.warehouse_stock
      where warehouse_id = coalesce(v_item.warehouse_id, v_order.warehouse_id)
        and product_id = v_item.product_id
      for update;

      if not found then
        insert into public.warehouse_stock (
          warehouse_id, product_id, quantity_on_hand, quantity_reserved,
          average_unit_cost, last_transaction_at, created_at, updated_at
        ) values (
          coalesce(v_item.warehouse_id, v_order.warehouse_id),
          v_item.product_id,
          abs(v_qty_difference), 0,
          v_historical_valuation_cost,
          now(), now(), now()
        );
      else
        v_new_stock_quantity := v_stock.quantity_on_hand + abs(v_qty_difference);
        v_new_average_cost := case when v_new_stock_quantity > 0 then
          round(((v_stock.quantity_on_hand * v_stock.average_unit_cost) +
                 (abs(v_qty_difference) * v_historical_valuation_cost)) /
                v_new_stock_quantity,8)
          else 0 end;

        update public.warehouse_stock
        set quantity_on_hand = v_new_stock_quantity,
            average_unit_cost = v_new_average_cost,
            last_transaction_at = now(),
            updated_at = now()
        where id = v_stock.id;
      end if;

      v_change_value := round(abs(v_qty_difference) * v_historical_valuation_cost,8);
      v_restore_total := v_restore_total + v_change_value;

      v_effect_sequence := v_effect_sequence + 1;
      insert into public.sales_order_revision_effects (
        revision_id, sales_order_id, effect_type, effect_sequence,
        sales_order_item_id, product_id, warehouse_id,
        inventory_transaction_id, quantity_change, unit_cost, total_cost,
        effect_data, created_by
      ) values (
        v_revision_id, v_order.id, 'inventory_restore', v_effect_sequence,
        v_item.id, v_item.product_id, coalesce(v_item.warehouse_id,v_order.warehouse_id),
        v_restore_transaction_id, abs(v_qty_difference),
        v_historical_valuation_cost, v_change_value,
        jsonb_build_object(
          'costBasis',
          case
            when v_delivery_item_id is not null then 'historical_sales_issue'
            else 'historical_revision_issue'
          end,
          'deliveryOrderItemId',
          v_delivery_item_id,
          'partialQuantityReduction',
          true
        ),
        v_user_id
      );

    elsif v_qty_difference > 0 then
      select * into v_stock
      from public.warehouse_stock
      where warehouse_id = coalesce(v_item.warehouse_id, v_order.warehouse_id)
        and product_id = v_item.product_id
      for update;

      if not found then
        raise exception 'No warehouse stock exists for additional issue on Sales Order line %.', v_item.line_number;
      end if;

      if (v_stock.quantity_on_hand - v_stock.quantity_reserved) < v_qty_difference then
        raise exception
          'Insufficient available stock for Sales Order line %. Required %, available %.',
          v_item.line_number, v_qty_difference,
          (v_stock.quantity_on_hand - v_stock.quantity_reserved);
      end if;

      v_current_average_cost := v_stock.average_unit_cost;
      v_issue_line_number := v_issue_line_number + 1;

      insert into public.inventory_transaction_items (
        inventory_transaction_id, warehouse_id, product_id, line_number,
        quantity_change, unit_cost, valuation_unit_cost,
        source_document_item_id, notes, created_at
      ) values (
        v_issue_transaction_id,
        coalesce(v_item.warehouse_id, v_order.warehouse_id),
        v_item.product_id,
        v_issue_line_number,
        -v_qty_difference,
        round(v_current_average_cost,4),
        v_current_average_cost,
        v_item.id,
        'Entry correction additional issue for ' || v_order.order_number || ' line ' || v_item.line_number,
        now()
      );

      update public.warehouse_stock
      set quantity_on_hand = quantity_on_hand - v_qty_difference,
          last_transaction_at = now(),
          updated_at = now()
      where id = v_stock.id;

      v_change_value := round(v_qty_difference * v_current_average_cost,8);
      v_issue_total := v_issue_total + v_change_value;

      v_effect_sequence := v_effect_sequence + 1;
      insert into public.sales_order_revision_effects (
        revision_id, sales_order_id, effect_type, effect_sequence,
        sales_order_item_id, product_id, warehouse_id,
        inventory_transaction_id, quantity_change, unit_cost, total_cost,
        effect_data, created_by
      ) values (
        v_revision_id, v_order.id, 'inventory_issue', v_effect_sequence,
        v_item.id, v_item.product_id, coalesce(v_item.warehouse_id,v_order.warehouse_id),
        v_issue_transaction_id, -v_qty_difference,
        v_current_average_cost, v_change_value,
        jsonb_build_object('costBasis','current_weighted_average'),
        v_user_id
      );
    end if;

    update public.sales_order_items
    set quantity = v_new_quantity,
        unit_price = v_new_unit_price,
        discount_percentage = v_new_discount_percentage,
        discount_amount = v_line_discount,
        tax_percentage = v_new_tax_percentage,
        tax_amount = v_line_tax,
        line_subtotal = v_line_subtotal,
        line_total = v_line_total,
        quantity_fulfilled = case
          when coalesce(quantity_fulfilled,0) > 0 then v_new_quantity
          else quantity_fulfilled
        end,
        updated_at = now()
    where id = v_item.id;

    v_effect_sequence := v_effect_sequence + 1;
    insert into public.sales_order_revision_effects (
      revision_id, sales_order_id, effect_type, effect_sequence,
      sales_order_item_id, product_id, warehouse_id,
      quantity_change, amount_change, effect_data, created_by
    ) values (
      v_revision_id, v_order.id, 'sales_order_item_update', v_effect_sequence,
      v_item.id, v_item.product_id, coalesce(v_item.warehouse_id,v_order.warehouse_id),
      v_qty_difference,
      round(v_line_total - coalesce(v_item.line_total,0),2),
      jsonb_build_object(
        'oldQuantity',v_item.quantity,'newQuantity',v_new_quantity,
        'oldUnitPrice',v_item.unit_price,'newUnitPrice',v_new_unit_price,
        'oldDiscountPercentage',v_item.discount_percentage,'newDiscountPercentage',v_new_discount_percentage,
        'oldTaxPercentage',v_item.tax_percentage,'newTaxPercentage',v_new_tax_percentage
      ),
      v_user_id
    );
  end loop;

  /* ---------------- Removed active lines ---------------- */
  for v_item in
    select soi.*
    from public.sales_order_items soi
    where soi.sales_order_id = v_order.id
      and coalesce(soi.is_revision_removed,false) = false
      and not exists (
        select 1 from jsonb_array_elements(v_items) p
        where nullif(p ->> 'id','')::uuid = soi.id
      )
    order by soi.line_number
    for update
  loop
    if exists (
      select 1 from public.sales_return_items sri
      join public.sales_returns sr on sr.id = sri.sales_return_id
      where sri.sales_order_item_id = v_item.id and sr.status <> 'cancelled'
    ) then
      raise exception 'Sales Order line % has Sales Return history and cannot be removed by entry correction.', v_item.line_number;
    end if;

    if coalesce(v_item.quantity_fulfilled,0) > 0 and v_item.product_id is not null then
      /*
       * Resolve the exact historical inventory issue being reversed.
       *
       * Original fulfilled line:
       *   delivery_order_item -> posted sales_issue
       *
       * Revision-added fulfilled line:
       *   sales_order_item -> posted sales_order_revision adjustment_out
       *
       * Never fall back to current weighted-average cost.
       */
      select count(*), min(doi.id::text)::uuid
      into v_issue_match_count, v_delivery_item_id
      from public.delivery_order_items doi
      join public.inventory_transaction_items iti
        on iti.source_document_item_id = doi.id
       and iti.product_id = v_item.product_id
       and iti.warehouse_id = coalesce(v_item.warehouse_id, v_order.warehouse_id)
       and iti.quantity_change < 0
      join public.inventory_transactions it
        on it.id = iti.inventory_transaction_id
       and it.transaction_type = 'sales_issue'
       and it.status = 'posted'
      where doi.sales_order_item_id = v_item.id;

      if v_issue_match_count = 1 then
        select iti.unit_cost, iti.valuation_unit_cost
        into v_historical_unit_cost, v_historical_valuation_cost
        from public.inventory_transaction_items iti
        join public.inventory_transactions it
          on it.id = iti.inventory_transaction_id
        where iti.source_document_item_id = v_delivery_item_id
          and iti.product_id = v_item.product_id
          and iti.warehouse_id = coalesce(v_item.warehouse_id, v_order.warehouse_id)
          and iti.quantity_change < 0
          and it.transaction_type = 'sales_issue'
          and it.status = 'posted'
        limit 1;

      elsif v_issue_match_count = 0 then
        /*
         * Revision-added lines do not have a delivery_order_item.
         * Their historical stock issue is linked directly to the
         * sales_order_item through source_document_item_id.
         */
        select count(*)
        into v_issue_match_count
        from public.inventory_transaction_items iti
        join public.inventory_transactions it
          on it.id = iti.inventory_transaction_id
        join public.sales_order_revision_effects e
          on e.inventory_transaction_id = it.id
         and e.sales_order_item_id = v_item.id
         and e.effect_type = 'inventory_issue'
        join public.sales_order_revisions r
          on r.id = e.revision_id
         and r.sales_order_id = v_order.id
         and r.status = 'applied'
        where iti.source_document_item_id = v_item.id
          and iti.product_id = v_item.product_id
          and iti.warehouse_id = coalesce(v_item.warehouse_id, v_order.warehouse_id)
          and iti.quantity_change < 0
          and it.transaction_type = 'adjustment_out'
          and it.reference_type = 'sales_order_revision'
          and it.status = 'posted';

        if v_issue_match_count <> 1 then
          raise exception
            'Sales Order line % has no delivery sales_issue and % applied revision inventory issue sources. Removal requires exactly one historical issue source.',
            v_item.line_number,
            v_issue_match_count;
        end if;

        select iti.unit_cost, iti.valuation_unit_cost
        into v_historical_unit_cost, v_historical_valuation_cost
        from public.inventory_transaction_items iti
        join public.inventory_transactions it
          on it.id = iti.inventory_transaction_id
        join public.sales_order_revision_effects e
          on e.inventory_transaction_id = it.id
         and e.sales_order_item_id = v_item.id
         and e.effect_type = 'inventory_issue'
        join public.sales_order_revisions r
          on r.id = e.revision_id
         and r.sales_order_id = v_order.id
         and r.status = 'applied'
        where iti.source_document_item_id = v_item.id
          and iti.product_id = v_item.product_id
          and iti.warehouse_id = coalesce(v_item.warehouse_id, v_order.warehouse_id)
          and iti.quantity_change < 0
          and it.transaction_type = 'adjustment_out'
          and it.reference_type = 'sales_order_revision'
          and it.status = 'posted'
        limit 1;

        v_delivery_item_id := null;

      else
        raise exception
          'Sales Order line % has % historical sales_issue sources. Removal requires exactly one unambiguous historical issue source.',
          v_item.line_number,
          v_issue_match_count;
      end if;

      if v_historical_unit_cost is null
         or v_historical_valuation_cost is null then
        raise exception
          'Historical inventory cost could not be resolved for Sales Order line %.',
          v_item.line_number;
      end if;

      v_restore_line_number := v_restore_line_number + 1;
      insert into public.inventory_transaction_items (
        inventory_transaction_id, warehouse_id, product_id, line_number,
        quantity_change, unit_cost, valuation_unit_cost,
        source_document_item_id, notes, created_at
      ) values (
        v_restore_transaction_id, coalesce(v_item.warehouse_id,v_order.warehouse_id),
        v_item.product_id, v_restore_line_number, v_item.quantity_fulfilled,
        v_historical_unit_cost, v_historical_valuation_cost, v_item.id,
        'Entry correction removal restore for ' || v_order.order_number || ' line ' || v_item.line_number, now()
      );

      select * into v_stock from public.warehouse_stock
      where warehouse_id = coalesce(v_item.warehouse_id,v_order.warehouse_id)
        and product_id = v_item.product_id for update;

      if not found then
        insert into public.warehouse_stock (
          warehouse_id, product_id, quantity_on_hand, quantity_reserved,
          average_unit_cost, last_transaction_at, created_at, updated_at
        ) values (
          coalesce(v_item.warehouse_id,v_order.warehouse_id), v_item.product_id,
          v_item.quantity_fulfilled, 0, v_historical_valuation_cost, now(), now(), now()
        );
      else
        v_new_stock_quantity := v_stock.quantity_on_hand + v_item.quantity_fulfilled;
        v_new_average_cost := case when v_new_stock_quantity > 0 then
          round(((v_stock.quantity_on_hand*v_stock.average_unit_cost) +
                 (v_item.quantity_fulfilled*v_historical_valuation_cost))/v_new_stock_quantity,8)
          else 0 end;
        update public.warehouse_stock
        set quantity_on_hand=v_new_stock_quantity, average_unit_cost=v_new_average_cost,
            last_transaction_at=now(), updated_at=now()
        where id=v_stock.id;
      end if;

      v_change_value := round(v_item.quantity_fulfilled*v_historical_valuation_cost,8);
      v_restore_total := v_restore_total + v_change_value;
      v_effect_sequence := v_effect_sequence + 1;
      insert into public.sales_order_revision_effects (
        revision_id,sales_order_id,effect_type,effect_sequence,sales_order_item_id,
        product_id,warehouse_id,inventory_transaction_id,quantity_change,unit_cost,total_cost,effect_data,created_by
      ) values (
        v_revision_id,v_order.id,'inventory_restore',v_effect_sequence,v_item.id,v_item.product_id,
        coalesce(v_item.warehouse_id,v_order.warehouse_id),v_restore_transaction_id,v_item.quantity_fulfilled,
        v_historical_valuation_cost,v_change_value,
        jsonb_build_object(
            'costBasis',
            case
              when v_delivery_item_id is not null then 'historical_sales_issue'
              else 'historical_revision_issue'
            end,
            'lineRemoval', true,
            'deliveryOrderItemId', v_delivery_item_id
          ),
          v_user_id
      );
    end if;

    update public.sales_order_items
    set is_revision_removed=true,
        revision_removed_at=now(),
        revision_removed_by=v_user_id,
        revision_removed_revision_id=v_revision_id,
        fulfilment_status='cancelled',
        updated_at=now()
    where id=v_item.id;

    v_effect_sequence := v_effect_sequence + 1;
    insert into public.sales_order_revision_effects (
      revision_id,sales_order_id,effect_type,effect_sequence,sales_order_item_id,
      product_id,warehouse_id,quantity_change,amount_change,effect_data,created_by
    ) values (
      v_revision_id,v_order.id,'sales_order_item_removed',v_effect_sequence,v_item.id,v_item.product_id,
      coalesce(v_item.warehouse_id,v_order.warehouse_id),-coalesce(v_item.quantity,0),-coalesce(v_item.line_total,0),
      jsonb_build_object('historicalRowPreserved',true,'originalLineNumber',v_item.line_number),v_user_id
    );
  end loop;

  /* ---------------- Newly added lines ---------------- */
  select coalesce(max(line_number),0) into v_next_line_number
  from public.sales_order_items where sales_order_id=v_order.id;

  for v_proposed in
    select value from jsonb_array_elements(v_items)
    where nullif(value ->> 'id','') is null
  loop
    v_new_product_id := nullif(v_proposed ->> 'product_id','')::uuid;
    v_new_unit_id := nullif(v_proposed ->> 'unit_id','')::uuid;
    v_new_warehouse_id := coalesce(nullif(v_proposed ->> 'warehouse_id','')::uuid,v_order.warehouse_id);
    if v_new_warehouse_id is null
      or not exists (
        select 1
        from public.warehouses w
        where w.id = v_new_warehouse_id
          and w.is_active = true
      )
    then
      raise exception
        'The selected warehouse was not found or is inactive.';
    end if;
    v_new_item_name := nullif(trim(coalesce(v_proposed ->> 'item_name','')),'');
    v_new_sku := nullif(trim(coalesce(v_proposed ->> 'sku','')),'');
    v_new_description := nullif(trim(coalesce(v_proposed ->> 'description','')),'');
    v_new_fulfilment_method := coalesce(nullif(trim(coalesce(v_proposed ->> 'fulfilment_method','')),''),'stock');
    v_new_line_notes := nullif(trim(coalesce(v_proposed ->> 'line_notes','')),'');
    v_new_quantity := (v_proposed ->> 'quantity')::numeric;
    v_new_unit_price := (v_proposed ->> 'unit_price')::numeric;
    v_new_discount_percentage := coalesce(nullif(v_proposed ->> 'discount_percentage','')::numeric,0);
    v_new_tax_percentage := coalesce(nullif(v_proposed ->> 'tax_percentage','')::numeric,0);
    v_line_subtotal := round(v_new_quantity*v_new_unit_price,2);
    v_line_discount := round(v_line_subtotal*v_new_discount_percentage/100,2);
    v_line_net := round(v_line_subtotal-v_line_discount,2);
    v_line_tax := round(v_line_net*v_new_tax_percentage/100,2);
    v_line_total := round(v_line_net+v_line_tax,2);
    v_next_line_number := v_next_line_number + 1;

    insert into public.sales_order_items (
      sales_order_id,line_number,product_id,unit_id,warehouse_id,sku,item_name,description,
      quantity,unit_price,discount_percentage,discount_amount,tax_percentage,tax_amount,
      line_subtotal,line_total,fulfilment_method,fulfilment_status,quantity_reserved,
      quantity_allocated,quantity_fulfilled,quantity_cancelled,shortage_quantity,
      procurement_required,line_notes,created_at,updated_at
    ) values (
      v_order.id,v_next_line_number,v_new_product_id,v_new_unit_id,v_new_warehouse_id,v_new_sku,v_new_item_name,v_new_description,
      v_new_quantity,v_new_unit_price,v_new_discount_percentage,v_line_discount,v_new_tax_percentage,v_line_tax,
      v_line_subtotal,v_line_total,v_new_fulfilment_method,'fulfilled',0,0,v_new_quantity,0,0,
      false,v_new_line_notes,now(),now()
    ) returning id into v_new_item_id;

    if v_new_fulfilment_method='stock' and v_new_product_id is not null then
      select * into v_stock from public.warehouse_stock
      where warehouse_id=v_new_warehouse_id and product_id=v_new_product_id for update;
      if not found then
        raise exception 'No warehouse stock exists for newly added product "%".',v_new_item_name;
      end if;
      if (v_stock.quantity_on_hand-v_stock.quantity_reserved) < v_new_quantity then
        raise exception 'Insufficient available stock for newly added product "%". Required %, available %.',
          v_new_item_name,v_new_quantity,(v_stock.quantity_on_hand-v_stock.quantity_reserved);
      end if;
      v_current_average_cost := v_stock.average_unit_cost;
      v_issue_line_number := v_issue_line_number + 1;
      insert into public.inventory_transaction_items (
        inventory_transaction_id,warehouse_id,product_id,line_number,quantity_change,
        unit_cost,valuation_unit_cost,source_document_item_id,notes,created_at
      ) values (
        v_issue_transaction_id,v_new_warehouse_id,v_new_product_id,v_issue_line_number,-v_new_quantity,
        round(v_current_average_cost,4),v_current_average_cost,v_new_item_id,
        'Entry correction new line issue for '||v_order.order_number||' line '||v_next_line_number,now()
      );
      update public.warehouse_stock
      set quantity_on_hand=quantity_on_hand-v_new_quantity,last_transaction_at=now(),updated_at=now()
      where id=v_stock.id;
      v_change_value := round(v_new_quantity*v_current_average_cost,8);
      v_issue_total := v_issue_total+v_change_value;
      v_effect_sequence := v_effect_sequence+1;
      insert into public.sales_order_revision_effects (
        revision_id,sales_order_id,effect_type,effect_sequence,sales_order_item_id,product_id,
        warehouse_id,inventory_transaction_id,quantity_change,unit_cost,total_cost,effect_data,created_by
      ) values (
        v_revision_id,v_order.id,'inventory_issue',v_effect_sequence,v_new_item_id,v_new_product_id,
        v_new_warehouse_id,v_issue_transaction_id,-v_new_quantity,v_current_average_cost,v_change_value,
        jsonb_build_object('costBasis','current_weighted_average','newLine',true),v_user_id
      );
    end if;

    v_effect_sequence := v_effect_sequence+1;
    insert into public.sales_order_revision_effects (
      revision_id,sales_order_id,effect_type,effect_sequence,sales_order_item_id,product_id,
      warehouse_id,quantity_change,amount_change,effect_data,created_by
    ) values (
      v_revision_id,v_order.id,'sales_order_item_added',v_effect_sequence,v_new_item_id,v_new_product_id,
      v_new_warehouse_id,v_new_quantity,v_line_total,
      jsonb_build_object('lineNumber',v_next_line_number,'itemName',v_new_item_name),v_user_id
    );
  end loop;

  /* ---------------- Commercial differential GL ---------------- */
  v_old_tax := round(coalesce(v_order.tax_amount,0),2);
  v_old_total := round(coalesce(v_order.grand_total,0),2);
  v_old_revenue := round(v_old_total - v_old_tax,2);
  v_new_revenue := round(v_grand_total - v_tax_total,2);
  v_delta_tax := round(v_tax_total - v_old_tax,2);
  v_delta_total := round(v_grand_total - v_old_total,2);
  v_delta_revenue := round(v_new_revenue - v_old_revenue,2);

  if v_delta_total <> 0 or v_delta_revenue <> 0 or v_delta_tax <> 0 then
    v_ar_account_id := public.get_mapped_gl_account('accounts_receivable');
    v_revenue_account_id := public.get_mapped_gl_account('sales_revenue');
    if v_delta_tax <> 0 then
      v_vat_account_id := public.get_mapped_gl_account('vat_payable');
    end if;

    /* AR: positive delta = debit; negative delta = credit. */
    if v_delta_total <> 0 then
      v_gl_lines := v_gl_lines || jsonb_build_array(jsonb_build_object(
        'glAccountId',v_ar_account_id,
        'debit',case when v_delta_total > 0 then v_delta_total else 0 end,
        'credit',case when v_delta_total < 0 then abs(v_delta_total) else 0 end,
        'baseDebit',case when v_delta_total > 0 then round(v_delta_total * v_order.exchange_rate,2) else 0 end,
        'baseCredit',case when v_delta_total < 0 then round(abs(v_delta_total) * v_order.exchange_rate,2) else 0 end,
        'description','Sales Order revision AR - ' || v_order.order_number,
        'customerId',v_order.customer_id
      ));
    end if;

    /* Revenue: positive delta = credit; negative delta = debit. */
    if v_delta_revenue <> 0 then
      v_gl_lines := v_gl_lines || jsonb_build_array(jsonb_build_object(
        'glAccountId',v_revenue_account_id,
        'debit',case when v_delta_revenue < 0 then abs(v_delta_revenue) else 0 end,
        'credit',case when v_delta_revenue > 0 then v_delta_revenue else 0 end,
        'baseDebit',case when v_delta_revenue < 0 then round(abs(v_delta_revenue) * v_order.exchange_rate,2) else 0 end,
        'baseCredit',case when v_delta_revenue > 0 then round(v_delta_revenue * v_order.exchange_rate,2) else 0 end,
        'description','Sales Order revision revenue - ' || v_order.order_number,
        'customerId',v_order.customer_id
      ));
    end if;

    /* VAT: positive delta = credit; negative delta = debit. */
    if v_delta_tax <> 0 then
      v_gl_lines := v_gl_lines || jsonb_build_array(jsonb_build_object(
        'glAccountId',v_vat_account_id,
        'debit',case when v_delta_tax < 0 then abs(v_delta_tax) else 0 end,
        'credit',case when v_delta_tax > 0 then v_delta_tax else 0 end,
        'baseDebit',case when v_delta_tax < 0 then round(abs(v_delta_tax) * v_order.exchange_rate,2) else 0 end,
        'baseCredit',case when v_delta_tax > 0 then round(v_delta_tax * v_order.exchange_rate,2) else 0 end,
        'description','Sales Order revision VAT - ' || v_order.order_number,
        'customerId',v_order.customer_id
      ));
    end if;

    v_commercial_journal_id := public.post_erp_gl_journal(
      'sales_order_revision_commercial',
      v_revision_id,
      v_order.order_number || '-R' || v_revision_number,
      current_date,
      current_date,
      'Sales Order revision commercial correction - ' || v_order.order_number,
      v_order.currency_code,
      v_order.exchange_rate,
      v_gl_lines
    );

    v_effect_sequence := v_effect_sequence + 1;
    insert into public.sales_order_revision_effects (
      revision_id, sales_order_id, effect_type, effect_sequence,
      journal_entry_id, amount_change, effect_data, created_by
    ) values (
      v_revision_id, v_order.id, 'commercial_gl', v_effect_sequence,
      v_commercial_journal_id, v_delta_total,
      jsonb_build_object('revenueDifference',v_delta_revenue,'taxDifference',v_delta_tax,'receivableDifference',v_delta_total),
      v_user_id
    );
  end if;

  /* ---------------- Receipt allocation reconciliation ----------------
   *
   * Original receipt headers and original receipt allocation rows remain
   * immutable.
   *
   * Each allocation adjustment owns its own GL journal.  This preserves
   * receipt-level traceability and allows a future receipt cancellation
   * workflow to reverse the exact reclassification belonging to that
   * receipt.
   *
   * Release:
   *   negative revision_release
   *   Dr Accounts Receivable / Cr Customer Advances
   *
   * Reapplication:
   *   positive revision_reapplication
   *   Dr Customer Advances / Cr Accounts Receivable
   *
   * No Cash / Bank / Treasury movement is created here.
   * --------------------------------------------------------------- */

  if v_payment_adjustment_needed <> 0 then

    /*
     * Existing receipt lifecycle guards permit controlled derived-total
     * synchronization under this transaction-local authorization.
     */
    perform set_config(
      'erp.customer_advance_application',
      '1',
      true
    );

    v_ar_account_id :=
      coalesce(
        v_ar_account_id,
        public.get_mapped_gl_account(
          'accounts_receivable'
        )
      );

    v_customer_advances_account_id :=
      public.get_mapped_gl_account(
        'customer_advances'
      );

    v_payment_adjustment_remaining :=
      abs(v_payment_adjustment_needed);


    /* =====================================================
     * DOWNWARD CORRECTION
     *
     * Release effective allocations newest-first.
     * ===================================================== */
    if v_payment_adjustment_needed < 0 then

      for v_receipt_allocation in
        select
          ea.allocation_id,
          ea.receipt_id,
          ea.effective_amount,
          a.created_at
        from
          public.customer_receipt_effective_allocations ea
        join
          public.customer_receipt_allocations a
            on a.id = ea.allocation_id
        join
          public.customer_receipts r
            on r.id = ea.receipt_id
        where
          ea.sales_order_id = v_order.id
          and r.status = 'posted'
          and ea.effective_amount > 0
        order by
          a.created_at desc,
          a.id desc
      loop

        exit when v_payment_adjustment_remaining <= 0;

        v_adjustment_amount :=
          least(
            round(
              v_receipt_allocation.effective_amount,
              2
            ),
            v_payment_adjustment_remaining
          );

        if v_adjustment_amount > 0 then

          /*
           * Generate the immutable adjustment identity before posting GL.
           * The journal uses this adjustment UUID as its accounting source.
           */
          v_allocation_adjustment_id :=
            gen_random_uuid();

          v_payment_reclass_lines :=
            jsonb_build_array(
              jsonb_build_object(
                'glAccountId',
                  v_ar_account_id,
                'debit',
                  v_adjustment_amount,
                'credit',
                  0,
                'baseDebit',
                  round(
                    v_adjustment_amount *
                    v_order.exchange_rate,
                    2
                  ),
                'baseCredit',
                  0,
                'description',
                  'Sales Order revision payment release - ' ||
                  v_order.order_number,
                'customerId',
                  v_order.customer_id,
                'sourceLineType',
                  'customer_receipt_allocation_adjustment',
                'sourceLineId',
                  v_allocation_adjustment_id
              ),
              jsonb_build_object(
                'glAccountId',
                  v_customer_advances_account_id,
                'debit',
                  0,
                'credit',
                  v_adjustment_amount,
                'baseDebit',
                  0,
                'baseCredit',
                  round(
                    v_adjustment_amount *
                    v_order.exchange_rate,
                    2
                  ),
                'description',
                  'Customer credit created by Sales Order revision - ' ||
                  v_order.order_number,
                'customerId',
                  v_order.customer_id,
                'sourceLineType',
                  'customer_receipt_allocation_adjustment',
                'sourceLineId',
                  v_allocation_adjustment_id
              )
            );

          v_payment_reclass_journal_id :=
            public.post_erp_gl_journal(
              'customer_receipt_allocation_release',
              v_allocation_adjustment_id,
              v_order.order_number ||
                '-R' ||
                v_revision_number,
              current_date,
              current_date,
              'Sales Order revision customer credit release - ' ||
                v_order.order_number,
              v_order.currency_code,
              v_order.exchange_rate,
              v_payment_reclass_lines
            );

          /*
           * Insert the immutable adjustment ONCE, already carrying its
           * permanent journal reference.
           */
          insert into
            public.customer_receipt_allocation_adjustments (
              id,
              allocation_id,
              receipt_id,
              sales_order_id,
              sales_order_revision_id,
              adjustment_type,
              amount,
              reason,
              gl_journal_entry_id,
              created_by
            )
          values (
            v_allocation_adjustment_id,
            v_receipt_allocation.allocation_id,
            v_receipt_allocation.receipt_id,
            v_order.id,
            v_revision_id,
            'revision_release',
            -v_adjustment_amount,
            'Sales Order revision ' ||
              v_order.order_number ||
              '-R' ||
              v_revision_number ||
              ': ' ||
              trim(p_reason),
            v_payment_reclass_journal_id,
            v_user_id
          );

          v_effect_sequence :=
            v_effect_sequence + 1;

          insert into
            public.sales_order_revision_effects (
              revision_id,
              sales_order_id,
              effect_type,
              effect_sequence,
              journal_entry_id,
              amount_change,
              effect_data,
              created_by
            )
          values (
            v_revision_id,
            v_order.id,
            'customer_credit',
            v_effect_sequence,
            v_payment_reclass_journal_id,
            v_adjustment_amount,
            jsonb_build_object(
              'allocationAdjustmentId',
                v_allocation_adjustment_id,
              'allocationId',
                v_receipt_allocation.allocation_id,
              'receiptId',
                v_receipt_allocation.receipt_id,
              'adjustmentType',
                'revision_release',
              'releasedAmount',
                v_adjustment_amount,
              'receiptHeaderPreserved',
                true,
              'originalAllocationPreserved',
                true,
              'accountingTreatment',
                'Dr Accounts Receivable / Cr Customer Advances'
            ),
            v_user_id
          );

          perform
            public.sync_customer_receipt_totals(
              v_receipt_allocation.receipt_id
            );

          v_payment_adjustment_remaining :=
            round(
              v_payment_adjustment_remaining -
              v_adjustment_amount,
              2
            );

        end if;

      end loop;

      if v_payment_adjustment_remaining > 0 then
        raise exception
          'Unable to release the full excess Sales Order payment allocation. Remaining amount: %.',
          v_payment_adjustment_remaining;
      end if;


    /* =====================================================
     * UPWARD CORRECTION
     *
     * Reapply only value previously released from immutable
     * allocations belonging to THIS Sales Order.
     * ===================================================== */
    else

      for v_receipt_allocation in
        select
          ea.allocation_id,
          ea.receipt_id,
          ea.original_amount,
          ea.effective_amount,
          round(
            greatest(
              ea.original_amount -
              ea.effective_amount,
              0
            ),
            2
          ) as available_for_reapplication,
          a.created_at
        from
          public.customer_receipt_effective_allocations ea
        join
          public.customer_receipt_allocations a
            on a.id = ea.allocation_id
        join
          public.customer_receipts r
            on r.id = ea.receipt_id
        where
          ea.sales_order_id = v_order.id
          and r.status = 'posted'
          and ea.effective_amount < ea.original_amount
        order by
          a.created_at asc,
          a.id asc
      loop

        exit when v_payment_adjustment_remaining <= 0;

        v_released_allocation_amount :=
          round(
            v_receipt_allocation.available_for_reapplication,
            2
          );

        v_adjustment_amount :=
          least(
            v_released_allocation_amount,
            v_payment_adjustment_remaining
          );

        if v_adjustment_amount > 0 then

          v_allocation_adjustment_id :=
            gen_random_uuid();

          v_payment_reclass_lines :=
            jsonb_build_array(
              jsonb_build_object(
                'glAccountId',
                  v_customer_advances_account_id,
                'debit',
                  v_adjustment_amount,
                'credit',
                  0,
                'baseDebit',
                  round(
                    v_adjustment_amount *
                    v_order.exchange_rate,
                    2
                  ),
                'baseCredit',
                  0,
                'description',
                  'Customer credit reapplied by Sales Order revision - ' ||
                  v_order.order_number,
                'customerId',
                  v_order.customer_id,
                'sourceLineType',
                  'customer_receipt_allocation_adjustment',
                'sourceLineId',
                  v_allocation_adjustment_id
              ),
              jsonb_build_object(
                'glAccountId',
                  v_ar_account_id,
                'debit',
                  0,
                'credit',
                  v_adjustment_amount,
                'baseDebit',
                  0,
                'baseCredit',
                  round(
                    v_adjustment_amount *
                    v_order.exchange_rate,
                    2
                  ),
                'description',
                  'Sales Order revision payment reapplication - ' ||
                  v_order.order_number,
                'customerId',
                  v_order.customer_id,
                'sourceLineType',
                  'customer_receipt_allocation_adjustment',
                'sourceLineId',
                  v_allocation_adjustment_id
              )
            );

          v_payment_reclass_journal_id :=
            public.post_erp_gl_journal(
              'customer_receipt_allocation_reapplication',
              v_allocation_adjustment_id,
              v_order.order_number ||
                '-R' ||
                v_revision_number,
              current_date,
              current_date,
              'Sales Order revision customer credit reapplication - ' ||
                v_order.order_number,
              v_order.currency_code,
              v_order.exchange_rate,
              v_payment_reclass_lines
            );

          insert into
            public.customer_receipt_allocation_adjustments (
              id,
              allocation_id,
              receipt_id,
              sales_order_id,
              sales_order_revision_id,
              adjustment_type,
              amount,
              reason,
              gl_journal_entry_id,
              created_by
            )
          values (
            v_allocation_adjustment_id,
            v_receipt_allocation.allocation_id,
            v_receipt_allocation.receipt_id,
            v_order.id,
            v_revision_id,
            'revision_reapplication',
            v_adjustment_amount,
            'Sales Order revision ' ||
              v_order.order_number ||
              '-R' ||
              v_revision_number ||
              ': ' ||
              trim(p_reason),
            v_payment_reclass_journal_id,
            v_user_id
          );

          v_effect_sequence :=
            v_effect_sequence + 1;

          insert into
            public.sales_order_revision_effects (
              revision_id,
              sales_order_id,
              effect_type,
              effect_sequence,
              journal_entry_id,
              amount_change,
              effect_data,
              created_by
            )
          values (
            v_revision_id,
            v_order.id,
            'customer_credit',
            v_effect_sequence,
            v_payment_reclass_journal_id,
            -v_adjustment_amount,
            jsonb_build_object(
              'allocationAdjustmentId',
                v_allocation_adjustment_id,
              'allocationId',
                v_receipt_allocation.allocation_id,
              'receiptId',
                v_receipt_allocation.receipt_id,
              'adjustmentType',
                'revision_reapplication',
              'reappliedAmount',
                v_adjustment_amount,
              'receiptHeaderPreserved',
                true,
              'originalAllocationPreserved',
                true,
              'accountingTreatment',
                'Dr Customer Advances / Cr Accounts Receivable'
            ),
            v_user_id
          );

          perform
            public.sync_customer_receipt_totals(
              v_receipt_allocation.receipt_id
            );

          v_payment_adjustment_remaining :=
            round(
              v_payment_adjustment_remaining -
              v_adjustment_amount,
              2
            );

        end if;

      end loop;

      if v_payment_adjustment_remaining > 0 then
        raise exception
          'Unable to reapply the full previously released Sales Order payment allocation. Remaining amount: %.',
          v_payment_adjustment_remaining;
      end if;

    end if;


    /*
     * Recalculate authoritative Sales Order paid amount from effective
     * posted receipt allocations.
     */
    perform
      public.sync_sales_order_paid_amount(
        v_order.id
      );

    select
      round(
        coalesce(paid_amount,0),
        2
      )
    into
      v_effective_paid_amount
    from
      public.sales_orders
    where
      id = v_order.id
    for update;

    v_balance_due :=
      greatest(
        round(
          v_grand_total -
          v_effective_paid_amount,
          2
        ),
        0
      );

  end if;
  /* ---------------- Inventory / COGS differential GL ---------------- */
  if v_restore_total <> 0 or v_issue_total <> 0 then
    v_inventory_account_id := public.get_mapped_gl_account('inventory');
    v_cogs_account_id := public.get_mapped_gl_account('cogs');

    if v_restore_total > 0 then
      v_inventory_gl_lines := v_inventory_gl_lines || jsonb_build_array(
        jsonb_build_object(
          'glAccountId',v_inventory_account_id,
          'debit',round(v_restore_total,2),'credit',0,
          'baseDebit',round(v_restore_total,2),'baseCredit',0,
          'description','Sales Order revision stock restoration - ' || v_order.order_number
        ),
        jsonb_build_object(
          'glAccountId',v_cogs_account_id,
          'debit',0,'credit',round(v_restore_total,2),
          'baseDebit',0,'baseCredit',round(v_restore_total,2),
          'description','Sales Order revision COGS reversal - ' || v_order.order_number
        )
      );
    end if;

    if v_issue_total > 0 then
      v_inventory_gl_lines := v_inventory_gl_lines || jsonb_build_array(
        jsonb_build_object(
          'glAccountId',v_cogs_account_id,
          'debit',round(v_issue_total,2),'credit',0,
          'baseDebit',round(v_issue_total,2),'baseCredit',0,
          'description','Sales Order revision additional COGS - ' || v_order.order_number
        ),
        jsonb_build_object(
          'glAccountId',v_inventory_account_id,
          'debit',0,'credit',round(v_issue_total,2),
          'baseDebit',0,'baseCredit',round(v_issue_total,2),
          'description','Sales Order revision additional inventory issue - ' || v_order.order_number
        )
      );
    end if;

    v_inventory_journal_id := public.post_erp_gl_journal(
      'sales_order_revision_inventory',
      v_revision_id,
      v_order.order_number || '-R' || v_revision_number,
      current_date,
      current_date,
      'Sales Order revision inventory correction - ' || v_order.order_number,
      'AED',
      1,
      v_inventory_gl_lines
    );

    v_effect_sequence := v_effect_sequence + 1;
    insert into public.sales_order_revision_effects (
      revision_id, sales_order_id, effect_type, effect_sequence,
      journal_entry_id, amount_change, effect_data, created_by
    ) values (
      v_revision_id, v_order.id, 'inventory_gl', v_effect_sequence,
      v_inventory_journal_id, round(v_issue_total - v_restore_total,2),
      jsonb_build_object('restoreCost',round(v_restore_total,8),'issueCost',round(v_issue_total,8)),
      v_user_id
    );
  end if;

  /* ---------------- Apply corrected header ---------------- */

  /*
   * If no allocation adjustment was required, the effective paid amount
   * remains the original current paid amount.
   */
  if v_payment_adjustment_needed = 0 then
    v_effective_paid_amount :=
      v_original_paid_amount;

    v_balance_due :=
      greatest(
        round(
          v_grand_total -
          v_effective_paid_amount,
          2
        ),
        0
      );
  end if;

  v_customer_credit :=
    greatest(
      round(
        v_original_paid_amount -
        v_effective_paid_amount,
        2
      ),
      0
    );

  v_additional_due :=
    greatest(
      round(
        v_balance_due -
        coalesce(v_order.balance_due,0),
        2
      ),
      0
    );

  v_payment_status := case
    when v_effective_paid_amount <= 0 then 'unpaid'
    when v_balance_due <= 0 then 'paid'
    else 'partially_paid'
  end;

  update public.sales_orders
  set subtotal = v_gross_subtotal,
      discount_amount = v_item_discount_total,
      invoice_discount_amount = v_invoice_discount,
      tax_amount = v_tax_total,
      shipping_amount = v_shipping,
      round_off_amount = v_round_off,
      grand_total = v_grand_total,
      paid_amount = v_effective_paid_amount,
      balance_due = v_balance_due,
      payment_status = v_payment_status,
      customer_notes = coalesce(v_header ->> 'customer_notes', customer_notes),
      internal_notes = coalesce(v_header ->> 'internal_notes', internal_notes),
      updated_by = v_user_id,
      updated_at = now()
  where id = v_order.id;

  v_effect_sequence := v_effect_sequence + 1;
  insert into public.sales_order_revision_effects (
    revision_id, sales_order_id, effect_type, effect_sequence,
    amount_change, effect_data, created_by
  ) values (
    v_revision_id, v_order.id, 'sales_order_update', v_effect_sequence,
    v_delta_total,
    jsonb_build_object('oldGrandTotal',v_old_total,'newGrandTotal',v_grand_total,'oldBalanceDue',v_order.balance_due,'newBalanceDue',v_balance_due),
    v_user_id
  );

    if v_additional_due > 0 then
    v_effect_sequence := v_effect_sequence + 1;
    insert into public.sales_order_revision_effects (
      revision_id, sales_order_id, effect_type, effect_sequence,
      amount_change, effect_data, created_by
    ) values (
      v_revision_id, v_order.id, 'additional_receivable', v_effect_sequence,
      v_additional_due,
      jsonb_build_object('existingReceiptsPreserved',true),
      v_user_id
    );
  end if;

  /* ---------------- Authoritative revision margin protection ---------------- */

  /*
   * Validate the FINAL revised commercial state.
   *
   * This deliberately does not reuse historical Sales Order margin
   * approvals because those approvals are not bound to this revision.
   *
   * Any exception raised here aborts the complete Apply transaction,
   * rolling back the revision, Sales Order/item changes, inventory,
   * payment adjustments and GL effects atomically.
   */
  perform public.validate_sales_order_revision_margin(
    v_order.id
  );

  /* ---------------- Finalize immutable revision ---------------- */
  update public.sales_order_revisions
  set status = 'applied',
      commercial_journal_entry_id = v_commercial_journal_id,
      inventory_journal_entry_id = v_inventory_journal_id,
      inventory_transaction_id = coalesce(v_restore_transaction_id,v_issue_transaction_id),
      original_paid_amount = v_original_paid_amount,
      revised_balance_due = v_balance_due,
      customer_credit_amount = v_customer_credit,
      additional_amount_due = v_additional_due,
      applied_at = now(),
      applied_by = v_user_id
  where id = v_revision_id;

  /* Clear the transaction-local authorization context. */
  perform set_config('app.sales_order_revision_internal_write','',true);

  v_result := jsonb_build_object(
    'revisionId',v_revision_id,
    'revisionNumber',v_revision_number,
    'status','applied',
    'salesOrderId',v_order.id,
    'orderNumber',v_order.order_number,
    'originalGrandTotal',v_old_total,
    'revisedGrandTotal',v_grand_total,
    'totalDifference',v_delta_total,
    'originalPaidAmount',v_original_paid_amount,
    'revisedPaidAmount',v_effective_paid_amount,
    'revisedBalanceDue',v_balance_due,
    'customerCreditAmount',v_customer_credit,
    'paymentReclassificationAmount',abs(v_payment_adjustment_needed),
    'paymentReclassificationJournalId',v_payment_reclass_journal_id,
    'paymentReclassificationJournalScope','last_allocation_adjustment',
    'additionalAmountDue',v_additional_due,
    'commercialJournalId',v_commercial_journal_id,
    'inventoryJournalId',v_inventory_journal_id,
    'restoreInventoryTransactionId',v_restore_transaction_id,
    'issueInventoryTransactionId',v_issue_transaction_id,
    'receiptsPreserved',true,
    'preview',v_preview,
    'idempotentReplay',false
  );

  return v_result;
end;
$$;
