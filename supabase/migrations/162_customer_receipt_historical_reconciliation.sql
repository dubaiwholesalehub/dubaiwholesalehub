/* =========================================================
 * Migration 162
 * Customer Receipt Historical Reconciliation
 *
 * Purpose
 * ---------------------------------------------------------
 *
 * Repair historical Customer Receipt allocation anomalies
 * created before Customer Receipt lifecycle hardening.
 *
 * Confirmed historical anomalies:
 *
 * A. Invalid INITIAL allocations to Draft Sales Orders
 *
 *   RCPT-2026-000022 -> SO-2026-000027   AED 10
 *   RCPT-2026-000022 -> SO-2026-000028   AED 10
 *
 * These allocations incorrectly reduced AR at receipt
 * posting time even though Draft Sales Orders had not yet
 * entered the accounting lifecycle.
 *
 * Required accounting correction:
 *
 *   Dr Accounts Receivable       20
 *      Cr Customer Advances          20
 *
 *
 * B. Historical advance allocations against a Sales Order
 *    that was later cancelled
 *
 *   RCPT-2026-000022 -> SO-2026-000045   AED 10
 *   RCPT-2026-000023 -> SO-2026-000045   AED 10
 *
 * Neither allocation ever generated Customer Advance
 * application GL. Therefore they only need operational
 * release back to available Customer Advance.
 *
 *
 * C. Valid historical Customer Advance applications that
 *    predate Migration 159 GL integration
 *
 *   RCPT-000008 -> SO-000022      75
 *   RCPT-000008 -> SO-000024      25
 *   RCPT-000009 -> SO-000025     100
 *   RCPT-000011 -> SO-000026      25
 *
 * Total                                225
 *
 * Required accounting:
 *
 *   Dr Customer Advances
 *      Cr Accounts Receivable
 *
 *
 * Design
 * ---------------------------------------------------------
 *
 * - Never edit/delete posted GL journals.
 * - Preserve removed allocation records in an audit table.
 * - Keep Migration 161 lifecycle protections active.
 * - Add a transaction-local historical repair guard.
 * - Add a narrow payment-sync exception for historical
 *   Cancelled Sales Orders only while that guard is active.
 * - Use the existing controlled GL posting engine.
 * - Use source-level idempotency.
 * - Require authenticated Administrator execution.
 * ========================================================= */


/* =========================================================
 * 1. Historical Repair Audit Table
 * ========================================================= */

create table if not exists
  public.customer_receipt_allocation_repair_audit
(
  allocation_id uuid primary key,

  receipt_id uuid not null,

  sales_order_id uuid not null,

  repair_reason text not null,

  allocation_snapshot jsonb not null,

  receipt_snapshot jsonb not null,

  sales_order_snapshot jsonb not null,

  repaired_at timestamptz not null
    default now(),

  repaired_by uuid
);


comment on table
  public.customer_receipt_allocation_repair_audit
is
'Immutable audit snapshots of historical Customer Receipt allocations removed by controlled accounting reconciliation.';


revoke all
on table
  public.customer_receipt_allocation_repair_audit
from public, anon, authenticated;



/* =========================================================
 * 2. Extend Customer Receipt Allocation Lifecycle Guard
 *
 * Normal Posted / Cancelled allocation history remains
 * immutable.
 *
 * DELETE is permitted only when:
 *
 *   erp.customer_receipt_historical_repair = 1
 *
 * The setting is transaction-local and is supplied only by
 * the controlled reconciliation function below.
 * ========================================================= */

create or replace function
  public.guard_customer_receipt_allocation_lifecycle()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_receipt_status text;

  v_sales_order_status text;

  v_advance_guard boolean :=
    coalesce(
      current_setting(
        'erp.customer_advance_application',
        true
      ),
      ''
    ) = '1';

  v_historical_repair_guard boolean :=
    coalesce(
      current_setting(
        'erp.customer_receipt_historical_repair',
        true
      ),
      ''
    ) = '1';

