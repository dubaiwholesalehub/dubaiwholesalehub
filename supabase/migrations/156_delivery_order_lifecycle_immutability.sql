/*
 * 156 — Delivery Order Lifecycle Immutability
 *
 * Purpose
 * -------
 * Protect Delivery Orders after inventory dispatch.
 *
 * Once a Delivery Order reaches "dispatched":
 *
 *   - inventory has left the warehouse,
 *   - Sales Order fulfilment has been updated,
 *   - a posted sales_issue inventory transaction exists,
 *   - COGS / Inventory GL accounting is posted by the
 *     managed atomic dispatch workflow.
 *
 * Therefore dispatched accounting facts must never be
 * silently edited or deleted.
 *
 * The only legitimate post-dispatch operational transition is:
 *
 *   dispatched -> delivered
 *
 * During that transition:
 *
 *   delivery_orders:
 *     status
 *     delivered_date
 *     delivered_at
 *     delivered_by
 *     updated_at
 *     updated_by
 *
 *   delivery_order_items:
 *     delivered_quantity
 *     updated_at
 *
 * may change.
 *
 * A delivered Delivery Order is fully historical and may
 * only receive harmless audit timestamp updates if required.
 *
 * Corrections to dispatched inventory/accounting must use
 * controlled Sales Return / accounting reversal workflows.
 */


/* =========================================================
 * 1. Delivery Order Header Lifecycle Protection
 * ========================================================= */

create or replace function
  public.enforce_delivery_order_lifecycle_immutability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_business jsonb;
  v_new_business jsonb;
begin

  /* -------------------------------------------------------
   * DELETE protection
   * ------------------------------------------------------- */

  if tg_op = 'DELETE' then

    if old.status in (
      'dispatched',
      'delivered'
    ) then
      raise exception
        'Delivery Order % cannot be deleted from status "%". Dispatched Delivery Orders are historical inventory/accounting documents.',
        old.delivery_number,
        old.status;
    end if;

    return old;
  end if;


  /* -------------------------------------------------------
   * Only dispatched/delivered rows require historical
   * immutability protection here.
   *
   * Earlier lifecycle states continue using the existing
   * controlled Delivery workflow.
   * ------------------------------------------------------- */

  if old.status not in (
    'dispatched',
    'delivered'
  ) then
    return new;
  end if;


  /* =======================================================
   * Delivered
   *
   * Delivered is terminal.
   * ======================================================= */

  if old.status = 'delivered' then

    if new.status <> 'delivered' then
      raise exception
        'Delivered Delivery Order % is immutable and cannot transition to "%".',
        old.delivery_number,
        new.status;
    end if;

    /*
     * Ignore only generic update-audit fields.
     */
    v_old_business :=
      to_jsonb(old)
      - array[
          'updated_at',
          'updated_by'
        ];

    v_new_business :=
      to_jsonb(new)
      - array[
          'updated_at',
          'updated_by'
        ];

    if v_old_business is distinct from v_new_business then
      raise exception
        'Delivered Delivery Order % is immutable. Use controlled Sales Return / accounting correction workflows.',
        old.delivery_number;
    end if;

    return new;
  end if;


  /* =======================================================
   * Dispatched
   *
   * Only:
   *
   *   dispatched -> dispatched
   *   dispatched -> delivered
   *
   * are legal.
   * ======================================================= */

  if new.status not in (
    'dispatched',
    'delivered'
  ) then
    raise exception
      'Dispatched Delivery Order % cannot transition to "%". Use a controlled Sales Return / accounting correction workflow.',
      old.delivery_number,
      new.status;
  end if;


  /* -------------------------------------------------------
   * Remaining in dispatched state
   *
   * No business/dispatch facts may change.
   * ------------------------------------------------------- */

  if new.status = 'dispatched' then

    v_old_business :=
      to_jsonb(old)
      - array[
          'updated_at',
          'updated_by'
        ];

    v_new_business :=
      to_jsonb(new)
      - array[
          'updated_at',
          'updated_by'
        ];

    if v_old_business is distinct from v_new_business then
      raise exception
        'Dispatched Delivery Order % is immutable. Use the controlled delivery completion or Sales Return workflow.',
        old.delivery_number;
    end if;

    return new;
  end if;


  /* -------------------------------------------------------
   * dispatched -> delivered
   *
   * mark_delivery_delivered() legitimately changes only:
   *
   *   status
   *   delivered_date
   *   delivered_at
   *   delivered_by
   *   updated_at
   *   updated_by
   *
   * Everything else must remain identical.
   * ------------------------------------------------------- */

  v_old_business :=
    to_jsonb(old)
    - array[
        'status',
        'delivered_date',
        'delivered_at',
        'delivered_by',
        'updated_at',
        'updated_by'
      ];

  v_new_business :=
    to_jsonb(new)
    - array[
        'status',
        'delivered_date',
        'delivered_at',
        'delivered_by',
        'updated_at',
        'updated_by'
      ];

  if v_old_business is distinct from v_new_business then
    raise exception
      'Delivery Order % contains invalid changes during delivery completion.',
      old.delivery_number;
  end if;


  if new.delivered_at is null
     or new.delivered_date is null
  then
    raise exception
      'Delivery Order % requires delivery date and delivery timestamp before it can be marked delivered.',
      old.delivery_number;
  end if;


  return new;

