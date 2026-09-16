/*
 * =========================================================
 * 193 - Apply Sales Order Modification
 *
 * PURPOSE
 * -------
 * Implements the controlled foundation used to modify a
 * financially posted Sales Order without deleting or
 * rewriting its historical accounting/inventory evidence.
 *
 * Core rules:
 *
 *   - Original Sales Order number is preserved.
 *   - Original GL journals are preserved.
 *   - Original inventory transactions are preserved.
 *   - Existing customer receipts are preserved.
 *   - Corrections are represented by a Sales Order revision.
 *   - Commercial differences are posted separately.
 *   - Inventory differences are posted separately.
 *   - Every applied effect is permanently auditable.
 *
 * Migration 158 remains the normal lifecycle protection.
 * This migration introduces a narrowly scoped internal-write
 * context that can only be activated for a valid draft
 * Sales Order revision by the SECURITY DEFINER apply engine.
 * =========================================================
 */


/* =========================================================
 * 1. Sales Order Revision Effects
 *
 * One revision can create multiple accounting/inventory
 * effects, so the single convenience references stored on
 * sales_order_revisions are not sufficient as the permanent
 * detailed audit ledger.
 * ========================================================= */

create table if not exists
  public.sales_order_revision_effects
(
  id uuid
    primary key
    default gen_random_uuid(),

  revision_id uuid
    not null
    references public.sales_order_revisions(id)
    on delete restrict,

  sales_order_id uuid
    not null
    references public.sales_orders(id)
    on delete restrict,

  effect_type text
    not null,

  effect_sequence integer
    not null,

  sales_order_item_id uuid
    references public.sales_order_items(id)
    on delete restrict,

  product_id uuid
    references public.products(id)
    on delete restrict,

  warehouse_id uuid
    references public.warehouses(id)
    on delete restrict,

  inventory_transaction_id uuid
    references public.inventory_transactions(id)
    on delete restrict,

  journal_entry_id uuid
    references public.gl_journal_entries(id)
    on delete restrict,

  quantity_change numeric(18, 4),

  unit_cost numeric(20, 8),

  total_cost numeric(20, 8),

  amount_change numeric(18, 2),

  effect_data jsonb
    not null
    default '{}'::jsonb,

  created_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz
    not null
    default now(),

  constraint
    sales_order_revision_effects_type_check
  check (
    effect_type in (
      'commercial_gl',
      'inventory_restore',
      'inventory_issue',
      'inventory_gl',
      'customer_credit',
      'additional_receivable',
      'sales_order_update',
      'sales_order_item_update'
    )
  ),

  constraint
    sales_order_revision_effects_sequence_check
  check (
    effect_sequence > 0
  ),

  constraint
    sales_order_revision_effects_unique_sequence
  unique (
    revision_id,
    effect_sequence
  )
);


/* =========================================================
 * 2. Revision Effect Indexes
 * ========================================================= */

create index if not exists
  sales_order_revision_effects_revision_idx
on public.sales_order_revision_effects (
  revision_id
);

create index if not exists
  sales_order_revision_effects_order_idx
on public.sales_order_revision_effects (
  sales_order_id
);

create index if not exists
  sales_order_revision_effects_inventory_idx
on public.sales_order_revision_effects (
  inventory_transaction_id
)
where inventory_transaction_id is not null;

create index if not exists
  sales_order_revision_effects_journal_idx
on public.sales_order_revision_effects (
  journal_entry_id
)
where journal_entry_id is not null;


/* =========================================================
 * 3. Effect Integrity Trigger
 *
 * Prevent an effect from being attached to a Sales Order
 * different from the revision's Sales Order.
 * ========================================================= */

create or replace function
  public.validate_sales_order_revision_effect()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_revision_order_id uuid;
