/*
 * =========================================================
 * 088 — General Ledger Posting Engine
 *
 * PURPOSE
 * -------
 *
 * Provides the controlled double-entry accounting engine
 * on top of the GL foundation created in migration 087.
 *
 *
 * THIS MIGRATION PROVIDES
 * -----------------------
 *
 * 1. Accounting-period resolution
 * 2. GL system-account resolution
 * 3. Draft journal creation
 * 4. Controlled journal-line creation
 * 5. Posting-account validation
 * 6. Currency/base-currency validation
 * 7. Double-entry balance validation
 * 8. Atomic journal posting
 * 9. Duplicate source protection
 * 10. Posted-journal immutability
 * 11. Formal journal reversal
 * 12. Manual journal creation
 * 13. ERP integration journal API
 * 14. Audit-safe SECURITY DEFINER functions
 *
 *
 * IMPORTANT
 * ---------
 *
 * This migration DOES NOT automatically connect:
 *
 *   Sales
 *   Purchases
 *   Customer Receipts
 *   Supplier Payments
 *   Expenses
 *   Inventory
 *   Treasury Transfers
 *
 * Those integrations begin in migration 089+.
 *
 *
 * POSTED JOURNALS ARE IMMUTABLE.
 *
 * Corrections must use reversal journals.
 * =========================================================
 */


/* =========================================================
 * 1. Resolve Accounting Period
 * ========================================================= */

create or replace function
  public.get_gl_accounting_period(
    p_posting_date date,
    p_require_open boolean
      default true
  )
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_period
    public.accounting_periods%rowtype;

begin

  if p_posting_date is null then
    raise exception
      'Posting date is required.';
  end if;


  select
    *
  into
    v_period
  from
    public.accounting_periods
  where
    p_posting_date
      between
        date_from
        and
        date_to
  order by
    date_from desc
  limit 1;


  if not found then
    raise exception
      'No accounting period exists for posting date %.',
      p_posting_date;
  end if;


  if
    p_require_open
    and
    v_period.status <>
      'open'
  then
    raise exception
      'Accounting period % is %. Posting is not allowed.',
      v_period.period_code,
      v_period.status;
  end if;


  return
    v_period.id;

end;
$$;


/* =========================================================
 * 2. Resolve System GL Account
 * ========================================================= */

create or replace function
  public.get_mapped_gl_account(
    p_mapping_key text
  )
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_account_id uuid;

  v_is_active boolean;

  v_is_posting boolean;

begin

  if
    p_mapping_key is null
    or
    length(
      trim(
        p_mapping_key
      )
    ) =
    0
  then
    raise exception
      'GL mapping key is required.';
  end if;


  select
    account.id,
    account.is_active,
    account.is_posting_account

  into
    v_account_id,
    v_is_active,
    v_is_posting

  from
    public.gl_account_mappings
      mapping

  inner join
    public.gl_accounts
      account

    on
      account.id =
        mapping.gl_account_id

  where
    mapping.mapping_key =
      trim(
        p_mapping_key
      )

    and
      mapping.is_active =
        true

  limit 1;


  if
    v_account_id is null
  then
    raise exception
      'No active GL account mapping exists for key "%".',
      p_mapping_key;
  end if;


  if
    not v_is_active
  then
    raise exception
      'GL account mapped to "%" is inactive.',
      p_mapping_key;
  end if;


  if
    not v_is_posting
  then
    raise exception
      'GL account mapped to "%" is not a posting account.',
      p_mapping_key;
  end if;


  return
    v_account_id;

end;
$$;


/* =========================================================
 * 3. Validate GL Posting Account
 * ========================================================= */

create or replace function
  public.validate_gl_posting_account(
    p_gl_account_id uuid,
    p_manual_posting boolean
      default false
  )
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_account
    public.gl_accounts%rowtype;

begin

  if
    p_gl_account_id is null
  then
    raise exception
      'GL account is required.';
  end if;


  select
    *
  into
    v_account
  from
    public.gl_accounts
  where
    id =
      p_gl_account_id;


  if not found then
    raise exception
      'GL account % does not exist.',
      p_gl_account_id;
  end if;


  if
    not v_account.is_active
  then
    raise exception
      'GL account % - % is inactive.',
      v_account.account_code,
      v_account.account_name;
  end if;


  if
    not v_account.is_posting_account
  then
    raise exception
      'GL account % - % is a heading/control grouping account and cannot receive journal lines.',
      v_account.account_code,
      v_account.account_name;
  end if;


  if
    p_manual_posting
    and
    not v_account.allow_manual_posting
  then
    raise exception
      'Manual posting is not allowed to GL account % - %.',
      v_account.account_code,
      v_account.account_name;
  end if;

end;
$$;


