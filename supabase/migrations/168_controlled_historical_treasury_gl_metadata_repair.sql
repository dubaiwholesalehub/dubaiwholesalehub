/* Migration 168 - Controlled historical treasury GL metadata repair */

create or replace function
  public.reconcile_historical_treasury_gl_metadata_167()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_missing_before integer := 0;

  v_missing_after integer := 0;

  v_receipt_candidates integer := 0;

  v_payment_candidates integer := 0;

  v_reversal_candidates integer := 0;

  v_receipt_updated integer := 0;

  v_payment_updated integer := 0;

  v_reversal_updated integer := 0;

  v_invalid_receipt_mappings integer := 0;

  v_invalid_payment_mappings integer := 0;

  v_invalid_reversal_mappings integer := 0;

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
        'reconcile_historical_treasury_gl_metadata_167'
      )
    );


  /* =======================================================
   * Count Missing Treasury Metadata Before Repair
   *
   * A treasury GL line is identified by the GL account
   * currently mapped to a financial account.
   * ======================================================= */

  select
    count(*)::integer
  into
    v_missing_before
  from
    public.gl_journal_lines line
  join
    public.gl_journal_entries journal
      on journal.id =
         line.journal_entry_id
  join
    public.financial_accounts financial_account
      on financial_account.gl_account_id =
         line.gl_account_id
  where
    journal.status in (
      'posted',
      'reversed'
    )
    and
    line.financial_account_id is null;


  /* =======================================================
   * Customer Receipt Validation
   * ======================================================= */

  select
    count(*)::integer
  into
    v_receipt_candidates
  from
    public.gl_journal_lines line
  join
    public.gl_journal_entries journal
      on journal.id =
         line.journal_entry_id
  join
    public.customer_receipts receipt
      on receipt.id =
         journal.source_id
  join
    public.financial_accounts financial_account
      on financial_account.id =
         receipt.financial_account_id
      and
         financial_account.gl_account_id =
         line.gl_account_id
  where
    journal.source_type =
      'customer_receipt'
    and
    journal.status in (
      'posted',
      'reversed'
    )
    and
    line.financial_account_id is null;


  /*
   * Every NULL treasury line belonging to a Customer Receipt
   * must resolve uniquely through:
   *
   * journal.source_id
   *   -> customer_receipts.id
   *   -> financial_account_id
   *   -> financial_accounts.gl_account_id
   */

  select
    count(*)::integer
  into
    v_invalid_receipt_mappings
  from
    public.gl_journal_lines line
  join
    public.gl_journal_entries journal
      on journal.id =
         line.journal_entry_id
  join
    public.financial_accounts treasury_account
      on treasury_account.gl_account_id =
         line.gl_account_id
  left join
    public.customer_receipts receipt
      on receipt.id =
         journal.source_id
  left join
    public.financial_accounts source_account
      on source_account.id =
         receipt.financial_account_id
  where
    journal.source_type =
      'customer_receipt'
    and
    journal.status in (
      'posted',
      'reversed'
    )
    and
    line.financial_account_id is null
    and
    (
      receipt.id is null
      or
      receipt.financial_account_id is null
      or
      source_account.id is null
      or
      source_account.gl_account_id is distinct from
        line.gl_account_id
    );


  if
    v_invalid_receipt_mappings > 0
  then
    raise exception
      'Treasury metadata repair aborted: % Customer Receipt treasury GL line(s) have invalid or ambiguous financial-account mappings.',
      v_invalid_receipt_mappings;
  end if;


  /* =======================================================
   * Supplier Payment Validation
   * ======================================================= */

  select
    count(*)::integer
  into
    v_payment_candidates
  from
    public.gl_journal_lines line
  join
    public.gl_journal_entries journal
      on journal.id =
         line.journal_entry_id
  join
    public.supplier_payments payment
      on payment.id =
         journal.source_id
  join
    public.financial_accounts financial_account
      on financial_account.id =
         payment.financial_account_id
      and
         financial_account.gl_account_id =
         line.gl_account_id
  where
    journal.source_type =
      'supplier_payment'
    and
    journal.status in (
      'posted',
      'reversed'
    )
    and
    line.financial_account_id is null;


  select
    count(*)::integer
  into
    v_invalid_payment_mappings
  from
    public.gl_journal_lines line
  join
    public.gl_journal_entries journal
      on journal.id =
         line.journal_entry_id
  join
    public.financial_accounts treasury_account
      on treasury_account.gl_account_id =
         line.gl_account_id
  left join
    public.supplier_payments payment
      on payment.id =
         journal.source_id
  left join
    public.financial_accounts source_account
      on source_account.id =
         payment.financial_account_id
  where
    journal.source_type =
      'supplier_payment'
    and
    journal.status in (
      'posted',
      'reversed'
    )
    and
    line.financial_account_id is null
    and
    (
      payment.id is null
      or
      payment.financial_account_id is null
      or
      source_account.id is null
      or
      source_account.gl_account_id is distinct from
        line.gl_account_id
    );


  if
    v_invalid_payment_mappings > 0
  then
    raise exception
      'Treasury metadata repair aborted: % Supplier Payment treasury GL line(s) have invalid or ambiguous financial-account mappings.',
      v_invalid_payment_mappings;
  end if;


  /* =======================================================
   * Reversal Validation
   * ======================================================= */

  select
    count(*)::integer
  into
    v_reversal_candidates
  from
    public.gl_journal_lines reversal_line
  join
    public.gl_journal_entries reversal_journal
      on reversal_journal.id =
         reversal_line.journal_entry_id
  join
    public.financial_accounts treasury_account
      on treasury_account.gl_account_id =
         reversal_line.gl_account_id
  where
    reversal_journal.source_type =
      'journal_reversal'
    and
    reversal_journal.status in (
      'posted',
      'reversed'
    )
    and
    reversal_line.financial_account_id is null
    and
    reversal_journal.original_entry_id is not null;


  /*
   * Each reversal treasury line must have exactly one
   * corresponding original line for the same GL account,
   * and that original line must have financial-account
   * metadata after the original-line repairs above.
   *
   * Validation of this condition is performed immediately
   * before the reversal update.
   */


  /* =======================================================
   * Controlled Internal Metadata Write
   * ======================================================= */

  perform
    set_config(
      'app.gl_internal_write',
      'on',
      true
    );

  /* =======================================================
   * Repair Customer Receipt Treasury Metadata
   * ======================================================= */

  update
    public.gl_journal_lines line
  set
    financial_account_id =
      receipt.financial_account_id
  from
    public.gl_journal_entries journal,
    public.customer_receipts receipt,
    public.financial_accounts financial_account
  where
    journal.id =
      line.journal_entry_id
    and
    journal.source_type =
      'customer_receipt'
    and
    journal.status in (
      'posted',
      'reversed'
    )
    and
    receipt.id =
      journal.source_id
    and
    financial_account.id =
      receipt.financial_account_id
    and
    financial_account.gl_account_id =
      line.gl_account_id
    and
    line.financial_account_id is null;

  get diagnostics
    v_receipt_updated =
      row_count;


  if
    v_receipt_updated <>
      v_receipt_candidates
  then
    raise exception
      'Treasury metadata repair aborted: Customer Receipt candidate count % does not match updated count %.',
      v_receipt_candidates,
      v_receipt_updated;
  end if;


  /* =======================================================
   * Repair Supplier Payment Treasury Metadata
   * ======================================================= */

  update
    public.gl_journal_lines line
  set
    financial_account_id =
      payment.financial_account_id
  from
    public.gl_journal_entries journal,
    public.supplier_payments payment,
    public.financial_accounts financial_account
  where
    journal.id =
      line.journal_entry_id
    and
    journal.source_type =
      'supplier_payment'
    and
    journal.status in (
      'posted',
      'reversed'
    )
    and
    payment.id =
      journal.source_id
    and
    financial_account.id =
      payment.financial_account_id
    and
    financial_account.gl_account_id =
      line.gl_account_id
    and
    line.financial_account_id is null;

  get diagnostics
    v_payment_updated =
      row_count;


  if
    v_payment_updated <>
      v_payment_candidates
  then
    raise exception
      'Treasury metadata repair aborted: Supplier Payment candidate count % does not match updated count %.',
      v_payment_candidates,
      v_payment_updated;
  end if;


  /* =======================================================
   * Validate Reversal Mapping After Original Repair
   * ======================================================= */

  select
    count(*)::integer
  into
    v_invalid_reversal_mappings
  from
    public.gl_journal_lines reversal_line
  join
    public.gl_journal_entries reversal_journal
      on reversal_journal.id =
         reversal_line.journal_entry_id
  join
    public.financial_accounts treasury_account
      on treasury_account.gl_account_id =
         reversal_line.gl_account_id
  where
    reversal_journal.source_type =
      'journal_reversal'
    and
    reversal_journal.status in (
      'posted',
      'reversed'
    )
    and
    reversal_line.financial_account_id is null
    and
    (
      reversal_journal.original_entry_id is null
      or
      (
        select
          count(*)
        from
          public.gl_journal_lines original_line
        where
          original_line.journal_entry_id =
            reversal_journal.original_entry_id
          and
          original_line.gl_account_id =
            reversal_line.gl_account_id
          and
          original_line.financial_account_id is not null
      ) <> 1
    );


  if
    v_invalid_reversal_mappings > 0
  then
    raise exception
      'Treasury metadata repair aborted: % reversal treasury GL line(s) do not resolve uniquely to an original financial-account line.',
      v_invalid_reversal_mappings;
  end if;


  /* =======================================================
   * Repair Reversal Treasury Metadata
   * ======================================================= */

  update
    public.gl_journal_lines reversal_line
  set
    financial_account_id =
      (
        select
          original_line.financial_account_id
        from
          public.gl_journal_lines original_line
        where
          original_line.journal_entry_id =
            reversal_journal.original_entry_id
          and
          original_line.gl_account_id =
            reversal_line.gl_account_id
          and
          original_line.financial_account_id is not null
      )
  from
    public.gl_journal_entries reversal_journal,
    public.financial_accounts treasury_account
  where
    reversal_journal.id =
      reversal_line.journal_entry_id
    and
    reversal_journal.source_type =
      'journal_reversal'
    and
    reversal_journal.status in (
      'posted',
      'reversed'
    )
    and
    treasury_account.gl_account_id =
      reversal_line.gl_account_id
    and
    reversal_line.financial_account_id is null
    and
    reversal_journal.original_entry_id is not null
    and
    (
      select
        count(*)
      from
        public.gl_journal_lines original_line
      where
        original_line.journal_entry_id =
          reversal_journal.original_entry_id
        and
        original_line.gl_account_id =
          reversal_line.gl_account_id
        and
        original_line.financial_account_id is not null
    ) = 1;

  get diagnostics
    v_reversal_updated =
      row_count;


  if
    v_reversal_updated <>
      v_reversal_candidates
  then
    raise exception
      'Treasury metadata repair aborted: reversal candidate count % does not match updated count %.',
      v_reversal_candidates,
      v_reversal_updated;
  end if;


  /* =======================================================
   * End Controlled Internal Metadata Write
   * ======================================================= */

  perform
    set_config(
      'app.gl_internal_write',
      'off',
      true
    );

  /* =======================================================
   * Final Validation
   * ======================================================= */

  select
    count(*)::integer
  into
    v_missing_after
  from
    public.gl_journal_lines line
  join
    public.gl_journal_entries journal
      on journal.id =
         line.journal_entry_id
  join
    public.financial_accounts financial_account
      on financial_account.gl_account_id =
         line.gl_account_id
  where
    journal.status in (
      'posted',
      'reversed'
    )
    and
    line.financial_account_id is null;


  if
    v_missing_after <> 0
  then
    raise exception
      'Treasury metadata repair incomplete: % active/reversed treasury GL line(s) still have NULL financial_account_id.',
      v_missing_after;
  end if;


  /* =======================================================
   * Result
   * ======================================================= */

  v_result :=
    jsonb_build_object(
      'status',
        'completed',

      'missing_before',
        v_missing_before,

      'customer_receipt_candidates',
        v_receipt_candidates,

      'customer_receipt_updated',
        v_receipt_updated,

      'supplier_payment_candidates',
        v_payment_candidates,

      'supplier_payment_updated',
        v_payment_updated,

      'reversal_candidates',
        v_reversal_candidates,

      'reversal_updated',
        v_reversal_updated,

      'total_updated',
        (
          v_receipt_updated
          +
          v_payment_updated
          +
          v_reversal_updated
        ),

      'missing_after',
        v_missing_after
    );


  return
    v_result;

end;
$$;

revoke all on function public.reconcile_historical_treasury_gl_metadata_167() from public;
revoke all on function public.reconcile_historical_treasury_gl_metadata_167() from anon;
grant execute on function public.reconcile_historical_treasury_gl_metadata_167() to authenticated;
