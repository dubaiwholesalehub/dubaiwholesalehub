/*
 * =========================================================
 * 093 — Supplier Advance GL Reclassification
 *
 * PURPOSE
 * -------
 *
 * Distinguishes:
 *
 * 1. Supplier Payment allocations created when the payment
 *    itself was originally posted.
 *
 * 2. Later applications of an existing Supplier Advance
 *    against a Quick Purchase.
 *
 *
 * WHY THIS MATTERS
 * ----------------
 *
 * Original Supplier Payment:
 *
 *   Allocated portion:
 *
 *     Dr Accounts Payable
 *
 *   Unallocated portion:
 *
 *     Dr Supplier Advances
 *
 *        Cr Cash / Bank
 *
 *
 * Later application of an existing Supplier Advance:
 *
 *     Dr Accounts Payable
 *        Cr Supplier Advances
 *
 *
 * No Cash / Bank movement occurs during the later
 * reclassification because the money left treasury when the
 * original Supplier Payment was posted.
 *
 *
 * ACCOUNTING SOURCE
 * -----------------
 *
 * Each supplier_payment_allocations row is the independent
 * audit unit.
 *
 * Later advance application:
 *
 *   source_type =
 *     supplier_advance_application
 *
 *   source_id =
 *     supplier_payment_allocations.id
 *
 *
 * This provides exact per-allocation GL idempotency.
 * =========================================================
 */


/* =========================================================
 * 1. Allocation Source Classification
 * ========================================================= */

alter table
  public.supplier_payment_allocations
add column if not exists
  allocation_source text;


/*
 * Historical classification.
 *
 * post_supplier_payment():
 *
 * - creates allocation rows first
 * - then marks the payment posted and sets posted_at
 *
 * Therefore those rows were created at or before posted_at.
 *
 *
 * apply_supplier_advance_to_quick_purchase():
 *
 * - only selects an already-posted Supplier Payment
 * - then creates a later allocation row
 *
 * Therefore those rows are created after posted_at.
 *
 *
 * PostgreSQL now() is transaction-stable, which also means
 * original payment allocations and payment.posted_at may
 * legitimately have exactly the same timestamp.
 */

update
  public.supplier_payment_allocations
    allocation

set
  allocation_source =
    case

      when
        payment.posted_at is not null
        and
        allocation.created_at >
          payment.posted_at

      then
        'supplier_advance_application'

      else
        'payment_posting'

    end

from
  public.supplier_payments
    payment

where
  payment.id =
    allocation.supplier_payment_id

  and
  allocation.allocation_source
    is null;


update
  public.supplier_payment_allocations

set
  allocation_source =
    'payment_posting'

where
  allocation_source
    is null;


alter table
  public.supplier_payment_allocations

alter column
  allocation_source

set default
  'payment_posting';


alter table
  public.supplier_payment_allocations

alter column
  allocation_source

set not null;


/* =========================================================
 * 2. Allocation Source Constraint
 * ========================================================= */

alter table
  public.supplier_payment_allocations

drop constraint if exists
  supplier_payment_allocations_source_check;


alter table
  public.supplier_payment_allocations

add constraint
  supplier_payment_allocations_source_check

check (
  allocation_source in (
    'payment_posting',
    'supplier_advance_application'
  )
);


/* =========================================================
 * 3. Allocation Source Index
 * ========================================================= */

create index if not exists
  supplier_payment_allocations_source_idx

on public.supplier_payment_allocations (
  allocation_source,
  created_at
);


/* =========================================================
 * 4. Replace Existing Supplier Advance Application Function
 *
 * Operational behavior remains unchanged.
 *
 * The only accounting-audit enhancement is that allocation
 * rows created by this function are explicitly marked:
 *
 *   supplier_advance_application
 * ========================================================= */

