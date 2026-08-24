/*
 * =========================================================
 * 134 - Atomic Expense + GL Posting
 *
 * PURPOSE
 * -------
 * Make Expense posting a single controlled transaction:
 *
 *   1. Operational Expense posting
 *   2. Financial Account movement
 *   3. Formal General Ledger posting
 *
 * If GL posting fails, the entire database call rolls back.
 *
 * The application should call ONLY:
 *
 *   public.post_expense_with_gl(...)
 *
 * Low-level GL primitives remain isolated by Migration 133.
 * =========================================================
 */


/* =========================================================
 * 1. Atomic Expense Posting Wrapper
 * ========================================================= */

create or replace function
  public.post_expense_with_gl(
    p_expense_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_account_transaction_id uuid;

  v_journal_id uuid;

begin

  /* =======================================================
   * Authentication / Authorization
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
      'Administrator access is required to post expenses.';
  end if;


  if
    p_expense_id is null
  then
    raise exception
      'Expense ID is required.';
  end if;


  /* =======================================================
   * Operational Posting
   *
   * Existing post_expense() is idempotent for an already
   * posted Expense and returns its account transaction ID.
   * ======================================================= */

  v_account_transaction_id :=
    public.post_expense(
      p_expense_id
    );


  if
    v_account_transaction_id is null
  then
    raise exception
      'Expense posting did not return an account transaction.';
  end if;


  /* =======================================================
   * Formal GL Posting
   *
   * Existing post_expense_gl() posts through the isolated
   * internal General Ledger engine.
   *
   * post_erp_gl_journal() provides source idempotency.
   * ======================================================= */

  v_journal_id :=
    public.post_expense_gl(
      p_expense_id
    );


  if
    v_journal_id is null
  then
    raise exception
      'Expense General Ledger posting did not return a journal.';
  end if;


  return
    v_account_transaction_id;

end;
$$;


/* =========================================================
 * 2. Permissions
 * ========================================================= */

revoke all
on function
  public.post_expense_with_gl(
    uuid
  )
from public;


revoke all
on function
  public.post_expense_with_gl(
    uuid
  )
from anon;


grant execute
on function
  public.post_expense_with_gl(
    uuid
  )
to authenticated;


/* =========================================================
 * 3. Documentation
 * ========================================================= */

comment on function
  public.post_expense_with_gl(
    uuid
  )
is
  'Atomically posts an Expense operationally and to the formal General Ledger. Intended application entry point for Expense posting.';