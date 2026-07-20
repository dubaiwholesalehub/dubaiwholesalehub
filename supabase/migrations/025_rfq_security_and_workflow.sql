-- ============================================================
-- Milestone 7.1B
-- RFQ Security, Totals and Workflow Automation
-- ============================================================


-- ============================================================
-- RFQ AUTHORIZATION HELPERS
-- ============================================================

-- Active internal users may view RFQ information.
create or replace function public.can_view_rfqs()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_active = true
      and role in (
        'super_admin',
        'admin',
        'manager',
        'sales',
        'viewer'
      )
  );
$$;


revoke all
on function public.can_view_rfqs()
from public;

grant execute
on function public.can_view_rfqs()
to authenticated;


-- Administrators, managers and sales users may operate RFQs.
create or replace function public.can_manage_rfqs()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_active = true
      and role in (
        'super_admin',
        'admin',
        'manager',
        'sales'
      )
  );
$$;


revoke all
on function public.can_manage_rfqs()
from public;

grant execute
on function public.can_manage_rfqs()
to authenticated;


-- Only administrators and managers may award or close RFQs.
create or replace function public.can_approve_rfqs()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_active = true
      and role in (
        'super_admin',
        'admin',
        'manager'
      )
  );
$$;


revoke all
on function public.can_approve_rfqs()
from public;

grant execute
on function public.can_approve_rfqs()
to authenticated;


-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================

alter table public.rfqs
enable row level security;

alter table public.rfq_items
enable row level security;

alter table public.rfq_suppliers
enable row level security;

alter table public.supplier_quotations
enable row level security;

alter table public.supplier_quotation_items
enable row level security;

alter table public.rfq_status_history
enable row level security;


-- ============================================================
-- RFQS POLICIES
-- ============================================================

drop policy if exists "Staff can view RFQs"
on public.rfqs;

drop policy if exists "RFQ managers can create RFQs"
on public.rfqs;

drop policy if exists "RFQ managers can update RFQs"
on public.rfqs;

drop policy if exists "RFQ managers can delete draft RFQs"
on public.rfqs;


create policy "Staff can view RFQs"
on public.rfqs
for select
to authenticated
using (public.can_view_rfqs());


create policy "RFQ managers can create RFQs"
on public.rfqs
for insert
to authenticated
with check (
  public.can_manage_rfqs()
  and (
    created_by is null
    or created_by = auth.uid()
  )
);


create policy "RFQ managers can update RFQs"
on public.rfqs
for update
to authenticated
using (public.can_manage_rfqs())
with check (public.can_manage_rfqs());


-- Physical deletion is allowed only while the RFQ remains a draft.
create policy "RFQ managers can delete draft RFQs"
on public.rfqs
for delete
to authenticated
using (
  public.can_manage_rfqs()
  and status = 'draft'
);


-- ============================================================
-- RFQ ITEMS POLICIES
-- ============================================================

drop policy if exists "Staff can view RFQ items"
on public.rfq_items;

drop policy if exists "RFQ managers can create RFQ items"
on public.rfq_items;

drop policy if exists "RFQ managers can update RFQ items"
on public.rfq_items;

drop policy if exists "RFQ managers can delete RFQ items"
on public.rfq_items;


create policy "Staff can view RFQ items"
on public.rfq_items
for select
to authenticated
using (public.can_view_rfqs());


create policy "RFQ managers can create RFQ items"
on public.rfq_items
for insert
to authenticated
with check (
  public.can_manage_rfqs()
  and exists (
    select 1
    from public.rfqs
    where rfqs.id = rfq_items.rfq_id
      and rfqs.status in (
        'draft',
        'ready'
      )
  )
);


create policy "RFQ managers can update RFQ items"
on public.rfq_items
for update
to authenticated
using (
  public.can_manage_rfqs()
  and exists (
    select 1
    from public.rfqs
    where rfqs.id = rfq_items.rfq_id
      and rfqs.status in (
        'draft',
        'ready'
      )
  )
)
with check (
  public.can_manage_rfqs()
  and exists (
    select 1
    from public.rfqs
    where rfqs.id = rfq_items.rfq_id
      and rfqs.status in (
        'draft',
        'ready'
      )
  )
);


