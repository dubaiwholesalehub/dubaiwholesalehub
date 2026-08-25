/*
 * =========================================================
 * 139 - Customer Receipt GL Reconciliation
 *
 * PURPOSE
 * -------
 * Provide an authenticated management-only repair entry point
 * for a posted Customer Receipt whose operational posting
 * exists but whose General Ledger journal is missing.
 *
 * Actual accounting logic remains delegated to:
 *
 *   public.post_customer_receipt_gl(uuid)
 *
 * That function is idempotent, so an existing journal is
 * returned rather than duplicated.
 * =========================================================
 */

create or replace function
  public.reconcile_customer_receipt_gl(
    p_customer_receipt_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_journal_id uuid;
begin

  /* =======================================================
   * Security
   * ======================================================= */

  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;

  if not public.is_admin() then
    raise exception
      'Administrator access is required.';
  end if;


  /* =======================================================
   * Validate Input
   * ======================================================= */

  if p_customer_receipt_id is null then
    raise exception
      'Customer Receipt ID is required.';
  end if;


  /* =======================================================
   * Delegate to canonical GL adapter
   * ======================================================= */

  v_journal_id :=
    public.post_customer_receipt_gl(
      p_customer_receipt_id
    );

  if v_journal_id is null then
    raise exception
      'Customer Receipt GL reconciliation did not return a journal ID.';
  end if;


  return v_journal_id;

end;
$$;


/* =========================================================
 * Permissions
 * ========================================================= */

revoke all
on function
  public.reconcile_customer_receipt_gl(uuid)
from public, anon;


grant execute
on function
  public.reconcile_customer_receipt_gl(uuid)
to authenticated;


/* =========================================================
 * Documentation
 * ========================================================= */

comment on function
  public.reconcile_customer_receipt_gl(uuid)
is
'Management-only idempotent reconciliation entry point that ensures a posted Customer Receipt has its corresponding General Ledger journal.';