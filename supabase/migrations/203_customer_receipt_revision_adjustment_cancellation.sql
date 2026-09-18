/* =========================================================
 * Migration 203
 * Customer Receipt Revision Adjustment Cancellation
 *
 * Purpose:
 * - Extend controlled Customer Receipt cancellation to understand
 *   Sales Order revision payment allocation adjustments introduced
 *   by migrations 200 / 201.
 * - Reverse every GL journal created by revision_release or
 *   revision_reapplication adjustments belonging to the receipt.
 * - Preserve original receipt allocations and adjustment rows.
 * - Preserve all original GL journals and use formal reversals.
 * - Continue using the proven migration-161 cancellation engine
 *   for operational receipt cancellation, treasury restoration,
 *   Customer Advance application reversal and original receipt GL
 *   reversal.
 * ========================================================= */


/* =========================================================
 * 1. Replace Controlled Customer Receipt Cancellation Wrapper
 * ========================================================= */

create or replace function
  public.cancel_customer_receipt_with_gl(
    p_receipt_id uuid,
    p_reason text
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reversal_id uuid;
  v_adjustment record;
  v_adjustment_reversal_id uuid;
  v_expected_source_type text;
  v_reason text;
begin

  /* ---------------------------------------------------------
   * Security
   * --------------------------------------------------------- */

  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;

  if not public.is_admin() then
    raise exception
      'Administrator access is required.';
  end if;

  if p_receipt_id is null then
    raise exception
      'Customer Receipt ID is required.';
  end if;

  v_reason :=
    nullif(
      btrim(
        coalesce(
          p_reason,
          ''
        )
      ),
      ''
    );

  if v_reason is null then
    raise exception
      'Cancellation reason is required.';
  end if;


  /* ---------------------------------------------------------
   * Lock and validate receipt before touching adjustment GL.
   *
   * The internal migration-161 cancellation workflow performs
   * its own validation as well. This early lock ensures that
   * adjustment reversals and receipt cancellation operate on one
   * stable receipt lifecycle state.
   * --------------------------------------------------------- */

  perform
    1
  from
    public.customer_receipts
  where
    id = p_receipt_id
  for update;

  if not found then
    raise exception
      'Customer Receipt was not found.';
  end if;


  /* ---------------------------------------------------------
   * Controlled lifecycle guard.
   *
   * Required by migration 161 for Posted -> Cancelled.
   * Transaction-local only.
   * --------------------------------------------------------- */

  perform
    set_config(
      'erp.customer_receipt_cancellation',
      '1',
      true
    );


  /* =========================================================
   * 2. Reverse Sales Order Revision Allocation Adjustment GL
   *
   * Every migration-201 allocation adjustment has:
   *
   *   revision_release
   *     source_type =
   *       customer_receipt_allocation_release
   *
   *   revision_reapplication
   *     source_type =
   *       customer_receipt_allocation_reapplication
   *
   * In both cases:
   *
   *   source_id =
   *     customer_receipt_allocation_adjustments.id
   *
   * Adjustment rows remain immutable. Only their posted GL
   * economic effect is formally reversed.
   * ========================================================= */

  for
    v_adjustment
  in
    select
      adjustment.id,
      adjustment.adjustment_type,
      adjustment.amount,
      adjustment.gl_journal_entry_id,
      adjustment.sales_order_id,
      adjustment.sales_order_revision_id,
      adjustment.created_at
    from
      public.customer_receipt_allocation_adjustments
        adjustment
    where
      adjustment.receipt_id = p_receipt_id
    order by
      adjustment.created_at,
      adjustment.id
  loop

    if
      v_adjustment.adjustment_type =
        'revision_release'
    then

      v_expected_source_type :=
        'customer_receipt_allocation_release';

    elsif
      v_adjustment.adjustment_type =
        'revision_reapplication'
    then

      v_expected_source_type :=
        'customer_receipt_allocation_reapplication';

    else

      raise exception
        'Unsupported Customer Receipt allocation adjustment type: %.',
        v_adjustment.adjustment_type;

    end if;


    /*
     * Migration 201 requires every controlled adjustment to carry
     * its permanent GL journal reference. Missing linkage is an
     * accounting-integrity failure and cancellation must stop.
     */

    if
      v_adjustment.gl_journal_entry_id is null
    then

      raise exception
        'Customer Receipt allocation adjustment % has no linked GL journal.',
        v_adjustment.id;

    end if;


    /*
     * Validate that the permanent journal reference belongs to the
     * expected source type / source ID.
     */

    if not exists (

      select
        1
      from
        public.gl_journal_entries journal
      where
        journal.id =
          v_adjustment.gl_journal_entry_id
        and journal.source_type =
          v_expected_source_type
        and journal.source_id =
          v_adjustment.id
        and journal.status in (
          'posted',
          'reversed'
        )

    )
    then

      raise exception
        'Customer Receipt allocation adjustment % has an invalid or missing % GL journal.',
        v_adjustment.id,
        v_expected_source_type;

    end if;


    /*
     * Formal reversal is idempotent according to the established
     * ERP GL reversal workflow.
     *
     * If already reversed, the helper must return/use the existing
     * reversal rather than modifying historical journal rows.
     */

    v_adjustment_reversal_id :=
      public.reverse_erp_source_gl_journal(
        v_expected_source_type,
        v_adjustment.id,
        current_date,
        concat(
          v_reason,
          ' Sales Order revision payment allocation adjustment reversed because originating Customer Receipt was cancelled.'
        )
      );

  end loop;


  /* =========================================================
   * 3. Execute Existing Proven Receipt Cancellation
   *
   * Migration 161 retained the migration-160 implementation as:
   *
   *   cancel_customer_receipt_with_gl_internal_161(...)
   *
   * It already handles:
   *
   * - Customer Advance application GL reversals
   * - Customer Receipt cancellation
   * - Sales Order paid/balance synchronization
   * - Financial account / treasury restoration
   * - Original Customer Receipt GL reversal
   *
   * We deliberately reuse it rather than duplicating that logic.
   * ========================================================= */

  v_reversal_id :=
    public.cancel_customer_receipt_with_gl_internal_161(
      p_receipt_id,
      v_reason
    );


  /* ---------------------------------------------------------
   * Clear transaction-local guard.
   * --------------------------------------------------------- */

  perform
    set_config(
      'erp.customer_receipt_cancellation',
      '',
      true
    );


  return
    v_reversal_id;

end;
$$;


/* =========================================================
 * 4. Permissions
 * ========================================================= */

revoke all
on function
  public.cancel_customer_receipt_with_gl(
    uuid,
    text
  )
from public, anon;


grant execute
on function
  public.cancel_customer_receipt_with_gl(
    uuid,
    text
  )
to authenticated;


/* =========================================================
 * 5. Documentation
 * ========================================================= */

comment on function
  public.cancel_customer_receipt_with_gl(
    uuid,
    text
  )
is
  'Controlled Customer Receipt cancellation entry point. Before executing the established receipt, treasury and GL cancellation workflow, formally reverses every Sales Order revision payment allocation release or reapplication journal belonging to the receipt. Original receipt allocations, allocation adjustments and GL journals remain immutable for audit history.';


/* =========================================================
 * End Migration 203
 * ========================================================= */