create policy "RFQ managers can delete RFQ items"
on public.rfq_items
for delete
to authenticated
using (
  public.can_manage_rfqs()
  and exists (
    select 1
    from public.rfqs
    where rfqs.id = rfq_items.rfq_id
      and rfqs.status in (
        'draft',
        'ready'
      )
  )
);


-- ============================================================
-- RFQ SUPPLIERS POLICIES
-- ============================================================

drop policy if exists "Staff can view RFQ suppliers"
on public.rfq_suppliers;

drop policy if exists "RFQ managers can create RFQ suppliers"
on public.rfq_suppliers;

drop policy if exists "RFQ managers can update RFQ suppliers"
on public.rfq_suppliers;

drop policy if exists "RFQ managers can delete RFQ suppliers"
on public.rfq_suppliers;


create policy "Staff can view RFQ suppliers"
on public.rfq_suppliers
for select
to authenticated
using (public.can_view_rfqs());


create policy "RFQ managers can create RFQ suppliers"
on public.rfq_suppliers
for insert
to authenticated
with check (
  public.can_manage_rfqs()
  and exists (
    select 1
    from public.rfqs
    where rfqs.id = rfq_suppliers.rfq_id
      and rfqs.status in (
        'draft',
        'ready'
      )
  )
);


create policy "RFQ managers can update RFQ suppliers"
on public.rfq_suppliers
for update
to authenticated
using (public.can_manage_rfqs())
with check (public.can_manage_rfqs());


create policy "RFQ managers can delete RFQ suppliers"
on public.rfq_suppliers
for delete
to authenticated
using (
  public.can_manage_rfqs()
  and exists (
    select 1
    from public.rfqs
    where rfqs.id = rfq_suppliers.rfq_id
      and rfqs.status in (
        'draft',
        'ready'
      )
  )
);


-- ============================================================
-- SUPPLIER QUOTATIONS POLICIES
-- ============================================================

drop policy if exists "Staff can view supplier quotations"
on public.supplier_quotations;

drop policy if exists "RFQ managers can create supplier quotations"
on public.supplier_quotations;

drop policy if exists "RFQ managers can update supplier quotations"
on public.supplier_quotations;

drop policy if exists "RFQ managers can delete draft supplier quotations"
on public.supplier_quotations;


create policy "Staff can view supplier quotations"
on public.supplier_quotations
for select
to authenticated
using (public.can_view_rfqs());


create policy "RFQ managers can create supplier quotations"
on public.supplier_quotations
for insert
to authenticated
with check (
  public.can_manage_rfqs()
  and (
    created_by is null
    or created_by = auth.uid()
  )
);


create policy "RFQ managers can update supplier quotations"
on public.supplier_quotations
for update
to authenticated
using (public.can_manage_rfqs())
with check (public.can_manage_rfqs());


create policy "RFQ managers can delete draft supplier quotations"
on public.supplier_quotations
for delete
to authenticated
using (
  public.can_manage_rfqs()
  and status = 'draft'
);


-- ============================================================
-- SUPPLIER QUOTATION ITEMS POLICIES
-- ============================================================

drop policy if exists "Staff can view supplier quotation items"
on public.supplier_quotation_items;

drop policy if exists "RFQ managers can create quotation items"
on public.supplier_quotation_items;

drop policy if exists "RFQ managers can update quotation items"
on public.supplier_quotation_items;

drop policy if exists "RFQ managers can delete quotation items"
on public.supplier_quotation_items;


create policy "Staff can view supplier quotation items"
on public.supplier_quotation_items
for select
to authenticated
using (public.can_view_rfqs());


