/*
 * =========================================================
 * Migration 166
 * Historical Expense GL Reconciliation
 * =========================================================
 *
 * Repairs:
 *
 *   EXP-2026-000007
 *
 * Operational state:
 *
 *   Posted Expense
 *   Cash account transaction exists
 *
 * Historical defect:
 *
 *   Formal GL journal is missing.
 *
 * Repair method:
 *
 *   Re-use public.post_expense_gl(...)
 *
 * Expected accounting:
 *
 *   Dr Telephone / Internet Expense   AED 1.00
 *   Cr Cash in Hand                   AED 1.00
 *
 * post_expense_gl() ultimately uses post_erp_gl_journal(),
 * which provides source-level idempotency.
 * =========================================================
 */

create or replace function
  public.reconcile_historical_expense_gl_166()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expense_id uuid;

  v_journal_id uuid;

  v_expense_number text;

  v_expense_status text;

  v_account_transaction_id uuid;

  v_financial_account_id uuid;

  v_result jsonb;

begin

  /* =======================================================
   * Authentication / Authorization
   * ======================================================= */

  if auth.uid() is null
  then
    raise exception
      'Authentication is required.';
  end if;


  if not public.is_admin()
  then
    raise exception
      'Administrator access is required.';
  end if;


  /* =======================================================
   * Serialize Historical Repair
   * ======================================================= */

  perform
    pg_advisory_xact_lock(
      hashtext(
        'reconcile_historical_expense_gl_166'
      )
    );


  /* =======================================================
   * Locate Historical Expense
   * ======================================================= */

  select
    e.id,
    e.expense_number,
    e.status,
    e.account_transaction_id,
    e.financial_account_id

  into
    v_expense_id,
    v_expense_number,
    v_expense_status,
    v_account_transaction_id,
    v_financial_account_id

  from
    public.expenses e

  where
    e.expense_number =
      'EXP-2026-000007'

  for update;


  if not found
  then
    raise exception
      'Historical Expense EXP-2026-000007 was not found.';
  end if;


  /* =======================================================
   * Validate Historical Operational State
   * ======================================================= */

  if v_expense_status <> 'posted'
  then
    raise exception
      'Expense % is not posted.',
      v_expense_number;
  end if;


  if v_account_transaction_id is null
  then
    raise exception
      'Expense % does not have an account transaction.',
      v_expense_number;
  end if;


  if v_financial_account_id is null
  then
    raise exception
      'Expense % does not have a financial account.',
      v_expense_number;
  end if;


  /* =======================================================
   * Post Missing Formal GL Journal
   * ======================================================= */

  v_journal_id :=
    public.post_expense_gl(
      v_expense_id
    );


  if v_journal_id is null
  then
    raise exception
      'Expense GL reconciliation did not return a journal.';
  end if;


  /* =======================================================
   * Result
   * ======================================================= */

  v_result :=
    jsonb_build_object(
      'status',
        'completed',

      'expense_number',
        v_expense_number,

      'expense_id',
        v_expense_id,

      'journal_id',
        v_journal_id,

      'account_transaction_id',
        v_account_transaction_id,

      'financial_account_id',
        v_financial_account_id,

      'repair_amount',
        1.00
    );


  return
    v_result;

end;
$$;


/* =========================================================
 * Permissions
 * ========================================================= */

revoke all
on function
  public.reconcile_historical_expense_gl_166()
from public;

revoke all
on function
  public.reconcile_historical_expense_gl_166()
from anon;

grant execute
on function
  public.reconcile_historical_expense_gl_166()
to authenticated;


/* =========================================================
 * Documentation
 * ========================================================= */

comment on function
  public.reconcile_historical_expense_gl_166()
is
  'Repairs the missing formal GL posting for historical posted Expense EXP-2026-000007 using the existing controlled post_expense_gl() adapter. Idempotent through post_erp_gl_journal source idempotency.';