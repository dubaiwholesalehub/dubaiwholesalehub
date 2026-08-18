/*
 * =========================================================
 * 075 — Expense Posting Workflow
 *
 * Creates controlled posting / cancellation workflow
 * between:
 *
 * expenses
 * financial_accounts
 * account_transactions
 *
 * Important accounting principle:
 *
 * Cash / Bank movement = gross amount paid.
 *
 * Profitability treatment will later distinguish:
 *
 * - net expense
 * - recoverable VAT
 * - pending VAT
 * - non-recoverable VAT
 * =========================================================
 */


/* =========================================================
 * Post Expense
 * ========================================================= */

create or replace function
  public.post_expense(
    p_expense_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_expense
    public.expenses%rowtype;

  v_category
    public.expense_categories%rowtype;

  v_account_transaction_id uuid;

  v_expected_gross
    numeric(18, 2);

  v_expected_recoverable
    numeric(18, 2);

  v_expected_pending
    numeric(18, 2);

begin

  /* =======================================================
   * Authentication / Authorization
   * ======================================================= */

  v_user_id :=
    auth.uid();


  if v_user_id is null then
    raise exception
      'Authentication is required.';
  end if;


  if not public.is_admin() then
    raise exception
      'You are not authorized to post expenses.';
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


  if not found then
    raise exception
      'Expense was not found.';
  end if;


  if
    v_expense.status =
    'posted'
  then

    if
      v_expense.account_transaction_id
      is null
    then
      raise exception
        'Expense is posted but its account transaction is missing.';
    end if;

    return
      v_expense.account_transaction_id;

  end if;


  if
    v_expense.status =
    'cancelled'
  then
    raise exception
      'Cancelled expenses cannot be posted.';
  end if;


  /* =======================================================
   * Validate Category
   * ======================================================= */

  select
    *

  into
    v_category

  from
    public.expense_categories

  where
    id =
      v_expense.category_id;


  if not found then
    raise exception
      'Expense category was not found.';
  end if;


  if not v_category.is_active then
    raise exception
      'Expense category is inactive.';
  end if;


  /*
   * Expense type comes from the category.
   *
   * This prevents someone from classifying Rent as
   * "direct" in one expense and "operating" in another.
   */

  v_expense.expense_type :=
    v_category.expense_type;


  /* =======================================================
   * Validate Financial Account
   * ======================================================= */

  if
    v_expense.financial_account_id
    is null
  then
    raise exception
      'A financial account is required before posting an expense.';
  end if;


  if
    v_expense.payment_method
    is null
  then
    raise exception
      'Payment method is required before posting an expense.';
  end if;


  /* =======================================================
   * Validate Amount
   * ======================================================= */

  if
    v_expense.net_amount is null
    or
    v_expense.net_amount <= 0
  then
    raise exception
      'Expense net amount must be greater than zero.';
  end if;


  if
    v_expense.tax_amount is null
    or
    v_expense.tax_amount < 0
  then
    raise exception
      'Expense VAT amount cannot be negative.';
  end if;


  v_expected_gross :=
    round(
      v_expense.net_amount +
      v_expense.tax_amount,
      2
    );


  if
    abs(
      v_expense.gross_amount -
      v_expected_gross
    ) > 0.01
  then
    raise exception
      'Expense gross amount must equal net amount plus VAT.';
  end if;


  /* =======================================================
   * VAT Treatment
   * ======================================================= */

  v_expected_recoverable := 0;

  v_expected_pending := 0;


  if
    v_expense.tax_treatment =
    'standard_vat'
  then

    if
      v_expense.tax_amount <= 0
    then
      raise exception
        'Standard VAT expense must contain VAT.';
    end if;


    if
      not v_expense.tax_invoice_verified
    then
      raise exception
        'A verified tax invoice is required before VAT can be treated as recoverable.';
    end if;


    if
      v_expense.supplier_trn is null
      or
      btrim(
        v_expense.supplier_trn
      ) = ''
    then
      raise exception
        'Supplier TRN is required for recoverable VAT expenses.';
    end if;


    if
      v_expense.supplier_invoice_number
      is null
      or
      btrim(
        v_expense.supplier_invoice_number
      ) = ''
    then
      raise exception
        'Supplier invoice number is required for recoverable VAT expenses.';
    end if;


    v_expected_recoverable :=
      v_expense.tax_amount;

  elsif
    v_expense.tax_treatment =
    'vat_pending'
  then

    if
      v_expense.tax_amount <= 0
    then
      raise exception
        'VAT pending expense must contain VAT.';
    end if;


    v_expected_pending :=
      v_expense.tax_amount;

  elsif
    v_expense.tax_treatment =
    'no_vat'
  then

    if
      abs(
        v_expense.tax_amount
      ) > 0.01
    then
      raise exception
        'No-VAT expense cannot contain VAT.';
    end if;

  elsif
    v_expense.tax_treatment =
    'non_recoverable'
  then

    /*
     * VAT may exist, but it is not recoverable.
     *
     * Later profitability will include this VAT as part
     * of the real expense cost.
     */

    v_expected_recoverable := 0;
    v_expected_pending := 0;

  else

    raise exception
      'Invalid expense VAT treatment.';

  end if;


  /* =======================================================
   * Synchronize Calculated Fields
   * ======================================================= */

  update
    public.expenses

  set
    expense_type =
      v_category.expense_type,

    recoverable_tax_amount =
      round(
        v_expected_recoverable,
        2
      ),

    pending_tax_amount =
      round(
        v_expected_pending,
        2
      ),

    gross_amount =
      v_expected_gross,

    updated_by =
      v_user_id,

    updated_at =
      now()

  where
    id =
      p_expense_id;


  /* =======================================================
   * Post Cash / Bank Movement
   *
   * IMPORTANT:
   *
   * Gross amount leaves the financial account.
   * ======================================================= */

  v_account_transaction_id :=
    public.post_account_transaction(
      v_expense.financial_account_id,

      v_expense.expense_date,

      'out',

      'expense',

      v_expected_gross,

      v_expense.currency_code,

      v_expense.exchange_rate,

      'expense',

      v_expense.id,

      v_expense.expense_number,

      concat(
        'Expense ',
        v_expense.expense_number,
        case
          when
            v_expense.payee_name
            is not null
            and
            btrim(
              v_expense.payee_name
            ) <> ''
          then
            ' - ' ||
            v_expense.payee_name
          else
            ''
        end
      ),

      v_expense.notes
    );


  /* =======================================================
   * Mark Expense Posted
   * ======================================================= */

  update
    public.expenses

  set
    status =
      'posted',

    account_transaction_id =
      v_account_transaction_id,

    posted_at =
      now(),

    posted_by =
      v_user_id,

    updated_by =
      v_user_id,

    updated_at =
      now()

  where
    id =
      p_expense_id;


  return
    v_account_transaction_id;

end;
$$;


/* =========================================================
 * Cancel Expense
 * ========================================================= */

create or replace function
  public.cancel_expense(
    p_expense_id uuid,
    p_reason text
  )
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_expense
    public.expenses%rowtype;

begin

  v_user_id :=
    auth.uid();


  if v_user_id is null then
    raise exception
      'Authentication is required.';
  end if;


  if not public.is_admin() then
    raise exception
      'You are not authorized to cancel expenses.';
  end if;


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


  if not found then
    raise exception
      'Expense was not found.';
  end if;


  if
    v_expense.status =
    'cancelled'
  then
    return;
  end if;


  if
    v_expense.status =
    'draft'
  then

    update
      public.expenses

    set
      status =
        'cancelled',

      cancelled_at =
        now(),

      cancelled_by =
        v_user_id,

      cancellation_reason =
        nullif(
          btrim(
            coalesce(
              p_reason,
              ''
            )
          ),
          ''
        ),

      updated_by =
        v_user_id,

      updated_at =
        now()

    where
      id =
        p_expense_id;


    return;

  end if;


  /*
   * Posted expense:
   *
   * Cancel its cash / bank transaction first.
   */

  if
    v_expense.account_transaction_id
    is null
  then
    raise exception
      'Posted expense has no linked account transaction.';
  end if;


  perform
    public.cancel_account_transaction(
      v_expense.account_transaction_id,
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


  update
    public.expenses

  set
    status =
      'cancelled',

    cancelled_at =
      now(),

    cancelled_by =
      v_user_id,

    cancellation_reason =
      nullif(
        btrim(
          coalesce(
            p_reason,
            ''
          )
        ),
        ''
      ),

    updated_by =
      v_user_id,

    updated_at =
      now()

  where
    id =
      p_expense_id;

end;
$$;


/* =========================================================
 * Protect Posted Financial Fields
 *
 * Posted / cancelled expenses must not be edited directly.
 * Cancellation creates the financial reversal through the
 * linked account transaction.
 * ========================================================= */

create or replace function
  public.protect_posted_expense()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  /*
   * Workflow functions need to update status and audit
   * fields, so only block changes to accounting content
   * after the old record has already been posted/cancelled.
   */

  if
    old.status in (
      'posted',
      'cancelled'
    )
  then

    if
      new.expense_date
        is distinct from
        old.expense_date

      or
      new.category_id
        is distinct from
        old.category_id

      or
      new.expense_type
        is distinct from
        old.expense_type

      or
      new.payee_name
        is distinct from
        old.payee_name

      or
      new.supplier_id
        is distinct from
        old.supplier_id

      or
      new.financial_account_id
        is distinct from
        old.financial_account_id

      or
      new.payment_method
        is distinct from
        old.payment_method

      or
      new.payment_reference
        is distinct from
        old.payment_reference

      or
      new.currency_code
        is distinct from
        old.currency_code

      or
      new.exchange_rate
        is distinct from
        old.exchange_rate

      or
      new.tax_treatment
        is distinct from
        old.tax_treatment

      or
      new.supplier_trn
        is distinct from
        old.supplier_trn

      or
      new.supplier_invoice_number
        is distinct from
        old.supplier_invoice_number

      or
      new.supplier_invoice_date
        is distinct from
        old.supplier_invoice_date

      or
      new.tax_invoice_verified
        is distinct from
        old.tax_invoice_verified

      or
      new.net_amount
        is distinct from
        old.net_amount

      or
      new.tax_amount
        is distinct from
        old.tax_amount

      or
      new.recoverable_tax_amount
        is distinct from
        old.recoverable_tax_amount

      or
      new.pending_tax_amount
        is distinct from
        old.pending_tax_amount

      or
      new.gross_amount
        is distinct from
        old.gross_amount

      or
      new.customer_id
        is distinct from
        old.customer_id

      or
      new.sales_order_id
        is distinct from
        old.sales_order_id

      or
      new.warehouse_id
        is distinct from
        old.warehouse_id

      or
      new.sales_channel
        is distinct from
        old.sales_channel

      or
      new.market_country_id
        is distinct from
        old.market_country_id

    then

      raise exception
        'Posted or cancelled expense accounting fields cannot be modified. Cancel the expense instead.';

    end if;

  end if;


  return new;

end;
$$;


drop trigger if exists
  protect_posted_expense_trigger
on public.expenses;


create trigger
  protect_posted_expense_trigger
before update
on public.expenses
for each row
execute function
  public.protect_posted_expense();


/* =========================================================
 * Permissions
 * ========================================================= */

revoke all
on function
  public.post_expense(
    uuid
  )
from public;


grant execute
on function
  public.post_expense(
    uuid
  )
to authenticated;


revoke all
on function
  public.cancel_expense(
    uuid,
    text
  )
from public;


grant execute
on function
  public.cancel_expense(
    uuid,
    text
  )
to authenticated;


/* =========================================================
 * Documentation
 * ========================================================= */

comment on function
  public.post_expense(uuid)
is
  'Posts a draft expense and creates the linked money-out account transaction.';


comment on function
  public.cancel_expense(uuid, text)
is
  'Cancels an expense and cancels its linked account transaction, restoring the financial account balance.';