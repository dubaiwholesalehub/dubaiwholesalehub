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

  /*
 * Approval was requested against the canonical commercial proposal
 * supplied by Modify Sale.
 *
 * The revision engine enriches after_snapshot with calculated header
 * values before this validator runs. Those derived values must not
 * change the identity of the proposal that was approved.
 */
if v_revision.after_snapshot is null then
  raise exception
    'Sales Order revision does not contain an after snapshot.';
end if;


v_current_snapshot :=
  jsonb_build_object(
    'header',
      jsonb_build_object(
        'invoice_discount_amount',
          coalesce(
            (v_revision.after_snapshot -> 'header' ->>
              'invoice_discount_amount')::numeric,
            0
          ),

        'shipping_amount',
          coalesce(
            (v_revision.after_snapshot -> 'header' ->>
              'shipping_amount')::numeric,
            0
          ),

        'round_off_amount',
          coalesce(
            (v_revision.after_snapshot -> 'header' ->>
              'round_off_amount')::numeric,
            0
          ),

        'customer_notes',
          v_revision.after_snapshot -> 'header' -> 'customer_notes',

        'internal_notes',
          v_revision.after_snapshot -> 'header' -> 'internal_notes'
      ),

    'items',
      coalesce(
        v_revision.after_snapshot -> 'items',
        '[]'::jsonb
      )
  );


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