begin

  select
    revision.sales_order_id
  into
    v_revision_order_id
  from
    public.sales_order_revisions revision
  where
    revision.id = new.revision_id;


  if not found then
    raise exception
      'Sales Order revision % was not found.',
      new.revision_id
      using errcode = 'P0001';
  end if;


  if
    new.sales_order_id
      is distinct from
    v_revision_order_id
  then
    raise exception
      'Revision effect Sales Order does not match its revision.'
      using errcode = 'P0001';
  end if;


  new.created_by :=
    coalesce(
      new.created_by,
      auth.uid()
    );


  return new;

end;
$$;


drop trigger if exists
  trg_validate_sales_order_revision_effect
on public.sales_order_revision_effects;

create trigger
  trg_validate_sales_order_revision_effect
before insert
on public.sales_order_revision_effects
for each row
execute function
  public.validate_sales_order_revision_effect();


/* =========================================================
 * 4. Revision Effects Are Append-Only
 * ========================================================= */

create or replace function
  public.protect_sales_order_revision_effect()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  raise exception
    'Sales Order revision effects are immutable and cannot be updated or deleted.'
    using errcode = 'P0001';

end;
$$;


drop trigger if exists
  trg_protect_sales_order_revision_effect
on public.sales_order_revision_effects;

create trigger
  trg_protect_sales_order_revision_effect
before update or delete
on public.sales_order_revision_effects
for each row
execute function
  public.protect_sales_order_revision_effect();


/* =========================================================
 * 5. Row Level Security
 * ========================================================= */

alter table
  public.sales_order_revision_effects
enable row level security;


drop policy if exists
  sales_order_revision_effects_admin_select
on public.sales_order_revision_effects;

create policy
  sales_order_revision_effects_admin_select
on public.sales_order_revision_effects
for select
to authenticated
using (
  public.is_admin()
);


drop policy if exists
  sales_order_revision_effects_admin_insert
on public.sales_order_revision_effects;

create policy
  sales_order_revision_effects_admin_insert
on public.sales_order_revision_effects
for insert
to authenticated
with check (
  public.is_admin()
);


/* =========================================================
 * 6. Internal Revision Write Authorization
 *
 * IMPORTANT:
 *
 * This is NOT a general "on/off" bypass.
 *
 * The transaction-local value must contain a real Revision
 * UUID. The revision must:
 *
 *   - exist;
 *   - belong to the Sales Order being modified;
 *   - still have status = draft;
 *   - belong to the current authenticated actor.
 *
 * Only the later SECURITY DEFINER apply workflow will set
 * this context.
 * ========================================================= */

create or replace function
  public.is_authorized_sales_order_revision_write(
    p_sales_order_id uuid
  )
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_setting text;

  v_revision_id uuid;

  v_allowed boolean := false;
begin

  if p_sales_order_id is null then
    return false;
  end if;


  v_setting :=
    nullif(
      current_setting(
        'app.sales_order_revision_internal_write',
        true
      ),
      ''
    );


  if v_setting is null then
    return false;
  end if;


  begin

    v_revision_id :=
      v_setting::uuid;

  exception
    when invalid_text_representation then
      return false;
  end;


  select
    exists (
      select
        1
      from
        public.sales_order_revisions revision
      where
        revision.id =
          v_revision_id
        and
        revision.sales_order_id =
          p_sales_order_id
        and
        revision.status =
          'draft'
        and
        revision.created_by =
          auth.uid()
    )
  into
    v_allowed;


  return
    coalesce(
      v_allowed,
      false
    );

end;
$$;


/* =========================================================
 * 7. Harden Header Lifecycle Guard
 *
 * Normal Migration-158 behavior remains unchanged.
 *
 * The only new path is:
 *
 *   valid draft revision
 *       +
 *   matching transaction-local revision UUID
 *
 * The apply engine is still responsible for creating the
 * accounting/inventory correction before finalizing the
 * revision.
 * ========================================================= */

create or replace function
  public.enforce_sales_order_lifecycle_immutability()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_old_business jsonb;
  v_new_business jsonb;

  v_revision_write boolean := false;
