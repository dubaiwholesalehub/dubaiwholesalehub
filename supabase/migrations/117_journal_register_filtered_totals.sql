/*
 * =========================================================
 * 117 — Journal Register Filtered Totals
 *
 * Recreates get_formal_journal_register() with full filtered
 * debit / credit totals independent of pagination.
 * =========================================================
 */

drop function if exists
  public.get_formal_journal_register(
    date,
    date,
    text,
    text,
    text,
    integer,
    integer
  );

/*
 * =========================================================
 * 116 — Formal Journal Register
 *
 * PURPOSE
 * -------
 *
 * Provides the formal General Ledger journal register.
 *
 * Includes:
 *
 *   - Journal number
 *   - Journal / posting date
 *   - Source
 *   - Description
 *   - Currency
 *   - Debit / credit totals
 *   - Status
 *   - Reversal relationships
 *   - Search / filter support
 *   - Pagination
 *
 * Both original reversed journals and their separate reversal
 * journals remain visible because both are part of the
 * permanent accounting audit trail.
 * =========================================================
 */


create or replace function
  public.get_formal_journal_register(
    p_date_from date,
    p_date_to date,
    p_status text
      default null,
    p_source_type text
      default null,
    p_search text
      default null,
    p_limit integer
      default 50,
    p_offset integer
      default 0
  )