/* =========================================================
 * 4. Internal Draft Journal Creator
 *
 * IMPORTANT:
 *
 * This is an internal accounting primitive.
 *
 * User-facing / ERP functions will call this function.
 * ========================================================= */

create or replace function
  public.create_gl_draft_journal(
    p_journal_date date,
    p_posting_date date,
    p_source_type text,
    p_source_id uuid,
    p_source_number text,
    p_description text,
    p_currency_code text
      default 'AED',
    p_exchange_rate numeric
      default 1
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_period_id uuid;

  v_journal_id uuid;

  v_journal_number text;

  v_existing_id uuid;

  v_source_type text;

  v_currency_code text;

begin

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
      'Administrator access is required.';
  end if;


  if
    p_journal_date is null
  then
    raise exception
      'Journal date is required.';
  end if;


  if
    p_posting_date is null
  then
    raise exception
      'Posting date is required.';
  end if;


  v_source_type :=
    trim(
      coalesce(
        p_source_type,
        ''
      )
    );


  if
    v_source_type =
      ''
  then
    raise exception
      'Journal source type is required.';
  end if;


  if
    length(
      trim(
        coalesce(
          p_description,
          ''
        )
      )
    ) =
    0
  then
    raise exception
      'Journal description is required.';
  end if;


  v_currency_code :=
    upper(
      trim(
        coalesce(
          p_currency_code,
          ''
        )
      )
    );


  if
    v_currency_code !~
      '^[A-Z]{3}$'
  then
    raise exception
      'Currency code must contain exactly three letters.';
  end if;


  if
    p_exchange_rate is null
    or
    p_exchange_rate <=
      0
  then
    raise exception
      'Exchange rate must be greater than zero.';
  end if;


  /*
   * Resolve an OPEN accounting period.
   */

  v_period_id :=
    public.get_gl_accounting_period(
      p_posting_date,
      true
    );


  /*
   * Prevent duplicate active accounting source.
   *
   * Draft is included here intentionally so repeated ERP
   * requests cannot leave several competing drafts.
   */

  if
    p_source_id is not null
  then

    select
      id
    into
      v_existing_id
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
          'draft',
          'posted'
        )

    order by
      created_at desc

    limit 1;


    if
      v_existing_id is not null
    then
      raise exception
        'An active GL journal already exists for source % / %.',
        v_source_type,
        p_source_id;
    end if;

  end if;


  v_journal_number :=
    public.next_gl_journal_number(
      p_journal_date
    );


  insert into
    public.gl_journal_entries
    (
      journal_number,
      journal_date,
      posting_date,
      accounting_period_id,
      source_type,
      source_id,
      source_number,
      description,
      currency_code,
      exchange_rate,
      status,
      created_by,
      updated_by
    )
  values
    (
      v_journal_number,
      p_journal_date,
      p_posting_date,
      v_period_id,
      v_source_type,
      p_source_id,
      nullif(
        trim(
          coalesce(
            p_source_number,
            ''
          )
        ),
        ''
      ),
      trim(
        p_description
      ),
      v_currency_code,
      p_exchange_rate,
      'draft',
      v_user_id,
      v_user_id
    )
  returning
    id
  into
    v_journal_id;


  return
    v_journal_id;

end;
$$;


/* =========================================================
 * 5. Add Draft Journal Line
 * ========================================================= */

