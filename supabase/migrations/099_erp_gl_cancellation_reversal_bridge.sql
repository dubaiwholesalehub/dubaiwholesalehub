/*
 * =========================================================
 * 099 — ERP Cancellation → GL Reversal Bridge
 *
 * PURPOSE
 * -------
 *
 * Bridges operational ERP cancellation workflows to the
 * formal General Ledger reversal engine.
 *
 *
 * COVERED SOURCES
 * ---------------
 *
 * Customer Receipt
 * Supplier Payment
 * Expense
 * Financial Account Transfer
 * Financial Account Opening Balance
 *
 *
 * DESIGN
 * ------
 *
 * 1. Run the existing operational cancellation workflow.
 *
 * 2. Locate the original GL journal using:
 *
 *      source_type
 *      source_id
 *
 * 3. Reverse the posted journal through:
 *
 *      public.reverse_gl_journal(...)
 *
 *
 * IMPORTANT
 * ---------
 *
 * The original GL journal is NEVER deleted or modified into
 * a negative transaction.
 *
 * A new formal reversal journal is created containing exact
 * opposite debit / credit entries.
 *
 *
 * IDEMPOTENCY
 * -----------
 *
 * reverse_gl_journal() already returns the existing reversal
 * journal when the original journal was previously reversed.
 * =========================================================
 */


/* =========================================================
 * 1. Find / Reverse ERP GL Journal
 *
 * Shared helper used by cancellation wrappers.
 * ========================================================= */