returns table
(
  journal_entry_id uuid,
  journal_number text,
  journal_date date,
  posting_date date,

  accounting_period_id uuid,

  source_type text,
  source_id uuid,
  source_number text,

  description text,

  currency_code text,
  exchange_rate numeric,

  status text,

  original_entry_id uuid,
  reversal_entry_id uuid,
  reversal_reason text,

  total_debit numeric,
  total_credit numeric,
  base_debit numeric,
  base_credit numeric,

  line_count bigint,

  posted_at timestamptz,
  reversed_at timestamptz,
  created_at timestamptz,

  total_count bigint,
  filtered_base_debit numeric,
  filtered_base_credit numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin

  /* =======================================================
   * Security
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
   * Validation
   * ======================================================= */

  if
    p_date_from is null
    or
    p_date_to is null
  then
    raise exception
      'Journal Register date range is required.';
  end if;


  if
    p_date_to <
      p_date_from
  then
    raise exception
      'Journal Register end date cannot be before start date.';
  end if;


  if
    p_status is not null
    and
    trim(
      p_status
    ) <>
      ''
    and
    trim(
      p_status
    ) not in (
      'draft',
      'posted',
      'reversed'
    )
  then
    raise exception
      'Invalid journal status "%".',
      p_status;
  end if;


  if
    p_limit is null
    or
    p_limit <
      1
    or
    p_limit >
      500
  then
    raise exception
      'Journal Register page size must be between 1 and 500.';
  end if;


  if
    p_offset is null
    or
    p_offset <
      0
  then
    raise exception
      'Journal Register offset cannot be negative.';
  end if;


  /* =======================================================
   * Journal Register
   * ======================================================= */

  return query

  with filtered_journals as
  (
    select
      journal.id,
      journal.journal_number,
      journal.journal_date,
      journal.posting_date,

      journal.accounting_period_id,

      journal.source_type,
      journal.source_id,
      journal.source_number,

      journal.description,

      journal.currency_code,
      journal.exchange_rate,

      journal.status,

      journal.original_entry_id,
      journal.reversal_entry_id,
      journal.reversal_reason,

      journal.posted_at,
      journal.reversed_at,
      journal.created_at

    from
      public.gl_journal_entries journal

    where
      journal.posting_date
        between
          p_date_from
          and
          p_date_to

      and
      (
        p_status is null

        or
        trim(
          p_status
        ) =
          ''

        or
        journal.status =
          trim(
            p_status
          )
      )

      and
      (
        p_source_type is null

        or
        trim(
          p_source_type
        ) =
          ''

        or
        journal.source_type =
          trim(
            p_source_type
          )
      )

      and
      (
        p_search is null

        or
        trim(
          p_search
        ) =
          ''

        or
        journal.journal_number
          ilike
            '%' ||
            trim(
              p_search
            ) ||
            '%'

        or
        coalesce(
          journal.source_number,
          ''
        )
          ilike
            '%' ||
            trim(
              p_search
            ) ||
            '%'

        or
        journal.source_type
          ilike
            '%' ||
            trim(
              p_search
            ) ||
            '%'

        or
        journal.description
          ilike
            '%' ||
            trim(
              p_search
            ) ||
            '%'
      )
  ),

  journal_totals as
  (
    select
      line.journal_entry_id,

      round(
        coalesce(
          sum(
            line.debit
          ),
          0
        ),
        2
      )
        as total_debit,

      round(
        coalesce(
          sum(
            line.credit
          ),
          0
        ),
        2
      )
        as total_credit,

      round(
        coalesce(
          sum(
            line.base_debit
          ),
          0
        ),
        2
      )
        as base_debit,

      round(
        coalesce(
          sum(
            line.base_credit
          ),
          0
        ),
        2
      )
        as base_credit,

      count(
        line.id
      )::bigint
        as line_count

    from
      public.gl_journal_lines line

    inner join
      filtered_journals journal

      on
        journal.id =
          line.journal_entry_id

    group by
      line.journal_entry_id
  ),

  register_rows as
  (
    select
      journal.id
        as journal_entry_id,

      journal.journal_number,
      journal.journal_date,
      journal.posting_date,

      journal.accounting_period_id,

      journal.source_type,
      journal.source_id,
      journal.source_number,

      journal.description,

      journal.currency_code,
      journal.exchange_rate,

      journal.status,

      journal.original_entry_id,
      journal.reversal_entry_id,
      journal.reversal_reason,

      coalesce(
        totals.total_debit,
        0
      )::numeric
        as total_debit,

      coalesce(
        totals.total_credit,
        0
      )::numeric
        as total_credit,

      coalesce(
        totals.base_debit,
        0
      )::numeric
        as base_debit,

      coalesce(
        totals.base_credit,
        0
      )::numeric
        as base_credit,

      coalesce(
        totals.line_count,
        0
      )::bigint
        as line_count,

      journal.posted_at,
      journal.reversed_at,
      journal.created_at

    from
      filtered_journals journal

    left join
      journal_totals totals

      on
        totals.journal_entry_id =
          journal.id
  )

  select
    row.journal_entry_id,
    row.journal_number,
    row.journal_date,
    row.posting_date,

    row.accounting_period_id,

    row.source_type,
    row.source_id,
    row.source_number,

    row.description,

    row.currency_code,
    row.exchange_rate,

    row.status,

    row.original_entry_id,
    row.reversal_entry_id,
    row.reversal_reason,

    row.total_debit,
    row.total_credit,
    row.base_debit,
    row.base_credit,

    row.line_count,

    row.posted_at,
    row.reversed_at,
    row.created_at,

    count(*) over ()
      as total_count,

    sum(
      row.base_debit
    ) over ()
      as filtered_base_debit,

    sum(
      row.base_credit
    ) over ()
      as filtered_base_credit

  from
    register_rows row

  order by
    row.posting_date desc,
    row.journal_number desc

  limit
    p_limit

  offset
    p_offset;

end;
$$;


/* =========================================================
 * Permissions
 * ========================================================= */

revoke all
on function
  public.get_formal_journal_register(
    date,
    date,
    text,
    text,
    text,
    integer,
    integer
  )
from public;


grant execute
on function
  public.get_formal_journal_register(
    date,
    date,
    text,
    text,
    text,
    integer,
    integer
  )
to authenticated;


/* =========================================================
 * Documentation
 * ========================================================= */

comment on function
  public.get_formal_journal_register(
    date,
    date,
    text,
    text,
    text,
    integer,
    integer
  )
is
  'Returns the formal General Ledger Journal Register with journal header information, debit/credit totals, reversal relationships, filtering, search and pagination.';