begin

  /* =======================================================
   * INSERT
   * ======================================================= */

  if tg_op = 'INSERT' then

    select
      status
    into
      v_receipt_status
    from
      public.customer_receipts
    where
      id = new.receipt_id;


    if not found then
      raise exception
        'Customer Receipt was not found.';
    end if;


    select
      status
    into
      v_sales_order_status
    from
      public.sales_orders
    where
      id = new.sales_order_id;


    if not found then
      raise exception
        'Sales Order was not found.';
    end if;


    if
      v_sales_order_status in (
        'draft',
        'cancelled'
      )
    then
      raise exception
        'Customer Receipt allocations cannot be applied to Draft or Cancelled Sales Orders.';
    end if;


    /*
     * Initial receipt allocations are inserted while the
     * receipt itself is Draft.
     */

    if v_receipt_status = 'draft' then
      return new;
    end if;


    /*
     * Later allocation of Posted receipt money is permitted
     * only through the controlled Customer Advance workflow.
     */

    if
      v_receipt_status = 'posted'
      and v_advance_guard
    then
      return new;
    end if;


    if v_receipt_status = 'cancelled' then
      raise exception
        'Allocations cannot be added to a Cancelled Customer Receipt.';
    end if;


    raise exception
      'Allocations cannot be added to a Posted Customer Receipt outside the controlled Customer Advance workflow.';

  end if;


  /* =======================================================
   * UPDATE
   * ======================================================= */

  if tg_op = 'UPDATE' then

    select
      status
    into
      v_receipt_status
    from
      public.customer_receipts
    where
      id = old.receipt_id;


    if not found then
      raise exception
        'Original Customer Receipt was not found.';
    end if;


    if
      v_receipt_status in (
        'posted',
        'cancelled'
      )
    then
      raise exception
        'Allocations belonging to Posted or Cancelled Customer Receipts are immutable.';
    end if;


    if new.receipt_id <> old.receipt_id then

      select
        status
      into
        v_receipt_status
      from
        public.customer_receipts
      where
        id = new.receipt_id;


      if not found then
        raise exception
          'Destination Customer Receipt was not found.';
      end if;


      if v_receipt_status <> 'draft' then
        raise exception
          'Allocations can only be moved to Draft Customer Receipts.';
      end if;

    end if;


    select
      status
    into
      v_sales_order_status
    from
      public.sales_orders
    where
      id = new.sales_order_id;


    if not found then
      raise exception
        'Sales Order was not found.';
    end if;


    if
      v_sales_order_status in (
        'draft',
        'cancelled'
      )
    then
      raise exception
        'Customer Receipt allocations cannot be applied to Draft or Cancelled Sales Orders.';
    end if;


    return new;

  end if;


  /* =======================================================
   * DELETE
   * ======================================================= */

  if tg_op = 'DELETE' then

    select
      status
    into
      v_receipt_status
    from
      public.customer_receipts
    where
      id = old.receipt_id;


    if not found then
      raise exception
        'Customer Receipt was not found.';
    end if;


    /*
     * Historical reconciliation exception.
     *
     * No normal ERP workflow sets this flag.
     */

    if v_historical_repair_guard then
      return old;
    end if;


    if
      v_receipt_status in (
        'posted',
        'cancelled'
      )
    then
      raise exception
        'Allocations belonging to Posted or Cancelled Customer Receipts cannot be deleted.';
    end if;


    return old;

  end if;


  raise exception
    'Unsupported Customer Receipt Allocation lifecycle operation.';

end;
$$;



/* =========================================================
 * 3. Extend Sales Order Lifecycle Guard
 *
 * Migration 158 correctly makes Cancelled Sales Orders
 * immutable.
 *
 * Historical reconciliation needs exactly one exception:
 * recalculation of derived payment fields after removal of
 * invalid historical allocations.
 *
 * Commercial fields and status remain immutable.
 * ========================================================= */

create or replace function
  public.enforce_sales_order_lifecycle_immutability()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_old_business jsonb;

  v_new_business jsonb;

  v_historical_repair_guard boolean :=
    coalesce(
      current_setting(
        'erp.customer_receipt_historical_repair',
        true
      ),
      ''
    ) = '1';

