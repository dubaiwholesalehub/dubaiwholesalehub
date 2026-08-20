/*
 * =========================================================
 * 102 — Historical GL Backfill Helper
 *
 * PURPOSE
 * -------
 *
 * Provides an authenticated admin-only helper to backfill
 * historical Customer Receipt and Supplier Payment documents
 * that were posted before their GL integrations existed.
 *
 * IMPORTANT
 * ---------
 *
 * This function does NOT contain accounting logic.
 *
 * It delegates all accounting to the existing production
 * adapters:
 *
 *   post_customer_receipt_gl(uuid)
 *   post_supplier_payment_gl(uuid)
 *
 * Those adapters are already idempotent through the GL
 * source uniqueness / posting engine.
 * =========================================================
 */


create or replace function
  public.backfill_historical_receipt_payment_gl()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare

  v_receipt_id uuid;

  v_payment_id uuid;

  v_journal_id uuid;

  v_receipt_count integer := 0;

  v_payment_count integer := 0;

  v_receipt_journals jsonb :=
    '[]'::jsonb;

  v_payment_journals jsonb :=
    '[]'::jsonb;

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
   * Historical Customer Receipts
   * ======================================================= */

  foreach v_receipt_id in array array[
    'e660b087-6527-4d61-894c-ecbe8b5adb4a'::uuid,
    '860dd24e-0d8f-4894-985d-1eb9a577fb71'::uuid,
    'bc2d2080-3aa8-4d44-980f-9f65eada5968'::uuid,
    '631d9cfe-ca06-4e01-bdff-bae1b114572e'::uuid,
    'e2555b57-f2ad-469d-8007-dc536c19e61b'::uuid,
    '985be0f1-8107-4942-a74c-0fab188d9adc'::uuid,
    'cc30a17e-15e3-4e8f-ad03-a687995fcc51'::uuid,
    '9b1915ad-d3d9-47e7-8806-930724027f63'::uuid,
    '97edafda-bb52-452b-b748-a130f5c50255'::uuid
  ]
  loop

    v_journal_id :=
      public.post_customer_receipt_gl(
        v_receipt_id
      );


    v_receipt_count :=
      v_receipt_count + 1;


    v_receipt_journals :=
      v_receipt_journals
      ||
      jsonb_build_array(
        jsonb_build_object(
          'sourceId',
          v_receipt_id,
          'journalId',
          v_journal_id
        )
      );

  end loop;


  /* =======================================================
   * Historical Supplier Payments
   * ======================================================= */

  foreach v_payment_id in array array[
    '84b7d332-b528-4a85-a741-0ca4c5b120d0'::uuid,
    'e299521a-5504-45d5-a613-a06582ed2a00'::uuid,
    '43ca9775-639e-4fbf-a973-c7e17baa0d9d'::uuid
  ]
  loop

    v_journal_id :=
      public.post_supplier_payment_gl(
        v_payment_id
      );


    v_payment_count :=
      v_payment_count + 1;


    v_payment_journals :=
      v_payment_journals
      ||
      jsonb_build_array(
        jsonb_build_object(
          'sourceId',
          v_payment_id,
          'journalId',
          v_journal_id
        )
      );

  end loop;


  /* =======================================================
   * Result
   * ======================================================= */

  return
    jsonb_build_object(
      'customerReceipts',
        v_receipt_count,

      'supplierPayments',
        v_payment_count,

      'totalSources',
        v_receipt_count
        +
        v_payment_count,

      'receiptJournals',
        v_receipt_journals,

      'paymentJournals',
        v_payment_journals
    );

end;
$$;


/* =========================================================
 * Permissions
 * ========================================================= */

revoke all
on function
  public.backfill_historical_receipt_payment_gl()
from public;


grant execute
on function
  public.backfill_historical_receipt_payment_gl()
to authenticated;


/* =========================================================
 * Documentation
 * ========================================================= */

comment on function
  public.backfill_historical_receipt_payment_gl()
is
  'Admin-only one-time historical GL backfill for Customer Receipts and Supplier Payments posted before their formal GL integrations existed. Delegates to the existing idempotent GL posting adapters.';