begin

  if tg_op = 'DELETE' then

    if old.status = 'draft' then
      return old;
    end if;

    raise exception
      'Sales Order % cannot be deleted from status "%". Confirmed Sales Orders are historical accounting documents.',
      old.order_number,
      old.status
      using errcode = 'P0001';

  end if;


  if old.status = 'draft' then

    if new.status not in (
      'draft',
      'confirmed',
      'cancelled'
    ) then
      raise exception
        'Draft Sales Order % cannot transition directly to status "%". Confirm or cancel the Sales Order through the controlled workflow.',
        old.order_number,
        new.status
        using errcode = 'P0001';
    end if;

    return new;

  end if;


  if old.status = 'cancelled' then
    raise exception
      'Cancelled Sales Order % is immutable.',
      old.order_number
      using errcode = 'P0001';
  end if;


  /*
   * Closed Sales Orders remain outside the direct revision
   * workflow. They require formal accounting-period handling.
   */
  if old.status = 'closed' then
    raise exception
      'Closed Sales Order % is immutable.',
      old.order_number
      using errcode = 'P0001';
  end if;


  v_revision_write :=
    public.is_authorized_sales_order_revision_write(
      old.id
    );


  /*
   * Controlled revision writes may alter the commercial
   * state, but may NOT:
   *
   *   - change identity;
   *   - move the Sales Order to another customer;
   *   - change currency/exchange-rate history;
   *   - cancel it;
   *   - rewrite receipt-derived paid amount.
   */
  if v_revision_write then

    if
      new.id is distinct from old.id
      or
      new.order_number is distinct from old.order_number
      or
      new.customer_id is distinct from old.customer_id
      or
      new.currency_code is distinct from old.currency_code
      or
      new.exchange_rate is distinct from old.exchange_rate
      or
      new.order_date is distinct from old.order_date
      or
      new.paid_amount is distinct from old.paid_amount
    then
      raise exception
        'Controlled Sales Order revision attempted to change a protected historical identity/payment field.'
        using errcode = 'P0001';
    end if;


    if new.status = 'cancelled' then
      raise exception
        'A posted Sales Order cannot be cancelled through the modification workflow.'
        using errcode = 'P0001';
    end if;


    return new;

  end if;


  /*
   * Standard Migration-158 commercial immutability.
   */
  if new.status = 'cancelled' then
    raise exception
      'Sales Order % has already been confirmed and cannot be cancelled directly. Use the controlled Sales Return / accounting reversal workflow.',
      old.order_number
      using errcode = 'P0001';
  end if;


  v_old_business :=
    to_jsonb(old)
      - 'status'
      - 'fulfilment_status'
      - 'payment_status'
      - 'paid_amount'
      - 'balance_due'
      - 'processing_at'
      - 'completed_at'
      - 'closed_at'
      - 'updated_by'
      - 'updated_at';

  v_new_business :=
    to_jsonb(new)
      - 'status'
      - 'fulfilment_status'
      - 'payment_status'
      - 'paid_amount'
      - 'balance_due'
      - 'processing_at'
      - 'completed_at'
      - 'closed_at'
      - 'updated_by'
      - 'updated_at';


  if v_old_business is distinct from v_new_business then
    raise exception
      'Confirmed Sales Order commercial fields are immutable. Use the controlled Sales Order modification workflow.'
      using errcode = 'P0001';
  end if;


  if
    old.status = 'confirmed'
    and new.status not in (
      'confirmed',
      'processing',
      'partially_fulfilled',
      'fulfilled',
      'completed',
      'closed'
    )
  then
    raise exception
      'Confirmed Sales Order % cannot transition to status "%".',
      old.order_number,
      new.status
      using errcode = 'P0001';
  end if;


  if
    old.status = 'processing'
    and new.status not in (
      'processing',
      'partially_fulfilled',
      'fulfilled',
      'completed',
      'closed'
    )
  then
    raise exception
      'Processing Sales Order % cannot transition to status "%".',
      old.order_number,
      new.status
      using errcode = 'P0001';
  end if;


  if
    old.status = 'partially_fulfilled'
    and new.status not in (
      'processing',
      'partially_fulfilled',
      'fulfilled',
      'completed',
      'closed'
    )
  then
    raise exception
      'Partially fulfilled Sales Order % cannot transition to status "%".',
      old.order_number,
      new.status
      using errcode = 'P0001';
  end if;


  if
    old.status = 'fulfilled'
    and new.status not in (
      'fulfilled',
      'completed',
      'closed'
    )
  then
    raise exception
      'Fulfilled Sales Order % cannot transition to status "%".',
      old.order_number,
      new.status
      using errcode = 'P0001';
  end if;


  if
    old.status = 'completed'
    and new.status not in (
      'completed',
      'closed'
    )
  then
    raise exception
      'Completed Sales Order % cannot transition to status "%".',
      old.order_number,
      new.status
      using errcode = 'P0001';
  end if;


  return new;

