/*
 * =========================================================
 * 095 — Expense General Ledger Integration
 *
 * PURPOSE
 * -------
 *
 * Connects posted operational Expenses to the formal
 * General Ledger.
 *
 *
 * EXISTING OPERATIONAL FLOW
 * -------------------------
 *
 * public.post_expense(...)
 *
 * already:
 *
 * - validates expense category
 * - validates VAT treatment
 * - validates financial account
 * - posts gross Cash / Bank movement
 * - creates account_transactions record
 * - marks the expense posted
 *
 *
 * This migration DOES NOT create another account transaction.
 *
 * It creates only the formal double-entry GL representation
 * of the already-posted Expense.
 *
 *
 * ACCOUNTING
 * ----------
 *
 * NO VAT
 *
 *   Dr Expense Category
 *      Cr Financial Account
 *
 *
 * STANDARD / RECOVERABLE VAT
 *
 *   Dr Expense Category
 *   Dr VAT Recoverable
 *      Cr Financial Account
 *
 *
 * VAT PENDING
 *
 *   Dr Expense Category
 *   Dr VAT Pending
 *      Cr Financial Account
 *
 *
 * NON-RECOVERABLE VAT
 *
 *   Dr Expense Category
 *      Cr Financial Account
 *
 * Tax forms part of expense cost in the non-recoverable case.
 *
 *
 * SOURCE
 * ------
 *
 *   source_type = expense
 *   source_id   = expenses.id
 *
 *
 * Idempotency is provided by:
 *
 *   public.post_erp_gl_journal(...)
 * =========================================================
 */


/* =========================================================
 * 1. Expense → GL Posting Adapter
 * ========================================================= */

