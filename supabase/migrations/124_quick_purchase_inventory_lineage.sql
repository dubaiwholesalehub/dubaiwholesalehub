/*
 * =========================================================
 * 124 — Quick Purchase Inventory Lineage
 *
 * PURPOSE
 * -------
 *
 * Establishes an exact line-level relationship between:
 *
 *   quick_purchase_items
 *
 * and
 *
 *   inventory_transaction_items
 *
 * using:
 *
 *   inventory_transaction_items.source_document_item_id
 *
 *
 * Quick Purchase already stores:
 *
 *   quick_purchases.inventory_transaction_id
 *
 * and guarantees that the same product cannot appear more
 * than once in one Quick Purchase.
 *
 * Therefore the relationship is deterministic:
 *
 *   Quick Purchase
 *      +
 *   Inventory Transaction
 *      +
 *   Product
 *
 * uniquely resolves one purchase item to one inventory item.
 *
 *
 * This migration:
 *
 *   1. Backfills historical Quick Purchase inventory lines.
 *   2. Provides a controlled linker for one Quick Purchase.
 *   3. Automatically links future Quick Purchases after their
 *      items are created.
 *   4. Provides audit intelligence for missing/ambiguous
 *      Quick Purchase inventory lineage.
 *
 *
 * IMPORTANT
 * ---------
 *
 * The existing post_local_purchase_inventory() function is
 * intentionally NOT changed.
 *
 * The Quick Purchase workflow currently posts inventory before
 * the Quick Purchase header/items exist.
 *
 * Lineage is therefore established safely after the purchase
 * items exist.
 * =========================================================
 */


/* =========================================================
 * 1. Controlled Quick Purchase Inventory Lineage Linker
 * ========================================================= */

create or replace function
  public.link_quick_purchase_inventory_items(
    p_quick_purchase_id uuid
  )
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase
    public.quick_purchases%rowtype;

  v_purchase_item
    public.quick_purchase_items%rowtype;

  v_inventory_item_id uuid;

  v_inventory_match_count integer;

  v_linked_count integer := 0;

begin

  /* =======================================================
   * Authentication
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
      'Administrator access is required.';
  end if;


  /* =======================================================
   * Input
   * ======================================================= */

  if
    p_quick_purchase_id is null
  then
    raise exception
      'Quick Purchase ID is required.';
  end if;


  /* =======================================================
   * Lock Quick Purchase
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
    v_purchase.inventory_transaction_id is null
  then
    raise exception
      'Quick Purchase % does not have an inventory transaction.',
      v_purchase.purchase_number;
  end if;


  /* =======================================================
   * Validate Inventory Transaction
   * ======================================================= */

  perform
    1
  from
    public.inventory_transactions
  where
    id =
      v_purchase.inventory_transaction_id

    and transaction_type =
      'local_purchase'

    and status =
      'posted';


  if not found then
    raise exception
      'Quick Purchase % does not have a valid posted local-purchase inventory transaction.',
      v_purchase.purchase_number;
  end if;


  /* =======================================================
   * Link Every Purchase Item
   * ======================================================= */

  for v_purchase_item in

    select
      *
    from
      public.quick_purchase_items
    where
      quick_purchase_id =
        v_purchase.id
    order by
      line_number

  loop

    /*
     * Resolve the exact inventory transaction item.
     *
     * Product uniqueness exists on both sides for this
     * Quick Purchase workflow.
     */

    select
      count(*),
      min(
        inventory_item.id::text
      )::uuid

    into
      v_inventory_match_count,
      v_inventory_item_id

    from
      public.inventory_transaction_items
        inventory_item

    where
      inventory_item.inventory_transaction_id =
        v_purchase.inventory_transaction_id

      and
      inventory_item.product_id =
        v_purchase_item.product_id;


    if
      v_inventory_match_count =
        0
    then
      raise exception
        'Quick Purchase % line % does not have a matching inventory transaction item.',
        v_purchase.purchase_number,
        v_purchase_item.line_number;
    end if;


    if
      v_inventory_match_count <>
        1
    then
      raise exception
        'Quick Purchase % line % has % matching inventory transaction items. Lineage is ambiguous.',
        v_purchase.purchase_number,
        v_purchase_item.line_number,
        v_inventory_match_count;
    end if;


    /*
     * Do not silently overwrite an existing unrelated source
     * document relationship.
     */

    if exists (
      select
        1
      from
        public.inventory_transaction_items
      where
        id =
          v_inventory_item_id

        and
        source_document_item_id
          is not null

        and
        source_document_item_id <>
          v_purchase_item.id
    )
    then
      raise exception
        'Quick Purchase % line % inventory item already points to another source document item.',
        v_purchase.purchase_number,
        v_purchase_item.line_number;
    end if;


    update
      public.inventory_transaction_items

    set
      source_document_item_id =
        v_purchase_item.id

    where
      id =
        v_inventory_item_id

      and
      source_document_item_id
        is distinct from
          v_purchase_item.id;


    if found then
      v_linked_count :=
        v_linked_count +
        1;
    end if;

  end loop;


  return
    v_linked_count;

