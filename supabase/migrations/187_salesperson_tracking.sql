/*
 * HM ERP — Salesperson Tracking V1
 *
 * Purpose
 * -------
 * Adds a dedicated commercial salesperson dimension to:
 *
 *   - Sales Quotations
 *   - Sales Orders
 *
 * salesperson_id represents the person who owns the sale.
 *
 * created_by remains the audit identity of the ERP user who
 * physically created the transaction.
 *
 * Example:
 *
 *   salesperson_id = Taher
 *   created_by      = Murtaza / Admin
 *
 * No accounting, VAT, AR, COGS, inventory, payment or
 * delivery posting logic is changed by this migration.
 */


/* =========================================================
 * 1. Add Salesperson Columns
 * ========================================================= */

alter table public.sales_quotations
  add column if not exists salesperson_id uuid;

alter table public.sales_orders
  add column if not exists salesperson_id uuid;


/* =========================================================
 * 2. Foreign Keys
 * ========================================================= */

alter table public.sales_quotations
  drop constraint if exists sales_quotations_salesperson_id_fkey;

alter table public.sales_quotations
  add constraint sales_quotations_salesperson_id_fkey
  foreign key (salesperson_id)
  references public.profiles(id)
  on delete restrict;


alter table public.sales_orders
  drop constraint if exists sales_orders_salesperson_id_fkey;

alter table public.sales_orders
  add constraint sales_orders_salesperson_id_fkey
  foreign key (salesperson_id)
  references public.profiles(id)
  on delete restrict;


/* =========================================================
 * 3. Safe Historical Backfill
 *
 * Production currently has no live Sales Quotations or
 * Sales Orders, but this makes the migration safe if any
 * historical rows exist in another environment.
 *
 * Existing created_by is used only when it points to an
 * active commercial ERP user.
 * ========================================================= */

update public.sales_quotations q
set salesperson_id = q.created_by
where q.salesperson_id is null
  and q.created_by is not null
  and exists (
    select 1
    from public.profiles p
    where p.id = q.created_by
      and p.is_active = true
      and p.role::text in (
        'super_admin',
        'admin',
        'manager',
        'sales'
      )
  );


update public.sales_orders so
set salesperson_id = so.created_by
where so.salesperson_id is null
  and so.created_by is not null
  and exists (
    select 1
    from public.profiles p
    where p.id = so.created_by
      and p.is_active = true
      and p.role::text in (
        'super_admin',
        'admin',
        'manager',
        'sales'
      )
  );


/* =========================================================
 * 4. Refuse Migration If Existing Rows Cannot Be Attributed
 * ========================================================= */

do $$
declare
  v_missing_quotations bigint;
  v_missing_orders bigint;
begin

  select count(*)
  into v_missing_quotations
  from public.sales_quotations
  where salesperson_id is null;


  select count(*)
  into v_missing_orders
  from public.sales_orders
  where salesperson_id is null;


  if v_missing_quotations > 0 then
    raise exception
      'Cannot enable Salesperson Tracking: % Sales Quotation row(s) do not have a valid salesperson.',
      v_missing_quotations;
  end if;


  if v_missing_orders > 0 then
    raise exception
      'Cannot enable Salesperson Tracking: % Sales Order row(s) do not have a valid salesperson.',
      v_missing_orders;
  end if;

end;
$$;


/* =========================================================
 * 5. Require Salesperson On Every Commercial Sale
 * ========================================================= */

alter table public.sales_quotations
  alter column salesperson_id set not null;

alter table public.sales_orders
  alter column salesperson_id set not null;


/* =========================================================
 * 6. Salesperson Validation
 *
 * Validate only:
 *
 *   - when a row is inserted; or
 *   - when salesperson_id is actually changed.
 *
 * Important:
 * A historical salesperson may later become inactive.
 * That must NOT block ordinary payment, delivery or lifecycle
 * synchronization on an already confirmed Sales Order.
 * ========================================================= */

create or replace function
  public.validate_salesperson_assignment()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_is_active boolean;
  v_role text;