end;
$$;


/* =========================================================
 * Header Trigger
 * ========================================================= */

drop trigger if exists
  trg_enforce_delivery_order_lifecycle_immutability
on public.delivery_orders;


create trigger
  trg_enforce_delivery_order_lifecycle_immutability
before update or delete
on public.delivery_orders
for each row
execute function
  public.enforce_delivery_order_lifecycle_immutability();


/* =========================================================
 * 2. Delivery Order Item Lifecycle Protection
 * ========================================================= */

create or replace function
  public.enforce_delivery_order_item_lifecycle_immutability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_parent_status text;
  v_new_parent_status text;

  v_old_business jsonb;
  v_new_business jsonb;
begin

  /* =======================================================
   * INSERT
   * ======================================================= */

  if tg_op = 'INSERT' then

    select status
    into v_new_parent_status
    from public.delivery_orders
    where id = new.delivery_order_id;

    if v_new_parent_status in (
      'dispatched',
      'delivered'
    ) then
      raise exception
        'Items cannot be added to a Delivery Order in status "%".',
        v_new_parent_status;
    end if;

    return new;
  end if;


  /* =======================================================
   * DELETE
   * ======================================================= */

  if tg_op = 'DELETE' then

    select status
    into v_old_parent_status
    from public.delivery_orders
    where id = old.delivery_order_id;

    if v_old_parent_status in (
      'dispatched',
      'delivered'
    ) then
      raise exception
        'Items cannot be deleted from a Delivery Order in status "%".',
        v_old_parent_status;
    end if;

    return old;
  end if;


  /* =======================================================
   * UPDATE
   * ======================================================= */

  select status
  into v_old_parent_status
  from public.delivery_orders
  where id = old.delivery_order_id;


  select status
  into v_new_parent_status
  from public.delivery_orders
  where id = new.delivery_order_id;


  /*
   * Prevent moving an item into or out of a historical
   * Delivery Order.
   */
  if old.delivery_order_id
       is distinct from
     new.delivery_order_id
  then

    if v_old_parent_status in (
      'dispatched',
      'delivered'
    )
    or v_new_parent_status in (
      'dispatched',
      'delivered'
    ) then
      raise exception
        'Delivery Order items cannot be moved into or out of dispatched/delivered Delivery Orders.';
    end if;

    return new;
  end if;


  /*
   * Pre-dispatch item workflow remains unchanged.
   */
  if v_old_parent_status not in (
    'dispatched',
    'delivered'
  ) then
    return new;
  end if;


  /* =======================================================
   * Delivered parent
   *
   * Item is fully immutable except updated_at.
   * ======================================================= */

  if v_old_parent_status = 'delivered' then

    v_old_business :=
      to_jsonb(old)
      - 'updated_at';

    v_new_business :=
      to_jsonb(new)
      - 'updated_at';

    if v_old_business is distinct from v_new_business then
      raise exception
        'Items belonging to a delivered Delivery Order are immutable.';
    end if;

    return new;
  end if;


  /* =======================================================
   * Dispatched parent
   *
   * mark_delivery_delivered() legitimately changes:
   *
   *   delivered_quantity
   *   updated_at
   *
   * All inventory / dispatch lineage remains frozen.
   * ======================================================= */

  v_old_business :=
    to_jsonb(old)
    - array[
        'delivered_quantity',
        'updated_at'
      ];

  v_new_business :=
    to_jsonb(new)
    - array[
        'delivered_quantity',
        'updated_at'
      ];

  if v_old_business is distinct from v_new_business then
    raise exception
      'Dispatched Delivery Order items are immutable except for controlled delivery completion.';
  end if;


  /*
   * Delivery completion may only set delivered quantity
   * equal to the already-posted dispatched quantity.
   *
   * Keeping the existing value is also harmless/idempotent.
   */
  if new.delivered_quantity
       is distinct from
     old.delivered_quantity
  then

    if new.delivered_quantity
         is distinct from
       old.dispatched_quantity
    then
      raise exception
        'Delivered quantity must equal the posted dispatched quantity.';
    end if;

  end if;


  return new;

end;
$$;


/* =========================================================
 * Item Trigger
 * ========================================================= */

drop trigger if exists
  trg_enforce_delivery_order_item_lifecycle_immutability
on public.delivery_order_items;


create trigger
  trg_enforce_delivery_order_item_lifecycle_immutability
before insert or update or delete
on public.delivery_order_items
for each row
execute function
  public.enforce_delivery_order_item_lifecycle_immutability();


/* =========================================================
 * 3. Documentation
 * ========================================================= */

comment on function
  public.enforce_delivery_order_lifecycle_immutability()
is
'Protects dispatched and delivered Delivery Orders from direct mutation or deletion. The only permitted post-dispatch lifecycle transition is controlled delivery completion. Inventory/accounting corrections must use Sales Return or controlled reversal workflows.';


comment on function
  public.enforce_delivery_order_item_lifecycle_immutability()
is
'Protects Delivery Order item inventory and dispatch facts after dispatch. During controlled delivery completion only delivered_quantity may advance to the already-posted dispatched quantity.';