/*
 * =========================================================
 * 206 - Posted Sale Revision Margin Approvals
 *
 * Purpose:
 *   Allow controlled below-minimum-margin modifications of
 *   posted Sales Orders without allowing historical order-
 *   level approvals to authorize future commercial states.
 *
 * Approval is bound to:
 *   - Sales Order
 *   - exact proposed after_snapshot
 *   - active margin policy thresholds
 *
 * Existing draft Sales Order approval workflow remains
 * unchanged.
 * =========================================================
 */


/* =========================================================
 * 1. Revision-specific approval table
 * ========================================================= */

create table if not exists
  public.sales_order_revision_margin_approvals
(
  id uuid
    primary key
    default gen_random_uuid(),

  sales_order_id uuid
    not null
    references public.sales_orders(id)
    on delete restrict,

  snapshot_hash text
    not null,

  after_snapshot jsonb
    not null,

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

  consumed_by_revision_id uuid
  references public.sales_order_revisions(id)
  on delete restrict,

  consumed_at timestamptz,

  lowest_margin_percentage numeric(18,4),

  policy_minimum_percentage numeric(18,4),

  policy_warning_percentage numeric(18,4),

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now(),

  constraint
    sales_order_revision_margin_approvals_status_check
  check (
    status in (
      'pending',
      'approved',
      'rejected',
      'cancelled',
      'consumed'
    )
  )
);


/*
 * Only one active request for an exact proposed state.
 */

create unique index if not exists
  sales_order_revision_margin_approvals_active_snapshot_idx
on public.sales_order_revision_margin_approvals (
  sales_order_id,
  snapshot_hash
)
where status in (
  'pending',
  'approved'
);


create index if not exists
  sales_order_revision_margin_approvals_order_idx
on public.sales_order_revision_margin_approvals (
  sales_order_id,
  requested_at desc
);


create index if not exists
  sales_order_revision_margin_approvals_status_idx
on public.sales_order_revision_margin_approvals (
  status
);


/* =========================================================
 * 2. Canonical snapshot fingerprint
 *
 * jsonb::text provides deterministic key ordering for jsonb.
 * The server/database owns the fingerprint.
 * ========================================================= */

create or replace function
  public.sales_order_revision_snapshot_hash(
    p_after_snapshot jsonb
  )
returns text
language sql
immutable
set search_path = public
as $$
  select
    md5(
      coalesce(
        p_after_snapshot,
        '{}'::jsonb
      )::text
    );
$$;


/* =========================================================
 * 3. Analyze proposed revision margin
 *
 * We cannot use sales_order_margin_analysis directly here
 * because the proposed snapshot has not yet been applied.
 *
 * Existing stock lines use the current margin-analysis cost.
 * Revision-added stock lines use warehouse average cost.
 * ========================================================= */