create policy "RFQ managers can create quotation items"
on public.supplier_quotation_items
for insert
to authenticated
with check (
  public.can_manage_rfqs()
  and exists (
    select 1
    from public.supplier_quotations
    where supplier_quotations.id =
      supplier_quotation_items.quotation_id
      and supplier_quotations.status in (
        'draft',
        'revised'
      )
  )
);


create policy "RFQ managers can update quotation items"
on public.supplier_quotation_items
for update
to authenticated
using (
  public.can_manage_rfqs()
  and exists (
    select 1
    from public.supplier_quotations
    where supplier_quotations.id =
      supplier_quotation_items.quotation_id
      and supplier_quotations.status in (
        'draft',
        'revised'
      )
  )
)
with check (
  public.can_manage_rfqs()
  and exists (
    select 1
    from public.supplier_quotations
    where supplier_quotations.id =
      supplier_quotation_items.quotation_id
      and supplier_quotations.status in (
        'draft',
        'revised'
      )
  )
);


create policy "RFQ managers can delete quotation items"
on public.supplier_quotation_items
for delete
to authenticated
using (
  public.can_manage_rfqs()
  and exists (
    select 1
    from public.supplier_quotations
    where supplier_quotations.id =
      supplier_quotation_items.quotation_id
      and supplier_quotations.status in (
        'draft',
        'revised'
      )
  )
);


-- ============================================================
-- RFQ STATUS HISTORY POLICIES
-- History is read-only through the application.
-- Database triggers insert history records.
-- ============================================================

drop policy if exists "Staff can view RFQ status history"
on public.rfq_status_history;


create policy "Staff can view RFQ status history"
on public.rfq_status_history
for select
to authenticated
using (public.can_view_rfqs());


-- ============================================================
-- AUTOMATIC USER ATTRIBUTION
-- ============================================================

create or replace function public.set_rfq_user_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.created_by is null then
      new.created_by := auth.uid();
    end if;

    if new.updated_by is null then
      new.updated_by := auth.uid();
    end if;
  else
    new.updated_by := auth.uid();
  end if;

  return new;
end;
$$;


create trigger set_rfqs_user_fields_trigger
before insert or update
on public.rfqs
for each row
execute function public.set_rfq_user_fields();


create trigger set_supplier_quotations_user_fields_trigger
before insert or update
on public.supplier_quotations
for each row
execute function public.set_rfq_user_fields();


-- ============================================================
-- AUTOMATIC RFQ STATUS TIMESTAMPS
-- ============================================================

create or replace function public.set_rfq_status_timestamps()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'sent'
       and new.sent_at is null then
      new.sent_at := now();
    end if;

    if new.status = 'awarded'
       and new.awarded_at is null then
      new.awarded_at := now();
    end if;

    if new.status = 'closed'
       and new.closed_at is null then
      new.closed_at := now();
    end if;

    if new.status = 'cancelled'
       and new.cancelled_at is null then
      new.cancelled_at := now();
    end if;

    return new;
  end if;

  if new.status is distinct from old.status then
    if new.status = 'sent'
       and new.sent_at is null then
      new.sent_at := now();
    end if;

    if new.status = 'awarded'
       and new.awarded_at is null then
      new.awarded_at := now();
    end if;

    if new.status = 'closed'
       and new.closed_at is null then
      new.closed_at := now();
    end if;

    if new.status = 'cancelled'
       and new.cancelled_at is null then
      new.cancelled_at := now();
    end if;
  end if;

  return new;
end;
$$;


create trigger set_rfq_status_timestamps_trigger
before insert or update of status
on public.rfqs
for each row
execute function public.set_rfq_status_timestamps();


-- ============================================================
-- AUTOMATIC QUOTATION STATUS TIMESTAMPS
-- ============================================================

create or replace function public.set_quotation_status_timestamps()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'submitted'
     and new.submitted_at is null then
    new.submitted_at := now();
  end if;

  if new.status = 'under_review'
     and new.reviewed_at is null then
    new.reviewed_at := now();
  end if;

  if new.status = 'accepted'
     and new.accepted_at is null then
    new.accepted_at := now();
  end if;

  if new.status = 'rejected'
     and new.rejected_at is null then
    new.rejected_at := now();
  end if;

  return new;