end;
$$;


/* =========================================================
 * 8. Harden Item Lifecycle Guard
 * ========================================================= */

create or replace function
  public.enforce_sales_order_item_lifecycle_immutability()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_old_parent_status text;
  v_new_parent_status text;

  v_order_id uuid;

  v_revision_write boolean := false;

  v_old_business jsonb;
  v_new_business jsonb;
begin

  if tg_op = 'INSERT' then

    v_order_id :=
      new.sales_order_id;


    select
      status
    into
      v_new_parent_status
    from
      public.sales_orders
    where
      id =
        v_order_id;


    if not found then
      raise exception
        'Parent Sales Order was not found.'
        using errcode = 'P0001';
    end if;


    if v_new_parent_status = 'draft' then
      return new;
    end if;


    v_revision_write :=
      public.is_authorized_sales_order_revision_write(
        v_order_id
      );


    if not v_revision_write then
      raise exception
        'Items cannot be added to a Sales Order in status "%". Confirmed Sales Order commercial lines are immutable.',
        v_new_parent_status
        using errcode = 'P0001';
    end if;


    /*
     * Phase 193 intentionally does not support adding new
     * lines to already fulfilled historical documents.
     */
    raise exception
      'Adding new lines to a posted Sales Order is not enabled in modification phase 193.'
      using errcode = 'P0001';

  end if;


  if tg_op = 'DELETE' then

    v_order_id :=
      old.sales_order_id;


    select
      status
    into
      v_old_parent_status
    from
      public.sales_orders
    where
      id =
        v_order_id;


    if not found then
      return old;
    end if;


    if v_old_parent_status = 'draft' then
      return old;
    end if;


    /*
     * Never physically delete historical posted lines.
     */
    raise exception
      'Posted Sales Order lines cannot be deleted. Use a controlled quantity correction or Sales Return.'
      using errcode = 'P0001';

  end if;


  v_order_id :=
    old.sales_order_id;


  select
    status
  into
    v_old_parent_status
  from
    public.sales_orders
  where
    id =
      old.sales_order_id;


  if not found then
    raise exception
      'Original parent Sales Order was not found.'
      using errcode = 'P0001';
  end if;


  select
    status
  into
    v_new_parent_status
  from
    public.sales_orders
  where
    id =
      new.sales_order_id;


  if not found then
    raise exception
      'Target parent Sales Order was not found.'
      using errcode = 'P0001';
  end if;


  if v_old_parent_status = 'draft' then

    if v_new_parent_status <> 'draft' then
      raise exception
        'Sales Order items cannot be moved into a non-draft Sales Order.'
        using errcode = 'P0001';
    end if;

    return new;

  end if;


  if
    new.sales_order_id
      is distinct from
    old.sales_order_id
  then
    raise exception
      'Confirmed Sales Order items cannot be moved between Sales Orders.'
      using errcode = 'P0001';
  end if;


  v_revision_write :=
    public.is_authorized_sales_order_revision_write(
      old.sales_order_id
    );


  if v_revision_write then

    /*
     * Historical identity remains protected even during a
     * controlled revision.
     *
     * Product replacement is represented by a later explicit
     * exchange workflow, not by silently changing product_id.
     */
    if
      new.id is distinct from old.id
      or
      new.sales_order_id is distinct from old.sales_order_id
      or
      new.product_id is distinct from old.product_id
      or
      new.created_at is distinct from old.created_at
    then
      raise exception
        'Controlled Sales Order revision attempted to change a protected line identity field.'
        using errcode = 'P0001';
    end if;


    if
      new.quantity <= 0
      or
      new.quantity_fulfilled < 0
      or
      new.quantity_fulfilled > new.quantity
    then
      raise exception
        'Controlled Sales Order revision produced invalid line quantities.'
        using errcode = 'P0001';
    end if;


    return new;

  end if;


  /*
   * Standard Migration-158 behavior.
   */
  v_old_business :=
    to_jsonb(old)
      - 'warehouse_id'
      - 'fulfilment_status'
      - 'quantity_reserved'
      - 'quantity_allocated'
      - 'quantity_fulfilled'
      - 'shortage_quantity'
      - 'procurement_required'
      - 'updated_at';

  v_new_business :=
    to_jsonb(new)
      - 'warehouse_id'
      - 'fulfilment_status'
      - 'quantity_reserved'
      - 'quantity_allocated'
      - 'quantity_fulfilled'
      - 'shortage_quantity'
      - 'procurement_required'
      - 'updated_at';


  if v_old_business is distinct from v_new_business then
    raise exception
      'Confirmed Sales Order item commercial fields are immutable. Use the controlled fulfilment or Sales Order modification workflow.'
      using errcode = 'P0001';
  end if;


  if
    new.quantity_fulfilled <
    old.quantity_fulfilled
  then
    raise exception
      'Sales Order fulfilled quantity cannot be reduced directly. Use the controlled Sales Return or Sales Order modification workflow.'
      using errcode = 'P0001';
  end if;


  if
    new.quantity_reserved < 0
    or
    new.quantity_allocated < 0
    or
    new.quantity_fulfilled < 0
    or
    new.quantity_cancelled < 0
    or
    new.shortage_quantity < 0
  then
    raise exception
      'Sales Order operational quantities cannot be negative.'
      using errcode = 'P0001';
  end if;


  return new;

