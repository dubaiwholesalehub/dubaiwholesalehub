/*
 * =========================================================
 * 164 — Historical Accounts Receivable Reconciliation
 * =========================================================
 *
 * PURPOSE
 * -------
 *
 * Reconciles two proven historical Accounts Receivable
 * accounting classification defects discovered during the
 * global AR control-account audit.
 *
 *
 * DEFECT 1
 * --------
 *
 * Three posted Customer Receipts were historically posted to
 * Accounts Receivable using allocations that were created
 * AFTER the receipt itself had already been posted.
 *
 * The later allocations were subsequently and correctly
 * accounted for through:
 *
 *   customer_advance_application
 *
 * journals:
 *
 *   Dr Customer Advances
 *      Cr Accounts Receivable
 *
 * Therefore the receipt-side historical GL classification
 * over-credited Accounts Receivable and under-credited
 * Customer Advances by:
 *
 *   RCPT-2026-000008    AED 100.00
 *   RCPT-2026-000009    AED 100.00
 *   RCPT-2026-000011    AED  25.00
 *                       ----------
 *                       AED 225.00
 *
 * Required correction:
 *
 *   Dr Accounts Receivable     225.00
 *      Cr Customer Advances       225.00
 *
 * The correction is posted as THREE independent journals,
 * one per Customer Receipt, for maximum audit traceability.
 *
 *
 * DEFECT 2
 * --------
 *
 * Migration 162 created:
 *
 *   JE-2026-000205
 *
 * source_type:
 *
 *   historical_customer_receipt_draft_reclass
 *
 * source_id:
 *
 *   RCPT-2026-000022
 *
 * Amount:
 *
 *   AED 20.00
 *
 * That journal duplicated the two already-existing historical
 * draft-order corrections:
 *
 *   JE-2026-000148    AED 10.00
 *   JE-2026-000149    AED 10.00
 *
 * JE-2026-000205 must therefore be formally reversed through
 * the canonical GL reversal engine. It must NEVER be deleted.
 *
 *
 * SAFETY
 * ------
 *
 * This migration DOES NOT automatically execute the repair.
 *
 * It creates an admin-only reconciliation function:
 *
 *   reconcile_historical_accounts_receivable_164()
 *
 * The function:
 *
 * - uses an advisory transaction lock
 * - validates exact Customer Receipt IDs
 * - validates exact Customer IDs
 * - validates receipt numbers
 * - validates receipt status / amounts / currency / FX
 * - validates later allocation totals
 * - validates Customer Advance application GL coverage
 * - validates Accounts Receivable / Customer Advances accounts
 * - validates JE-000148 / JE-000149 / JE-000205
 * - posts corrections only through post_erp_gl_journal()
 * - reverses JE-000205 only through
 *   reverse_erp_source_gl_journal()
 * - is idempotent
 * - refuses to recreate deliberately reversed corrections
 *
 * No operational Customer Receipt, allocation, Sales Order,
 * financial-account transaction, or treasury row is modified.
 * =========================================================
 */


create or replace function
  public.reconcile_historical_accounts_receivable_164()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare

  v_user_id uuid;

  v_ar_account_id uuid;

  v_customer_advance_account_id uuid;


  v_expected record;

  v_receipt
    public.customer_receipts%rowtype;


  v_current_allocation_total
    numeric(18, 2);

  v_later_allocation_total
    numeric(18, 2);

  v_later_advance_gl_total
    numeric(18, 2);


  v_existing_journal_id uuid;

  v_existing_journal_status text;

  v_correction_journal_id uuid;


  v_lines jsonb;

  v_results jsonb :=
    '[]'::jsonb;


  v_total_correction
    numeric(18, 2) :=
      0;


  v_duplicate_receipt_id uuid :=
    '6753bb81-9583-4d08-becb-38bc79d761b8'::uuid;

  v_duplicate_journal_id uuid :=
    'a5d9ffef-7752-4647-b329-7a86d2f8103b'::uuid;

  v_duplicate_reversal_id uuid;


  v_je148 record;

  v_je149 record;

  v_je205 record;


