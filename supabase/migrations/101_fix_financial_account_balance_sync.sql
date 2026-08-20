/*
 * =========================================================
 * 101 — Fix Financial Account Balance Synchronization
 *
 * PURPOSE
 * -------
 *
 * The live version of sync_financial_account_balance()
 * incorrectly includes opening_balance account transactions
 * in the transaction total.
 *
 * Opening balance already exists in:
 *
 *   financial_accounts.opening_balance
 *
 * The opening_balance account transaction exists only for
 * audit/history and must NOT be counted again.
 *
 * This migration:
 *
 * 1. Corrects sync_financial_account_balance()
 * 2. Recalculates all financial account balances
 * =========================================================
 */


create or replace function
  public.sync_financial_account_balance(
    p_account_id uuid
  )
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare

  v_opening_balance
    numeric(18, 2);

  v_transaction_balance
    numeric(18, 2);

  v_final_balance
    numeric(18, 2);

begin

  select
    opening_balance

  into
    v_opening_balance

  from
    public.financial_accounts

  where
    id =
      p_account_id

  for update;


  if not found then
    raise exception
      'Financial account was not found.';
  end if;


  select
    coalesce(
      sum(
        case

          when direction = 'in'
          then
            base_amount

          when direction = 'out'
          then
            -base_amount

          else
            0

        end
      ),
      0
    )

  into
    v_transaction_balance

  from
    public.account_transactions

  where
    account_id =
      p_account_id

    and
    status =
      'posted'

    /*
     * IMPORTANT:
     *
     * Opening balance is already stored in
     * financial_accounts.opening_balance.
     *
     * The opening_balance transaction is an audit record
     * only and must not affect the calculated balance again.
     */
    and
    transaction_type <>
      'opening_balance';


  v_final_balance :=
    round(
      coalesce(
        v_opening_balance,
        0
      )
      +
      v_transaction_balance,
      2
    );


  update
    public.financial_accounts

  set
    current_balance =
      v_final_balance,

    updated_at =
      now()

  where
    id =
      p_account_id;


  return
    v_final_balance;

end;
$$;


/* =========================================================
 * Recalculate Existing Financial Accounts
 * ========================================================= */

do $$
declare

  v_account record;

begin

  for v_account in

    select
      id

    from
      public.financial_accounts

    order by
      id

  loop

    perform
      public.sync_financial_account_balance(
        v_account.id
      );

  end loop;

end;
$$;


/* =========================================================
 * Documentation
 * ========================================================= */

comment on function
  public.sync_financial_account_balance(
    uuid
  )
is
  'Recalculates a financial account as opening_balance plus posted non-opening account transactions. opening_balance audit transactions are deliberately excluded because the master opening balance already contains that amount.';