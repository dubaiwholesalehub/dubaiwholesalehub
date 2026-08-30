/*
 * 157 — Fix Delivery Completion Immutability
 *
 * Migration 156 protects dispatched Delivery Order items
 * while allowing the normal delivered_quantity update.
 *
 * delivery_order_items.remaining_quantity is a generated
 * column whose value automatically changes when
 * delivered_quantity changes.
 *
 * Therefore remaining_quantity must also be excluded from
 * row-comparison immutability checks during controlled
 * delivery completion.
 */


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
   *
   * remaining_quantity is generated and therefore excluded
   * from comparison even though normal delivered rows should
   * not cause it to change.
   * ======================================================= */

  if v_old_parent_status = 'delivered' then

    v_old_business :=
      to_jsonb(old)
      - array[
          'updated_at',
          'remaining_quantity'
        ];

    v_new_business :=
      to_jsonb(new)
      - array[
          'updated_at',
          'remaining_quantity'
        ];

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
   * remaining_quantity changes automatically because it is
   * a generated column derived partly from delivered_quantity.
   *
   * All inventory / dispatch lineage remains frozen.
   * ======================================================= */

  v_old_business :=
    to_jsonb(old)
    - array[
        'delivered_quantity',
        'remaining_quantity',
        'updated_at'
      ];

  v_new_business :=
    to_jsonb(new)
    - array[
        'delivered_quantity',
        'remaining_quantity',
        'updated_at'
      ];

  if v_old_business is distinct from v_new_business then
    raise exception
      'Dispatched Delivery Order items are immutable except for controlled delivery completion.';
  end if;


  /*
   * Delivery completion may only set delivered quantity
   * equal to the already-posted dispatched quantity.
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


comment on function
  public.enforce_delivery_order_item_lifecycle_immutability()
is
'Protects Delivery Order item inventory and dispatch facts after dispatch. Controlled delivery completion may update delivered_quantity, with remaining_quantity changing automatically as a generated column.';