end;
$$;


create trigger set_quotation_status_timestamps_trigger
before insert or update of status
on public.supplier_quotations
for each row
execute function public.set_quotation_status_timestamps();


-- ============================================================
-- CALCULATE QUOTATION LINE TOTALS
-- ============================================================

create or replace function public.calculate_quotation_item_totals()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  calculated_subtotal numeric(16, 4);
  calculated_discount numeric(16, 4);
  taxable_amount numeric(16, 4);
  calculated_tax numeric(16, 4);
begin
  calculated_subtotal :=
    round(
      new.quoted_quantity * new.unit_price,
      4
    );

  calculated_discount :=
    round(
      calculated_subtotal *
      (new.discount_percent / 100),
      4
    );

  taxable_amount :=
    calculated_subtotal -
    calculated_discount;

  calculated_tax :=
    round(
      taxable_amount *
      (new.tax_percent / 100),
      4
    );

  new.line_subtotal :=
    calculated_subtotal;

  new.discount_amount :=
    calculated_discount;

  new.tax_amount :=
    calculated_tax;

  new.line_total :=
    round(
      taxable_amount +
      calculated_tax,
      4
    );

  return new;
end;
$$;


create trigger calculate_quotation_item_totals_trigger
before insert or update of
  quoted_quantity,
  unit_price,
  discount_percent,
  tax_percent
on public.supplier_quotation_items
for each row
execute function public.calculate_quotation_item_totals();


-- ============================================================
-- RECALCULATE QUOTATION HEADER TOTALS
-- ============================================================