create or replace function
  public.apply_supplier_advance_to_quick_purchase(
    p_quick_purchase_id uuid
  )
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_supplier_id uuid;

  v_currency_code text;

  v_grand_total
    numeric(18, 2);

  v_paid_amount
    numeric(18, 2);

  v_balance_due
    numeric(18, 2);

  v_purchase_status text;

  v_payment record;

  v_allocate_amount
    numeric(18, 2);

  v_total_applied
    numeric(18, 2) := 0;

begin

  /* =======================================================
   * Security
   * ======================================================= */

  v_user_id :=
    auth.uid();


  if
    v_user_id is null
  then
    raise exception
      'Authentication is required.';
  end if;


  if
    not public.is_admin()
  then
    raise exception
      'You are not authorized to apply supplier advances.';
  end if;


  /* =======================================================
   * Lock Quick Purchase
   * ======================================================= */

  select
    supplier_id,
    currency_code,
    grand_total,
    paid_amount,
    balance_due,
    status

  into
    v_supplier_id,
    v_currency_code,
    v_grand_total,
    v_paid_amount,
    v_balance_due,
    v_purchase_status

  from
    public.quick_purchases

  where
    id =
      p_quick_purchase_id

  for update;


  if not found
  then
    raise exception
      'Quick Purchase was not found.';
  end if;


  if
    v_purchase_status <>
      'posted'
  then
    return 0;
  end if;


  /*
   * Anonymous/local-shop purchases cannot participate in
   * the registered supplier advance ledger.
   */

  if
    v_supplier_id is null
  then
    return 0;
  end if;


  /*
   * Already fully paid.
   */

  if
    v_balance_due <= 0
  then
    return 0;
  end if;


  /* =======================================================
   * Apply Advances — FIFO
   * ======================================================= */

  for
    v_payment

  in

    select
      payment.id,
      payment.unallocated_amount

    from
      public.supplier_payments
        payment

    where
      payment.supplier_id =
        v_supplier_id

      and payment.status =
        'posted'

      and upper(
        payment.currency_code
      ) =
        upper(
          v_currency_code
        )

      and payment.unallocated_amount >
        0

      /*
       * Prevent duplicate application from one Supplier
       * Payment to the same Quick Purchase.
       */

      and not exists (
        select
          1

        from
          public.supplier_payment_allocations
            allocation

        where
          allocation.supplier_payment_id =
            payment.id

          and allocation.quick_purchase_id =
            p_quick_purchase_id
      )

    order by
      payment.payment_date asc,
      payment.created_at asc,
      payment.id asc

    for update

  loop

    /* =====================================================
     * Refresh Quick Purchase Balance
     * ===================================================== */

    select
      balance_due

    into
      v_balance_due

    from
      public.quick_purchases

    where
      id =
        p_quick_purchase_id

    for update;


    if
      v_balance_due <= 0
    then
      exit;
    end if;


    v_allocate_amount :=
      least(
        round(
          v_payment.unallocated_amount,
          2
        ),
        round(
          v_balance_due,
          2
        )
      );


    if
      v_allocate_amount <= 0
    then
      continue;
    end if;


    /* =====================================================
     * Allocation Audit Record
     *
     * IMPORTANT:
     *
     * This is a LATER application of previously unallocated
     * Supplier Advance.
     * ===================================================== */

    insert into
      public.supplier_payment_allocations
    (
      supplier_payment_id,
      quick_purchase_id,
      amount,
      allocation_source
    )

    values
    (
      v_payment.id,
      p_quick_purchase_id,
      v_allocate_amount,
      'supplier_advance_application'
    );


    /* =====================================================
     * Update Supplier Payment
     * ===================================================== */

    perform
      public.sync_supplier_payment_totals(
        v_payment.id
      );


    /* =====================================================
     * Update Quick Purchase
     * ===================================================== */

    perform
      public.sync_quick_purchase_paid_amount(
        p_quick_purchase_id
      );


    v_total_applied :=
      v_total_applied +
      v_allocate_amount;

  end loop;


  /* =======================================================
   * Final Synchronization
   * ======================================================= */

  perform
    public.sync_quick_purchase_paid_amount(
      p_quick_purchase_id
    );


  return
    round(
      v_total_applied,
      2
    );