begin

  /*
   * On UPDATE, no further salesperson validation is required
   * when the assignment itself has not changed.
   */
  if tg_op = 'UPDATE'
     and new.salesperson_id is not distinct from old.salesperson_id
  then
    return new;
  end if;


  if new.salesperson_id is null then
    raise exception
      'Salesperson is required.'
      using errcode = 'P0001';
  end if;


  select
    p.is_active,
    p.role::text
  into
    v_is_active,
    v_role
  from public.profiles p
  where p.id = new.salesperson_id;


  if not found then
    raise exception
      'Selected salesperson does not exist.'
      using errcode = 'P0001';
  end if;


  if v_is_active is distinct from true then
    raise exception
      'Selected salesperson is inactive.'
      using errcode = 'P0001';
  end if;


  if v_role not in (
    'super_admin',
    'admin',
    'manager',
    'sales'
  ) then
    raise exception
      'Selected ERP user cannot be assigned as a salesperson.'
      using errcode = 'P0001';
  end if;


  return new;

end;
$$;


/* =========================================================
 * 7. Quotation Salesperson Lifecycle Protection
 *
 * Salesperson may be changed while quotation is Draft.
 *
 * Once the quotation leaves Draft, its commercial ownership
 * is historical and cannot be reassigned.
 * ========================================================= */

create or replace function
  public.protect_sales_quotation_salesperson()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  if new.salesperson_id is distinct from old.salesperson_id
     and old.status <> 'draft'
  then
    raise exception
      'Salesperson cannot be changed after Sales Quotation % leaves Draft status.',
      old.quotation_number
      using errcode = 'P0001';
  end if;


  return new;

end;
$$;


/* =========================================================
 * 8. Triggers
 * ========================================================= */

drop trigger if exists
  trg_validate_sales_quotation_salesperson
on public.sales_quotations;

create trigger
  trg_validate_sales_quotation_salesperson
before insert or update of salesperson_id
on public.sales_quotations
for each row
execute function
  public.validate_salesperson_assignment();


drop trigger if exists
  trg_protect_sales_quotation_salesperson
on public.sales_quotations;

create trigger
  trg_protect_sales_quotation_salesperson
before update of salesperson_id
on public.sales_quotations
for each row
execute function
  public.protect_sales_quotation_salesperson();


drop trigger if exists
  trg_validate_sales_order_salesperson
on public.sales_orders;

create trigger
  trg_validate_sales_order_salesperson
before insert or update of salesperson_id
on public.sales_orders
for each row
execute function
  public.validate_salesperson_assignment();


/*
 * No additional Sales Order salesperson immutability trigger
 * is necessary.
 *
 * Migration 158 already freezes every commercial Sales Order
 * header field after confirmation except explicitly permitted
 * operational/payment fields.
 *
 * salesperson_id therefore automatically becomes immutable
 * once the Sales Order is confirmed.
 */


/* =========================================================
 * 9. Reporting Indexes
 * ========================================================= */

create index if not exists
  idx_sales_quotations_salesperson_date
on public.sales_quotations (
  salesperson_id,
  quotation_date
);


create index if not exists
  idx_sales_orders_salesperson_date
on public.sales_orders (
  salesperson_id,
  order_date
);


/* =========================================================
 * 10. Documentation
 * ========================================================= */

comment on column
  public.sales_quotations.salesperson_id
is
  'Commercial owner of the Sales Quotation. Separate from created_by, which records the ERP user who created the document.';


comment on column
  public.sales_orders.salesperson_id
is
  'Commercial owner of the Sales Order for salesperson performance reporting. Separate from created_by.';


comment on function
  public.validate_salesperson_assignment()
is
  'Ensures new or reassigned sales ownership points to an active commercial ERP user. Existing historical assignments remain valid if that user is later deactivated.';


comment on function
  public.protect_sales_quotation_salesperson()
is
  'Allows salesperson reassignment only while a Sales Quotation remains Draft.';