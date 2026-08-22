/*
 * =========================================================
 * 115 — Accounting Period Management
 * =========================================================
 */

revoke insert, update, delete
on public.accounting_periods
from authenticated;

drop policy if exists
  accounting_periods_admin_manage
on public.accounting_periods;


/* =========================================================
 * Soft Close
 * ========================================================= */

create or replace function
  public.soft_close_accounting_period(
    p_period_id uuid,
    p_notes text
      default null
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period
    public.accounting_periods%rowtype;
begin

  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;

  if not public.is_admin() then
    raise exception
      'Administrator access is required.';
  end if;

  select *
  into v_period
  from public.accounting_periods
  where id = p_period_id
  for update;

  if not found then
    raise exception
      'Accounting period % does not exist.',
      p_period_id;
  end if;

  if v_period.status <> 'open' then
    raise exception
      'Accounting period % must be open before soft close. Current status: %.',
      v_period.period_code,
      v_period.status;
  end if;

  update public.accounting_periods
  set
    status = 'soft_closed',
    soft_closed_at = now(),
    soft_closed_by = auth.uid(),
    notes = coalesce(
      nullif(trim(coalesce(p_notes, '')), ''),
      notes
    ),
    updated_at = now()
  where id = p_period_id;

  return p_period_id;

end;
$$;


/* =========================================================
 * Close
 * ========================================================= */

create or replace function
  public.close_accounting_period(
    p_period_id uuid,
    p_notes text
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period
    public.accounting_periods%rowtype;
begin

  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;

  if not public.is_admin() then
    raise exception
      'Administrator access is required.';
  end if;

  if length(
    trim(
      coalesce(
        p_notes,
        ''
      )
    )
  ) < 3 then
    raise exception
      'A meaningful closing note is required.';
  end if;

  select *
  into v_period
  from public.accounting_periods
  where id = p_period_id
  for update;

  if not found then
    raise exception
      'Accounting period % does not exist.',
      p_period_id;
  end if;

  if v_period.status <> 'soft_closed' then
    raise exception
      'Accounting period % must be soft closed before final close. Current status: %.',
      v_period.period_code,
      v_period.status;
  end if;

  update public.accounting_periods
  set
    status = 'closed',
    closed_at = now(),
    closed_by = auth.uid(),
    notes = trim(p_notes),
    updated_at = now()
  where id = p_period_id;

  return p_period_id;

end;
$$;


/* =========================================================
 * Reopen
 * ========================================================= */

create or replace function
  public.reopen_accounting_period(
    p_period_id uuid,
    p_reason text
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period
    public.accounting_periods%rowtype;
begin

  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;

  if not public.is_admin() then
    raise exception
      'Administrator access is required.';
  end if;

  if length(
    trim(
      coalesce(
        p_reason,
        ''
      )
    )
  ) < 3 then
    raise exception
      'A meaningful reopen reason is required.';
  end if;

  select *
  into v_period
  from public.accounting_periods
  where id = p_period_id
  for update;

  if not found then
    raise exception
      'Accounting period % does not exist.',
      p_period_id;
  end if;

  if v_period.status = 'open' then
    raise exception
      'Accounting period % is already open.',
      v_period.period_code;
  end if;

  update public.accounting_periods
  set
    status = 'open',
    reopened_at = now(),
    reopened_by = auth.uid(),
    notes = trim(p_reason),
    updated_at = now()
  where id = p_period_id;

  return p_period_id;

end;
$$;


/* =========================================================
 * Permissions
 * ========================================================= */

revoke all
on function
  public.soft_close_accounting_period(
    uuid,
    text
  )
from public;

revoke all
on function
  public.close_accounting_period(
    uuid,
    text
  )
from public;

revoke all
on function
  public.reopen_accounting_period(
    uuid,
    text
  )
from public;


grant execute
on function
  public.soft_close_accounting_period(
    uuid,
    text
  )
to authenticated;

grant execute
on function
  public.close_accounting_period(
    uuid,
    text
  )
to authenticated;

grant execute
on function
  public.reopen_accounting_period(
    uuid,
    text
  )
to authenticated;


/* =========================================================
 * Documentation
 * ========================================================= */

comment on function
  public.soft_close_accounting_period(
    uuid,
    text
  )
is
  'Soft closes an open accounting period. Ordinary GL posting is blocked because the posting engine requires period status open.';

comment on function
  public.close_accounting_period(
    uuid,
    text
  )
is
  'Final closes a soft-closed accounting period. Requires a meaningful closing note.';

comment on function
  public.reopen_accounting_period(
    uuid,
    text
  )
is
  'Reopens a soft-closed or closed accounting period with a mandatory reason.';