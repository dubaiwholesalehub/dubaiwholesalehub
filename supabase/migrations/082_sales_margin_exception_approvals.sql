/*
 * =========================================================
 * 082 — Sales Margin Exception Approval Workflow
 *
 * Purpose:
 *
 * Below-minimum-margin Sales Orders are not permanently
 * blocked. They require an auditable admin approval.
 *
 * Flow:
 *
 * Healthy / Warning
 *   -> confirm normally
 *
 * Below Minimum
 *   -> approval required
 *
 * Approved exception
 *   -> confirmation allowed
 * =========================================================
 */


/* =========================================================
 * 1. Margin Exception Approval Table
 * ========================================================= */

create table if not exists
  public.sales_margin_approvals
(
  id uuid
    primary key
    default gen_random_uuid(),

  sales_order_id uuid
    not null
    references public.sales_orders(id)
    on delete restrict,

  status text
    not null
    default 'pending',

  requested_reason text
    not null,

  requested_by uuid
    references public.profiles(id),

  requested_at timestamptz
    not null
    default now(),

  approved_by uuid
    references public.profiles(id),

  approved_at timestamptz,

  rejected_by uuid
    references public.profiles(id),

  rejected_at timestamptz,

  decision_notes text,

  /*
   * Snapshot of margin conditions at request/approval time.
   */
  lowest_margin_percentage numeric(18, 4),

  policy_minimum_percentage numeric(18, 4),

  policy_warning_percentage numeric(18, 4),

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  constraint
    sales_margin_approvals_status_check
  check (
    status in (
      'pending',
      'approved',
      'rejected',
      'cancelled'
    )
  )
);


/* =========================================================
 * Only one active approval workflow per Sales Order
 * ========================================================= */

create unique index if not exists
  sales_margin_approvals_active_order_idx
on public.sales_margin_approvals (
  sales_order_id
)
where status in (
  'pending',
  'approved'
);


/* =========================================================
 * Helpful Indexes
 * ========================================================= */

create index if not exists
  sales_margin_approvals_status_idx
on public.sales_margin_approvals (
  status
);


create index if not exists
  sales_margin_approvals_requested_at_idx
on public.sales_margin_approvals (
  requested_at desc
);


/* =========================================================
 * 2. Request Margin Approval
 * ========================================================= */