create or replace function
  public.reverse_erp_source_gl_journal(
    p_source_type text,
    p_source_id uuid,
    p_reversal_date date,
    p_reason text
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare

  v_source_type text;

  v_reason text;

  v_journal_id uuid;

  v_reversal_id uuid;

begin

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


  v_source_type :=
    nullif(
      btrim(
        coalesce(
          p_source_type,
          ''
        )
      ),
      ''
    );


  if
    v_source_type is null
  then
    raise exception
      'GL source type is required.';
  end if;


  if
    p_source_id is null
  then
    raise exception
      'GL source ID is required.';
  end if;


  if
    p_reversal_date is null
  then
    raise exception
      'GL reversal date is required.';
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


  if
    v_reason is null
  then
    raise exception
      'GL reversal reason is required.';
  end if;


  /*
   * Find the source journal regardless of whether it is still
   * posted or was already reversed.
   *
   * This makes the bridge safely idempotent.
   */

  select
    id

  into
    v_journal_id

  from
    public.gl_journal_entries

  where
    source_type =
      v_source_type

    and
    source_id =
      p_source_id

    and
    status in (
      'posted',
      'reversed'
    )

  order by
    created_at desc

  limit 1

  for update;


  if not found
  then
    raise exception
      'No posted/reversed GL journal was found for source % / %.',
      v_source_type,
      p_source_id;
  end if;


  v_reversal_id :=
    public.reverse_gl_journal(
      v_journal_id,
      p_reversal_date,
      v_reason
    );


  return
    v_reversal_id;

end;
$$;


/* =========================================================
 * 2. Customer Receipt Cancellation + GL Reversal
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

  v_receipt_status text;

  v_receipt_date date;

  v_reversal_id uuid;

begin

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


  select
    status,
    receipt_date

  into
    v_receipt_status,
    v_receipt_date

  from
    public.customer_receipts

  where
    id =
      p_receipt_id

  for update;


  if not found
  then
    raise exception
      'Customer Receipt was not found.';
  end if;


  /*
   * Existing operational cancellation reverses:
   *
   * - receipt allocations
   * - linked financial-account transaction
   */

  if
    v_receipt_status <>
      'cancelled'
  then

    perform
      public.cancel_customer_receipt_with_account(
        p_receipt_id,
        p_reason
      );

  end if;


  v_reversal_id :=
    public.reverse_erp_source_gl_journal(
      'customer_receipt',
      p_receipt_id,
      coalesce(
        current_date,
        v_receipt_date
      ),
      coalesce(
        nullif(
          btrim(
            p_reason
          ),
          ''
        ),
        'Customer receipt cancelled.'
      )
    );


  return
    v_reversal_id;

end;
$$;


/* =========================================================
 * 3. Supplier Payment Cancellation + GL Reversal
 * ========================================================= */

create or replace function
  public.cancel_supplier_payment_with_gl(
    p_supplier_payment_id uuid,
    p_reason text
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare

  v_payment_status text;

  v_payment_date date;

  v_reversal_id uuid;

begin

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


  select
    status,
    payment_date

  into
    v_payment_status,
    v_payment_date

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
    v_payment_status <>
      'cancelled'
  then

    perform
      public.cancel_supplier_payment_with_account(
        p_supplier_payment_id,
        p_reason
      );

  end if;


  v_reversal_id :=
    public.reverse_erp_source_gl_journal(
      'supplier_payment',
      p_supplier_payment_id,
      coalesce(
        current_date,
        v_payment_date
      ),
      coalesce(
        nullif(
          btrim(
            p_reason
          ),
          ''
        ),
        'Supplier payment cancelled.'
      )
    );


  return
    v_reversal_id;

end;
$$;


/* =========================================================
 * 4. Expense Cancellation + GL Reversal
 * ========================================================= */

create or replace function
  public.cancel_expense_with_gl(
    p_expense_id uuid,
    p_reason text
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare

  v_expense_status text;

  v_expense_date date;

  v_reversal_id uuid;

begin

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


  select
    status,
    expense_date

  into
    v_expense_status,
    v_expense_date

  from
    public.expenses

  where
    id =
      p_expense_id

  for update;


  if not found
  then
    raise exception
      'Expense was not found.';
  end if;


  /*
   * Draft expenses never created formal GL journals.
   *
   * Therefore only posted / previously-cancelled expenses
   * should attempt GL reversal.
   */

  if
    v_expense_status =
      'draft'
  then

    perform
      public.cancel_expense(
        p_expense_id,
        p_reason
      );


    return
      null;

  end if;


  if
    v_expense_status <>
      'cancelled'
  then

    perform
      public.cancel_expense(
        p_expense_id,
        p_reason
      );

  end if;


  v_reversal_id :=
    public.reverse_erp_source_gl_journal(
      'expense',
      p_expense_id,
      coalesce(
        current_date,
        v_expense_date
      ),
      coalesce(
        nullif(
          btrim(
            p_reason
          ),
          ''
        ),
        'Expense cancelled.'
      )
    );


  return
    v_reversal_id;

end;
$$;


/* =========================================================
 * 5. Financial Account Transfer Cancellation + GL Reversal
 * ========================================================= */

create or replace function
  public.cancel_financial_account_transfer_with_gl(
    p_transfer_id uuid,
    p_reason text
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare

  v_transfer_status text;

  v_transfer_date date;

  v_reversal_id uuid;

begin

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


  select
    status,
    transfer_date

  into
    v_transfer_status,
    v_transfer_date

  from
    public.financial_account_transfers

  where
    id =
      p_transfer_id

  for update;


  if not found
  then
    raise exception
      'Financial Account Transfer was not found.';
  end if;


  /*
   * Existing transfer cancellation itself throws when the
   * transfer is already cancelled.
   *
   * Therefore we call it only once.
   */

  if
    v_transfer_status <>
      'cancelled'
  then

    perform
      public.cancel_financial_account_transfer(
        p_transfer_id,
        p_reason
      );

  end if;


  v_reversal_id :=
    public.reverse_erp_source_gl_journal(
      'financial_account_transfer',
      p_transfer_id,
      coalesce(
        current_date,
        v_transfer_date
      ),
      coalesce(
        nullif(
          btrim(
            p_reason
          ),
          ''
        ),
        'Financial account transfer cancelled.'
      )
    );


  return
    v_reversal_id;

end;
$$;


/* =========================================================
 * 6. Financial Account Opening Balance Cancellation
 *    + GL Reversal
 * ========================================================= */

create or replace function
  public.cancel_financial_account_opening_balance_with_gl(
    p_financial_account_id uuid,
    p_reason text
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare

  v_opening_transaction_id uuid;

  v_opening_transaction_status text;

  v_transaction_date date;

  v_reversal_id uuid;

begin

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


  /*
   * Find the original opening-balance account transaction.
   *
   * It may already be cancelled if this wrapper is called a
   * second time.
   */

  select
    id,
    status,
    transaction_date

  into
    v_opening_transaction_id,
    v_opening_transaction_status,
    v_transaction_date

  from
    public.account_transactions

  where
    account_id =
      p_financial_account_id

    and
    transaction_type =
      'opening_balance'

  order by
    created_at desc

  limit 1;


  if not found
  then
    raise exception
      'Financial Account does not have an opening-balance transaction.';
  end if;


  if
    v_opening_transaction_status =
      'posted'
  then

    perform
      public.cancel_financial_account_opening_balance(
        p_financial_account_id,
        p_reason
      );

  end if;


  v_reversal_id :=
    public.reverse_erp_source_gl_journal(
      'financial_account_opening_balance',
      p_financial_account_id,
      coalesce(
        current_date,
        v_transaction_date
      ),
      coalesce(
        nullif(
          btrim(
            p_reason
          ),
          ''
        ),
        'Financial account opening balance cancelled.'
      )
    );


  return
    v_reversal_id;

end;
$$;


/* =========================================================
 * 7. Permissions
 * ========================================================= */

revoke all
on function
  public.reverse_erp_source_gl_journal(
    text,
    uuid,
    date,
    text
  )
from public;


grant execute
on function
  public.reverse_erp_source_gl_journal(
    text,
    uuid,
    date,
    text
  )
to authenticated;


revoke all
on function
  public.cancel_customer_receipt_with_gl(
    uuid,
    text
  )
from public;


grant execute
on function
  public.cancel_customer_receipt_with_gl(
    uuid,
    text
  )
to authenticated;


revoke all
on function
  public.cancel_supplier_payment_with_gl(
    uuid,
    text
  )
from public;


grant execute
on function
  public.cancel_supplier_payment_with_gl(
    uuid,
    text
  )
to authenticated;


revoke all
on function
  public.cancel_expense_with_gl(
    uuid,
    text
  )
from public;


grant execute
on function
  public.cancel_expense_with_gl(
    uuid,
    text
  )
to authenticated;


revoke all
on function
  public.cancel_financial_account_transfer_with_gl(
    uuid,
    text
  )
from public;


grant execute
on function
  public.cancel_financial_account_transfer_with_gl(
    uuid,
    text
  )
to authenticated;


revoke all
on function
  public.cancel_financial_account_opening_balance_with_gl(
    uuid,
    text
  )
from public;


grant execute
on function
  public.cancel_financial_account_opening_balance_with_gl(
    uuid,
    text
  )
to authenticated;


/* =========================================================
 * 8. Documentation
 * ========================================================= */

comment on function
  public.reverse_erp_source_gl_journal(
    text,
    uuid,
    date,
    text
  )
is
  'Finds the formal GL journal for an ERP source and reverses it through reverse_gl_journal(). Repeated requests are idempotent because the GL reversal engine returns the existing reversal journal.';


comment on function
  public.cancel_customer_receipt_with_gl(
    uuid,
    text
  )
is
  'Cancels a Customer Receipt through the existing operational workflow and formally reverses its Customer Receipt GL journal.';


comment on function
  public.cancel_supplier_payment_with_gl(
    uuid,
    text
  )
is
  'Cancels a Supplier Payment through the existing operational workflow and formally reverses its Supplier Payment GL journal.';


comment on function
  public.cancel_expense_with_gl(
    uuid,
    text
  )
is
  'Cancels an Expense through the existing operational workflow and formally reverses its Expense GL journal. Draft expense cancellation returns NULL because no posted GL journal exists.';


comment on function
  public.cancel_financial_account_transfer_with_gl(
    uuid,
    text
  )
is
  'Cancels a Financial Account Transfer through the existing operational workflow and formally reverses its transfer GL journal.';


comment on function
  public.cancel_financial_account_opening_balance_with_gl(
    uuid,
    text
  )
is
  'Cancels a Financial Account Opening Balance through the existing operational workflow and formally reverses its opening-balance GL journal.';