end;
$$;


/* =========================================================
 * 9. Permissions - Internal Helpers
 * ========================================================= */

revoke all
on function
  public.is_authorized_sales_order_revision_write(
    uuid
  )
from public, anon, authenticated;

revoke all
on function
  public.validate_sales_order_revision_effect()
from public, anon, authenticated;

revoke all
on function
  public.protect_sales_order_revision_effect()
from public, anon, authenticated;


/* =========================================================
 * 10. Documentation
 * ========================================================= */

comment on table
  public.sales_order_revision_effects
is
  'Immutable detailed effect ledger for applied Sales Order revisions. Stores commercial GL, inventory, COGS and customer-balance effects without rewriting the original posted transaction history.';


comment on function
  public.is_authorized_sales_order_revision_write(
    uuid
  )
is
  'Internal authorization helper for the controlled Sales Order revision workflow. Requires a transaction-local revision UUID matching a draft revision owned by the authenticated actor. Not executable directly through the API.';


comment on function
  public.enforce_sales_order_lifecycle_immutability()
is
  'Protects financially posted Sales Orders from direct commercial mutation while allowing narrowly authorized, revision-linked writes performed by the controlled Sales Order modification engine.';


comment on function
  public.enforce_sales_order_item_lifecycle_immutability()
is
  'Protects posted Sales Order line history while allowing narrowly authorized, revision-linked correction of existing lines. Posted line deletion and product replacement remain prohibited.';


/* =========================================================
 * 11. Controlled Apply Engine
 *
 * Phase 193 production scope:
 *   - fulfilled / completed Sales Orders only
 *   - existing lines only (no add/remove/product replacement)
 *   - quantity / price / discount / VAT corrections
 *   - invoice discount / delivery / round-off / notes
 *   - quantity differences are treated as ENTRY CORRECTIONS
 *   - receipts are never edited or deleted
 *   - if revised total is below paid amount, apply is blocked
 *     until the explicit customer-credit workflow is enabled
 *
 * Original GL and inventory history is never deleted.
 * Only differential correction transactions are posted.
 * ========================================================= */

