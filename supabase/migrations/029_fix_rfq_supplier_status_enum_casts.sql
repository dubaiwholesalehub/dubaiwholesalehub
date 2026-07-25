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
          then 'awarded'::public.rfq_supplier_status
        else
          'quoted'::public.rfq_supplier_status
      end,
      responded_at = coalesce(
        responded_at,
        now()
      )
    where id = target_rfq_supplier_id;
  end if;

  if new.status = 'rejected' then
    update public.rfq_suppliers
    set
      status = 'rejected'::public.rfq_supplier_status
    where id = target_rfq_supplier_id;
  end if;

  select count(*)
  into invited_count
  from public.rfq_suppliers
  where rfq_id = target_rfq_id
    and status not in (
      'declined'::public.rfq_supplier_status,
      'cancelled'::public.rfq_supplier_status
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
    set
      status = case
        when invited_count > 0
          and submitted_count >= invited_count
        then 'quoted'::public.rfq_status
        else 'partially_quoted'::public.rfq_status
      end
    where id = target_rfq_id
      and status not in (
        'awarded'::public.rfq_status,
        'closed'::public.rfq_status,
        'cancelled'::public.rfq_status
      );
  end if;

  return new;
end;
$$;