end;
$$;


/* =========================================================
 * 2. Internal Trigger Linker
 *
 * Called after each Quick Purchase item insert.
 *
 * We cannot call the admin-only public linker directly from
 * an unauthenticated database context safely, so the trigger
 * performs only the deterministic relationship update.
 * ========================================================= */

create or replace function
  public.link_quick_purchase_inventory_item_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inventory_transaction_id uuid;

  v_inventory_item_id uuid;

  v_match_count integer;

begin

  /* =======================================================
   * Resolve Purchase Inventory Transaction
   * ======================================================= */

  select
    purchase.inventory_transaction_id
  into
    v_inventory_transaction_id
  from
    public.quick_purchases
      purchase
  where
    purchase.id =
      new.quick_purchase_id;


  if
    v_inventory_transaction_id is null
  then
    return
      new;
  end if;


  /* =======================================================
   * Resolve Exact Inventory Item
   * ======================================================= */

  select
    count(*),
    min(
      inventory_item.id::text
    )::uuid

  into
    v_match_count,
    v_inventory_item_id

  from
    public.inventory_transaction_items
      inventory_item

  where
    inventory_item.inventory_transaction_id =
      v_inventory_transaction_id

    and
    inventory_item.product_id =
      new.product_id;


  /*
   * Fail loudly on ambiguity.
   *
   * Missing lineage is allowed here because the controlled
   * audit/linker can repair it later. Ambiguous lineage must
   * never be silently guessed.
   */

  if
    v_match_count >
      1
  then
    raise exception
      'Quick Purchase item % has ambiguous inventory lineage.',
      new.id;
  end if;


  if
    v_match_count =
      1
  then

    if exists (
      select
        1
      from
        public.inventory_transaction_items
      where
        id =
          v_inventory_item_id

        and
        source_document_item_id
          is not null

        and
        source_document_item_id <>
          new.id
    )
    then
      raise exception
        'Inventory transaction item % already points to another source document item.',
        v_inventory_item_id;
    end if;


    update
      public.inventory_transaction_items

    set
      source_document_item_id =
        new.id

    where
      id =
        v_inventory_item_id

      and
      source_document_item_id
        is distinct from
          new.id;

  end if;


  return
    new;

end;
$$;


/* =========================================================
 * 3. Future Quick Purchase Automatic Lineage
 * ========================================================= */

drop trigger if exists
  link_quick_purchase_inventory_item
on
  public.quick_purchase_items;


create trigger
  link_quick_purchase_inventory_item

after insert
on
  public.quick_purchase_items

for each row

execute function
  public.link_quick_purchase_inventory_item_trigger();


/* =========================================================
 * 4. Historical Backfill
 *
 * Only deterministic 1:1 matches are updated.
 *
 * Existing non-null relationships are never overwritten.
 * ========================================================= */