create or replace function public.recalculate_quotation_totals(
  target_quotation_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  calculated_subtotal numeric(16, 4);
  calculated_discount numeric(16, 4);
  calculated_tax numeric(16, 4);
begin
  select
    coalesce(sum(line_subtotal), 0),
    coalesce(sum(discount_amount), 0),
    coalesce(sum(tax_amount), 0)
  into
    calculated_subtotal,
    calculated_discount,
    calculated_tax
  from public.supplier_quotation_items
  where quotation_id = target_quotation_id;

  update public.supplier_quotations
  set
    subtotal = calculated_subtotal,
    discount_amount = calculated_discount,
    tax_amount = calculated_tax,
    total_amount = round(
      calculated_subtotal
      - calculated_discount
      + calculated_tax
      + shipping_amount
      + other_charges,
      4
    )
  where id = target_quotation_id;
end;
$$;


revoke all
on function public.recalculate_quotation_totals(uuid)
from public;


-- Trigger wrapper supporting INSERT, UPDATE and DELETE.
create or replace function public.sync_quotation_totals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_quotation_totals(
      old.quotation_id
    );

    return old;
  end if;

  perform public.recalculate_quotation_totals(
    new.quotation_id
  );

  if tg_op = 'UPDATE'
     and old.quotation_id is distinct
         from new.quotation_id then
    perform public.recalculate_quotation_totals(
      old.quotation_id
    );
  end if;

  return new;
end;
$$;


create trigger sync_quotation_totals_trigger
after insert or update or delete
on public.supplier_quotation_items
for each row
execute function public.sync_quotation_totals();


-- Recalculate total when header-level charges change.
create or replace function public.calculate_quotation_header_total()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.total_amount :=
    round(
      new.subtotal
      - new.discount_amount
      + new.tax_amount
      + new.shipping_amount
      + new.other_charges,
      4
    );

  return new;
end;
$$;


create trigger calculate_quotation_header_total_trigger
before insert or update of
  subtotal,
  discount_amount,
  tax_amount,
  shipping_amount,
  other_charges
on public.supplier_quotations
for each row
execute function public.calculate_quotation_header_total();


-- ============================================================
-- SYNCHRONIZE QUOTATION, INVITATION AND RFQ STATUS
-- ============================================================

create or replace function public.sync_rfq_quotation_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_rfq_id uuid;
  target_rfq_supplier_id uuid;
  submitted_count integer;
  invited_count integer;
begin
  target_rfq_id := new.rfq_id;
  target_rfq_supplier_id := new.rfq_supplier_id;

  if new.status in (
    'submitted',
    'under_review',
    'revised',
    'accepted'
  ) then
    update public.rfq_suppliers
    set
      status = case
        when new.status = 'accepted'
          then 'awarded'
        else 'quoted'
      end,
      responded_at = coalesce(
        responded_at,
        now()
      )
    where id = target_rfq_supplier_id;
  end if;

  if new.status = 'rejected' then
    update public.rfq_suppliers
    set status = 'rejected'
    where id = target_rfq_supplier_id;
  end if;

  select count(*)
  into invited_count
  from public.rfq_suppliers
  where rfq_id = target_rfq_id
    and status not in (
      'declined',
      'cancelled'
    );

  select count(distinct rfq_supplier_id)
  into submitted_count
  from public.supplier_quotations
  where rfq_id = target_rfq_id
    and status in (
      'submitted',
      'under_review',
      'revised',
      'accepted'
    );

  if submitted_count > 0 then
    update public.rfqs
    set status = case
      when invited_count > 0
       and submitted_count >= invited_count
        then 'quoted'::public.rfq_status
      else 'partially_quoted'::public.rfq_status
    end
    where id = target_rfq_id
      and status not in (
        'awarded',
        'closed',
        'cancelled'
      );
  end if;

  return new;
end;
$$;


create trigger sync_rfq_quotation_status_trigger
after insert or update of status
on public.supplier_quotations
for each row
when (
  new.status in (
    'submitted',
    'under_review',
    'revised',
    'accepted',
    'rejected'
  )
)
execute function public.sync_rfq_quotation_status();


-- ============================================================
-- SEND RFQ FUNCTION
-- ============================================================

create or replace function public.send_rfq(
  target_rfq_id uuid
)
returns public.rfqs
language plpgsql
security definer
set search_path = public
as $$
declare
  target_rfq public.rfqs;
  item_count integer;
  supplier_count integer;
begin
  if not public.can_manage_rfqs() then
    raise exception
      'You are not authorized to send RFQs.';
  end if;

  select *
  into target_rfq
  from public.rfqs
  where id = target_rfq_id
  for update;

  if not found then
    raise exception
      'RFQ does not exist.';
  end if;

  if target_rfq.status not in (
    'draft',
    'ready'
  ) then
    raise exception
      'Only draft or ready RFQs can be sent.';
  end if;

  select count(*)
  into item_count
  from public.rfq_items
  where rfq_id = target_rfq_id;

  if item_count = 0 then
    raise exception
      'Add at least one RFQ item before sending.';
  end if;

  select count(*)
  into supplier_count
  from public.rfq_suppliers
  where rfq_id = target_rfq_id;

  if supplier_count = 0 then
    raise exception
      'Add at least one supplier before sending.';
  end if;

  update public.rfq_suppliers
  set
    status = 'sent',
    sent_at = coalesce(
      sent_at,
      now()
    )
  where rfq_id = target_rfq_id
    and status = 'invited';

  update public.rfqs
  set
    status = 'sent',
    sent_at = coalesce(
      sent_at,
      now()
    ),
    updated_by = auth.uid()
  where id = target_rfq_id
  returning *
  into target_rfq;

  return target_rfq;
end;
$$;


revoke all
on function public.send_rfq(uuid)
from public;

grant execute
on function public.send_rfq(uuid)
to authenticated;


-- ============================================================
-- AWARD QUOTATION FUNCTION
-- ============================================================

create or replace function public.award_supplier_quotation(
  target_rfq_id uuid,
  target_quotation_id uuid
)
returns public.rfqs
language plpgsql
security definer
set search_path = public
as $$
declare
  target_rfq public.rfqs;
  selected_quotation public.supplier_quotations;
begin
  if not public.can_approve_rfqs() then
    raise exception
      'Only administrators and managers may award an RFQ.';
  end if;

  select *
  into target_rfq
  from public.rfqs
  where id = target_rfq_id
  for update;

  if not found then
    raise exception
      'RFQ does not exist.';
  end if;

  if target_rfq.status in (
    'closed',
    'cancelled'
  ) then
    raise exception
      'Closed or cancelled RFQs cannot be awarded.';
  end if;

  select *
  into selected_quotation
  from public.supplier_quotations
  where id = target_quotation_id
    and rfq_id = target_rfq_id
    and status in (
      'submitted',
      'under_review',
      'revised'
    )
  for update;

  if not found then
    raise exception
      'The selected quotation is not eligible for award.';
  end if;

  update public.supplier_quotations
  set
    status = case
      when id = target_quotation_id
        then 'accepted'::public.supplier_quotation_status
      else 'rejected'::public.supplier_quotation_status
    end,
    accepted_at = case
      when id = target_quotation_id
        then coalesce(
          accepted_at,
          now()
        )
      else accepted_at
    end,
    rejected_at = case
      when id <> target_quotation_id
        then coalesce(
          rejected_at,
          now()
        )
      else rejected_at
    end,
    updated_by = auth.uid()
  where rfq_id = target_rfq_id
    and status in (
      'submitted',
      'under_review',
      'revised'
    );

  update public.rfq_suppliers
  set
    status = case
      when supplier_id =
        selected_quotation.supplier_id
        then 'awarded'::public.rfq_supplier_status
      else 'rejected'::public.rfq_supplier_status
    end,
    awarded_at = case
      when supplier_id =
        selected_quotation.supplier_id
        then coalesce(
          awarded_at,
          now()
        )
      else awarded_at
    end
  where rfq_id = target_rfq_id;

  update public.rfqs
  set
    awarded_supplier_id =
      selected_quotation.supplier_id,
    awarded_quotation_id =
      selected_quotation.id,
    status = 'awarded',
    awarded_at = coalesce(
      awarded_at,
      now()
    ),
    updated_by = auth.uid()
  where id = target_rfq_id
  returning *
  into target_rfq;

  return target_rfq;
end;
$$;


revoke all
on function public.award_supplier_quotation(
  uuid,
  uuid
)
from public;

grant execute
on function public.award_supplier_quotation(
  uuid,
  uuid
)
to authenticated;


-- ============================================================
-- CLOSE RFQ FUNCTION
-- ============================================================

create or replace function public.close_rfq(
  target_rfq_id uuid
)
returns public.rfqs
language plpgsql
security definer
set search_path = public
as $$
declare
  target_rfq public.rfqs;
begin
  if not public.can_approve_rfqs() then
    raise exception
      'Only administrators and managers may close RFQs.';
  end if;

  update public.rfqs
  set
    status = 'closed',
    closed_at = coalesce(
      closed_at,
      now()
    ),
    updated_by = auth.uid()
  where id = target_rfq_id
    and status = 'awarded'
  returning *
  into target_rfq;

  if not found then
    raise exception
      'Only awarded RFQs may be closed.';
  end if;

  return target_rfq;
end;
$$;


revoke all
on function public.close_rfq(uuid)
from public;

grant execute
on function public.close_rfq(uuid)
to authenticated;


-- ============================================================
-- COMMENTS
-- ============================================================

comment on function public.can_view_rfqs() is
'Returns true for active internal users allowed to view RFQ data.';

comment on function public.can_manage_rfqs() is
'Returns true for active administrators, managers and sales users.';

comment on function public.can_approve_rfqs() is
'Returns true for active administrators and managers allowed to award or close RFQs.';

comment on function public.send_rfq(uuid) is
'Validates and sends an RFQ to its invited suppliers.';

comment on function public.award_supplier_quotation(uuid, uuid) is
'Awards an eligible supplier quotation and rejects competing quotations.';

comment on function public.close_rfq(uuid) is
'Closes an awarded RFQ.';