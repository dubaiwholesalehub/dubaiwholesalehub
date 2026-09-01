/* =========================================================
 * 170_harden_manual_journal_aed_boundary.sql
 *
 * Purpose:
 *   Harden the Manual Journal RPC at the database boundary.
 *
 * Rules:
 *   - Manual journals are AED-only.
 *   - Exchange rate must be exactly 1.
 *   - Base debit/credit are derived by the database from the
 *     AED debit/credit values.
 *   - Caller-supplied baseDebit/baseCredit are not trusted.
 *
 * Existing GL validation remains authoritative for:
 *   - authentication / administrator access
 *   - posting-account validation
 *   - manual-posting permission
 *   - debit / credit direction
 *   - balancing
 *   - accounting-period control
 *   - atomic posting
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

  v_debit numeric;

  v_credit numeric;

begin

  /* -------------------------------------------------------
   * Authentication / authorization
   * ------------------------------------------------------- */

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


  /* -------------------------------------------------------
   * Manual journals are AED-only.
   *
   * Keep the existing function signature for application
   * compatibility, but reject any attempt to use another
   * currency or exchange rate.
   * ------------------------------------------------------- */

  if
    upper(
      trim(
        coalesce(
          p_currency_code,
          ''
        )
      )
    ) <>
    'AED'
  then
    raise exception
      'Manual journals may only be posted in AED.';
  end if;


  if
    p_exchange_rate is null
    or
    p_exchange_rate <>
    1
  then
    raise exception
      'Manual journal exchange rate must be 1 for AED.';
  end if;


  /* -------------------------------------------------------
   * Validate supplied line container.
   * ------------------------------------------------------- */

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


  /* -------------------------------------------------------
   * Create controlled AED draft journal.
   *
   * Currency and exchange rate are deliberately fixed here
   * rather than forwarding caller values.
   * ------------------------------------------------------- */

  v_journal_id :=
    public.create_gl_draft_journal(
      p_journal_date,
      p_posting_date,
      'manual_journal',
      null,
      p_reference,
      p_description,
      'AED',
      1
    );


  /* -------------------------------------------------------
   * Add journal lines.
   *
   * IMPORTANT:
   * baseDebit/baseCredit supplied inside p_lines are ignored.
   *
   * For AED manual journals:
   *
   *   base_debit  = debit
   *   base_credit = credit
   *
   * The normal GL line function performs the remaining
   * amount, direction, account and manual-posting checks.
   * ------------------------------------------------------- */

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


    begin

      v_debit :=
        coalesce(
          (
            v_line
              ->>
            'debit'
          )::numeric,
          0
        );


      v_credit :=
        coalesce(
          (
            v_line
              ->>
            'credit'
          )::numeric,
          0
        );

    exception
      when invalid_text_representation then
        raise exception
          'Manual journal debit and credit values must be valid numbers.';
    end;


    perform
      public.add_gl_draft_journal_line(
        v_journal_id,
        v_gl_account_id,

        v_debit,

        v_credit,

        /* AED base amounts are derived, never trusted. */
        v_debit,

        v_credit,

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


  /* -------------------------------------------------------
   * Existing posting engine performs final journal
   * validation and posts atomically.
   * ------------------------------------------------------- */

  perform
    public.post_gl_journal(
      v_journal_id
    );


  return
    v_journal_id;

end;
$$;


/* =========================================================
 * Security
 * ========================================================= */

revoke all on function
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


revoke all on function
  public.create_manual_gl_journal(
    date,
    date,
    text,
    jsonb,
    text,
    numeric,
    text
  )
from anon;


grant execute on function
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


/* =========================================================
 * Documentation
 * ========================================================= */

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
  'Creates and atomically posts an administrator-only AED manual GL journal. Manual journals are restricted to AED with exchange rate 1. Base debit and credit amounts are derived by the database from document debit and credit values; caller-supplied base amounts are ignored.';