with deterministic_links as
(
  select
    inventory_item.id
      as inventory_transaction_item_id,

    purchase_item.id
      as quick_purchase_item_id

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
      inventory_item.product_id =
        purchase_item.product_id

  where
    purchase.inventory_transaction_id
      is not null

    and
    inventory_item.source_document_item_id
      is null

    and
    (
      select
        count(*)

      from
        public.inventory_transaction_items
          candidate_inventory_item

      where
        candidate_inventory_item.inventory_transaction_id =
          purchase.inventory_transaction_id

        and
        candidate_inventory_item.product_id =
          purchase_item.product_id
    ) =
      1
)

update
  public.inventory_transaction_items
    inventory_item

set
  source_document_item_id =
    link.quick_purchase_item_id

from
  deterministic_links
    link

where
  inventory_item.id =
    link.inventory_transaction_item_id

  and
  inventory_item.source_document_item_id
    is null;


/* =========================================================
 * 5. Quick Purchase Inventory Lineage Audit View
 * ========================================================= */

create or replace view
  public.quick_purchase_inventory_lineage_audit

with (
  security_invoker = true
)

as

select
  purchase.id
    as quick_purchase_id,

  purchase.purchase_number,

  purchase.purchase_date,

  purchase.status
    as quick_purchase_status,

  purchase.inventory_transaction_id,

  inventory_transaction.transaction_number,

  inventory_transaction.status
    as inventory_transaction_status,

  purchase_item.id
    as quick_purchase_item_id,

  purchase_item.line_number,

  purchase_item.product_id,

  purchase_item.quantity
    as purchased_quantity,

  purchase_item.unit_cost
    as purchase_unit_cost,

  inventory_item.id
    as inventory_transaction_item_id,

  inventory_item.quantity_change
    as inventory_quantity,

  inventory_item.unit_cost
    as inventory_unit_cost,

  inventory_item.source_document_item_id,

  case

    when
      purchase.inventory_transaction_id
        is null
    then
      'missing_inventory_transaction'


    when
      inventory_transaction.id
        is null
    then
      'inventory_transaction_not_found'


    when
      inventory_item.id
        is null
    then
      'missing_inventory_item'


    when
      inventory_item.source_document_item_id
        is null
    then
      'missing_lineage'


    when
      inventory_item.source_document_item_id <>
        purchase_item.id
    then
      'incorrect_lineage'


    when
      inventory_item.quantity_change <>
        purchase_item.quantity
    then
      'quantity_mismatch'


    when
      abs(
        inventory_item.unit_cost
        -
        purchase_item.unit_cost
      ) >
        0.0001
    then
      'unit_cost_mismatch'


    else
      'ok'

  end
    as lineage_status

from
  public.quick_purchases
    purchase

inner join
  public.quick_purchase_items
    purchase_item

  on
    purchase_item.quick_purchase_id =
      purchase.id

left join
  public.inventory_transactions
    inventory_transaction

  on
    inventory_transaction.id =
      purchase.inventory_transaction_id

left join
  public.inventory_transaction_items
    inventory_item

  on
    inventory_item.inventory_transaction_id =
      purchase.inventory_transaction_id

    and
    inventory_item.product_id =
      purchase_item.product_id;


/* =========================================================
 * 6. Supporting Index
 *
 * Existing source_document_item_id index already exists.
 *
 * This composite index improves Quick Purchase lineage
 * resolution and future Supplier Return validation.
 * ========================================================= */

create index if not exists
  inventory_transaction_items_transaction_product_idx

on public.inventory_transaction_items (
  inventory_transaction_id,
  product_id
);


/* =========================================================
 * 7. Permissions
 * ========================================================= */

revoke all
on function
  public.link_quick_purchase_inventory_items(
    uuid
  )
from public;


grant execute
on function
  public.link_quick_purchase_inventory_items(
    uuid
  )
to authenticated;


/* =========================================================
 * 8. Documentation
 * ========================================================= */

comment on function
  public.link_quick_purchase_inventory_items(
    uuid
  )
is
  'Establishes deterministic Quick Purchase item to inventory transaction item lineage through inventory_transaction_items.source_document_item_id.';


comment on view
  public.quick_purchase_inventory_lineage_audit
is
  'Audits Quick Purchase inventory lineage, quantities and original inventory unit cost for Supplier Return and inventory reconciliation controls.';