create or replace function
  public.post_expense_gl(
    p_expense_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare

  v_expense
    public.expenses%rowtype;


  v_expense_gl_account_id uuid;

  v_financial_gl_account_id uuid;

  v_vat_recoverable_account_id uuid;

  v_vat_pending_account_id uuid;


  /*
   * Transaction currency amounts.
   */

  v_expense_debit
    numeric(18, 2);

  v_vat_recoverable_debit
    numeric(18, 2);

  v_vat_pending_debit
    numeric(18, 2);

  v_financial_credit
    numeric(18, 2);


  /*
   * AED base-currency amounts.
   */

  v_base_expense_debit
    numeric(18, 2);

  v_base_vat_recoverable_debit
    numeric(18, 2);

  v_base_vat_pending_debit
    numeric(18, 2);

  v_base_financial_credit
    numeric(18, 2);


  v_lines jsonb;

  v_journal_id uuid;

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
      'Administrator access is required.';
  end if;


  /* =======================================================
   * Input
   * ======================================================= */

  if
    p_expense_id is null
  then
    raise exception
      'Expense ID is required.';
  end if;


  /* =======================================================
   * Lock Expense
   * ======================================================= */

  select
    *

  into
    v_expense

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


  /* =======================================================
   * Expense Must Already Be Operationally Posted
   * ======================================================= */

  if
    v_expense.status <>
      'posted'
  then
    raise exception
      'Expense % must be posted before General Ledger posting.',
      v_expense.expense_number;
  end if;


  /*
   * post_expense() creates the treasury/account-transaction
   * movement first.
   *
   * Refuse GL posting if that operational cash movement is
   * missing.
   */

  if
    v_expense.account_transaction_id
      is null
  then
    raise exception
      'Expense % does not have an account transaction.',
      v_expense.expense_number;
  end if;


  if
    v_expense.financial_account_id
      is null
  then
    raise exception
      'Expense % does not have a financial account.',
      v_expense.expense_number;
  end if;


  /* =======================================================
   * Currency Validation
   * ======================================================= */

  if
    v_expense.currency_code is null
    or
    trim(
      v_expense.currency_code
    ) = ''
  then
    raise exception
      'Expense % does not have a valid currency.',
      v_expense.expense_number;
  end if;


  if
    v_expense.exchange_rate is null
    or
    v_expense.exchange_rate <= 0
  then
    raise exception
      'Expense % does not have a valid exchange rate.',
      v_expense.expense_number;
  end if;


  /* =======================================================
   * Validate Expense Amounts
   * ======================================================= */

  if
    v_expense.net_amount is null
    or
    v_expense.net_amount <= 0
  then
    raise exception
      'Expense % has an invalid net amount.',
      v_expense.expense_number;
  end if;


  if
    v_expense.tax_amount is null
    or
    v_expense.tax_amount < 0
  then
    raise exception
      'Expense % has an invalid VAT amount.',
      v_expense.expense_number;
  end if;


  if
    v_expense.gross_amount is null
    or
    v_expense.gross_amount <= 0
  then
    raise exception
      'Expense % has an invalid gross amount.',
      v_expense.expense_number;
  end if;


  if
    abs(
      round(
        v_expense.net_amount
        +
        v_expense.tax_amount,
        2
      )
      -
      round(
        v_expense.gross_amount,
        2
      )
    ) > 0.01
  then
    raise exception
      'Expense % net amount plus VAT does not equal gross amount.',
      v_expense.expense_number;
  end if;


  /* =======================================================
   * Resolve GL Accounts
   * ======================================================= */

  v_expense_gl_account_id :=
    public.get_expense_category_gl_account(
      v_expense.category_id
    );


  v_financial_gl_account_id :=
    public.get_financial_account_gl_account(
      v_expense.financial_account_id
    );


  /* =======================================================
   * Initialize Accounting Components
   * ======================================================= */

  v_expense_debit := 0;

  v_vat_recoverable_debit := 0;

  v_vat_pending_debit := 0;

  v_financial_credit :=
    round(
      v_expense.gross_amount,
      2
    );


  /* =======================================================
   * VAT Treatment
   * ======================================================= */

  if
    v_expense.tax_treatment =
      'standard_vat'
  then

    /*
     * Net amount is expense.
     * VAT is recoverable asset.
     */

    if
      v_expense.tax_amount <= 0
    then
      raise exception
        'Standard VAT Expense % must contain VAT.',
        v_expense.expense_number;
    end if;


    if
      not v_expense.tax_invoice_verified
    then
      raise exception
        'Standard VAT Expense % must have a verified tax invoice.',
        v_expense.expense_number;
    end if;


    if
      abs(
        coalesce(
          v_expense.recoverable_tax_amount,
          0
        )
        -
        v_expense.tax_amount
      ) > 0.01
    then
      raise exception
        'Expense % recoverable VAT amount is inconsistent.',
        v_expense.expense_number;
    end if;


    if
      abs(
        coalesce(
          v_expense.pending_tax_amount,
          0
        )
      ) > 0.01
    then
      raise exception
        'Standard VAT Expense % cannot contain pending VAT.',
        v_expense.expense_number;
    end if;


    v_expense_debit :=
      round(
        v_expense.net_amount,
        2
      );


    v_vat_recoverable_debit :=
      round(
        v_expense.recoverable_tax_amount,
        2
      );


    v_vat_recoverable_account_id :=
      public.get_mapped_gl_account(
        'vat_recoverable'
      );


  elsif
    v_expense.tax_treatment =
      'vat_pending'
  then

    /*
     * Net amount is expense.
     * VAT remains pending until documentation/classification.
     */

    if
      v_expense.tax_amount <= 0
    then
      raise exception
        'VAT Pending Expense % must contain VAT.',
        v_expense.expense_number;
    end if;


    if
      abs(
        coalesce(
          v_expense.pending_tax_amount,
          0
        )
        -
        v_expense.tax_amount
      ) > 0.01
    then
      raise exception
        'Expense % pending VAT amount is inconsistent.',
        v_expense.expense_number;
    end if;


    if
      abs(
        coalesce(
          v_expense.recoverable_tax_amount,
          0
        )
      ) > 0.01
    then
      raise exception
        'VAT Pending Expense % cannot contain recoverable VAT.',
        v_expense.expense_number;
    end if;


    v_expense_debit :=
      round(
        v_expense.net_amount,
        2
      );


    v_vat_pending_debit :=
      round(
        v_expense.pending_tax_amount,
        2
      );


    v_vat_pending_account_id :=
      public.get_mapped_gl_account(
        'vat_pending'
      );


  elsif
    v_expense.tax_treatment =
      'no_vat'
  then

    /*
     * Entire gross amount equals expense because VAT = 0.
     */

    if
      abs(
        v_expense.tax_amount
      ) > 0.01
    then
      raise exception
        'No-VAT Expense % cannot contain VAT.',
        v_expense.expense_number;
    end if;


    if
      abs(
        coalesce(
          v_expense.recoverable_tax_amount,
          0
        )
      ) > 0.01
      or
      abs(
        coalesce(
          v_expense.pending_tax_amount,
          0
        )
      ) > 0.01
    then
      raise exception
        'No-VAT Expense % contains invalid VAT classification amounts.',
        v_expense.expense_number;
    end if;


    v_expense_debit :=
      round(
        v_expense.gross_amount,
        2
      );


  elsif
    v_expense.tax_treatment =
      'non_recoverable'
  then

    /*
     * Non-recoverable VAT is a real business cost.
     *
     * Therefore expense debit includes BOTH:
     *
     *   net expense
     *   +
     *   non-recoverable VAT
     */

    if
      abs(
        coalesce(
          v_expense.recoverable_tax_amount,
          0
        )
      ) > 0.01
      or
      abs(
        coalesce(
          v_expense.pending_tax_amount,
          0
        )
      ) > 0.01
    then
      raise exception
        'Non-recoverable VAT Expense % contains invalid recoverable or pending VAT.',
        v_expense.expense_number;
    end if;


    v_expense_debit :=
      round(
        v_expense.gross_amount,
        2
      );


  else

    raise exception
      'Expense % has an invalid VAT treatment.',
      v_expense.expense_number;

  end if;


  /* =======================================================
   * Validate Transaction-Currency Balance
   * ======================================================= */

  if
    abs(
      (
        v_expense_debit
        +
        v_vat_recoverable_debit
        +
        v_vat_pending_debit
      )
      -
      v_financial_credit
    ) > 0.01
  then
    raise exception
      'Expense % GL components are not balanced in transaction currency.',
      v_expense.expense_number;
  end if;


  /* =======================================================
   * Base Currency = AED
   *
   * Component debits are rounded independently.
   *
   * Financial-account credit is derived from the sum of
   * those rounded base debit components so the journal
   * remains exactly balanced in AED.
   * ======================================================= */

  v_base_expense_debit :=
    round(
      v_expense_debit
      *
      v_expense.exchange_rate,
      2
    );


  v_base_vat_recoverable_debit :=
    round(
      v_vat_recoverable_debit
      *
      v_expense.exchange_rate,
      2
    );


  v_base_vat_pending_debit :=
    round(
      v_vat_pending_debit
      *
      v_expense.exchange_rate,
      2
    );


  v_base_financial_credit :=
    round(
      v_base_expense_debit
      +
      v_base_vat_recoverable_debit
      +
      v_base_vat_pending_debit,
      2
    );


  /* =======================================================
   * Build Journal Lines
   * ======================================================= */

  v_lines :=
    '[]'::jsonb;


  /* =======================================================
   * Expense Category Debit
   * ======================================================= */

  v_lines :=
    v_lines
    ||
    jsonb_build_array(

      jsonb_build_object(
        'glAccountId',
          v_expense_gl_account_id,

        'debit',
          v_expense_debit,

        'credit',
          0,

        'baseDebit',
          v_base_expense_debit,

        'baseCredit',
          0,

        'description',
          'Expense - '
          ||
          v_expense.expense_number,

        'supplierId',
          v_expense.supplier_id,

        'customerId',
          v_expense.customer_id,

        'warehouseId',
          v_expense.warehouse_id,

        'expenseCategoryId',
          v_expense.category_id,

        'sourceLineType',
          'expense',

        'sourceLineId',
          v_expense.id,

        'sourceLineNumber',
          1
      )
    );


  /* =======================================================
   * Recoverable VAT Debit
   * ======================================================= */

  if
    v_vat_recoverable_debit > 0
  then

    v_lines :=
      v_lines
      ||
      jsonb_build_array(

        jsonb_build_object(
          'glAccountId',
            v_vat_recoverable_account_id,

          'debit',
            v_vat_recoverable_debit,

          'credit',
            0,

          'baseDebit',
            v_base_vat_recoverable_debit,

          'baseCredit',
            0,

          'description',
            'Recoverable VAT - '
            ||
            v_expense.expense_number,

          'supplierId',
            v_expense.supplier_id,

          'customerId',
            v_expense.customer_id,

          'warehouseId',
            v_expense.warehouse_id,

          'expenseCategoryId',
            v_expense.category_id,

          'sourceLineType',
            'expense_vat',

          'sourceLineId',
            v_expense.id,

          'sourceLineNumber',
            2
        )
      );

  end if;


  /* =======================================================
   * Pending VAT Debit
   * ======================================================= */

  if
    v_vat_pending_debit > 0
  then

    v_lines :=
      v_lines
      ||
      jsonb_build_array(

        jsonb_build_object(
          'glAccountId',
            v_vat_pending_account_id,

          'debit',
            v_vat_pending_debit,

          'credit',
            0,

          'baseDebit',
            v_base_vat_pending_debit,

          'baseCredit',
            0,

          'description',
            'VAT Pending - '
            ||
            v_expense.expense_number,

          'supplierId',
            v_expense.supplier_id,

          'customerId',
            v_expense.customer_id,

          'warehouseId',
            v_expense.warehouse_id,

          'expenseCategoryId',
            v_expense.category_id,

          'sourceLineType',
            'expense_vat',

          'sourceLineId',
            v_expense.id,

          'sourceLineNumber',
            2
        )
      );

  end if;


  /* =======================================================
   * Financial Account Credit
   *
   * Gross amount already left the operational financial
   * account through post_expense().
   *
   * This is only the formal GL representation.
   * ======================================================= */

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
          v_financial_credit,

        'baseDebit',
          0,

        'baseCredit',
          v_base_financial_credit,

        'description',
          'Expense payment - '
          ||
          v_expense.expense_number,

        'supplierId',
          v_expense.supplier_id,

        'customerId',
          v_expense.customer_id,

        'warehouseId',
          v_expense.warehouse_id,

        'financialAccountId',
          v_expense.financial_account_id,

        'sourceLineType',
          'expense_payment',

        'sourceLineId',
          v_expense.account_transaction_id,

        'sourceLineNumber',
          1
      )
    );


  /* =======================================================
   * Post Through Controlled GL Engine
   * ======================================================= */

  v_journal_id :=
    public.post_erp_gl_journal(
      'expense',

      v_expense.id,

      v_expense.expense_number,

      v_expense.expense_date,

      v_expense.expense_date,

      case
        when
          v_expense.payee_name is not null
          and
          btrim(
            v_expense.payee_name
          ) <> ''
        then
          'Expense - '
          ||
          v_expense.expense_number
          ||
          ' - '
          ||
          v_expense.payee_name

        else
          'Expense - '
          ||
          v_expense.expense_number
      end,

      v_expense.currency_code,

      v_expense.exchange_rate,

      v_lines
    );


  return
    v_journal_id;

end;
$$;


/* =========================================================
 * 2. Permissions
 * ========================================================= */

revoke all
on function
  public.post_expense_gl(
    uuid
  )
from public;


grant execute
on function
  public.post_expense_gl(
    uuid
  )
to authenticated;


/* =========================================================
 * 3. Documentation
 * ========================================================= */

comment on function
  public.post_expense_gl(
    uuid
  )
is
  'Posts one operationally-posted Expense to the General Ledger. Debits the mapped Expense Category, separately debits VAT Recoverable or VAT Pending when applicable, includes non-recoverable VAT in expense cost, and credits the selected Financial Account for the full gross amount. Does not create another account transaction.';