/* Trigger functions call this helper during normal DML.  The helper itself
 * does not mutate data; execution is required so the trigger can evaluate it.
 */
grant execute
on function public.is_authorized_sales_order_revision_write(uuid)
to authenticated;


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
      'Phase 193 apply supports fulfilled/completed Sales Orders only. Current status is "%".',
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

  /* Phase 193 deliberately requires every existing line exactly once. */
  select count(*) into v_existing_count
  from public.sales_order_items
  where sales_order_id = v_order.id;

  select jsonb_array_length(v_items) into v_proposed_count;

  if v_proposed_count <> v_existing_count then
    raise exception
      'Phase 193 does not add or remove posted Sales Order lines. Expected % existing lines but received %.',
      v_existing_count, v_proposed_count;
  end if;

  select count(*)
  into v_match_count
  from jsonb_array_elements(v_items) p
  join public.sales_order_items soi
    on soi.id = nullif(p ->> 'id','')::uuid
   and soi.sales_order_id = v_order.id;

  if v_match_count <> v_existing_count then
    raise exception 'Every proposed line must contain one unique existing Sales Order item ID.';
  end if;

  if exists (
    select 1
    from (
      select nullif(p ->> 'id','')::uuid as id, count(*) as c
      from jsonb_array_elements(v_items) p
      group by nullif(p ->> 'id','')::uuid
    ) d
    where d.id is null or d.c <> 1
  ) then
    raise exception 'Duplicate or missing Sales Order item IDs are not allowed.';
  end if;

  /* One warehouse keeps phase-193 inventory correction atomic and explicit. */
  select count(distinct coalesce(soi.warehouse_id, v_order.warehouse_id))
  into v_order_warehouse_count
  from public.sales_order_items soi
  where soi.sales_order_id = v_order.id
    and soi.product_id is not null;

  if v_order_warehouse_count > 1 then
    raise exception 'Phase 193 inventory correction supports one warehouse per Sales Order.';
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
    select * into v_item
    from public.sales_order_items
    where id = (v_proposed ->> 'id')::uuid
      and sales_order_id = v_order.id
    for update;

    v_new_quantity := nullif(v_proposed ->> 'quantity','')::numeric;
    v_new_unit_price := nullif(v_proposed ->> 'unit_price','')::numeric;
    v_new_discount_percentage := coalesce(nullif(v_proposed ->> 'discount_percentage','')::numeric,0);
    v_new_tax_percentage := coalesce(nullif(v_proposed ->> 'tax_percentage','')::numeric,0);

    if v_new_quantity is null or v_new_quantity <= 0 then
      raise exception 'Quantity must be greater than zero on line %.', v_item.line_number;
    end if;
    if v_new_unit_price is null or v_new_unit_price < 0 then
      raise exception 'Unit price cannot be negative on line %.', v_item.line_number;
    end if;
    if v_new_discount_percentage < 0 or v_new_discount_percentage > 100 then
      raise exception 'Discount percentage must be between 0 and 100 on line %.', v_item.line_number;
    end if;
    if v_new_tax_percentage < 0 or v_new_tax_percentage > 100 then
      raise exception 'Tax percentage must be between 0 and 100 on line %.', v_item.line_number;
    end if;

    if v_item.product_id is distinct from nullif(v_proposed ->> 'product_id','')::uuid then
      raise exception 'Product replacement is not enabled in phase 193. Remove/add will be handled by the exchange extension.';
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
  v_balance_due := greatest(round(v_grand_total - coalesce(v_order.paid_amount,0),2),0);
  v_customer_credit := greatest(round(coalesce(v_order.paid_amount,0) - v_grand_total,2),0);
  v_additional_due := greatest(round(v_balance_due - coalesce(v_order.balance_due,0),2),0);

  /* Receipts are immutable.  Do not invent a refund/advance allocation here. */
  if v_customer_credit > 0 then
    raise exception
      'Corrected total would create customer credit of %. Existing receipts will not be rewritten. Use the customer-credit/refund workflow before applying this revision.',
      v_customer_credit;
  end if;

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
      'paid_amount', v_order.paid_amount,
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
  if exists (
    select 1
    from jsonb_array_elements(v_items) p
    join public.sales_order_items soi
      on soi.id = (p ->> 'id')::uuid
    where soi.sales_order_id = v_order.id
      and round((p ->> 'quantity')::numeric,4) <> round(soi.quantity,4)
  ) and p_modification_type <> 'entry_correction' then
    raise exception 'Quantity changes on fulfilled Sales Orders require modification_type = entry_correction.';
  end if;

  /* Resolve the single warehouse used by physical lines. */
  select coalesce(min(coalesce(soi.warehouse_id, v_order.warehouse_id)::text)::uuid, v_order.warehouse_id)
  into v_warehouse_id
  from public.sales_order_items soi
  where soi.sales_order_id = v_order.id
    and soi.product_id is not null;

  /* Create restore header only if required. */
  if exists (
    select 1
    from jsonb_array_elements(v_items) p
    join public.sales_order_items soi on soi.id = (p ->> 'id')::uuid
    where soi.sales_order_id = v_order.id
      and (p ->> 'quantity')::numeric < soi.quantity
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
    join public.sales_order_items soi on soi.id = (p ->> 'id')::uuid
    where soi.sales_order_id = v_order.id
      and (p ->> 'quantity')::numeric > soi.quantity
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
  loop
    select * into v_item
    from public.sales_order_items
    where id = (v_proposed ->> 'id')::uuid
      and sales_order_id = v_order.id
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

      /* Require one exact historical posted sales_issue source for this line.
       * Multi-delivery history is intentionally deferred to the extension.
       */
      select count(*), min(doi.id)
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

      if v_issue_match_count <> 1 then
        raise exception
          'Sales Order line % has % historical sales_issue sources. Phase 193 requires exactly one; use the multi-delivery extension.',
          v_item.line_number, v_issue_match_count;
      end if;

      select iti.unit_cost, iti.valuation_unit_cost
      into v_historical_unit_cost, v_historical_valuation_cost
      from public.inventory_transaction_items iti
      join public.inventory_transactions it on it.id = iti.inventory_transaction_id
      where iti.source_document_item_id = v_delivery_item_id
        and iti.product_id = v_item.product_id
        and iti.warehouse_id = coalesce(v_item.warehouse_id, v_order.warehouse_id)
        and iti.quantity_change < 0
        and it.transaction_type = 'sales_issue'
        and it.status = 'posted'
      limit 1;

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
        jsonb_build_object('costBasis','historical_sales_issue','deliveryOrderItemId',v_delivery_item_id),
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
  v_payment_status := case
    when coalesce(v_order.paid_amount,0) <= 0 then 'unpaid'
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

  /* ---------------- Finalize immutable revision ---------------- */
  update public.sales_order_revisions
  set status = 'applied',
      commercial_journal_entry_id = v_commercial_journal_id,
      inventory_journal_entry_id = v_inventory_journal_id,
      inventory_transaction_id = coalesce(v_restore_transaction_id,v_issue_transaction_id),
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
    'originalPaidAmount',coalesce(v_order.paid_amount,0),
    'revisedBalanceDue',v_balance_due,
    'customerCreditAmount',v_customer_credit,
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


/* =========================================================
 * 12. API Permissions
 * ========================================================= */

revoke all
on function public.apply_sales_order_modification(
  uuid, jsonb, text, text, text, text
)
from public, anon;

grant execute
on function public.apply_sales_order_modification(
  uuid, jsonb, text, text, text, text
)
to authenticated;


comment on function public.apply_sales_order_modification(
  uuid, jsonb, text, text, text, text
)
is
  'Management-only atomic Sales Order revision engine. Phase 193 applies controlled corrections to existing fulfilled/completed Sales Order lines, posts differential AR/Revenue/VAT and Inventory/COGS effects, preserves original journals and receipts, and records immutable revision/effect history.';