begin

  /* =======================================================
   * DELETE
   * ======================================================= */

  if tg_op = 'DELETE' then

    if old.status = 'draft' then
      return old;
    end if;


    raise exception
      'Sales Order % cannot be deleted from status "%". Confirmed Sales Orders are historical accounting documents.',
      old.order_number,
      old.status
      using errcode = 'P0001';

  end if;


  /* =======================================================
   * Draft
   * ======================================================= */

  if old.status = 'draft' then

    if new.status not in (
      'draft',
      'confirmed',
      'cancelled'
    ) then
      raise exception
        'Draft Sales Order % cannot transition directly to status "%". Confirm or cancel the Sales Order through the controlled workflow.',
        old.order_number,
        new.status
        using errcode = 'P0001';
    end if;


    return new;

  end if;


  /* =======================================================
   * Cancelled
   * ======================================================= */

  if old.status = 'cancelled' then

    /*
     * Historical repair may ONLY refresh payment-derived
     * fields.
     *
     * Everything else remains frozen.
     */

    if v_historical_repair_guard then

      if new.status <> 'cancelled' then
        raise exception
        'Historical Customer Receipt reconciliation cannot change Cancelled Sales Order % status.',
        old.order_number
        using errcode = 'P0001';
      end if;


      v_old_business :=
        to_jsonb(old)
          - 'payment_status'
          - 'paid_amount'
          - 'balance_due'
          - 'updated_by'
          - 'updated_at';


      v_new_business :=
        to_jsonb(new)
          - 'payment_status'
          - 'paid_amount'
          - 'balance_due'
          - 'updated_by'
          - 'updated_at';


      if
        v_old_business
        is distinct from
        v_new_business
      then
        raise exception
          'Historical Customer Receipt reconciliation may update only payment-derived fields on Cancelled Sales Order %.',
          old.order_number
          using errcode = 'P0001';
      end if;


      return new;

    end if;


    raise exception
      'Cancelled Sales Order % is immutable.',
      old.order_number
      using errcode = 'P0001';

  end if;


  /* =======================================================
   * Confirmed / later lifecycle
   * ======================================================= */

  if new.status = 'cancelled' then
    raise exception
      'Sales Order % has already been confirmed and cannot be cancelled directly. Use the controlled Sales Return / accounting reversal workflow.',
      old.order_number
      using errcode = 'P0001';
  end if;


  v_old_business :=
    to_jsonb(old)
      - 'status'
      - 'fulfilment_status'
      - 'payment_status'
      - 'paid_amount'
      - 'balance_due'
      - 'processing_at'
      - 'completed_at'
      - 'closed_at'
      - 'updated_by'
      - 'updated_at';


  v_new_business :=
    to_jsonb(new)
      - 'status'
      - 'fulfilment_status'
      - 'payment_status'
      - 'paid_amount'
      - 'balance_due'
      - 'processing_at'
      - 'completed_at'
      - 'closed_at'
      - 'updated_by'
      - 'updated_at';


  if
    v_old_business
    is distinct from
    v_new_business
  then
    raise exception
      'Confirmed Sales Order % commercial/accounting fields are immutable. Use controlled fulfilment, receipt, Sales Return, or accounting correction workflows.',
      old.order_number
      using errcode = 'P0001';
  end if;


  /* =======================================================
   * Lifecycle Status Protection
   * ======================================================= */

  if
    old.status = 'confirmed'
    and new.status not in (
      'confirmed',
      'processing'
    )
  then
    raise exception
      'Confirmed Sales Order % cannot transition directly to status "%". Delivery execution must move the order through the controlled fulfilment workflow.',
      old.order_number,
      new.status
      using errcode = 'P0001';
  end if;


  if
    old.status = 'processing'
    and new.status not in (
      'processing',
      'partially_fulfilled',
      'fulfilled',
      'completed',
      'closed'
    )
  then
    raise exception
      'Processing Sales Order % cannot transition to status "%".',
      old.order_number,
      new.status
      using errcode = 'P0001';
  end if;


  if
    old.status = 'partially_fulfilled'
    and new.status not in (
      'processing',
      'partially_fulfilled',
      'fulfilled',
      'completed',
      'closed'
    )
  then
    raise exception
      'Partially fulfilled Sales Order % cannot transition to status "%".',
      old.order_number,
      new.status
      using errcode = 'P0001';
  end if;


  if
    old.status = 'fulfilled'
    and new.status not in (
      'fulfilled',
      'completed',
      'closed'
    )
  then
    raise exception
      'Fulfilled Sales Order % cannot transition directly to status "%".',
      old.order_number,
      new.status
      using errcode = 'P0001';
  end if;


  if
    old.status = 'completed'
    and new.status not in (
      'completed',
      'closed'
    )
  then
    raise exception
      'Completed Sales Order % cannot transition to status "%".',
      old.order_number,
      new.status
      using errcode = 'P0001';
  end if;


  if
    old.status = 'closed'
    and new.status <> 'closed'
  then
    raise exception
      'Closed Sales Order % is terminal and cannot transition to status "%".',
      old.order_number,
      new.status
      using errcode = 'P0001';
  end if;


  return new;

end;
$$;



/* =========================================================
 * 4. Controlled Historical Reconciliation
 * ========================================================= */