end;
$$;


/* =========================================================
 * 5. Harden Supplier Payment GL Adapter
 *
 * IMPORTANT
 * ---------
 *
 * supplier_payments.allocated_amount is CURRENT state.
 *
 * It may increase later when an old Supplier Advance is
 * applied to a Quick Purchase.
 *
 * The original Supplier Payment journal must instead represent
 * allocation state AT PAYMENT POSTING.
 *
 * Therefore:
 *
 * original allocated amount =
 *
 *   SUM(
 *     supplier_payment_allocations.amount
 *     WHERE allocation_source = payment_posting
 *   )
 *
 *
 * original unallocated amount =
 *
 *   payment.amount
 *   -
 *   original allocated amount
 *
 *
 * This protects historical Supplier Payment accounting from
 * later allocation activity.
 * ========================================================= */

create or replace function
  public.post_supplier_payment_gl(
    p_supplier_payment_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment
    public.supplier_payments%rowtype;

  v_financial_gl_account_id uuid;

  v_accounts_payable_account_id uuid;

  v_supplier_advance_account_id uuid;


  v_payment_amount
    numeric(18, 2);

  v_allocated_amount
    numeric(18, 2);

  v_unallocated_amount
    numeric(18, 2);


  v_base_payment_amount
    numeric(18, 2);

  v_base_allocated_amount
    numeric(18, 2);

  v_base_unallocated_amount
    numeric(18, 2);


  v_lines jsonb;

  v_journal_id uuid;

begin

  /* =======================================================
   * Authentication
   * ======================================================= */

  if
    auth.uid() is null
  then
    raise exception
      'Authentication is required.';
  end if;


  if
    not public.is_admin()
  then
    raise exception
      'Administrator access is required.';
  end if;


  /* =======================================================
   * Input
   * ======================================================= */

  if
    p_supplier_payment_id is null
  then
    raise exception
      'Supplier Payment ID is required.';
  end if;


  /* =======================================================
   * Lock Payment
   * ======================================================= */

  select
    *

  into
    v_payment

  from
    public.supplier_payments

  where
    id =
      p_supplier_payment_id

  for update;


  if not found
  then
    raise exception
      'Supplier Payment was not found.';
  end if;


  if
    v_payment.status <>
      'posted'
  then
    raise exception
      'Supplier Payment % must be posted before General Ledger posting.',
      v_payment.payment_number;
  end if;


  if
    v_payment.financial_account_id is null
  then
    raise exception
      'Supplier Payment % does not have a financial account.',
      v_payment.payment_number;
  end if;


  if
    v_payment.account_transaction_id is null
  then
    raise exception
      'Supplier Payment % does not have an account transaction.',
      v_payment.payment_number;
  end if;


  if
    v_payment.currency_code is null
    or
    trim(
      v_payment.currency_code
    ) = ''
  then
    raise exception
      'Supplier Payment % does not have a valid currency.',
      v_payment.payment_number;
  end if;


  if
    v_payment.exchange_rate is null
    or
    v_payment.exchange_rate <= 0
  then
    raise exception
      'Supplier Payment % does not have a valid exchange rate.',
      v_payment.payment_number;
  end if;


  /* =======================================================
   * Original Payment Accounting Amount
   * ======================================================= */

  v_payment_amount :=
    round(
      coalesce(
        v_payment.amount,
        0
      ),
      2
    );


  /*
   * ONLY allocations made during original Supplier Payment
   * posting belong to the original payment accounting event.
   */

  select
    round(
      coalesce(
        sum(
          allocation.amount
        ),
        0
      ),
      2
    )

  into
    v_allocated_amount

  from
    public.supplier_payment_allocations
      allocation

  where
    allocation.supplier_payment_id =
      v_payment.id

    and allocation.allocation_source =
      'payment_posting';


  v_unallocated_amount :=
    round(
      v_payment_amount
      -
      v_allocated_amount,
      2
    );


  /* =======================================================
   * Validation
   * ======================================================= */

  if
    v_payment_amount <= 0
  then
    raise exception
      'Supplier Payment % has zero or negative accounting value.',
      v_payment.payment_number;
  end if;


  if
    v_allocated_amount < 0
    or
    v_unallocated_amount < 0
  then
    raise exception
      'Supplier Payment % contains invalid original allocation totals.',
      v_payment.payment_number;
  end if;


  if
    v_allocated_amount >
      v_payment_amount
  then
    raise exception
      'Supplier Payment % original allocations exceed payment amount.',
      v_payment.payment_number;
  end if;


  if
    abs(
      v_payment_amount
      -
      (
        v_allocated_amount
        +
        v_unallocated_amount
      )
    ) > 0.01
  then
    raise exception
      'Supplier Payment % original accounting totals are inconsistent.',
      v_payment.payment_number;
  end if;


  /* =======================================================
   * AED Base Amounts
   * ======================================================= */

  v_base_allocated_amount :=
    round(
      v_allocated_amount
      *
      v_payment.exchange_rate,
      2
    );


  v_base_unallocated_amount :=
    round(
      v_unallocated_amount
      *
      v_payment.exchange_rate,
      2
    );


  v_base_payment_amount :=
    round(
      v_base_allocated_amount
      +
      v_base_unallocated_amount,
      2
    );


  /* =======================================================
   * Resolve GL Accounts
   * ======================================================= */

  v_financial_gl_account_id :=
    public.get_financial_account_gl_account(
      v_payment.financial_account_id
    );


  if
    v_allocated_amount > 0
  then

    v_accounts_payable_account_id :=
      public.get_mapped_gl_account(
        'accounts_payable'
      );

  end if;


  if
    v_unallocated_amount > 0
  then

    v_supplier_advance_account_id :=
      public.get_mapped_gl_account(
        'supplier_advances'
      );

  end if;


  /* =======================================================
   * Build Journal
   * ======================================================= */

  v_lines :=
    '[]'::jsonb;


  if
    v_allocated_amount > 0
  then

    v_lines :=
      v_lines
      ||
      jsonb_build_array(

        jsonb_build_object(
          'glAccountId',
            v_accounts_payable_account_id,

          'debit',
            v_allocated_amount,

          'credit',
            0,

          'baseDebit',
            v_base_allocated_amount,

          'baseCredit',
            0,

          'description',
            'Supplier Payment allocation - '
            ||
            v_payment.payment_number,

          'supplierId',
            v_payment.supplier_id
        )
      );

  end if;


  if
    v_unallocated_amount > 0
  then

    v_lines :=
      v_lines
      ||
      jsonb_build_array(

        jsonb_build_object(
          'glAccountId',
            v_supplier_advance_account_id,

          'debit',
            v_unallocated_amount,

          'credit',
            0,

          'baseDebit',
            v_base_unallocated_amount,

          'baseCredit',
            0,

          'description',
            'Supplier Advance - '
            ||
            v_payment.payment_number,

          'supplierId',
            v_payment.supplier_id
        )
      );

  end if;


  v_lines :=
    v_lines
    ||
    jsonb_build_array(

      jsonb_build_object(
        'glAccountId',
          v_financial_gl_account_id,

        'debit',
          0,

        'credit',
          v_payment_amount,

        'baseDebit',
          0,

        'baseCredit',
          v_base_payment_amount,

        'description',
          'Supplier Payment - '
          ||
          v_payment.payment_number,

        'supplierId',
          v_payment.supplier_id
      )
    );


  v_journal_id :=
    public.post_erp_gl_journal(
      'supplier_payment',
      v_payment.id,
      v_payment.payment_number,
      v_payment.payment_date,
      v_payment.payment_date,

      'Supplier Payment - '
      ||
      v_payment.payment_number,

      v_payment.currency_code,
      v_payment.exchange_rate,
      v_lines
    );


  return
    v_journal_id;

end;
$$;


/* =========================================================
 * 6. Supplier Advance Application → GL Adapter
 *
 * Accounting:
 *
 *   Dr Accounts Payable
 *      Cr Supplier Advances
 *
 *
 * Source:
 *
 *   source_type =
 *     supplier_advance_application
 *
 *   source_id =
 *     supplier_payment_allocations.id
 *
 *
 * No Cash / Bank is involved.
 * ========================================================= */

create or replace function
  public.post_supplier_advance_application_gl(
    p_supplier_payment_allocation_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allocation
    public.supplier_payment_allocations%rowtype;

  v_payment
    public.supplier_payments%rowtype;

  v_purchase
    public.quick_purchases%rowtype;


  v_accounts_payable_account_id uuid;

  v_supplier_advance_account_id uuid;


  v_amount
    numeric(18, 2);

  v_base_amount
    numeric(18, 2);


  v_lines jsonb;

  v_journal_id uuid;

begin

  /* =======================================================
   * Authentication
   * ======================================================= */

  if
    auth.uid() is null
  then
    raise exception
      'Authentication is required.';
  end if;


  if
    not public.is_admin()
  then
    raise exception
      'Administrator access is required.';
  end if;


  if
    p_supplier_payment_allocation_id
      is null
  then
    raise exception
      'Supplier Payment Allocation ID is required.';
  end if;


  /* =======================================================
   * Lock Allocation
   * ======================================================= */

  select
    *

  into
    v_allocation

  from
    public.supplier_payment_allocations

  where
    id =
      p_supplier_payment_allocation_id

  for update;


  if not found
  then
    raise exception
      'Supplier Payment Allocation was not found.';
  end if;


  /* =======================================================
   * Must Be Later Supplier Advance Application
   * ======================================================= */

  if
    v_allocation.allocation_source <>
      'supplier_advance_application'
  then
    raise exception
      'Supplier Payment Allocation % is not a Supplier Advance application.',
      v_allocation.id;
  end if;


  /* =======================================================
   * Load Payment
   * ======================================================= */

  select
    *

  into
    v_payment

  from
    public.supplier_payments

  where
    id =
      v_allocation.supplier_payment_id;


  if not found
  then
    raise exception
      'Supplier Payment for allocation % was not found.',
      v_allocation.id;
  end if;


  if
    v_payment.status <>
      'posted'
  then
    raise exception
      'Supplier Payment % must remain posted before advance application GL posting.',
      v_payment.payment_number;
  end if;


  /* =======================================================
   * Load Quick Purchase
   * ======================================================= */

  select
    *

  into
    v_purchase

  from
    public.quick_purchases

  where
    id =
      v_allocation.quick_purchase_id;


  if not found
  then
    raise exception
      'Quick Purchase for allocation % was not found.',
      v_allocation.id;
  end if;


  if
    v_purchase.status <>
      'posted'
  then
    raise exception
      'Quick Purchase % must remain posted before advance application GL posting.',
      v_purchase.purchase_number;
  end if;


  /* =======================================================
   * Supplier / Currency Integrity
   * ======================================================= */

  if
    v_purchase.supplier_id is null
    or
    v_purchase.supplier_id <>
      v_payment.supplier_id
  then
    raise exception
      'Supplier Payment % and Quick Purchase % do not belong to the same supplier.',
      v_payment.payment_number,
      v_purchase.purchase_number;
  end if;


  if
    upper(
      v_purchase.currency_code
    ) <>
    upper(
      v_payment.currency_code
    )
  then
    raise exception
      'Supplier Payment % and Quick Purchase % currencies do not match.',
      v_payment.payment_number,
      v_purchase.purchase_number;
  end if;


  if
    v_payment.exchange_rate is null
    or
    v_payment.exchange_rate <=
      0
  then
    raise exception
      'Supplier Payment % has an invalid exchange rate.',
      v_payment.payment_number;
  end if;


  /* =======================================================
   * Accounting Amount
   * ======================================================= */

  v_amount :=
    round(
      coalesce(
        v_allocation.amount,
        0
      ),
      2
    );


  if
    v_amount <= 0
  then
    raise exception
      'Supplier Advance application % has zero or negative value.',
      v_allocation.id;
  end if;


  v_base_amount :=
    round(
      v_amount
      *
      v_payment.exchange_rate,
      2
    );


  /* =======================================================
   * GL Accounts
   * ======================================================= */

  v_accounts_payable_account_id :=
    public.get_mapped_gl_account(
      'accounts_payable'
    );


  v_supplier_advance_account_id :=
    public.get_mapped_gl_account(
      'supplier_advances'
    );


  /* =======================================================
   * Journal Lines
   * ======================================================= */

  v_lines :=
    jsonb_build_array(

      jsonb_build_object(
        'glAccountId',
          v_accounts_payable_account_id,

        'debit',
          v_amount,

        'credit',
          0,

        'baseDebit',
          v_base_amount,

        'baseCredit',
          0,

        'description',
          'Supplier Advance applied to '
          ||
          v_purchase.purchase_number,

        'supplierId',
          v_payment.supplier_id,

        'sourceLineType',
          'supplier_payment_allocation',

        'sourceLineId',
          v_allocation.id
      ),

      jsonb_build_object(
        'glAccountId',
          v_supplier_advance_account_id,

        'debit',
          0,

        'credit',
          v_amount,

        'baseDebit',
          0,

        'baseCredit',
          v_base_amount,

        'description',
          'Supplier Advance reclassification - '
          ||
          v_payment.payment_number,

        'supplierId',
          v_payment.supplier_id,

        'sourceLineType',
          'supplier_payment_allocation',

        'sourceLineId',
          v_allocation.id
      )
    );


  /* =======================================================
   * Post Through Controlled GL Engine
   * ======================================================= */

  v_journal_id :=
    public.post_erp_gl_journal(
      'supplier_advance_application',

      v_allocation.id,

      concat(
        v_payment.payment_number,
        ' / ',
        v_purchase.purchase_number
      ),

      v_allocation.created_at::date,

      v_allocation.created_at::date,

      concat(
        'Supplier Advance application - ',
        v_payment.payment_number,
        ' → ',
        v_purchase.purchase_number
      ),

      v_payment.currency_code,

      v_payment.exchange_rate,

      v_lines
    );


  return
    v_journal_id;

end;
$$;


/* =========================================================
 * 7. Permissions
 * ========================================================= */

revoke all
on function
  public.post_supplier_advance_application_gl(
    uuid
  )
from public;


grant execute
on function
  public.post_supplier_advance_application_gl(
    uuid
  )
to authenticated;


/*
 * Reaffirm Supplier Payment adapter permission after replacing
 * the function in this migration.
 */

revoke all
on function
  public.post_supplier_payment_gl(
    uuid
  )
from public;


grant execute
on function
  public.post_supplier_payment_gl(
    uuid
  )
to authenticated;


/* =========================================================
 * 8. Documentation
 * ========================================================= */

comment on column
  public.supplier_payment_allocations.allocation_source
is
  'Classifies whether an allocation was created during original Supplier Payment posting or later by applying an existing Supplier Advance.';


comment on function
  public.apply_supplier_advance_to_quick_purchase(
    uuid
  )
is
  'Automatically allocates posted unallocated supplier payments against a posted Quick Purchase using FIFO. New allocations are explicitly classified as supplier_advance_application.';


comment on function
  public.post_supplier_payment_gl(
    uuid
  )
is
  'Posts the original Supplier Payment accounting event using only allocations classified as payment_posting, preserving historical accounting when Supplier Advances are allocated later.';


comment on function
  public.post_supplier_advance_application_gl(
    uuid
  )
is
  'Posts one later Supplier Advance application to the General Ledger by debiting Accounts Payable and crediting Supplier Advances. Source identity is the supplier_payment_allocations row and no treasury movement is recorded.';