-- ============================================================
-- Supplier quotation workflow functions
-- ============================================================

-- ------------------------------------------------------------
-- Submit supplier quotation
-- Allowed transitions:
-- draft   -> submitted
-- revised -> submitted
-- ------------------------------------------------------------

create or replace function public.submit_supplier_quotation(
  target_quotation_id uuid
)
returns public.supplier_quotations
language plpgsql
security definer
set search_path = public
as $$
declare
  quotation_record public.supplier_quotations;
begin
  if not public.can_manage_rfqs() then
    raise exception 'You do not have permission to submit supplier quotations.';
  end if;

  select *
  into quotation_record
  from public.supplier_quotations
  where id = target_quotation_id
  for update;

  if not found then
    raise exception 'Supplier quotation not found.';
  end if;

  if quotation_record.status not in ('draft', 'revised') then
    raise exception
      'Only draft or revised supplier quotations can be submitted. Current status: %.',
      quotation_record.status;
  end if;

  update public.supplier_quotations
  set
    status = 'submitted',
    submitted_at = now(),
    reviewed_at = null,
    accepted_at = null,
    rejected_at = null,
    updated_at = now(),
    updated_by = auth.uid()
  where id = target_quotation_id
  returning *
  into quotation_record;

  return quotation_record;
end;
$$;


-- ------------------------------------------------------------
-- Review supplier quotation
-- Allowed transition:
-- submitted -> under_review
-- ------------------------------------------------------------

create or replace function public.review_supplier_quotation(
  target_quotation_id uuid
)
returns public.supplier_quotations
language plpgsql
security definer
set search_path = public
as $$
declare
  quotation_record public.supplier_quotations;
begin
  if not public.can_manage_rfqs() then
    raise exception 'You do not have permission to review supplier quotations.';
  end if;

  select *
  into quotation_record
  from public.supplier_quotations
  where id = target_quotation_id
  for update;

  if not found then
    raise exception 'Supplier quotation not found.';
  end if;

  if quotation_record.status <> 'submitted' then
    raise exception
      'Only submitted supplier quotations can be placed under review. Current status: %.',
      quotation_record.status;
  end if;

  update public.supplier_quotations
  set
    status = 'under_review',
    reviewed_at = now(),
    updated_at = now(),
    updated_by = auth.uid()
  where id = target_quotation_id
  returning *
  into quotation_record;

  return quotation_record;
end;
$$;


-- ------------------------------------------------------------
-- Reject supplier quotation
-- Allowed transitions:
-- submitted
-- under_review
-- revised
--
-- There is no rejection_reason column in the current schema,
-- so an optional reason is appended to internal_notes.
-- ------------------------------------------------------------

create or replace function public.reject_supplier_quotation(
  target_quotation_id uuid,
  rejection_reason text default null
)
returns public.supplier_quotations
language plpgsql
security definer
set search_path = public
as $$
declare
  quotation_record public.supplier_quotations;
  cleaned_reason text;
begin
  if not public.can_approve_rfqs() then
    raise exception 'You do not have permission to reject supplier quotations.';
  end if;

  select *
  into quotation_record
  from public.supplier_quotations
  where id = target_quotation_id
  for update;

  if not found then
    raise exception 'Supplier quotation not found.';
  end if;

  if quotation_record.status not in (
    'submitted',
    'under_review',
    'revised'
  ) then
    raise exception
      'This supplier quotation cannot be rejected from status: %.',
      quotation_record.status;
  end if;

  cleaned_reason := nullif(btrim(rejection_reason), '');

  update public.supplier_quotations
  set
    status = 'rejected',
    rejected_at = now(),
    accepted_at = null,
    updated_at = now(),
    updated_by = auth.uid(),
    internal_notes = case
      when cleaned_reason is null then internal_notes
      when internal_notes is null or btrim(internal_notes) = '' then
        'Rejection reason: ' || cleaned_reason
      else
        internal_notes
        || E'\n\nRejection reason: '
        || cleaned_reason
    end
  where id = target_quotation_id
  returning *
  into quotation_record;

  return quotation_record;
end;
$$;


-- ------------------------------------------------------------
-- Function permissions
-- ------------------------------------------------------------

revoke all on function public.submit_supplier_quotation(uuid)
from public;

revoke all on function public.review_supplier_quotation(uuid)
from public;

revoke all on function public.reject_supplier_quotation(uuid, text)
from public;


grant execute on function public.submit_supplier_quotation(uuid)
to authenticated;

grant execute on function public.review_supplier_quotation(uuid)
to authenticated;

grant execute on function public.reject_supplier_quotation(uuid, text)
to authenticated;