begin

  /* =======================================================
   * 1. Security
   * ======================================================= */

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



  /* =======================================================
   * 2. Serialize Historical AR Repair
   * ======================================================= */

  perform
    pg_advisory_xact_lock(
      hashtext(
        '164_historical_accounts_receivable_reconciliation'
      )
    );



  /* =======================================================
   * 3. Resolve Formal GL Accounts
   * ======================================================= */

  select
    id
  into
    v_ar_account_id

  from
    public.gl_accounts

  where
    account_code =
      '1200'

    and
      is_active = true

    and
      is_posting_account = true

  limit 1;


  if
    v_ar_account_id is null
  then
    raise exception
      'Active posting GL account 1200 - Accounts Receivable was not found.';
  end if;


  select
    id
  into
    v_customer_advance_account_id

  from
    public.gl_accounts

  where
    account_code =
      '2300'

    and
      is_active = true

    and
      is_posting_account = true

  limit 1;


  if
    v_customer_advance_account_id is null
  then
    raise exception
      'Active posting GL account 2300 - Customer Advances was not found.';
  end if;



  /* =======================================================
   * 4. Reclassify Historical Receipt-Side AR
   *
   * Expected correction rows:
   *
   * Receipt 000008   100
   * Receipt 000009   100
   * Receipt 000011    25
   * ======================================================= */

  for v_expected in

    select
      *

    from (
      values

        (
          'ab0494cd-c1da-4be7-a391-832ce628b92e'::uuid,
          'RCPT-2026-000008'::text,
          'ef2bd498-edb6-4a7d-bcbf-874f09cb08cf'::uuid,
          100.00::numeric,
          100.00::numeric,
          0.00::numeric,
          100.00::numeric
        ),

        (
          'f27152ef-67f5-49a6-af27-45fc6d9ce0df'::uuid,
          'RCPT-2026-000009'::text,
          'f7db524d-c561-4c53-8369-fd22023906ed'::uuid,
          100.00::numeric,
          100.00::numeric,
          0.00::numeric,
          100.00::numeric
        ),

        (
          'e660b087-6527-4d61-894c-ecbe8b5adb4a'::uuid,
          'RCPT-2026-000011'::text,
          'f7db524d-c561-4c53-8369-fd22023906ed'::uuid,
          85.00::numeric,
          85.00::numeric,
          0.00::numeric,
          25.00::numeric
        )

    ) as expected(
      receipt_id,
      receipt_number,
      customer_id,
      receipt_amount,
      allocated_amount,
      unallocated_amount,
      correction_amount
    )

  loop

    /* -------------------------------------------------------
     * Lock + validate Customer Receipt
     * ------------------------------------------------------- */

    select
      *
    into
      v_receipt

    from
      public.customer_receipts

    where
      id =
        v_expected.receipt_id

    for update;


    if not found
    then
      raise exception
        'Historical AR repair receipt % was not found.',
        v_expected.receipt_number;
    end if;


    if
      v_receipt.receipt_number <>
        v_expected.receipt_number
    then
      raise exception
        'Historical AR repair receipt-number mismatch for receipt ID %.',
        v_expected.receipt_id;
    end if;


    if
      v_receipt.customer_id <>
        v_expected.customer_id
    then
      raise exception
        'Historical AR repair customer mismatch for %.',
        v_expected.receipt_number;
    end if;


    if
      v_receipt.status <>
        'posted'
    then
      raise exception
        'Historical AR repair requires % to remain posted. Current status: %.',
        v_expected.receipt_number,
        v_receipt.status;
    end if;


    if
      round(v_receipt.amount, 2) <>
        round(v_expected.receipt_amount, 2)
    then
      raise exception
        'Historical AR repair amount mismatch for %. Expected %, found %.',
        v_expected.receipt_number,
        v_expected.receipt_amount,
        v_receipt.amount;
    end if;


    if
      round(v_receipt.allocated_amount, 2) <>
        round(v_expected.allocated_amount, 2)
    then
      raise exception
        'Historical AR repair allocated amount mismatch for %. Expected %, found %.',
        v_expected.receipt_number,
        v_expected.allocated_amount,
        v_receipt.allocated_amount;
    end if;


    if
      round(v_receipt.unallocated_amount, 2) <>
        round(v_expected.unallocated_amount, 2)
    then
      raise exception
        'Historical AR repair unallocated amount mismatch for %. Expected %, found %.',
        v_expected.receipt_number,
        v_expected.unallocated_amount,
        v_receipt.unallocated_amount;
    end if;


    if
      v_receipt.currency_code <>
        'AED'
    then
      raise exception
        'Historical AR repair expects AED receipt %. Currency found: %.',
        v_expected.receipt_number,
        v_receipt.currency_code;
    end if;


    if
      round(v_receipt.exchange_rate, 6) <>
        1.000000
    then
      raise exception
        'Historical AR repair expects exchange rate 1.000000 for %. Found %.',
        v_expected.receipt_number,
        v_receipt.exchange_rate;
    end if;


    if
      v_receipt.posted_at is null
    then
      raise exception
        'Historical AR repair requires posted_at for %.',
        v_expected.receipt_number;
    end if;



    /* -------------------------------------------------------
     * Validate Current Allocation Total
     * ------------------------------------------------------- */

    select
      round(
        coalesce(
          sum(cra.amount),
          0
        ),
        2
      )

    into
      v_current_allocation_total

    from
      public.customer_receipt_allocations cra

    where
      cra.receipt_id =
        v_receipt.id;


    if
      v_current_allocation_total <>
        round(v_expected.allocated_amount, 2)
    then
      raise exception
        'Historical AR repair allocation-row total mismatch for %. Expected %, found %.',
        v_expected.receipt_number,
        v_expected.allocated_amount,
        v_current_allocation_total;
    end if;



    /* -------------------------------------------------------
     * Validate Allocations Created AFTER Receipt Posting
     *
     * These are the allocations that should originally have
     * remained Customer Advances at receipt-posting time.
     * ------------------------------------------------------- */

    select
      round(
        coalesce(
          sum(cra.amount),
          0
        ),
        2
      )

    into
      v_later_allocation_total

    from
      public.customer_receipt_allocations cra

    where
      cra.receipt_id =
        v_receipt.id

      and
        cra.created_at >
          v_receipt.posted_at;


    if
      v_later_allocation_total <>
        round(v_expected.correction_amount, 2)
    then
      raise exception
        'Historical AR repair later-allocation total mismatch for %. Expected %, found %.',
        v_expected.receipt_number,
        v_expected.correction_amount,
        v_later_allocation_total;
    end if;



    /* -------------------------------------------------------
     * Validate Later Customer Advance Application GL
     *
     * Every later allocation must already have its legitimate
     * customer_advance_application journal.
     *
     * We are correcting the original receipt-side
     * classification, NOT removing these later journals.
     * ------------------------------------------------------- */

    select
      round(
        coalesce(
          sum(cra.amount),
          0
        ),
        2
      )

    into
      v_later_advance_gl_total

    from
      public.customer_receipt_allocations cra

    where
      cra.receipt_id =
        v_receipt.id

      and
        cra.created_at >
          v_receipt.posted_at

      and
        exists (

          select
            1

          from
            public.gl_journal_entries journal

          where
            journal.source_type =
              'customer_advance_application'

            and
              journal.source_id =
                cra.id

            and
              journal.status =
                'posted'
        );


    if
      v_later_advance_gl_total <>
        round(v_expected.correction_amount, 2)
    then
      raise exception
        'Historical AR repair Customer Advance GL coverage mismatch for %. Expected %, found %.',
        v_expected.receipt_number,
        v_expected.correction_amount,
        v_later_advance_gl_total;
    end if;



    /* -------------------------------------------------------
     * Prepare Formal Correction
     *
     *   Dr Accounts Receivable
     *      Cr Customer Advances
     * ------------------------------------------------------- */

    v_lines :=
      jsonb_build_array(

        jsonb_build_object(

          'glAccountId',
            v_ar_account_id,

          'debit',
            v_expected.correction_amount,

          'credit',
            0,

          'baseDebit',
            v_expected.correction_amount,

          'baseCredit',
            0,

          'description',
            'Historical Customer Receipt AR classification correction - '
            ||
            v_receipt.receipt_number,

          'customerId',
            v_receipt.customer_id,

          'sourceLineType',
            'customer_receipt_historical_ar_reclassification',

          'sourceLineId',
            v_receipt.id
        ),


        jsonb_build_object(

          'glAccountId',
            v_customer_advance_account_id,

          'debit',
            0,

          'credit',
            v_expected.correction_amount,

          'baseDebit',
            0,

          'baseCredit',
            v_expected.correction_amount,

          'description',
            'Historical Customer Receipt amount restored to Customer Advances - '
            ||
            v_receipt.receipt_number,

          'customerId',
            v_receipt.customer_id,

          'sourceLineType',
            'customer_receipt_historical_ar_reclassification',

          'sourceLineId',
            v_receipt.id
        )

      );



    /* -------------------------------------------------------
     * Explicit Idempotency / Reversal Protection
     * ------------------------------------------------------- */

    v_existing_journal_id :=
      null;

    v_existing_journal_status :=
      null;


    select
      id,
      status

    into
      v_existing_journal_id,
      v_existing_journal_status

    from
      public.gl_journal_entries

    where
      source_type =
        'historical_customer_receipt_ar_reclassification'

      and
        source_id =
          v_receipt.id

      and
        status in (
          'posted',
          'reversed'
        )

    order by
      created_at desc

    limit 1;


    if
      v_existing_journal_id is not null
      and
      v_existing_journal_status =
        'reversed'
    then
      raise exception
        'Historical AR correction for % was previously reversed and requires manual accounting review.',
        v_receipt.receipt_number;
    end if;


    if
      v_existing_journal_id is not null
      and
      v_existing_journal_status =
        'posted'
    then

      v_correction_journal_id :=
        v_existing_journal_id;

    else

      v_correction_journal_id :=
        public.post_erp_gl_journal(

          'historical_customer_receipt_ar_reclassification',

          v_receipt.id,

          v_receipt.receipt_number,

          v_receipt.posted_at::date,

          v_receipt.posted_at::date,

          'Historical Customer Receipt AR classification correction - '
          ||
          v_receipt.receipt_number,

          v_receipt.currency_code,

          v_receipt.exchange_rate,

          v_lines
        );

    end if;



    /* -------------------------------------------------------
     * Verify Posted Correction Journal
     * ------------------------------------------------------- */

    if not exists (

      select
        1

      from
        public.gl_journal_entries journal

      where
        journal.id =
          v_correction_journal_id

        and
          journal.source_type =
            'historical_customer_receipt_ar_reclassification'

        and
          journal.source_id =
            v_receipt.id

        and
          journal.status =
            'posted'
    )
    then
      raise exception
        'Historical AR correction journal did not remain posted for %.',
        v_receipt.receipt_number;
    end if;


    if
      round(
        coalesce(
          (
            select
              sum(
                line.base_debit
                -
                line.base_credit
              )

            from
              public.gl_journal_lines line

            where
              line.journal_entry_id =
                v_correction_journal_id

              and
                line.gl_account_id =
                  v_ar_account_id
          ),
          0
        ),
        2
      ) <>
      round(v_expected.correction_amount, 2)
    then
      raise exception
        'Historical AR correction journal AR value is invalid for %.',
        v_receipt.receipt_number;
    end if;


    if
      round(
        coalesce(
          (
            select
              sum(
                line.base_credit
                -
                line.base_debit
              )

            from
              public.gl_journal_lines line

            where
              line.journal_entry_id =
                v_correction_journal_id

              and
                line.gl_account_id =
                  v_customer_advance_account_id
          ),
          0
        ),
        2
      ) <>
      round(v_expected.correction_amount, 2)
    then
      raise exception
        'Historical AR correction journal Customer Advance value is invalid for %.',
        v_receipt.receipt_number;
    end if;



    v_total_correction :=
      round(
        v_total_correction
        +
        v_expected.correction_amount,
        2
      );


    v_results :=
      v_results
      ||
      jsonb_build_array(

        jsonb_build_object(

          'receiptId',
            v_receipt.id,

          'receiptNumber',
            v_receipt.receipt_number,

          'customerId',
            v_receipt.customer_id,

          'correctionAmount',
            round(
              v_expected.correction_amount,
              2
            ),

          'journalId',
            v_correction_journal_id
        )

      );

  end loop;



  /* =======================================================
   * 5. Validate Total Receipt Reclassification
   * ======================================================= */

  if
    v_total_correction <>
      225.00
  then
    raise exception
      'Historical AR correction total must equal AED 225.00. Found %.',
      v_total_correction;
  end if;



  /* =======================================================
   * 6. Validate Existing Draft-Order Reclassification
   *    JE-2026-000148
   * ======================================================= */

  select
    journal.id,
    journal.status,
    journal.source_type,
    journal.source_id,
    journal.source_number,
    journal.journal_date,
    journal.posting_date,

    round(
      coalesce(
        sum(line.base_debit),
        0
      ),
      2
    )
      as total_debit,

    round(
      coalesce(
        sum(line.base_credit),
        0
      ),
      2
    )
      as total_credit

  into
    v_je148

  from
    public.gl_journal_entries journal

  join
    public.gl_journal_lines line
  on
    line.journal_entry_id =
      journal.id

  where
    journal.id =
      'c1ab6a61-5f22-41c5-9464-f3b1db8541a8'::uuid

    and
      journal.journal_number =
        'JE-2026-000148'

  group by
    journal.id,
    journal.status,
    journal.source_type,
    journal.source_id,
    journal.source_number,
    journal.journal_date,
    journal.posting_date;


  if
    v_je148.id is null
  then
    raise exception
      'Required historical journal JE-2026-000148 was not found.';
  end if;


  if
    v_je148.status <> 'posted'
    or
    v_je148.source_type <>
      'draft_order_receipt_reclassification'
    or
    v_je148.source_id <>
      'c5d326e1-5727-42a5-ba33-bee6fa3d3c11'::uuid
    or
    v_je148.source_number <>
      'RCPT-2026-000022-SO-2026-000027'
    or
    v_je148.total_debit <> 10.00
    or
    v_je148.total_credit <> 10.00
  then
    raise exception
      'JE-2026-000148 no longer matches the audited historical state.';
  end if;



  /* =======================================================
   * 7. Validate Existing Draft-Order Reclassification
   *    JE-2026-000149
   * ======================================================= */

  select
    journal.id,
    journal.status,
    journal.source_type,
    journal.source_id,
    journal.source_number,
    journal.journal_date,
    journal.posting_date,

    round(
      coalesce(
        sum(line.base_debit),
        0
      ),
      2
    )
      as total_debit,

    round(
      coalesce(
        sum(line.base_credit),
        0
      ),
      2
    )
      as total_credit

  into
    v_je149

  from
    public.gl_journal_entries journal

  join
    public.gl_journal_lines line
  on
    line.journal_entry_id =
      journal.id

  where
    journal.id =
      'edbddcbe-5d78-451a-83d6-3c0822bf04c5'::uuid

    and
      journal.journal_number =
        'JE-2026-000149'

  group by
    journal.id,
    journal.status,
    journal.source_type,
    journal.source_id,
    journal.source_number,
    journal.journal_date,
    journal.posting_date;


  if
    v_je149.id is null
  then
    raise exception
      'Required historical journal JE-2026-000149 was not found.';
  end if;


  if
    v_je149.status <> 'posted'
    or
    v_je149.source_type <>
      'draft_order_receipt_reclassification'
    or
    v_je149.source_id <>
      'af2a9c38-f560-4681-b29e-f5d845836604'::uuid
    or
    v_je149.source_number <>
      'RCPT-2026-000022-SO-2026-000028'
    or
    v_je149.total_debit <> 10.00
    or
    v_je149.total_credit <> 10.00
  then
    raise exception
      'JE-2026-000149 no longer matches the audited historical state.';
  end if;



  /* =======================================================
   * 8. Validate Duplicate Migration-162 Journal
   *    JE-2026-000205
   * ======================================================= */

  select
    journal.id,
    journal.status,
    journal.source_type,
    journal.source_id,
    journal.source_number,
    journal.journal_date,
    journal.posting_date,
    journal.reversal_entry_id,

    round(
      coalesce(
        sum(line.base_debit),
        0
      ),
      2
    )
      as total_debit,

    round(
      coalesce(
        sum(line.base_credit),
        0
      ),
      2
    )
      as total_credit

  into
    v_je205

  from
    public.gl_journal_entries journal

  join
    public.gl_journal_lines line
  on
    line.journal_entry_id =
      journal.id

  where
    journal.id =
      v_duplicate_journal_id

    and
      journal.journal_number =
        'JE-2026-000205'

  group by
    journal.id,
    journal.status,
    journal.source_type,
    journal.source_id,
    journal.source_number,
    journal.journal_date,
    journal.posting_date,
    journal.reversal_entry_id;


  if
    v_je205.id is null
  then
    raise exception
      'Required historical duplicate journal JE-2026-000205 was not found.';
  end if;


  if
    v_je205.source_type <>
      'historical_customer_receipt_draft_reclass'

    or
      v_je205.source_id <>
        v_duplicate_receipt_id

    or
      v_je205.source_number <>
        'RCPT-2026-000022'

    or
      v_je205.journal_date <>
        date '2026-08-19'

    or
      v_je205.posting_date <>
        date '2026-08-19'

    or
      v_je205.total_debit <>
        20.00

    or
      v_je205.total_credit <>
        20.00
  then
    raise exception
      'JE-2026-000205 no longer matches the audited historical state.';
  end if;



  /* =======================================================
   * 9. Validate RCPT-2026-000022 Current State
   * ======================================================= */

  select
    *
  into
    v_receipt

  from
    public.customer_receipts

  where
    id =
      v_duplicate_receipt_id

  for update;


  if not found
  then
    raise exception
      'RCPT-2026-000022 was not found.';
  end if;


  if
    v_receipt.receipt_number <>
      'RCPT-2026-000022'

    or
      v_receipt.customer_id <>
        'ef2bd498-edb6-4a7d-bcbf-874f09cb08cf'::uuid

    or
      v_receipt.status <>
        'posted'

    or
      round(v_receipt.amount, 2) <>
        165.00

    or
      round(v_receipt.allocated_amount, 2) <>
        135.00

    or
      round(v_receipt.unallocated_amount, 2) <>
        30.00

    or
      v_receipt.currency_code <>
        'AED'

    or
      round(v_receipt.exchange_rate, 6) <>
        1.000000

    or
      v_receipt.posted_at::date <>
        date '2026-08-19'
  then
    raise exception
      'RCPT-2026-000022 no longer matches the audited historical state.';
  end if;



  /* =======================================================
   * 10. Reverse Duplicate JE-2026-000205
   *
   * reverse_erp_source_gl_journal() is idempotent.
   *
   * If JE205 is already reversed, the existing reversal is
   * returned.
   * ======================================================= */

  if
    v_je205.status not in (
      'posted',
      'reversed'
    )
  then
    raise exception
      'JE-2026-000205 has unexpected status %.',
      v_je205.status;
  end if;


  v_duplicate_reversal_id :=
    public.reverse_erp_source_gl_journal(

      'historical_customer_receipt_draft_reclass',

      v_duplicate_receipt_id,

      date '2026-08-19',

      'Migration 164 historical AR reconciliation: reverse duplicate RCPT-2026-000022 draft-allocation reclassification because JE-2026-000148 and JE-2026-000149 already contain the valid AED 20.00 correction.'
    );



  /* =======================================================
   * 11. Validate Formal Reversal
   * ======================================================= */

  if not exists (

    select
      1

    from
      public.gl_journal_entries original

    where
      original.id =
        v_duplicate_journal_id

      and
        original.status =
          'reversed'

      and
        original.reversal_entry_id =
          v_duplicate_reversal_id
  )
  then
    raise exception
      'JE-2026-000205 was not formally reversed as expected.';
  end if;


  if not exists (

    select
      1

    from
      public.gl_journal_entries reversal

    where
      reversal.id =
        v_duplicate_reversal_id

      and
        reversal.status =
          'posted'

      and
        reversal.source_type =
          'journal_reversal'

      and
        reversal.source_id =
          v_duplicate_journal_id
  )
  then
    raise exception
      'JE-2026-000205 reversal journal is invalid.';
  end if;



  /* =======================================================
   * 12. Return Audit Result
   * ======================================================= */

  return
    jsonb_build_object(

      'status',
        'completed',

      'receiptCorrectionCount',
        3,

      'receiptCorrectionTotal',
        v_total_correction,

      'receiptCorrections',
        v_results,

      'duplicateJournalId',
        v_duplicate_journal_id,

      'duplicateJournalNumber',
        'JE-2026-000205',

      'duplicateAmount',
        20.00,

      'duplicateReversalJournalId',
        v_duplicate_reversal_id,

      'netAccountsReceivableRepair',
        round(
          v_total_correction
          -
          20.00,
          2
        )

    );

end;
$$;



/* =========================================================
 * 13. Permissions
 * ========================================================= */

revoke all
on function
  public.reconcile_historical_accounts_receivable_164()
from public;


revoke all
on function
  public.reconcile_historical_accounts_receivable_164()
from anon;


grant execute
on function
  public.reconcile_historical_accounts_receivable_164()
to authenticated;



/* =========================================================
 * 14. Documentation
 * ========================================================= */

comment on function
  public.reconcile_historical_accounts_receivable_164()
is
  'Admin-only exact-state historical Accounts Receivable reconciliation. Posts AED 225 of receipt-side AR-to-Customer-Advance classification corrections across RCPT-2026-000008/000009/000011 and formally reverses duplicate Migration-162 journal JE-2026-000205 AED 20. Net AR repair AED 205. Does not modify operational Customer Receipt, allocation, Sales Order or treasury data.';



/* =========================================================
 * End Migration 164
 * ========================================================= */