create or replace function
  public.reconcile_historical_customer_receipts_162()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare

  v_expected record;

  v_actual record;

  v_receipt
    public.customer_receipts%rowtype;


  v_bad_allocation_ids uuid[] :=
    array[
      'c5d326e1-5727-42a5-ba33-bee6fa3d3c11'::uuid,
      'af2a9c38-f560-4681-b29e-f5d845836604'::uuid,
      '55cfa97b-2d2d-4584-98bf-2fd72f2186bf'::uuid,
      '25a45d7e-bc0c-4719-8dac-1426dfe36731'::uuid
    ];


  v_valid_advance_ids uuid[] :=
    array[
      'ed75b9a2-0391-4d1a-93c1-ac0118c3ca37'::uuid,
      'aae7b942-816b-4b36-8dc6-f425c27e6d70'::uuid,
      '0f0dce2d-ed93-4e3f-8b6c-2a50f094c65c'::uuid,
      '6f6a526b-e577-4dd9-9a28-7497078f5af6'::uuid
    ];


  v_bad_present_count integer := 0;

  v_audit_count integer := 0;

  v_deleted_count integer := 0;

  v_valid_advance_count integer := 0;

  v_valid_advance_total numeric(18, 2) := 0;


  v_ar_account_id uuid;

  v_customer_advance_account_id uuid;

  v_correction_amount numeric(18, 2) := 20;

  v_correction_base_amount numeric(18, 2);

  v_lines jsonb;

  v_correction_journal_id uuid;

  v_existing_journal_id uuid;

  v_existing_journal_status text;

  v_advance_journal_id uuid;

  v_advance_journals jsonb :=
    '[]'::jsonb;

