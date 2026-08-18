/*
 * =========================================================
 * 076 — Integrate Customer Receipts and Supplier Payments
 *       with Financial Accounts
 *
 * Purpose:
 *
 * Customer Receipt
 *   -> Account Transaction IN
 *
 * Supplier Payment
 *   -> Account Transaction OUT
 *
 * Existing receipt/payment allocation RPCs remain intact.
 *
 * New wrapper RPCs provide the financial account layer so
 * we do not break existing accounting / allocation logic.
 * =========================================================
 */


/* =========================================================
 * 1. Financial Account Links
 * ========================================================= */

alter table
  public.customer_receipts
add column if not exists
  financial_account_id uuid
  references public.financial_accounts(id)
  on delete restrict;


alter table
  public.customer_receipts
add column if not exists
  account_transaction_id uuid
  references public.account_transactions(id)
  on delete restrict;


alter table
  public.supplier_payments
add column if not exists
  financial_account_id uuid
  references public.financial_accounts(id)
  on delete restrict;


alter table
  public.supplier_payments
add column if not exists
  account_transaction_id uuid
  references public.account_transactions(id)
  on delete restrict;


/* =========================================================
 * 2. Indexes
 * ========================================================= */

create index if not exists
  customer_receipts_financial_account_idx
on public.customer_receipts (
  financial_account_id
)
where
  financial_account_id is not null;


create unique index if not exists
  customer_receipts_account_transaction_unique
on public.customer_receipts (
  account_transaction_id
)
where
  account_transaction_id is not null;


create index if not exists
  supplier_payments_financial_account_idx
on public.supplier_payments (
  financial_account_id
)
where
  financial_account_id is not null;


create unique index if not exists
  supplier_payments_account_transaction_unique
on public.supplier_payments (
  account_transaction_id
)
where
  account_transaction_id is not null;


/* =========================================================
 * 3. Validate Payment Method Against Financial Account
 *
 * cash
 *   -> cash account
 *
 * bank / cheque
 *   -> bank account
 *
 * card
 *   -> card / gateway / clearing
 *
 * other
 *   -> any active account
 * ========================================================= */

create or replace function
  public.validate_payment_financial_account(
    p_financial_account_id uuid,
    p_payment_method text,
    p_currency_code text
  )
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_type text;

  v_account_currency text;

  v_is_active boolean;

begin

  if
    p_financial_account_id
    is null
  then
    raise exception
      'A financial account is required.';
  end if;


  select
    account_type,
    currency_code,
    is_active

  into
    v_account_type,
    v_account_currency,
    v_is_active

  from
    public.financial_accounts

  where
    id =
      p_financial_account_id;


  if not found then
    raise exception
      'Financial account was not found.';
  end if;


  if not v_is_active then
    raise exception
      'Financial account is inactive.';
  end if;


  if
    upper(
      v_account_currency
    )
    <>
    upper(
      p_currency_code
    )
  then
    raise exception
      'Financial account currency must match payment currency.';
  end if;


  if
    p_payment_method =
    'cash'

    and
    v_account_type <>
    'cash'
  then
    raise exception
      'Cash payments must use a cash financial account.';
  end if;


  if
    p_payment_method in (
      'bank',
      'cheque'
    )

    and
    v_account_type <>
    'bank'
  then
    raise exception
      'Bank and cheque payments must use a bank financial account.';
  end if;


  if
    p_payment_method =
    'card'

    and
    v_account_type not in (
      'card',
      'payment_gateway',
      'clearing'
    )
  then
    raise exception
      'Card payments must use a card, payment gateway or clearing account.';
  end if;

end;
$$;


/* =========================================================
 * 4. Post Customer Receipt With Financial Account
 *
 * Existing post_customer_receipt() remains untouched.
 *
 * The entire receipt amount is Money In.
 *
 * Example:
 *
 * Receipt AED 100
 * Allocated AED 75
 * Customer Advance AED 25
 *
 * Cash / Bank increase = AED 100
 * ========================================================= */

