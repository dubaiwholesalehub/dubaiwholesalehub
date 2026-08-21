/*
 * =========================================================
 * 111 — Formal Journal Entry Detail
 *
 * PURPOSE
 * -------
 *
 * Returns one complete General Ledger journal for audit
 * drill-down.
 *
 * Includes:
 *
 * - journal header
 * - all debit / credit lines
 * - GL account information
 * - operational dimensions
 * - reversal relationships
 * - source information
 * - base-currency totals
 *
 * The journal is read-only reporting data.
 * =========================================================
 */


create or replace function
  public.get_formal_journal_entry_detail(
    p_journal_entry_id uuid
  )
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare

  v_journal
    public.gl_journal_entries%rowtype;

  v_lines
    jsonb;

  v_total_debit
    numeric(18, 2);

  v_total_credit
    numeric(18, 2);

  v_base_debit
    numeric(18, 2);

  v_base_credit
    numeric(18, 2);

  v_result
    jsonb;

begin

  /* =======================================================
   * Authentication / Authorization
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
      'You are not authorized to view journal entries.';
  end if;


  if
    p_journal_entry_id is null
  then
    raise exception
      'Journal Entry ID is required.';
  end if;


  /* =======================================================
   * Resolve Journal
   * ======================================================= */

  select
    *
  into
    v_journal
  from
    public.gl_journal_entries
  where
    id =
      p_journal_entry_id;


  if not found
  then
    raise exception
      'Journal Entry % does not exist.',
      p_journal_entry_id;
  end if;


  /* =======================================================
   * Totals
   * ======================================================= */

  select

    round(
      coalesce(
        sum(
          line.debit
        ),
        0
      ),
      2
    ),

    round(
      coalesce(
        sum(
          line.credit
        ),
        0
      ),
      2
    ),

    round(
      coalesce(
        sum(
          line.base_debit
        ),
        0
      ),
      2
    ),

    round(
      coalesce(
        sum(
          line.base_credit
        ),
        0
      ),
      2
    )

  into
    v_total_debit,
    v_total_credit,
    v_base_debit,
    v_base_credit

  from
    public.gl_journal_lines line

  where
    line.journal_entry_id =
      p_journal_entry_id;


  /* =======================================================
   * Journal Lines
   * ======================================================= */

  select
    coalesce(
      jsonb_agg(

        jsonb_build_object(

          'journalLineId',
            line.id,

          'lineNumber',
            line.line_number,

          'description',
            line.description,


          /*
           * GL Account
           */

          'glAccountId',
            account.id,

          'accountCode',
            account.account_code,

          'accountName',
            account.account_name,

          'accountClass',
            account.account_class,

          'statementType',
            account.statement_type,

          'normalBalance',
            account.normal_balance,

          'isControlAccount',
            account.is_control_account,


          /*
           * Document Currency
           */

          'debit',
            line.debit,

          'credit',
            line.credit,


          /*
           * Base Currency AED
           */

          'baseDebit',
            line.base_debit,

          'baseCredit',
            line.base_credit,


          /*
           * Operational Dimensions
           */

          'customerId',
            line.customer_id,

          'supplierId',
            line.supplier_id,

          'productId',
            line.product_id,

          'warehouseId',
            line.warehouse_id,

          'financialAccountId',
            line.financial_account_id,

          'expenseCategoryId',
            line.expense_category_id,


          /*
           * Source Line Trace
           */

          'sourceLineType',
            line.source_line_type,

          'sourceLineId',
            line.source_line_id,

          'sourceLineNumber',
            line.source_line_number

        )

        order by
          line.line_number,
          line.id

      ),
      '[]'::jsonb
    )

  into
    v_lines

  from
    public.gl_journal_lines line

  inner join
    public.gl_accounts account

    on
      account.id =
        line.gl_account_id

  where
    line.journal_entry_id =
      p_journal_entry_id;


  /* =======================================================
   * Result
   * ======================================================= */

  v_result :=
    jsonb_build_object(

      'journalEntryId',
        v_journal.id,

      'journalNumber',
        v_journal.journal_number,

      'journalDate',
        v_journal.journal_date,

      'postingDate',
        v_journal.posting_date,

      'accountingPeriodId',
        v_journal.accounting_period_id,

      'sourceType',
        v_journal.source_type,

      'sourceId',
        v_journal.source_id,

      'sourceNumber',
        v_journal.source_number,

      'description',
        v_journal.description,

      'currencyCode',
        v_journal.currency_code,

      'exchangeRate',
        v_journal.exchange_rate,

      'status',
        v_journal.status,


      /*
       * Reversal Relationships
       */

      'originalEntryId',
        v_journal.original_entry_id,

      'reversalEntryId',
        v_journal.reversal_entry_id,

      'reversalReason',
        v_journal.reversal_reason,


      /*
       * Posting Audit
       */

      'postedAt',
        v_journal.posted_at,

      'postedBy',
        v_journal.posted_by,

      'reversedAt',
        v_journal.reversed_at,

      'reversedBy',
        v_journal.reversed_by,

      'createdBy',
        v_journal.created_by,

      'createdAt',
        v_journal.created_at,


      /*
       * Totals
       */

      'totalDebit',
        v_total_debit,

      'totalCredit',
        v_total_credit,

      'baseDebit',
        v_base_debit,

      'baseCredit',
        v_base_credit,

      'isBalanced',
        (
          v_total_debit =
            v_total_credit

          and
          v_base_debit =
            v_base_credit
        ),


      /*
       * Lines
       */

      'lineCount',
        jsonb_array_length(
          v_lines
        ),

      'lines',
        v_lines

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
  public.get_formal_journal_entry_detail(
    uuid
  )
from public;


grant execute
on function
  public.get_formal_journal_entry_detail(
    uuid
  )
to authenticated;


/* =========================================================
 * Documentation
 * ========================================================= */

comment on function
  public.get_formal_journal_entry_detail(
    uuid
  )
is
  'Returns one complete formal General Ledger journal entry including header, debit/credit lines, GL account metadata, operational dimensions, reversal relationships, source information and balancing controls.';