begin

  /* =======================================================
   * Authentication
   * ======================================================= */

  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;


  if not public.is_admin() then
    raise exception
      'Administrator access is required.';
  end if;


  /*
   * Prevent two reconciliation runs from operating
   * concurrently.
   */

  perform
    pg_advisory_xact_lock(
      hashtext(
        'reconcile_historical_customer_receipts_162'
      )
    );


  /* =======================================================
   * 5. Determine whether operational repair already ran
   * ======================================================= */

  select
    count(*)
  into
    v_bad_present_count
  from
    public.customer_receipt_allocations
  where
    id = any(
      v_bad_allocation_ids
    );


  if
    v_bad_present_count not in (
      0,
      4
    )
  then
    raise exception
      'Historical Customer Receipt repair is in an unexpected partial state. Expected 0 or 4 repair allocations, found %.',
      v_bad_present_count;
  end if;



  /* =======================================================
   * 6. Validate and Snapshot Invalid Allocations
   * ======================================================= */

  if v_bad_present_count = 4 then

    /*
     * Validate the exact known historical records.
     */

    for v_expected in

      select
        *

      from
        (
          values

            (
              'c5d326e1-5727-42a5-ba33-bee6fa3d3c11'::uuid,
              '6753bb81-9583-4d08-becb-38bc79d761b8'::uuid,
              '1d3de794-aeb6-490e-b136-7539a67e1e60'::uuid,
              10::numeric,
              'draft'::text,
              'INITIAL_DRAFT'::text
            ),

            (
              'af2a9c38-f560-4681-b29e-f5d845836604'::uuid,
              '6753bb81-9583-4d08-becb-38bc79d761b8'::uuid,
              '2b6ae6c9-14c2-47ee-a255-8cb037b748aa'::uuid,
              10::numeric,
              'draft'::text,
              'INITIAL_DRAFT'::text
            ),

            (
              '55cfa97b-2d2d-4584-98bf-2fd72f2186bf'::uuid,
              '6753bb81-9583-4d08-becb-38bc79d761b8'::uuid,
              '01e5890a-e7b0-40cc-b587-36d23285fff2'::uuid,
              10::numeric,
              'cancelled'::text,
              'CANCELLED_ORDER'::text
            ),

            (
              '25a45d7e-bc0c-4719-8dac-1426dfe36731'::uuid,
              'f45672ba-9371-4eb0-8e50-0a248a9e437f'::uuid,
              '01e5890a-e7b0-40cc-b587-36d23285fff2'::uuid,
              10::numeric,
              'cancelled'::text,
              'CANCELLED_ORDER'::text
            )

        ) as expected(
          allocation_id,
          receipt_id,
          sales_order_id,
          amount,
          expected_order_status,
          repair_reason
        )

    loop

      select
        cra.id as allocation_id,

        cra.receipt_id,

        cra.sales_order_id,

        cra.amount,

        cra.created_at,

        r.status as receipt_status,

        r.posted_at,

        so.status as sales_order_status,

        to_jsonb(cra) as allocation_snapshot,

        to_jsonb(r) as receipt_snapshot,

        to_jsonb(so) as sales_order_snapshot

      into
        v_actual

      from
        public.customer_receipt_allocations cra

      join
        public.customer_receipts r
      on
        r.id = cra.receipt_id

      join
        public.sales_orders so
      on
        so.id = cra.sales_order_id

      where
        cra.id =
          v_expected.allocation_id;


      if not found then
        raise exception
          'Historical allocation % was not found.',
          v_expected.allocation_id;
      end if;


      if
        v_actual.receipt_id
          is distinct from
          v_expected.receipt_id

        or

        v_actual.sales_order_id
          is distinct from
          v_expected.sales_order_id

        or

        round(
          v_actual.amount,
          2
        )
          is distinct from
          round(
            v_expected.amount,
            2
          )

        or

        v_actual.receipt_status
          is distinct from
          'posted'

        or

        v_actual.sales_order_status
          is distinct from
          v_expected.expected_order_status

      then
        raise exception
          'Historical allocation % no longer matches the audited repair facts.',
          v_expected.allocation_id;
      end if;


      /*
       * INITIAL Draft allocations must have been created
       * exactly when the receipt was posted.
       */

      if
        v_expected.repair_reason =
          'INITIAL_DRAFT'

        and

        v_actual.created_at
          is distinct from
          v_actual.posted_at

      then
        raise exception
          'Historical Draft allocation % is no longer classified as an initial receipt allocation.',
          v_expected.allocation_id;
      end if;


      /*
       * Cancelled-order allocations were later applications.
       */

      if
        v_expected.repair_reason =
          'CANCELLED_ORDER'

        and not (
          v_actual.created_at
          >
          v_actual.posted_at
        )

      then
        raise exception
          'Historical Cancelled-order allocation % is not a later Customer Advance application.',
          v_expected.allocation_id;
      end if;


      insert into
        public.customer_receipt_allocation_repair_audit
      (
        allocation_id,
        receipt_id,
        sales_order_id,
        repair_reason,
        allocation_snapshot,
        receipt_snapshot,
        sales_order_snapshot,
        repaired_by
      )
      values
      (
        v_actual.allocation_id,
        v_actual.receipt_id,
        v_actual.sales_order_id,
        v_expected.repair_reason,
        v_actual.allocation_snapshot,
        v_actual.receipt_snapshot,
        v_actual.sales_order_snapshot,
        auth.uid()
      )
      on conflict (
        allocation_id
      )
      do nothing;

    end loop;



    /* =====================================================
     * Current-state validation before mutation
     * ===================================================== */

    if not exists (
      select
        1
      from
        public.customer_receipts
      where
        id =
          '6753bb81-9583-4d08-becb-38bc79d761b8'::uuid
        and status = 'posted'
        and round(amount, 2) = 165
        and round(allocated_amount, 2) = 165
        and round(unallocated_amount, 2) = 0
    )
    then
      raise exception
        'RCPT-2026-000022 no longer matches the audited pre-repair state.';
    end if;


    if not exists (
      select
        1
      from
        public.customer_receipts
      where
        id =
          'f45672ba-9371-4eb0-8e50-0a248a9e437f'::uuid
        and status = 'posted'
        and round(amount, 2) = 10
        and round(allocated_amount, 2) = 10
        and round(unallocated_amount, 2) = 0
    )
    then
      raise exception
        'RCPT-2026-000023 no longer matches the audited pre-repair state.';
    end if;


    if not exists (
      select
        1
      from
        public.sales_orders
      where
        id =
          '1d3de794-aeb6-490e-b136-7539a67e1e60'::uuid
        and status = 'draft'
        and round(paid_amount, 2) = 10
        and round(balance_due, 2) = 0
    )
    then
      raise exception
        'SO-2026-000027 no longer matches the audited pre-repair state.';
    end if;


    if not exists (
      select
        1
      from
        public.sales_orders
      where
        id =
          '2b6ae6c9-14c2-47ee-a255-8cb037b748aa'::uuid
        and status = 'draft'
        and round(paid_amount, 2) = 10
        and round(balance_due, 2) = 0
    )
    then
      raise exception
        'SO-2026-000028 no longer matches the audited pre-repair state.';
    end if;


    if not exists (
      select
        1
      from
        public.sales_orders
      where
        id =
          '01e5890a-e7b0-40cc-b587-36d23285fff2'::uuid
        and status = 'cancelled'
        and round(paid_amount, 2) = 20
        and round(balance_due, 2) = 1
    )
    then
      raise exception
        'SO-2026-000045 no longer matches the audited pre-repair state.';
    end if;



    /* =====================================================
     * Enable transaction-local repair guards
     * ===================================================== */

    perform
      set_config(
        'erp.customer_receipt_historical_repair',
        '1',
        true
      );


    /*
     * Receipt total synchronization is already protected by
     * Migration 161's Customer Advance guard.
     */

    perform
      set_config(
        'erp.customer_advance_application',
        '1',
        true
      );


    /* =====================================================
     * Remove the four invalid historical allocations
     * ===================================================== */

    delete from
      public.customer_receipt_allocations

    where
      id = any(
        v_bad_allocation_ids
      );


    get diagnostics
      v_deleted_count = row_count;


    if v_deleted_count <> 4 then
      raise exception
        'Expected to remove 4 historical allocations, removed %.',
        v_deleted_count;
    end if;



    /* =====================================================
     * Synchronize Customer Receipt totals
     * ===================================================== */

    perform
      public.sync_customer_receipt_totals(
        '6753bb81-9583-4d08-becb-38bc79d761b8'::uuid
      );


    perform
      public.sync_customer_receipt_totals(
        'f45672ba-9371-4eb0-8e50-0a248a9e437f'::uuid
      );



    /* =====================================================
     * Synchronize affected Sales Orders
     * ===================================================== */

    perform
      public.sync_sales_order_paid_amount(
        '1d3de794-aeb6-490e-b136-7539a67e1e60'::uuid
      );


    perform
      public.sync_sales_order_paid_amount(
        '2b6ae6c9-14c2-47ee-a255-8cb037b748aa'::uuid
      );


    perform
      public.sync_sales_order_paid_amount(
        '01e5890a-e7b0-40cc-b587-36d23285fff2'::uuid
      );



    /* =====================================================
     * Disable repair guards for remaining transaction work
     * ===================================================== */

    perform
      set_config(
        'erp.customer_advance_application',
        '0',
        true
      );


    perform
      set_config(
        'erp.customer_receipt_historical_repair',
        '0',
        true
      );


  else

    /*
     * If the allocation rows are already gone, require the
     * complete audit trail before treating the repair as
     * previously completed.
     */

    select
      count(*)
    into
      v_audit_count
    from
      public.customer_receipt_allocation_repair_audit
    where
      allocation_id = any(
        v_bad_allocation_ids
      );


    if v_audit_count <> 4 then
      raise exception
        'Historical allocation rows are absent but the repair audit is incomplete. Expected 4 snapshots, found %.',
        v_audit_count;
    end if;

  end if;



  /* =======================================================
   * 7. Validate repaired operational balances
   * ======================================================= */

  if not exists (
    select
      1
    from
      public.customer_receipts
    where
      id =
        '6753bb81-9583-4d08-becb-38bc79d761b8'::uuid
      and status = 'posted'
      and round(amount, 2) = 165
      and round(allocated_amount, 2) = 135
      and round(unallocated_amount, 2) = 30
  )
  then
    raise exception
      'RCPT-2026-000022 did not reconcile to allocated AED 135 / unallocated AED 30.';
  end if;


  if not exists (
    select
      1
    from
      public.customer_receipts
    where
      id =
        'f45672ba-9371-4eb0-8e50-0a248a9e437f'::uuid
      and status = 'posted'
      and round(amount, 2) = 10
      and round(allocated_amount, 2) = 0
      and round(unallocated_amount, 2) = 10
  )
  then
    raise exception
      'RCPT-2026-000023 did not reconcile to allocated AED 0 / unallocated AED 10.';
  end if;


  if not exists (
    select
      1
    from
      public.sales_orders
    where
      id =
        '1d3de794-aeb6-490e-b136-7539a67e1e60'::uuid
      and status = 'draft'
      and round(paid_amount, 2) = 0
      and round(balance_due, 2) = 10
  )
  then
    raise exception
      'SO-2026-000027 payment balance did not reconcile.';
  end if;


  if not exists (
    select
      1
    from
      public.sales_orders
    where
      id =
        '2b6ae6c9-14c2-47ee-a255-8cb037b748aa'::uuid
      and status = 'draft'
      and round(paid_amount, 2) = 0
      and round(balance_due, 2) = 10
  )
  then
    raise exception
      'SO-2026-000028 payment balance did not reconcile.';
  end if;


  if not exists (
    select
      1
    from
      public.sales_orders
    where
      id =
        '01e5890a-e7b0-40cc-b587-36d23285fff2'::uuid
      and status = 'cancelled'
      and round(paid_amount, 2) = 0
      and round(balance_due, 2) = 21
  )
  then
    raise exception
      'SO-2026-000045 payment balance did not reconcile.';
  end if;



  /* =======================================================
   * 8. Correct INITIAL Draft-allocation GL classification
   *
   * RCPT-000022 originally posted:
   *
   *   Cr AR                 155
   *   Cr Customer Advances  10
   *
   * Correct classification after releasing the two Draft
   * allocations is:
   *
   *   Cr AR                 135
   *   Cr Customer Advances  30
   *
   * Therefore:
   *
   *   Dr AR                  20
   *      Cr Customer Advances 20
   * ======================================================= */

  select
    *
  into
    v_receipt
  from
    public.customer_receipts
  where
    id =
      '6753bb81-9583-4d08-becb-38bc79d761b8'::uuid
  for update;


  if not found then
    raise exception
      'RCPT-2026-000022 was not found.';
  end if;


  if
    v_receipt.status <> 'posted'
  then
    raise exception
      'RCPT-2026-000022 must remain Posted.';
  end if;


  if
    v_receipt.exchange_rate is null
    or
    v_receipt.exchange_rate <= 0
  then
    raise exception
      'RCPT-2026-000022 has an invalid exchange rate.';
  end if;


  v_ar_account_id :=
    public.get_mapped_gl_account(
      'accounts_receivable'
    );


  v_customer_advance_account_id :=
    public.get_mapped_gl_account(
      'customer_advances'
    );


  v_correction_base_amount :=
    round(
      v_correction_amount
      *
      v_receipt.exchange_rate,
      2
    );


  v_lines :=
    jsonb_build_array(

      jsonb_build_object(
        'glAccountId',
          v_ar_account_id,

        'debit',
          v_correction_amount,

        'credit',
          0,

        'baseDebit',
          v_correction_base_amount,

        'baseCredit',
          0,

        'description',
          'Historical Draft allocation AR correction - '
          ||
          v_receipt.receipt_number,

        'customerId',
          v_receipt.customer_id,

        'sourceLineType',
          'customer_receipt_historical_repair',

        'sourceLineId',
          v_receipt.id
      ),


      jsonb_build_object(
        'glAccountId',
          v_customer_advance_account_id,

        'debit',
          0,

        'credit',
          v_correction_amount,

        'baseDebit',
          0,

        'baseCredit',
          v_correction_base_amount,

        'description',
          'Historical Draft allocation reclassified to Customer Advance - '
          ||
          v_receipt.receipt_number,

        'customerId',
          v_receipt.customer_id,

        'sourceLineType',
          'customer_receipt_historical_repair',

        'sourceLineId',
          v_receipt.id
      )

    );


  /*
   * If this historical correction was deliberately reversed
   * later, do not silently recreate it.
   */

  select
    id,
    status
  into
    v_existing_journal_id,
    v_existing_journal_status

  from
    public.gl_journal_entries

  where
    source_type =
      'historical_customer_receipt_draft_reclass'

    and
      source_id =
        v_receipt.id

    and
      status in (
        'posted',
        'reversed'
      )

  order by
    created_at desc

  limit 1;


  if
    v_existing_journal_id is not null
    and
    v_existing_journal_status = 'reversed'
  then
    raise exception
      'Historical Customer Receipt correction journal for RCPT-2026-000022 has been reversed and requires manual accounting review.';
  end if;


  if
    v_existing_journal_id is not null
    and
    v_existing_journal_status = 'posted'
  then

    v_correction_journal_id :=
      v_existing_journal_id;

  else

    v_correction_journal_id :=
      public.post_erp_gl_journal(

        'historical_customer_receipt_draft_reclass',

        v_receipt.id,

        v_receipt.receipt_number,

        v_receipt.posted_at::date,

        v_receipt.posted_at::date,

        'Historical Customer Receipt Draft allocation reclassification - '
        ||
        v_receipt.receipt_number,

        v_receipt.currency_code,

        v_receipt.exchange_rate,

        v_lines
      );

  end if;



  /* =======================================================
   * 9. Validate Historical Customer Advance Applications
   * ======================================================= */

  select
    count(*),
    round(
      coalesce(
        sum(cra.amount),
        0
      ),
      2
    )
  into
    v_valid_advance_count,
    v_valid_advance_total

  from
    public.customer_receipt_allocations cra

  join
    public.customer_receipts r
  on
    r.id = cra.receipt_id

  join
    public.sales_orders so
  on
    so.id = cra.sales_order_id

  where
    cra.id = any(
      v_valid_advance_ids
    )

    and
      r.status = 'posted'

    and
      so.status not in (
        'draft',
        'cancelled'
      )

    and
      cra.created_at >
        r.posted_at;


  if
    v_valid_advance_count <> 4
    or
    v_valid_advance_total <> 225
  then
    raise exception
      'Historical valid Customer Advance application set no longer matches the audited AED 225 scope. Count %, total %.',
      v_valid_advance_count,
      v_valid_advance_total;
  end if;



  /* =======================================================
   * 10. Backfill Missing Customer Advance GL
   * ======================================================= */

  for v_expected in

    select
      *

    from
      (
        values

          (
            'ed75b9a2-0391-4d1a-93c1-ac0118c3ca37'::uuid,
            75::numeric
          ),

          (
            'aae7b942-816b-4b36-8dc6-f425c27e6d70'::uuid,
            25::numeric
          ),

          (
            '0f0dce2d-ed93-4e3f-8b6c-2a50f094c65c'::uuid,
            100::numeric
          ),

          (
            '6f6a526b-e577-4dd9-9a28-7497078f5af6'::uuid,
            25::numeric
          )

      ) as expected(
        allocation_id,
        amount
      )

  loop

    select
      id,
      status
    into
      v_existing_journal_id,
      v_existing_journal_status

    from
      public.gl_journal_entries

    where
      source_type =
        'customer_advance_application'

      and
        source_id =
          v_expected.allocation_id

      and
        status in (
          'posted',
          'reversed'
        )

    order by
      created_at desc

    limit 1;


    /*
     * Do not recreate a deliberately reversed historical
     * application journal.
     */

    if
      v_existing_journal_id is not null
      and
      v_existing_journal_status = 'reversed'
    then
      raise exception
        'Customer Advance application % has a reversed GL journal and requires manual accounting review.',
        v_expected.allocation_id;
    end if;


    v_advance_journal_id :=
      public.post_customer_advance_application_gl(
        v_expected.allocation_id
      );


    if v_advance_journal_id is null then
      raise exception
        'Customer Advance GL posting returned NULL for allocation %.',
        v_expected.allocation_id;
    end if;


    v_advance_journals :=
      v_advance_journals
      ||
      jsonb_build_array(
        jsonb_build_object(
          'allocationId',
            v_expected.allocation_id,

          'amount',
            v_expected.amount,

          'journalId',
            v_advance_journal_id
        )
      );

  end loop;



  /* =======================================================
   * 11. Result
   * ======================================================= */

  return
    jsonb_build_object(

      'status',
        'completed',

      'operationalRepair',
        jsonb_build_object(

          'historicalAllocationsRemoved',
            case
              when v_bad_present_count = 4
              then v_deleted_count
              else 0
            end,

          'auditSnapshots',
            4,

          'releasedFromDraftOrders',
            20,

          'releasedFromCancelledOrder',
            20,

          'rcpt000022Allocated',
            135,

          'rcpt000022Unallocated',
            30,

          'rcpt000023Allocated',
            0,

          'rcpt000023Unallocated',
            10
        ),

      'draftAllocationGLCorrection',
        jsonb_build_object(

          'amount',
            20,

          'journalId',
            v_correction_journal_id
        ),

      'historicalAdvanceBackfill',
        jsonb_build_object(

          'allocationCount',
            v_valid_advance_count,

          'amount',
            v_valid_advance_total,

          'journals',
            v_advance_journals
        )

    );

end;
$$;



/* =========================================================
 * 12. Permissions
 * ========================================================= */

revoke all
on function
  public.reconcile_historical_customer_receipts_162()
from public, anon, authenticated;


grant execute
on function
  public.reconcile_historical_customer_receipts_162()
to authenticated;


comment on function
  public.reconcile_historical_customer_receipts_162()
is
'Administrator-only, idempotent historical Customer Receipt reconciliation. Repairs four known invalid allocations, preserves audit snapshots, reclassifies AED 20 from AR to Customer Advances, and posts AED 225 of historical Customer Advance application GL.';