create or replace function
  public.analyze_sales_order_revision_margin(
    p_sales_order_id uuid,
    p_after_snapshot jsonb
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

  v_item jsonb;

  v_existing_item_id uuid;

  v_product_id uuid;

  v_warehouse_id uuid;

  v_fulfilment_method text;

  v_quantity numeric(18,4);

  v_unit_price numeric(18,4);

  v_discount_percentage numeric(18,4);

  v_gross numeric(18,4);

  v_net numeric(18,4);

  v_unit_cost numeric(18,4);

  v_margin numeric(18,4);

  v_lowest_margin numeric(18,4);

  v_warning_count integer := 0;

  v_blocked_count integer := 0;

  v_missing_cost_count integer := 0;

  v_requires_approval boolean := false;

  v_line_number integer := 0;

  v_invoice_discount numeric(18,2) := 0;

  v_total_net numeric(18,4) := 0;

  v_invoice_discount_share numeric(18,4);

begin

  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception
      'Authentication is required.';
  end if;

  if not public.is_admin() then
    raise exception
      'You are not authorized to analyze revision margins.';
  end if;


  if not exists (
    select 1
    from public.sales_orders
    where id = p_sales_order_id
  ) then
    raise exception
      'Sales Order was not found.';
  end if;


  select *
  into v_policy
  from public.sales_margin_policy
  where is_active = true
  order by updated_at desc
  limit 1;

  if not found then
    raise exception
      'No active sales margin policy exists.';
  end if;


  v_invoice_discount :=
    greatest(
      coalesce(
        (p_after_snapshot -> 'header' ->>
          'invoice_discount_amount')::numeric,
        0
      ),
      0
    );


  /*
   * First pass:
   * calculate total merchandise net before invoice discount.
   */

  for v_item in
    select value
    from jsonb_array_elements(
      coalesce(
        p_after_snapshot -> 'items',
        '[]'::jsonb
      )
    )
  loop

    v_quantity :=
      greatest(
        coalesce(
          (v_item ->> 'quantity')::numeric,
          0
        ),
        0
      );

    v_unit_price :=
      greatest(
        coalesce(
          (v_item ->> 'unit_price')::numeric,
          0
        ),
        0
      );

    v_discount_percentage :=
      least(
        greatest(
          coalesce(
            (v_item ->> 'discount_percentage')::numeric,
            0
          ),
          0
        ),
        100
      );

    v_gross :=
      v_quantity * v_unit_price;

    v_net :=
      v_gross
      -
      (
        v_gross
        *
        v_discount_percentage
        /
        100
      );

    v_total_net :=
      v_total_net + v_net;

  end loop;


  if v_invoice_discount > v_total_net then
    v_invoice_discount := v_total_net;
  end if;


  /*
   * Second pass:
   * resolve cost and margin for each stock line.
   */

  for v_item in
    select value
    from jsonb_array_elements(
      coalesce(
        p_after_snapshot -> 'items',
        '[]'::jsonb
      )
    )
  loop

    v_line_number :=
      v_line_number + 1;

    v_existing_item_id :=
      nullif(
        v_item ->> 'id',
        ''
      )::uuid;

    v_product_id :=
      nullif(
        v_item ->> 'product_id',
        ''
      )::uuid;

    v_warehouse_id :=
      nullif(
        v_item ->> 'warehouse_id',
        ''
      )::uuid;

    v_fulfilment_method :=
      coalesce(
        nullif(
          trim(
            v_item ->> 'fulfilment_method'
          ),
          ''
        ),
        'stock'
      );

    if v_fulfilment_method <> 'stock' then
      continue;
    end if;


    v_quantity :=
      greatest(
        coalesce(
          (v_item ->> 'quantity')::numeric,
          0
        ),
        0
      );

    v_unit_price :=
      greatest(
        coalesce(
          (v_item ->> 'unit_price')::numeric,
          0
        ),
        0
      );

    v_discount_percentage :=
      least(
        greatest(
          coalesce(
            (v_item ->> 'discount_percentage')::numeric,
            0
          ),
          0
        ),
        100
      );

    v_gross :=
      v_quantity * v_unit_price;

    v_net :=
      v_gross
      -
      (
        v_gross
        *
        v_discount_percentage
        /
        100
      );


    if v_total_net > 0 then
      v_invoice_discount_share :=
        v_invoice_discount
        *
        (
          v_net / v_total_net
        );
    else
      v_invoice_discount_share := 0;
    end if;


    v_net :=
      greatest(
        v_net
        -
        v_invoice_discount_share,
        0
      );


    v_unit_cost := null;


    /*
     * Existing active Sales Order item:
     * use the same current cost basis exposed by the
     * authoritative margin-analysis view.
     */

    if v_existing_item_id is not null then

      select
        ma.current_unit_cost
      into
        v_unit_cost
      from public.sales_order_margin_analysis ma
      where
        ma.sales_order_id =
          p_sales_order_id
        and
        ma.sales_order_item_id =
          v_existing_item_id
      limit 1;

    else

      /*
       * Revision-added product:
       * use selected warehouse average cost.
       */

      if
        v_product_id is not null
        and
        v_warehouse_id is not null
      then

        select
          ws.average_unit_cost
        into
          v_unit_cost
        from public.warehouse_stock ws
        where
          ws.product_id =
            v_product_id
          and
          ws.warehouse_id =
            v_warehouse_id
        limit 1;

      end if;

    end if;


    if
      v_unit_cost is null
      or
      v_unit_cost <= 0
    then

      v_missing_cost_count :=
        v_missing_cost_count + 1;

      if v_policy.block_when_cost_missing then
        v_requires_approval := true;
      end if;

      continue;

    end if;


    if v_net <= 0 then
      v_margin := -100;
    else
      v_margin :=
        (
          (
            v_net
            -
            (
              v_quantity
              *
              v_unit_cost
            )
          )
          /
          v_net
        )
        *
        100;
    end if;


    if
      v_lowest_margin is null
      or
      v_margin < v_lowest_margin
    then
      v_lowest_margin := v_margin;
    end if;


    if
      v_margin <
      v_policy.minimum_margin_percentage
    then

      v_blocked_count :=
        v_blocked_count + 1;

      if v_policy.block_below_minimum then
        v_requires_approval := true;
      end if;

    elsif
      v_margin <
      v_policy.warning_margin_percentage
    then

      v_warning_count :=
        v_warning_count + 1;

    end if;

  end loop;


  return jsonb_build_object(
    'salesOrderId',
      p_sales_order_id,

    'snapshotHash',
      public.sales_order_revision_snapshot_hash(
        p_after_snapshot
      ),

    'warningMarginPercentage',
      v_policy.warning_margin_percentage,

    'minimumMarginPercentage',
      v_policy.minimum_margin_percentage,

    'warningCount',
      v_warning_count,

    'blockedCount',
      v_blocked_count,

    'missingCostCount',
      v_missing_cost_count,

    'lowestMarginPercentage',
      v_lowest_margin,

    'requiresApproval',
      v_requires_approval
  );

end;
$$;


/* =========================================================
 * 4. Request posted-revision margin approval
 * ========================================================= */

create or replace function
  public.request_sales_order_revision_margin_approval(
    p_sales_order_id uuid,
    p_after_snapshot jsonb,
    p_reason text
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_reason text;

  v_analysis jsonb;

  v_snapshot_hash text;

  v_existing_id uuid;

  v_approval_id uuid;

begin

  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception
      'Authentication is required.';
  end if;

  if not public.is_admin() then
    raise exception
      'You are not authorized to request revision margin approval.';
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


  if not exists (
    select 1
    from public.sales_orders
    where id = p_sales_order_id
      and status in (
        'confirmed',
        'processing',
        'partially_fulfilled',
        'fulfilled',
        'completed'
      )
  ) then
    raise exception
      'Only an active posted Sales Order can request revision margin approval.';
  end if;


  v_analysis :=
    public.analyze_sales_order_revision_margin(
      p_sales_order_id,
      p_after_snapshot
    );


  if not coalesce(
    (v_analysis ->> 'requiresApproval')::boolean,
    false
  ) then
    raise exception
      'This proposed Sales Order modification does not require margin approval.';
  end if;


  v_snapshot_hash :=
    v_analysis ->> 'snapshotHash';


  select id
  into v_existing_id
  from public.sales_order_revision_margin_approvals
  where
    sales_order_id =
      p_sales_order_id
    and
    snapshot_hash =
      v_snapshot_hash
    and
    status = 'pending'
  order by requested_at desc
  limit 1
  for update;


  if found then

    update
      public.sales_order_revision_margin_approvals
    set
      requested_reason =
        v_reason,

      requested_by =
        v_user_id,

      requested_at =
        now(),

      lowest_margin_percentage =
        nullif(
          v_analysis ->>
            'lowestMarginPercentage',
          ''
        )::numeric,

      policy_minimum_percentage =
        nullif(
          v_analysis ->>
            'minimumMarginPercentage',
          ''
        )::numeric,

      policy_warning_percentage =
        nullif(
          v_analysis ->>
            'warningMarginPercentage',
          ''
        )::numeric,

      updated_at =
        now()

    where id =
      v_existing_id;

    return
      v_existing_id;

  end if;


  insert into
    public.sales_order_revision_margin_approvals
  (
    sales_order_id,
    snapshot_hash,
    after_snapshot,
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
    v_snapshot_hash,
    p_after_snapshot,
    'pending',
    v_reason,
    v_user_id,
    now(),
    nullif(
      v_analysis ->>
        'lowestMarginPercentage',
      ''
    )::numeric,
    nullif(
      v_analysis ->>
        'minimumMarginPercentage',
      ''
    )::numeric,
    nullif(
      v_analysis ->>
        'warningMarginPercentage',
      ''
    )::numeric
  )
  returning id
  into v_approval_id;


  return
    v_approval_id;

end;
$$;


/* =========================================================
 * 5. Approve exact proposed revision
 * ========================================================= */

create or replace function
  public.approve_sales_order_revision_margin_exception(
    p_approval_id uuid,
    p_decision_notes text
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_approval
    public.sales_order_revision_margin_approvals%rowtype;

  v_analysis jsonb;

  v_current_hash text;

begin

  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception
      'Authentication is required.';
  end if;

  if not public.is_admin() then
    raise exception
      'Only an administrator can approve a revision margin exception.';
  end if;


  select *
  into v_approval
  from public.sales_order_revision_margin_approvals
  where id = p_approval_id
  for update;


  if not found then
    raise exception
      'Revision margin approval request was not found.';
  end if;


  if v_approval.status <> 'pending' then
    raise exception
      'Only a pending revision margin request can be approved.';
  end if;


  v_analysis :=
    public.analyze_sales_order_revision_margin(
      v_approval.sales_order_id,
      v_approval.after_snapshot
    );


  v_current_hash :=
    v_analysis ->> 'snapshotHash';


  if
    v_current_hash is distinct from
    v_approval.snapshot_hash
  then
    raise exception
      'The proposed commercial snapshot no longer matches this approval request.';
  end if;


  if not coalesce(
    (v_analysis ->> 'requiresApproval')::boolean,
    false
  ) then
    raise exception
      'This proposed modification no longer requires margin approval.';
  end if;


  update
    public.sales_order_revision_margin_approvals
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
      nullif(
        v_analysis ->>
          'lowestMarginPercentage',
        ''
      )::numeric,

    policy_minimum_percentage =
      nullif(
        v_analysis ->>
          'minimumMarginPercentage',
        ''
      )::numeric,

    policy_warning_percentage =
      nullif(
        v_analysis ->>
          'warningMarginPercentage',
        ''
      )::numeric,

    updated_at =
      now()

  where id =
    p_approval_id;


  return
    p_approval_id;

end;
$$;


/* =========================================================
 * 6. Reject request
 * ========================================================= */

create or replace function
  public.reject_sales_order_revision_margin_exception(
    p_approval_id uuid,
    p_decision_notes text
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

begin

  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception
      'Authentication is required.';
  end if;

  if not public.is_admin() then
    raise exception
      'Only an administrator can reject a revision margin exception.';
  end if;


  update
    public.sales_order_revision_margin_approvals
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
    id = p_approval_id
    and
    status = 'pending';


  if not found then
    raise exception
      'No pending revision margin approval request was found.';
  end if;


  return
    p_approval_id;

end;
$$;


/* =========================================================
 * 7. Exact approval validity check
 * ========================================================= */

create or replace function
  public.has_valid_sales_order_revision_margin_approval(
    p_sales_order_id uuid,
    p_after_snapshot jsonb
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
      public.sales_order_revision_margin_approvals a
    where
      a.sales_order_id =
        p_sales_order_id
      and
      a.snapshot_hash =
        public.sales_order_revision_snapshot_hash(
          p_after_snapshot
        )
      and
      a.status =
        'approved'
  );

$$;

/* =========================================================
 * 8. Approval-aware authoritative validator
 *
 * Keeps the Migration 205 one-argument contract because the
 * Apply RPC invokes this AFTER writing the proposed state but
 * BEFORE finalizing the revision.
 *
 * Any exception still rolls back the complete transaction.
 * ========================================================= */

create or replace function
  public.validate_sales_order_revision_margin(
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

  v_revision_id uuid;

  v_revision
    public.sales_order_revisions%rowtype;

  v_approval
    public.sales_order_revision_margin_approvals%rowtype;

  v_current_snapshot jsonb;

  v_current_hash text;

  v_warning_count integer := 0;

  v_blocked_count integer := 0;

  v_missing_cost_count integer := 0;

  v_lowest_margin numeric(18,4);

  v_requires_approval boolean := false;

begin

  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception
      'Authentication is required.';
  end if;

  if not public.is_admin() then
    raise exception
      'You are not authorized to validate revision margins.';
  end if;


  select *
  into v_policy
  from public.sales_margin_policy
  where is_active = true
  order by updated_at desc
  limit 1;

  if not found then
    raise exception
      'No active sales margin policy exists.';
  end if;


  /*
   * Apply has already created the draft revision inside the
   * same transaction. Find that exact current revision.
   */

  select
    sor.id
  into
    v_revision_id
  from public.sales_order_revisions sor
  where
    sor.sales_order_id =
      p_sales_order_id
    and
    sor.status = 'draft'
    and
    sor.created_by =
      v_user_id
  order by
    sor.created_at desc
  limit 1;


  if v_revision_id is null then
    raise exception
      'Active Sales Order revision context was not found.';
  end if;


  select *
  into v_revision
  from public.sales_order_revisions
  where id = v_revision_id
  for update;


  /*
   * after_snapshot is the exact proposed snapshot captured by
   * the Apply engine before transactional changes were made.
   */

  v_current_snapshot :=
    v_revision.after_snapshot;

  if v_current_snapshot is null then
    raise exception
      'Sales Order revision does not contain an after snapshot.';
  end if;


  v_current_hash :=
    public.sales_order_revision_snapshot_hash(
      v_current_snapshot
    );


  /*
   * Validate FINAL transactional margin state.
   */

  for v_line in

    select *
    from public.sales_order_margin_analysis
    where
      sales_order_id =
        p_sales_order_id
      and
      fulfilment_method =
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

      if v_policy.block_when_cost_missing then
        v_requires_approval := true;
      end if;

      continue;

    end if;


    if
      v_lowest_margin is null
      or
      (
        v_line.estimated_margin_percentage
          is not null
        and
        v_line.estimated_margin_percentage <
          v_lowest_margin
      )
    then

      v_lowest_margin :=
        v_line.estimated_margin_percentage;

    end if;


    if
      v_line.estimated_margin_percentage
        is not null
      and
      v_line.estimated_margin_percentage <
        v_policy.minimum_margin_percentage
    then

      v_blocked_count :=
        v_blocked_count + 1;

      if v_policy.block_below_minimum then
        v_requires_approval := true;
      end if;

    elsif
      v_line.estimated_margin_percentage
        is not null
      and
      v_line.estimated_margin_percentage <
        v_policy.warning_margin_percentage
    then

      v_warning_count :=
        v_warning_count + 1;

    end if;

  end loop;


  /*
   * Healthy/warning state requires no exception approval.
   */

  if not v_requires_approval then

    return jsonb_build_object(
      'salesOrderId',
        p_sales_order_id,

      'revisionId',
        v_revision_id,

      'snapshotHash',
        v_current_hash,

      'warningMarginPercentage',
        v_policy.warning_margin_percentage,

      'minimumMarginPercentage',
        v_policy.minimum_margin_percentage,

      'warningCount',
        v_warning_count,

      'blockedCount',
        v_blocked_count,

      'missingCostCount',
        v_missing_cost_count,

      'lowestMarginPercentage',
        v_lowest_margin,

      'approvalRequired',
        false,

      'hasApproval',
        false
    );

  end if;


  /*
   * Below-minimum/missing-cost state:
   * require APPROVED approval for this exact snapshot.
   */

  select *
  into v_approval
  from public.sales_order_revision_margin_approvals a
  where
    a.sales_order_id =
      p_sales_order_id
    and
    a.snapshot_hash =
      v_current_hash
    and
    a.status =
      'approved'
  order by
    a.approved_at desc
  limit 1
  for update;


  if not found then
    raise exception
      'Admin approval required for this exact posted-sale modification. Request margin approval before applying the revision.';
  end if;


  /*
   * Consume approval atomically.
   *
   * If anything later in Apply fails, PostgreSQL rolls this
   * update back together with the entire revision.
   */

  update
    public.sales_order_revision_margin_approvals
  set
    status =
      'consumed',

    consumed_by_revision_id =
      v_revision_id,

    consumed_at =
      now(),

    updated_at =
      now()

  where
    id =
      v_approval.id
    and
    status =
      'approved';


  if not found then
    raise exception
      'The revision margin approval could not be consumed.';
  end if;


  return jsonb_build_object(
    'salesOrderId',
      p_sales_order_id,

    'revisionId',
      v_revision_id,

    'approvalId',
      v_approval.id,

    'snapshotHash',
      v_current_hash,

    'warningMarginPercentage',
      v_policy.warning_margin_percentage,

    'minimumMarginPercentage',
      v_policy.minimum_margin_percentage,

    'warningCount',
      v_warning_count,

    'blockedCount',
      v_blocked_count,

    'missingCostCount',
      v_missing_cost_count,

    'lowestMarginPercentage',
      v_lowest_margin,

    'approvalRequired',
      true,

    'hasApproval',
      true,

    'approvalConsumed',
      true
  );

end;
$$;


revoke all
on function
  public.validate_sales_order_revision_margin(uuid)
from public;


grant execute
on function
  public.validate_sales_order_revision_margin(uuid)
to authenticated;


comment on function
  public.validate_sales_order_revision_margin(uuid)
is
  'Validates the final transactional state of a posted Sales Order revision and atomically consumes an exact-snapshot margin approval when an exception is required.';

/* =========================================================
 * 9. RLS
 * ========================================================= */

alter table
  public.sales_order_revision_margin_approvals
enable row level security;


drop policy if exists
  sales_order_revision_margin_approvals_admin
on
  public.sales_order_revision_margin_approvals;


create policy
  sales_order_revision_margin_approvals_admin
on
  public.sales_order_revision_margin_approvals
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


/* =========================================================
 * 10. Permissions
 * ========================================================= */

revoke all
on function
  public.sales_order_revision_snapshot_hash(jsonb)
from public;

grant execute
on function
  public.sales_order_revision_snapshot_hash(jsonb)
to authenticated;


revoke all
on function
  public.analyze_sales_order_revision_margin(uuid,jsonb)
from public;

grant execute
on function
  public.analyze_sales_order_revision_margin(uuid,jsonb)
to authenticated;


revoke all
on function
  public.request_sales_order_revision_margin_approval(uuid,jsonb,text)
from public;

grant execute
on function
  public.request_sales_order_revision_margin_approval(uuid,jsonb,text)
to authenticated;


revoke all
on function
  public.approve_sales_order_revision_margin_exception(uuid,text)
from public;

grant execute
on function
  public.approve_sales_order_revision_margin_exception(uuid,text)
to authenticated;


revoke all
on function
  public.reject_sales_order_revision_margin_exception(uuid,text)
from public;

grant execute
on function
  public.reject_sales_order_revision_margin_exception(uuid,text)
to authenticated;


revoke all
on function
  public.has_valid_sales_order_revision_margin_approval(uuid,jsonb)
from public;

grant execute
on function
  public.has_valid_sales_order_revision_margin_approval(uuid,jsonb)
to authenticated;


/* =========================================================
 * 11. Documentation
 * ========================================================= */

comment on table
  public.sales_order_revision_margin_approvals
is
  'Auditable margin approvals bound to the exact proposed commercial snapshot of a posted Sales Order modification.';