create or replace function
  public.post_customer_receipt_with_account(
    p_customer_id uuid,
    p_receipt_date date,
    p_payment_method text,
    p_currency_code text,
    p_exchange_rate numeric,
    p_amount numeric,
    p_reference_number text,
    p_bank_name text,
    p_cheque_number text,
    p_cheque_date date,
    p_notes text,
    p_allocations jsonb,
    p_financial_account_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receipt_id uuid;

  v_receipt_number text;

  v_account_transaction_id uuid;

begin

  /*
   * Validate selected treasury account first.
   */

  perform
    public.validate_payment_financial_account(
      p_financial_account_id,
      p_payment_method,
      p_currency_code
    );


  /*
   * Run existing tested customer receipt engine.
   *
   * If anything below fails, PostgreSQL rolls the entire
   * wrapper transaction back, including the receipt.
   */

  v_receipt_id :=
    public.post_customer_receipt(
      p_customer_id,
      p_receipt_date,
      p_payment_method,
      p_currency_code,
      p_exchange_rate,
      p_amount,
      p_reference_number,
      p_bank_name,
      p_cheque_number,
      p_cheque_date,
      p_notes,
      p_allocations
    );


  select
    receipt_number

  into
    v_receipt_number

  from
    public.customer_receipts

  where
    id =
      v_receipt_id;


  /*
   * Full receipt amount enters Cash / Bank.
   *
   * Allocation versus customer advance does not change
   * the actual amount of money received.
   */

  v_account_transaction_id :=
    public.post_account_transaction(
      p_financial_account_id,

      p_receipt_date,

      'in',

      'customer_receipt',

      p_amount,

      p_currency_code,

      p_exchange_rate,

      'customer_receipt',

      v_receipt_id,

      v_receipt_number,

      concat(
        'Customer Receipt ',
        v_receipt_number
      ),

      p_notes
    );


  update
    public.customer_receipts

  set
    financial_account_id =
      p_financial_account_id,

    account_transaction_id =
      v_account_transaction_id

  where
    id =
      v_receipt_id;


  return
    v_receipt_id;

end;
$$;


/* =========================================================
 * 5. Cancel Customer Receipt With Financial Reversal
 * ========================================================= */

create or replace function
  public.cancel_customer_receipt_with_account(
    p_receipt_id uuid,
    p_reason text
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_transaction_id uuid;

  v_result uuid;

begin

  /*
   * Lock receipt so financial reversal and receivable
   * reversal cannot race each other.
   */

  select
    account_transaction_id

  into
    v_account_transaction_id

  from
    public.customer_receipts

  where
    id =
      p_receipt_id

  for update;


  if not found then
    raise exception
      'Customer receipt was not found.';
  end if;


  /*
   * Existing function reverses Sales Order allocations.
   */

  v_result :=
    public.cancel_customer_receipt(
      p_receipt_id,
      p_reason
    );


  /*
   * Cancel Cash / Bank movement.
   */

  if
    v_account_transaction_id
    is not null
  then

    perform
      public.cancel_account_transaction(
        v_account_transaction_id,
        coalesce(
          nullif(
            trim(
              p_reason
            ),
            ''
          ),
          'Customer receipt cancelled.'
        )
      );

  end if;


  return
    v_result;

end;
$$;


/* =========================================================
 * 6. Post Supplier Payment With Financial Account
 *
 * The FULL supplier payment amount is Money Out.
 *
 * Example:
 *
 * Payment AED 100
 * Allocated AED 75
 * Supplier Advance AED 25
 *
 * Cash / Bank decrease = AED 100
 * ========================================================= */

create or replace function
  public.post_supplier_payment_with_account(
    p_supplier_id uuid,
    p_payment_date date,
    p_payment_method text,
    p_currency_code text,
    p_exchange_rate numeric,
    p_amount numeric,
    p_reference_number text,
    p_bank_name text,
    p_cheque_number text,
    p_cheque_date date,
    p_notes text,
    p_allocations jsonb,
    p_financial_account_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment_id uuid;

  v_payment_number text;

  v_account_transaction_id uuid;

begin

  perform
    public.validate_payment_financial_account(
      p_financial_account_id,
      p_payment_method,
      p_currency_code
    );


  /*
   * Existing tested Supplier Payment workflow.
   */

  v_payment_id :=
    public.post_supplier_payment(
      p_supplier_id,
      p_payment_date,
      p_payment_method,
      p_currency_code,
      p_exchange_rate,
      p_amount,
      p_reference_number,
      p_bank_name,
      p_cheque_number,
      p_cheque_date,
      p_notes,
      p_allocations
    );


  select
    payment_number

  into
    v_payment_number

  from
    public.supplier_payments

  where
    id =
      v_payment_id;


  /*
   * Full supplier payment leaves Cash / Bank.
   */

  v_account_transaction_id :=
    public.post_account_transaction(
      p_financial_account_id,

      p_payment_date,

      'out',

      'supplier_payment',

      p_amount,

      p_currency_code,

      p_exchange_rate,

      'supplier_payment',

      v_payment_id,

      v_payment_number,

      concat(
        'Supplier Payment ',
        v_payment_number
      ),

      p_notes
    );


  update
    public.supplier_payments

  set
    financial_account_id =
      p_financial_account_id,

    account_transaction_id =
      v_account_transaction_id

  where
    id =
      v_payment_id;


  return
    v_payment_id;

end;
$$;


/* =========================================================
 * 7. Cancel Supplier Payment With Financial Reversal
 * ========================================================= */

create or replace function
  public.cancel_supplier_payment_with_account(
    p_supplier_payment_id uuid,
    p_reason text
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_transaction_id uuid;

  v_result uuid;

begin

  select
    account_transaction_id

  into
    v_account_transaction_id

  from
    public.supplier_payments

  where
    id =
      p_supplier_payment_id

  for update;


  if not found then
    raise exception
      'Supplier payment was not found.';
  end if;


  /*
   * Existing function reverses payable allocations.
   */

  v_result :=
    public.cancel_supplier_payment(
      p_supplier_payment_id,
      p_reason
    );


  /*
   * Restore Cash / Bank position.
   */

  if
    v_account_transaction_id
    is not null
  then

    perform
      public.cancel_account_transaction(
        v_account_transaction_id,
        coalesce(
          nullif(
            trim(
              p_reason
            ),
            ''
          ),
          'Supplier payment cancelled.'
        )
      );

  end if;


  return
    v_result;

end;
$$;


/* =========================================================
 * 8. Permissions
 * ========================================================= */

revoke all
on function
  public.validate_payment_financial_account(
    uuid,
    text,
    text
  )
from public;


revoke all
on function
  public.post_customer_receipt_with_account(
    uuid,
    date,
    text,
    text,
    numeric,
    numeric,
    text,
    text,
    text,
    date,
    text,
    jsonb,
    uuid
  )
from public;


grant execute
on function
  public.post_customer_receipt_with_account(
    uuid,
    date,
    text,
    text,
    numeric,
    numeric,
    text,
    text,
    text,
    date,
    text,
    jsonb,
    uuid
  )
to authenticated;


revoke all
on function
  public.cancel_customer_receipt_with_account(
    uuid,
    text
  )
from public;


grant execute
on function
  public.cancel_customer_receipt_with_account(
    uuid,
    text
  )
to authenticated;


revoke all
on function
  public.post_supplier_payment_with_account(
    uuid,
    date,
    text,
    text,
    numeric,
    numeric,
    text,
    text,
    text,
    date,
    text,
    jsonb,
    uuid
  )
from public;


grant execute
on function
  public.post_supplier_payment_with_account(
    uuid,
    date,
    text,
    text,
    numeric,
    numeric,
    text,
    text,
    text,
    date,
    text,
    jsonb,
    uuid
  )
to authenticated;


revoke all
on function
  public.cancel_supplier_payment_with_account(
    uuid,
    text
  )
from public;


grant execute
on function
  public.cancel_supplier_payment_with_account(
    uuid,
    text
  )
to authenticated;


/* =========================================================
 * 9. Documentation
 * ========================================================= */

comment on function
  public.post_customer_receipt_with_account(
    uuid,
    date,
    text,
    text,
    numeric,
    numeric,
    text,
    text,
    text,
    date,
    text,
    jsonb,
    uuid
  )
is
  'Posts a Customer Receipt using the existing receivable allocation engine and records the full receipt as Money In to the selected financial account.';


comment on function
  public.cancel_customer_receipt_with_account(
    uuid,
    text
  )
is
  'Cancels a Customer Receipt and its linked Cash/Bank account transaction.';


comment on function
  public.post_supplier_payment_with_account(
    uuid,
    date,
    text,
    text,
    numeric,
    numeric,
    text,
    text,
    text,
    date,
    text,
    jsonb,
    uuid
  )
is
  'Posts a Supplier Payment using the existing payable allocation engine and records the full payment as Money Out from the selected financial account.';


comment on function
  public.cancel_supplier_payment_with_account(
    uuid,
    text
  )
is
  'Cancels a Supplier Payment and its linked Cash/Bank account transaction.';