create or replace function
  public.add_gl_draft_journal_line(
    p_journal_entry_id uuid,
    p_gl_account_id uuid,
    p_debit numeric,
    p_credit numeric,
    p_base_debit numeric,
    p_base_credit numeric,
    p_description text
      default null,
    p_customer_id uuid
      default null,
    p_supplier_id uuid
      default null,
    p_product_id uuid
      default null,
    p_warehouse_id uuid
      default null,
    p_financial_account_id uuid
      default null,
    p_expense_category_id uuid
      default null,
    p_source_line_type text
      default null,
    p_source_line_id uuid
      default null,
    p_source_line_number integer
      default null,
    p_manual_posting boolean
      default false
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_journal
    public.gl_journal_entries%rowtype;

  v_line_number integer;

  v_line_id uuid;

  v_debit numeric(18, 2);

  v_credit numeric(18, 2);

  v_base_debit numeric(18, 2);

  v_base_credit numeric(18, 2);

begin

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
      'Administrator access is required.';
  end if;


  select
    *
  into
    v_journal
  from
    public.gl_journal_entries
  where
    id =
      p_journal_entry_id
  for update;


  if not found then
    raise exception
      'GL journal % does not exist.',
      p_journal_entry_id;
  end if;


  if
    v_journal.status <>
      'draft'
  then
    raise exception
      'Journal % is %. Only draft journals may be edited.',
      v_journal.journal_number,
      v_journal.status;
  end if;


  perform
    public.get_gl_accounting_period(
      v_journal.posting_date,
      true
    );


  perform
    public.validate_gl_posting_account(
      p_gl_account_id,
      p_manual_posting
    );


  v_debit :=
    round(
      coalesce(
        p_debit,
        0
      ),
      2
    );


  v_credit :=
    round(
      coalesce(
        p_credit,
        0
      ),
      2
    );


  v_base_debit :=
    round(
      coalesce(
        p_base_debit,
        0
      ),
      2
    );


  v_base_credit :=
    round(
      coalesce(
        p_base_credit,
        0
      ),
      2
    );


  if
    v_debit <
      0
    or
    v_credit <
      0
    or
    v_base_debit <
      0
    or
    v_base_credit <
      0
  then
    raise exception
      'GL debit and credit values cannot be negative.';
  end if;


  if not (
    (
      v_debit >
        0
      and
      v_credit =
        0
    )
    or
    (
      v_credit >
        0
      and
      v_debit =
        0
    )
  )
  then
    raise exception
      'A journal line must contain either a debit or a credit, but not both.';
  end if;


  if not (
    (
      v_base_debit >
        0
      and
      v_base_credit =
        0
    )
    or
    (
      v_base_credit >
        0
      and
      v_base_debit =
        0
    )
  )
  then
    raise exception
      'A journal line must contain either a base debit or a base credit, but not both.';
  end if;


  if
    (
      v_debit >
        0
      and
      v_base_debit =
        0
    )
    or
    (
      v_credit >
        0
      and
      v_base_credit =
        0
    )
  then
    raise exception
      'Document-currency and base-currency posting directions must match.';
  end if;


  if
    (
      v_debit >
        0
      and
      v_base_credit >
        0
    )
    or
    (
      v_credit >
        0
      and
      v_base_debit >
        0
    )
  then
    raise exception
      'Document-currency and base-currency posting directions must match.';
  end if;


  select
    coalesce(
      max(
        line_number
      ),
      0
    )
    +
    1

  into
    v_line_number

  from
    public.gl_journal_lines

  where
    journal_entry_id =
      p_journal_entry_id;


  insert into
    public.gl_journal_lines
    (
      journal_entry_id,
      line_number,
      gl_account_id,
      description,
      debit,
      credit,
      base_debit,
      base_credit,
      customer_id,
      supplier_id,
      product_id,
      warehouse_id,
      financial_account_id,
      expense_category_id,
      source_line_type,
      source_line_id,
      source_line_number
    )
  values
    (
      p_journal_entry_id,
      v_line_number,
      p_gl_account_id,
      nullif(
        trim(
          coalesce(
            p_description,
            ''
          )
        ),
        ''
      ),
      v_debit,
      v_credit,
      v_base_debit,
      v_base_credit,
      p_customer_id,
      p_supplier_id,
      p_product_id,
      p_warehouse_id,
      p_financial_account_id,
      p_expense_category_id,
      nullif(
        trim(
          coalesce(
            p_source_line_type,
            ''
          )
        ),
        ''
      ),
      p_source_line_id,
      p_source_line_number
    )
  returning
    id
  into
    v_line_id;


  return
    v_line_id;

end;
$$;


/* =========================================================
 * 6. Validate Journal
 *
 * Returns TRUE when valid.
 *
 * Raises a meaningful exception otherwise.
 * ========================================================= */

create or replace function
  public.validate_gl_journal(
    p_journal_entry_id uuid
  )
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_journal
    public.gl_journal_entries%rowtype;

  v_line_count integer;

  v_total_debit numeric(18, 2);

  v_total_credit numeric(18, 2);

  v_base_debit numeric(18, 2);

  v_base_credit numeric(18, 2);

  v_invalid_accounts integer;

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
    *
  into
    v_journal
  from
    public.gl_journal_entries
  where
    id =
      p_journal_entry_id;


  if not found then
    raise exception
      'GL journal % does not exist.',
      p_journal_entry_id;
  end if;


  perform
    public.get_gl_accounting_period(
      v_journal.posting_date,
      true
    );


  select
    count(*)::integer,

    round(
      coalesce(
        sum(
          debit
        ),
        0
      ),
      2
    ),

    round(
      coalesce(
        sum(
          credit
        ),
        0
      ),
      2
    ),

    round(
      coalesce(
        sum(
          base_debit
        ),
        0
      ),
      2
    ),

    round(
      coalesce(
        sum(
          base_credit
        ),
        0
      ),
      2
    )

  into
    v_line_count,
    v_total_debit,
    v_total_credit,
    v_base_debit,
    v_base_credit

  from
    public.gl_journal_lines

  where
    journal_entry_id =
      p_journal_entry_id;


  if
    v_line_count <
      2
  then
    raise exception
      'Journal % must contain at least two lines.',
      v_journal.journal_number;
  end if;


  if
    v_total_debit <=
      0
    or
    v_total_credit <=
      0
  then
    raise exception
      'Journal % must contain both debit and credit amounts.',
      v_journal.journal_number;
  end if;


  if
    v_total_debit <>
      v_total_credit
  then
    raise exception
      'Journal % is not balanced in document currency. Debit %, credit %.',
      v_journal.journal_number,
      v_total_debit,
      v_total_credit;
  end if;


  if
    v_base_debit <>
      v_base_credit
  then
    raise exception
      'Journal % is not balanced in base currency. Debit %, credit %.',
      v_journal.journal_number,
      v_base_debit,
      v_base_credit;
  end if;


  if
    v_base_debit <=
      0
  then
    raise exception
      'Journal % has no accounting value.',
      v_journal.journal_number;
  end if;


  select
    count(*)::integer

  into
    v_invalid_accounts

  from
    public.gl_journal_lines
      line

  inner join
    public.gl_accounts
      account

    on
      account.id =
        line.gl_account_id

  where
    line.journal_entry_id =
      p_journal_entry_id

    and
      (
        not account.is_active
        or
        not account.is_posting_account
      );


  if
    v_invalid_accounts >
      0
  then
    raise exception
      'Journal % contains inactive or non-posting GL accounts.',
      v_journal.journal_number;
  end if;


  return
    true;

end;
$$;


/* =========================================================
 * 7. Post Draft Journal
 *
 * Atomic:
 *
 * validation + status transition occur in the same database
 * transaction.
 * ========================================================= */

create or replace function
  public.post_gl_journal(
    p_journal_entry_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_journal
    public.gl_journal_entries%rowtype;

  v_period_id uuid;

begin

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
      'Administrator access is required.';
  end if;


  select
    *
  into
    v_journal
  from
    public.gl_journal_entries
  where
    id =
      p_journal_entry_id
  for update;


  if not found then
    raise exception
      'GL journal % does not exist.',
      p_journal_entry_id;
  end if;


  if
    v_journal.status =
      'posted'
  then
    return
      v_journal.id;
  end if;


  if
    v_journal.status <>
      'draft'
  then
    raise exception
      'Journal % cannot be posted because its status is %.',
      v_journal.journal_number,
      v_journal.status;
  end if;


  v_period_id :=
    public.get_gl_accounting_period(
      v_journal.posting_date,
      true
    );


  perform
    public.validate_gl_journal(
      p_journal_entry_id
    );


  /*
   * Recheck duplicate source immediately before posting.
   */

  if
    v_journal.source_id is not null
    and
    exists (
      select
        1
      from
        public.gl_journal_entries
      where
        source_type =
          v_journal.source_type

        and
          source_id =
            v_journal.source_id

        and
          status =
            'posted'

        and
          id <>
            v_journal.id
    )
  then
    raise exception
      'A posted GL journal already exists for source % / %.',
      v_journal.source_type,
      v_journal.source_id;
  end if;


  update
    public.gl_journal_entries

  set
    accounting_period_id =
      v_period_id,

    status =
      'posted',

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
      p_journal_entry_id;


  return
    p_journal_entry_id;

end;
$$;


/* =========================================================
 * 8. Journal Immutability Guard
 *
 * Prevents modification/deletion of posted or reversed
 * journal headers except when the controlled accounting
 * engine explicitly enables an internal transaction-local
 * bypass.
 * ========================================================= */

create or replace function
  public.protect_posted_gl_journal()
returns trigger
language plpgsql
set search_path = public
as $$
begin

  if
    current_setting(
      'app.gl_internal_write',
      true
    ) =
    'on'
  then

    if
      tg_op =
        'DELETE'
    then
      return
        old;
    end if;


    return
      new;

  end if;


  if
    tg_op =
      'DELETE'
  then

    if
      old.status in (
        'posted',
        'reversed'
      )
    then
      raise exception
        'Posted/reversed GL journals cannot be deleted.';
    end if;


    return
      old;

  end if;


  if
    old.status in (
      'posted',
      'reversed'
    )
  then
    raise exception
      'Posted/reversed GL journals are immutable. Use a reversal journal.';
  end if;


  return
    new;

end;
$$;


drop trigger if exists
  protect_posted_gl_journal
on
  public.gl_journal_entries;


create trigger
  protect_posted_gl_journal

before update or delete
on
  public.gl_journal_entries

for each row

execute function
  public.protect_posted_gl_journal();


/* =========================================================
 * 9. Journal Line Immutability Guard
 * ========================================================= */

create or replace function
  public.protect_posted_gl_journal_line()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_journal_id uuid;

  v_status text;

begin

  if
    current_setting(
      'app.gl_internal_write',
      true
    ) =
    'on'
  then

    if
      tg_op =
        'DELETE'
    then
      return
        old;
    end if;


    return
      new;

  end if;


  if
    tg_op =
      'DELETE'
  then
    v_journal_id :=
      old.journal_entry_id;

  else
    v_journal_id :=
      new.journal_entry_id;

  end if;


  select
    status
  into
    v_status
  from
    public.gl_journal_entries
  where
    id =
      v_journal_id;


  if
    v_status in (
      'posted',
      'reversed'
    )
  then
    raise exception
      'Lines belonging to posted/reversed GL journals are immutable.';
  end if;


  /*
   * Also prevent moving an existing line away from a posted
   * journal by changing journal_entry_id.
   */

  if
    tg_op =
      'UPDATE'

    and
      old.journal_entry_id <>
        new.journal_entry_id
  then

    select
      status
    into
      v_status
    from
      public.gl_journal_entries
    where
      id =
        old.journal_entry_id;


    if
      v_status in (
        'posted',
        'reversed'
      )
    then
      raise exception
        'Lines belonging to posted/reversed GL journals are immutable.';
    end if;

  end if;


  if
    tg_op =
      'DELETE'
  then
    return
      old;
  end if;


  return
    new;

end;
$$;


drop trigger if exists
  protect_posted_gl_journal_line
on
  public.gl_journal_lines;


create trigger
  protect_posted_gl_journal_line

before update or delete
on
  public.gl_journal_lines

for each row

execute function
  public.protect_posted_gl_journal_line();


/* =========================================================
 * 10. Reverse Posted Journal
 *
 * Creates a NEW journal containing the exact opposite
 * debit/credit entries.
 *
 * Original remains permanently available.
 * ========================================================= */

create or replace function
  public.reverse_gl_journal(
    p_journal_entry_id uuid,
    p_reversal_date date,
    p_reason text
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_original
    public.gl_journal_entries%rowtype;

  v_period_id uuid;

  v_reversal_id uuid;

  v_reversal_number text;

begin

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
      'Administrator access is required.';
  end if;


  if
    p_reversal_date is null
  then
    raise exception
      'Reversal date is required.';
  end if;


  if
    length(
      trim(
        coalesce(
          p_reason,
          ''
        )
      )
    ) <
    3
  then
    raise exception
      'A meaningful reversal reason is required.';
  end if;


  select
    *
  into
    v_original
  from
    public.gl_journal_entries
  where
    id =
      p_journal_entry_id
  for update;


  if not found then
    raise exception
      'GL journal % does not exist.',
      p_journal_entry_id;
  end if;


  if
    v_original.status =
      'reversed'
  then

    if
      v_original.reversal_entry_id is not null
    then
      return
        v_original.reversal_entry_id;
    end if;


    raise exception
      'Journal % has already been reversed.',
      v_original.journal_number;

  end if;


  if
    v_original.status <>
      'posted'
  then
    raise exception
      'Only posted journals may be reversed.';
  end if;


  if
    v_original.original_entry_id
      is not null
  then
    raise exception
      'A reversal journal cannot itself be reversed through this function.';
  end if;


  v_period_id :=
    public.get_gl_accounting_period(
      p_reversal_date,
      true
    );


  v_reversal_number :=
    public.next_gl_journal_number(
      p_reversal_date
    );


  insert into
    public.gl_journal_entries
    (
      journal_number,
      journal_date,
      posting_date,
      accounting_period_id,
      source_type,
      source_id,
      source_number,
      description,
      currency_code,
      exchange_rate,
      status,
      original_entry_id,
      reversal_reason,
      created_by,
      updated_by
    )
  values
    (
      v_reversal_number,
      p_reversal_date,
      p_reversal_date,
      v_period_id,
      'journal_reversal',
      v_original.id,
      v_original.journal_number,
      'Reversal of '
        ||
      v_original.journal_number
        ||
      ': '
        ||
      trim(
        p_reason
      ),
      v_original.currency_code,
      v_original.exchange_rate,
      'draft',
      v_original.id,
      trim(
        p_reason
      ),
      v_user_id,
      v_user_id
    )
  returning
    id
  into
    v_reversal_id;


  /*
   * Reverse every line.
   *
   * Debit becomes credit.
   * Credit becomes debit.
   */

  insert into
    public.gl_journal_lines
    (
      journal_entry_id,
      line_number,
      gl_account_id,
      description,
      debit,
      credit,
      base_debit,
      base_credit,
      customer_id,
      supplier_id,
      product_id,
      warehouse_id,
      financial_account_id,
      expense_category_id,
      source_line_type,
      source_line_id,
      source_line_number
    )

  select
    v_reversal_id,

    line.line_number,

    line.gl_account_id,

    case
      when
        line.description is null
      then
        'Reversal'

      else
        'Reversal: '
        ||
        line.description
    end,

    line.credit,

    line.debit,

    line.base_credit,

    line.base_debit,

    line.customer_id,

    line.supplier_id,

    line.product_id,

    line.warehouse_id,

    line.financial_account_id,

    line.expense_category_id,

    line.source_line_type,

    line.source_line_id,

    line.source_line_number

  from
    public.gl_journal_lines
      line

  where
    line.journal_entry_id =
      v_original.id

  order by
    line.line_number;


  perform
    public.validate_gl_journal(
      v_reversal_id
    );


  /*
   * Controlled internal write.
   *
   * Required because once reversal is posted we must mark
   * the original journal as reversed while retaining the
   * normal immutability trigger for every other write path.
   */

  perform
    set_config(
      'app.gl_internal_write',
      'on',
      true
    );


  update
    public.gl_journal_entries

  set
    status =
      'posted',

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
      v_reversal_id;


  update
    public.gl_journal_entries

  set
    status =
      'reversed',

    reversal_entry_id =
      v_reversal_id,

    reversal_reason =
      trim(
        p_reason
      ),

    reversed_at =
      now(),

    reversed_by =
      v_user_id,

    updated_by =
      v_user_id,

    updated_at =
      now()

  where
    id =
      v_original.id;


  perform
    set_config(
      'app.gl_internal_write',
      'off',
      true
    );


  return
    v_reversal_id;

end;
$$;


/* =========================================================
 * 11. Manual Journal API
 *
 * p_lines JSONB example:
 *
 * [
 *   {
 *     "glAccountId": "...",
 *     "debit": 100,
 *     "credit": 0,
 *     "baseDebit": 100,
 *     "baseCredit": 0,
 *     "description": "Adjustment"
 *   },
 *   {
 *     "glAccountId": "...",
 *     "debit": 0,
 *     "credit": 100,
 *     "baseDebit": 0,
 *     "baseCredit": 100,
 *     "description": "Adjustment"
 *   }
 * ]
 *
 * Manual journals are posted immediately and atomically.
 * ========================================================= */

create or replace function
  public.create_manual_gl_journal(
    p_journal_date date,
    p_posting_date date,
    p_description text,
    p_lines jsonb,
    p_currency_code text
      default 'AED',
    p_exchange_rate numeric
      default 1,
    p_reference text
      default null
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_journal_id uuid;

  v_line jsonb;

  v_gl_account_id uuid;

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


  if
    p_lines is null
    or
    jsonb_typeof(
      p_lines
    ) <>
    'array'
  then
    raise exception
      'Manual journal lines must be supplied as a JSON array.';
  end if;


  if
    jsonb_array_length(
      p_lines
    ) <
    2
  then
    raise exception
      'A manual journal requires at least two lines.';
  end if;


  v_journal_id :=
    public.create_gl_draft_journal(
      p_journal_date,
      p_posting_date,
      'manual_journal',
      null,
      p_reference,
      p_description,
      p_currency_code,
      p_exchange_rate
    );


  for
    v_line
  in

    select
      value
    from
      jsonb_array_elements(
        p_lines
      )

  loop

    begin

      v_gl_account_id :=
        (
          v_line
            ->>
          'glAccountId'
        )::uuid;

    exception
      when others then
        raise exception
          'Every manual journal line requires a valid glAccountId UUID.';
    end;


    perform
      public.add_gl_draft_journal_line(
        v_journal_id,
        v_gl_account_id,

        coalesce(
          (
            v_line
              ->>
            'debit'
          )::numeric,
          0
        ),

        coalesce(
          (
            v_line
              ->>
            'credit'
          )::numeric,
          0
        ),

        coalesce(
          (
            v_line
              ->>
            'baseDebit'
          )::numeric,
          0
        ),

        coalesce(
          (
            v_line
              ->>
            'baseCredit'
          )::numeric,
          0
        ),

        v_line
          ->>
        'description',

        nullif(
          v_line
            ->>
          'customerId',
          ''
        )::uuid,

        nullif(
          v_line
            ->>
          'supplierId',
          ''
        )::uuid,

        nullif(
          v_line
            ->>
          'productId',
          ''
        )::uuid,

        nullif(
          v_line
            ->>
          'warehouseId',
          ''
        )::uuid,

        nullif(
          v_line
            ->>
          'financialAccountId',
          ''
        )::uuid,

        nullif(
          v_line
            ->>
          'expenseCategoryId',
          ''
        )::uuid,

        'manual_journal_line',

        null,

        null,

        true
      );

  end loop;


  perform
    public.post_gl_journal(
      v_journal_id
    );


  return
    v_journal_id;

end;
$$;


/* =========================================================
 * 12. ERP Journal Posting API
 *
 * This is the generic controlled interface that migrations
 * 089+ may call.
 *
 *
 * p_lines JSON format:
 *
 * [
 *   {
 *     "glAccountId": "...",
 *     "debit": 100,
 *     "credit": 0,
 *     "baseDebit": 100,
 *     "baseCredit": 0,
 *     "description": "...",
 *     "customerId": "...",
 *     "supplierId": "...",
 *     "productId": "...",
 *     "warehouseId": "...",
 *     "financialAccountId": "...",
 *     "expenseCategoryId": "...",
 *     "sourceLineType": "...",
 *     "sourceLineId": "...",
 *     "sourceLineNumber": 1
 *   }
 * ]
 *
 *
 * The function is idempotent for source_type/source_id.
 *
 * If a POSTED journal already exists for the same source,
 * that journal ID is returned.
 * ========================================================= */

create or replace function
  public.post_erp_gl_journal(
    p_source_type text,
    p_source_id uuid,
    p_source_number text,
    p_journal_date date,
    p_posting_date date,
    p_description text,
    p_currency_code text,
    p_exchange_rate numeric,
    p_lines jsonb
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_id uuid;

  v_journal_id uuid;

  v_line jsonb;

  v_gl_account_id uuid;

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


  if
    p_source_id is null
  then
    raise exception
      'ERP GL posting requires a source ID.';
  end if;


  if
    length(
      trim(
        coalesce(
          p_source_type,
          ''
        )
      )
    ) =
    0
  then
    raise exception
      'ERP GL posting requires a source type.';
  end if;


  /*
   * Idempotency.
   */

  select
    id
  into
    v_existing_id
  from
    public.gl_journal_entries
  where
    source_type =
      trim(
        p_source_type
      )

    and
      source_id =
        p_source_id

    and
      status =
        'posted'

  order by
    created_at desc

  limit 1;


  if
    v_existing_id is not null
  then
    return
      v_existing_id;
  end if;


  if
    p_lines is null
    or
    jsonb_typeof(
      p_lines
    ) <>
    'array'
  then
    raise exception
      'ERP journal lines must be supplied as a JSON array.';
  end if;


  if
    jsonb_array_length(
      p_lines
    ) <
    2
  then
    raise exception
      'ERP journal requires at least two lines.';
  end if;


  v_journal_id :=
    public.create_gl_draft_journal(
      p_journal_date,
      p_posting_date,
      trim(
        p_source_type
      ),
      p_source_id,
      p_source_number,
      p_description,
      p_currency_code,
      p_exchange_rate
    );


  for
    v_line
  in

    select
      value
    from
      jsonb_array_elements(
        p_lines
      )

  loop

    begin

      v_gl_account_id :=
        (
          v_line
            ->>
          'glAccountId'
        )::uuid;

    exception
      when others then
        raise exception
          'Every ERP journal line requires a valid glAccountId UUID.';
    end;


    perform
      public.add_gl_draft_journal_line(
        v_journal_id,
        v_gl_account_id,

        coalesce(
          (
            v_line
              ->>
            'debit'
          )::numeric,
          0
        ),

        coalesce(
          (
            v_line
              ->>
            'credit'
          )::numeric,
          0
        ),

        coalesce(
          (
            v_line
              ->>
            'baseDebit'
          )::numeric,
          0
        ),

        coalesce(
          (
            v_line
              ->>
            'baseCredit'
          )::numeric,
          0
        ),

        v_line
          ->>
        'description',

        nullif(
          v_line
            ->>
          'customerId',
          ''
        )::uuid,

        nullif(
          v_line
            ->>
          'supplierId',
          ''
        )::uuid,

        nullif(
          v_line
            ->>
          'productId',
          ''
        )::uuid,

        nullif(
          v_line
            ->>
          'warehouseId',
          ''
        )::uuid,

        nullif(
          v_line
            ->>
          'financialAccountId',
          ''
        )::uuid,

        nullif(
          v_line
            ->>
          'expenseCategoryId',
          ''
        )::uuid,

        nullif(
          v_line
            ->>
          'sourceLineType',
          ''
        ),

        nullif(
          v_line
            ->>
          'sourceLineId',
          ''
        )::uuid,

        nullif(
          v_line
            ->>
          'sourceLineNumber',
          ''
        )::integer,

        false
      );

  end loop;


  perform
    public.post_gl_journal(
      v_journal_id
    );


  return
    v_journal_id;

end;
$$;


/* =========================================================
 * 13. Prevent Direct INSERT of Journal Headers/Lines
 *
 * authenticated does not receive these privileges.
 *
 * SECURITY DEFINER functions execute through their owner.
 * ========================================================= */

revoke insert,
       update,
       delete
on
  public.gl_journal_entries
from authenticated;


revoke insert,
       update,
       delete
on
  public.gl_journal_lines
from authenticated;


/* =========================================================
 * 14. Function Permissions
 *
 * Internal primitives are NOT exposed directly.
 *
 * Application-facing controlled functions:
 *
 *   create_manual_gl_journal
 *   post_erp_gl_journal
 *   reverse_gl_journal
 *
 * Validation/read helpers may also be executed by admins.
 * ========================================================= */


/* ---------------------------------------------------------
 * Remove PUBLIC access
 * --------------------------------------------------------- */

revoke all
on function
  public.get_gl_accounting_period(
    date,
    boolean
  )
from public;


revoke all
on function
  public.get_mapped_gl_account(
    text
  )
from public;


revoke all
on function
  public.validate_gl_posting_account(
    uuid,
    boolean
  )
from public;


revoke all
on function
  public.create_gl_draft_journal(
    date,
    date,
    text,
    uuid,
    text,
    text,
    text,
    numeric
  )
from public;


revoke all
on function
  public.add_gl_draft_journal_line(
    uuid,
    uuid,
    numeric,
    numeric,
    numeric,
    numeric,
    text,
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    uuid,
    integer,
    boolean
  )
from public;


revoke all
on function
  public.validate_gl_journal(
    uuid
  )
from public;


revoke all
on function
  public.post_gl_journal(
    uuid
  )
from public;


revoke all
on function
  public.reverse_gl_journal(
    uuid,
    date,
    text
  )
from public;


revoke all
on function
  public.create_manual_gl_journal(
    date,
    date,
    text,
    jsonb,
    text,
    numeric,
    text
  )
from public;


revoke all
on function
  public.post_erp_gl_journal(
    text,
    uuid,
    text,
    date,
    date,
    text,
    text,
    numeric,
    jsonb
  )
from public;


/* ---------------------------------------------------------
 * Authenticated access
 *
 * Every function independently checks public.is_admin().
 * --------------------------------------------------------- */

grant execute
on function
  public.get_gl_accounting_period(
    date,
    boolean
  )
to authenticated;


grant execute
on function
  public.get_mapped_gl_account(
    text
  )
to authenticated;


grant execute
on function
  public.validate_gl_journal(
    uuid
  )
to authenticated;


grant execute
on function
  public.reverse_gl_journal(
    uuid,
    date,
    text
  )
to authenticated;


grant execute
on function
  public.create_manual_gl_journal(
    date,
    date,
    text,
    jsonb,
    text,
    numeric,
    text
  )
to authenticated;


grant execute
on function
  public.post_erp_gl_journal(
    text,
    uuid,
    text,
    date,
    date,
    text,
    text,
    numeric,
    jsonb
  )
to authenticated;


/*
 * Intentionally no authenticated EXECUTE grant for:
 *
 * create_gl_draft_journal
 * add_gl_draft_journal_line
 * post_gl_journal
 * validate_gl_posting_account
 *
 * They remain internal primitives used by SECURITY DEFINER
 * accounting functions.
 */


/* =========================================================
 * 15. Documentation
 * ========================================================= */

comment on function
  public.get_gl_accounting_period(
    date,
    boolean
  )
is
  'Resolves the accounting period containing a posting date and optionally requires that period to be open.';


comment on function
  public.get_mapped_gl_account(
    text
  )
is
  'Resolves an active system GL account mapping and verifies that the mapped account is a valid posting account.';


comment on function
  public.validate_gl_posting_account(
    uuid,
    boolean
  )
is
  'Validates that a GL account exists, is active, is a posting account and, when requested, permits manual posting.';


comment on function
  public.create_gl_draft_journal(
    date,
    date,
    text,
    uuid,
    text,
    text,
    text,
    numeric
  )
is
  'Internal accounting primitive that creates a draft GL journal in an open accounting period.';


comment on function
  public.add_gl_draft_journal_line(
    uuid,
    uuid,
    numeric,
    numeric,
    numeric,
    numeric,
    text,
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    text,
    uuid,
    integer,
    boolean
  )
is
  'Internal accounting primitive that adds a validated debit or credit line to a draft GL journal.';


comment on function
  public.validate_gl_journal(
    uuid
  )
is
  'Validates accounting period, journal line count, posting accounts, document-currency balance and AED base-currency balance.';


comment on function
  public.post_gl_journal(
    uuid
  )
is
  'Internal accounting primitive that validates and atomically posts a draft journal.';


comment on function
  public.reverse_gl_journal(
    uuid,
    date,
    text
  )
is
  'Creates and posts an exact opposite journal and permanently marks the original posted journal as reversed.';


comment on function
  public.create_manual_gl_journal(
    date,
    date,
    text,
    jsonb,
    text,
    numeric,
    text
  )
is
  'Admin-only controlled API for creating and immediately posting balanced manual journals.';


comment on function
  public.post_erp_gl_journal(
    text,
    uuid,
    text,
    date,
    date,
    text,
    text,
    numeric,
    jsonb
  )
is
  'Idempotent controlled accounting API for future ERP transaction integrations.';