create or replace function
  public.request_sales_margin_approval(
    p_sales_order_id uuid,
    p_reason text
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_existing_id uuid;

  v_analysis jsonb;

  v_lowest_margin numeric(18, 4);

  v_minimum_margin numeric(18, 4);

  v_warning_margin numeric(18, 4);

  v_approval_id uuid;

  v_reason text;

begin

  v_user_id :=
    auth.uid();


  if v_user_id is null then
    raise exception
      'Authentication is required.';
  end if;


  if not public.is_admin() then
    raise exception
      'You are not authorized to request margin approval.';
  end if;


  v_reason :=
    nullif(
      trim(
        coalesce(
          p_reason,
          ''
        )
      ),
      ''
    );


  if v_reason is null then
    raise exception
      'Approval reason is required.';
  end if;


  /*
   * Must still be a draft order.
   */
  if not exists (
    select 1
    from public.sales_orders
    where id = p_sales_order_id
      and status = 'draft'
  ) then
    raise exception
      'Only draft Sales Orders can request margin approval.';
  end if;


  /*
   * Analyze the current order.
   *
   * validate_sales_order_margin() may raise when below
   * minimum, so we cannot call that function directly here.
   *
   * Instead we read the analysis view.
   */

  select
    min(
      estimated_margin_percentage
    )

  into
    v_lowest_margin

  from
    public.sales_order_margin_analysis

  where
    sales_order_id =
      p_sales_order_id

    and fulfilment_method =
      'stock'

    and estimated_margin_percentage
      is not null;


  select
    minimum_margin_percentage,
    warning_margin_percentage

  into
    v_minimum_margin,
    v_warning_margin

  from
    public.sales_margin_policy

  where
    is_active = true

  order by
    updated_at desc

  limit 1;


  if not found then
    raise exception
      'No active sales margin policy exists.';
  end if;


  /*
   * If the order is not below minimum, approval is
   * unnecessary.
   */

  if
    v_lowest_margin is not null
    and
    v_lowest_margin >=
      v_minimum_margin
  then
    raise exception
      'This Sales Order does not require margin approval.';
  end if;


  /*
   * Reuse existing pending request if one exists.
   */

  select
    id

  into
    v_existing_id

  from
    public.sales_margin_approvals

  where
    sales_order_id =
      p_sales_order_id

    and status =
      'pending'

  limit 1;


  if found then

    update
      public.sales_margin_approvals

    set
      requested_reason =
        v_reason,

      lowest_margin_percentage =
        v_lowest_margin,

      policy_minimum_percentage =
        v_minimum_margin,

      policy_warning_percentage =
        v_warning_margin,

      requested_by =
        v_user_id,

      requested_at =
        now(),

      updated_at =
        now()

    where
      id =
        v_existing_id;


    return
      v_existing_id;

  end if;


  insert into
    public.sales_margin_approvals
  (
    sales_order_id,

    status,

    requested_reason,

    requested_by,

    requested_at,

    lowest_margin_percentage,

    policy_minimum_percentage,

    policy_warning_percentage
  )

  values
  (
    p_sales_order_id,

    'pending',

    v_reason,

    v_user_id,

    now(),

    v_lowest_margin,

    v_minimum_margin,

    v_warning_margin
  )

  returning
    id

  into
    v_approval_id;


  return
    v_approval_id;

end;
$$;


/* =========================================================
 * 3. Approve Margin Exception
 * ========================================================= */

create or replace function
  public.approve_sales_margin_exception(
    p_sales_order_id uuid,
    p_decision_notes text
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_approval_id uuid;

  v_lowest_margin numeric(18, 4);

  v_minimum_margin numeric(18, 4);

  v_warning_margin numeric(18, 4);

begin

  v_user_id :=
    auth.uid();


  if v_user_id is null then
    raise exception
      'Authentication is required.';
  end if;


  if not public.is_admin() then
    raise exception
      'Only an administrator can approve a margin exception.';
  end if;


  if not exists (
    select 1
    from public.sales_orders
    where id =
      p_sales_order_id

      and status =
        'draft'
  ) then
    raise exception
      'Only draft Sales Orders can receive margin approval.';
  end if;


  select
    min(
      estimated_margin_percentage
    )

  into
    v_lowest_margin

  from
    public.sales_order_margin_analysis

  where
    sales_order_id =
      p_sales_order_id

    and fulfilment_method =
      'stock'

    and estimated_margin_percentage
      is not null;


  select
    minimum_margin_percentage,
    warning_margin_percentage

  into
    v_minimum_margin,
    v_warning_margin

  from
    public.sales_margin_policy

  where
    is_active = true

  order by
    updated_at desc

  limit 1;


  if not found then
    raise exception
      'No active sales margin policy exists.';
  end if;


  /*
   * Find pending request.
   */

  select
    id

  into
    v_approval_id

  from
    public.sales_margin_approvals

  where
    sales_order_id =
      p_sales_order_id

    and status =
      'pending'

  order by
    requested_at desc

  limit 1

  for update;


  /*
   * Admin may approve immediately even when no prior
   * request exists. This supports "Approve & Confirm".
   */

  if not found then

    insert into
      public.sales_margin_approvals
    (
      sales_order_id,

      status,

      requested_reason,

      requested_by,

      requested_at,

      approved_by,

      approved_at,

      decision_notes,

      lowest_margin_percentage,

      policy_minimum_percentage,

      policy_warning_percentage
    )

    values
    (
      p_sales_order_id,

      'approved',

      coalesce(
        nullif(
          trim(
            p_decision_notes
          ),
          ''
        ),
        'Admin-approved margin exception.'
      ),

      v_user_id,

      now(),

      v_user_id,

      now(),

      nullif(
        trim(
          coalesce(
            p_decision_notes,
            ''
          )
        ),
        ''
      ),

      v_lowest_margin,

      v_minimum_margin,

      v_warning_margin
    )

    returning
      id

    into
      v_approval_id;


    return
      v_approval_id;

  end if;


  update
    public.sales_margin_approvals

  set
    status =
      'approved',

    approved_by =
      v_user_id,

    approved_at =
      now(),

    decision_notes =
      nullif(
        trim(
          coalesce(
            p_decision_notes,
            ''
          )
        ),
        ''
      ),

    lowest_margin_percentage =
      v_lowest_margin,

    policy_minimum_percentage =
      v_minimum_margin,

    policy_warning_percentage =
      v_warning_margin,

    updated_at =
      now()

  where
    id =
      v_approval_id;


  return
    v_approval_id;

end;
$$;


/* =========================================================
 * 4. Reject Margin Exception
 * ========================================================= */

create or replace function
  public.reject_sales_margin_exception(
    p_sales_order_id uuid,
    p_decision_notes text
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_approval_id uuid;

begin

  v_user_id :=
    auth.uid();


  if v_user_id is null then
    raise exception
      'Authentication is required.';
  end if;


  if not public.is_admin() then
    raise exception
      'Only an administrator can reject a margin exception.';
  end if;


  select
    id

  into
    v_approval_id

  from
    public.sales_margin_approvals

  where
    sales_order_id =
      p_sales_order_id

    and status =
      'pending'

  order by
    requested_at desc

  limit 1

  for update;


  if not found then
    raise exception
      'No pending margin approval request was found.';
  end if;


  update
    public.sales_margin_approvals

  set
    status =
      'rejected',

    rejected_by =
      v_user_id,

    rejected_at =
      now(),

    decision_notes =
      nullif(
        trim(
          coalesce(
            p_decision_notes,
            ''
          )
        ),
        ''
      ),

    updated_at =
      now()

  where
    id =
      v_approval_id;


  return
    v_approval_id;

end;
$$;


/* =========================================================
 * 5. Check Valid Approval
 * ========================================================= */

create or replace function
  public.has_valid_sales_margin_approval(
    p_sales_order_id uuid
  )
returns boolean
language sql
stable
security definer
set search_path = public
as $$

  select exists (
    select 1

    from
      public.sales_margin_approvals

    where
      sales_order_id =
        p_sales_order_id

      and status =
        'approved'
  );

$$;


/* =========================================================
 * 6. Replace Margin Validator
 *
 * NEW behavior:
 *
 * - Warning margin:
 *     allowed
 *
 * - Below minimum:
 *     allowed only when approved
 *
 * - Missing stock cost:
 *     still blocked unless an approved exception exists
 * ========================================================= */

create or replace function
  public.validate_sales_order_margin(
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

  v_warning_count integer := 0;

  v_blocked_count integer := 0;

  v_missing_cost_count integer := 0;

  v_lowest_margin numeric(18, 4);

  v_has_approval boolean := false;

begin

  v_user_id :=
    auth.uid();


  if v_user_id is null then
    raise exception
      'Authentication is required.';
  end if;


  if not public.is_admin() then
    raise exception
      'You are not authorized to validate sales margins.';
  end if;


  select *
  into
    v_policy
  from
    public.sales_margin_policy
  where
    is_active = true
  order by
    updated_at desc
  limit 1;


  if not found then
    raise exception
      'No active sales margin policy exists.';
  end if;


  v_has_approval :=
    public.has_valid_sales_margin_approval(
      p_sales_order_id
    );


  if not exists (
    select 1
    from public.sales_orders
    where id =
      p_sales_order_id
  ) then
    raise exception
      'Sales order was not found.';
  end if;


  for v_line in

    select *
    from
      public.sales_order_margin_analysis

    where
      sales_order_id =
        p_sales_order_id

      and fulfilment_method =
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


      if
        v_policy.block_when_cost_missing
        and
        not v_has_approval
      then

        raise exception
          'Admin approval required. Sales Order % line % (%) has no valid inventory cost.',
          v_line.order_number,
          v_line.line_number,
          v_line.item_name;

      end if;


      continue;

    end if;


    if
      v_line.estimated_margin_percentage
      is not null
    then

      if
        v_lowest_margin is null
        or
        v_line.estimated_margin_percentage <
          v_lowest_margin
      then

        v_lowest_margin :=
          v_line.estimated_margin_percentage;

      end if;

    end if;


    if
      v_line.estimated_margin_percentage
      <
      v_policy.minimum_margin_percentage
    then

      v_blocked_count :=
        v_blocked_count + 1;


      if
        v_policy.block_below_minimum
        and
        not v_has_approval
      then

        raise exception
          'Admin approval required. Sales Order % line % (%) margin is %%%, below the minimum %%%.',
          v_line.order_number,
          v_line.line_number,
          v_line.item_name,
          round(
            v_line.estimated_margin_percentage,
            2
          ),
          round(
            v_policy.minimum_margin_percentage,
            2
          );

      end if;


    elsif
      v_line.estimated_margin_percentage
      <
      v_policy.warning_margin_percentage
    then

      v_warning_count :=
        v_warning_count + 1;

    end if;

  end loop;


  return
    jsonb_build_object(
      'salesOrderId',
        p_sales_order_id,

      'warningMarginPercentage',
        v_policy.warning_margin_percentage,

      'minimumMarginPercentage',
        v_policy.minimum_margin_percentage,

      'warningLines',
        v_warning_count,

      'blockedLines',
        v_blocked_count,

      'missingCostLines',
        v_missing_cost_count,

      'lowestMarginPercentage',
        v_lowest_margin,

      'hasApproval',
        v_has_approval,

      'requiresApproval',
        (
          v_blocked_count > 0
          or
          (
            v_policy.block_when_cost_missing
            and
            v_missing_cost_count > 0
          )
        ),

      'canConfirm',
        (
          (
            v_blocked_count = 0
            and
            (
              not v_policy.block_when_cost_missing
              or
              v_missing_cost_count = 0
            )
          )
          or
          v_has_approval
        )
    );

end;
$$;


/* =========================================================
 * 7. RLS
 * ========================================================= */

alter table
  public.sales_margin_approvals
enable row level security;


drop policy if exists
  sales_margin_approvals_admin
on
  public.sales_margin_approvals;


create policy
  sales_margin_approvals_admin
on
  public.sales_margin_approvals
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


/* =========================================================
 * 8. Permissions
 * ========================================================= */

revoke all
on function
  public.request_sales_margin_approval(
    uuid,
    text
  )
from public;


grant execute
on function
  public.request_sales_margin_approval(
    uuid,
    text
  )
to authenticated;


revoke all
on function
  public.approve_sales_margin_exception(
    uuid,
    text
  )
from public;


grant execute
on function
  public.approve_sales_margin_exception(
    uuid,
    text
  )
to authenticated;


revoke all
on function
  public.reject_sales_margin_exception(
    uuid,
    text
  )
from public;


grant execute
on function
  public.reject_sales_margin_exception(
    uuid,
    text
  )
to authenticated;


revoke all
on function
  public.has_valid_sales_margin_approval(
    uuid
  )
from public;


grant execute
on function
  public.has_valid_sales_margin_approval(
    uuid
  )
to authenticated;


/* =========================================================
 * Documentation
 * ========================================================= */

comment on table
  public.sales_margin_approvals
is
  'Auditable approval workflow for Sales Orders that require a margin exception.';


comment on function
  public.approve_sales_margin_exception(
    uuid,
    text
  )
is
  'Admin approval for below-minimum-margin or missing-cost Sales Orders, allowing the normal confirmation workflow to continue.';