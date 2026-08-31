/*
 * Migration 165
 * Historical Accounts Payable reconciliation.
 *
 * Repairs two historical payable recognition gaps and one related
 * supplier-advance application gap discovered during the global AP audit.
 *
 * Historical defects:
 *
 * 1. QP-2026-16329358
 *    - Posted Quick Purchase: AED 10.00
 *    - Operationally fully paid.
 *    - Original AP recognition journal is missing.
 *    - AED 10.00 of SPAY-2026-000016 was posted to Supplier Advances
 *      because the payable did not yet exist in GL.
 *
 *    Required corrections:
 *      Dr Inventory             10.00
 *      Cr Accounts Payable      10.00
 *
 *      Dr Accounts Payable      10.00
 *      Cr Supplier Advances     10.00
 *
 * 2. GRN-2026-000009
 *    - Historical payable reconstructed at AED 15.00.
 *    - AED 5.00 paid.
 *    - AED 10.00 subsequently reduced by supplier return.
 *    - Original AP recognition journal is missing.
 *
 *    Required correction:
 *      Dr Inventory             15.00
 *      Cr Accounts Payable      15.00
 *
 * Net AP effect:
 *      +10 -10 +15 = +15
 *
 * Expected global AP after reconciliation:
 *      Operational AP = AED 644.00
 *      Formal GL AP    = AED 644.00
 */

create or replace function public.reconcile_historical_accounts_payable_165()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_qp_id uuid :=
    '3afc73fe-f5c9-4868-a1ae-0c2ed4bd7c2c'::uuid;

  v_grn_id uuid :=
    '9d858970-8bd4-4c7c-b762-7f7c80814ca9'::uuid;

  v_supplier_payment_id uuid;

  v_inventory_account_id uuid;
  v_ap_account_id uuid;
  v_supplier_advances_account_id uuid;

  v_qp_supplier_id uuid;
  v_qp_warehouse_id uuid;
  v_grn_supplier_id uuid;
  v_grn_warehouse_id uuid;

  v_qp_recognition_journal_id uuid;
  v_qp_advance_application_journal_id uuid;
  v_grn_recognition_journal_id uuid;

  v_amount numeric;
  v_count integer;

  v_qp_date date;
  v_grn_date date;
begin

  /*
   * Administrative repair only.
   */
  if auth.uid() is null then
    raise exception
      'Authentication is required.';
  end if;

    if not public.is_admin() then
    raise exception
      'Administrator access is required.';
  end if;


  /*
   * Serialize this one-purpose historical AP repair.
   */
  perform
    pg_advisory_xact_lock(
      hashtext(
        '165_historical_accounts_payable_reconciliation'
      )
    );


  /*
   * Lock and validate QP-2026-16329358.
   */
  select
    qp.grand_total,
    qp.purchase_date,
    qp.supplier_id,
    qp.warehouse_id
  into
    v_amount,
    v_qp_date,
    v_qp_supplier_id,
    v_qp_warehouse_id
  from public.quick_purchases qp
  where qp.id = v_qp_id
    and qp.purchase_number = 'QP-2026-16329358'
    and qp.status = 'posted'
  for update;

  if not found then
    raise exception
      'Historical AP reconciliation 165: expected Quick Purchase QP-2026-16329358 was not found in posted status.';
  end if;

  if round(coalesce(v_amount, 0), 2) <> 10.00 then
    raise exception
      'Historical AP reconciliation 165: QP-2026-16329358 expected grand total AED 10.00, found AED %.',
      round(coalesce(v_amount, 0), 2);
  end if;


  /*
   * Validate the operational QP settlement state.
   */
  select count(*)
  into v_count
  from public.quick_purchases qp
  where qp.id = v_qp_id
    and round(coalesce(qp.paid_amount, 0), 2) = 10.00
    and round(coalesce(qp.balance_due, 0), 2) = 0.00
    and qp.payment_status = 'paid';

  if v_count <> 1 then
    raise exception
      'Historical AP reconciliation 165: QP-2026-16329358 settlement state no longer matches the audited AED 10.00 fully-paid state.';
  end if;


  /*
   * Validate that the original Quick Purchase AP recognition
   * is genuinely absent.
   *
   * On reruns, our historical correction source type is different,
   * so this check continues to validate the original defect.
   */
  select count(*)
  into v_count
  from public.gl_journal_entries je
  where je.source_type = 'quick_purchase'
    and je.source_id = v_qp_id
    and je.status = 'posted';

  if v_count <> 0 then
    raise exception
      'Historical AP reconciliation 165: QP-2026-16329358 now has an original posted quick_purchase journal; refusing historical repair.';
  end if;


  /*
   * Validate SPAY-2026-000016 and the exact AED 10 allocation
   * to the affected Quick Purchase.
   */
  select sp.id
  into v_supplier_payment_id
  from public.supplier_payments sp
  where sp.payment_number = 'SPAY-2026-000016'
    and sp.status = 'posted';

  if v_supplier_payment_id is null then
    raise exception
      'Historical AP reconciliation 165: posted SPAY-2026-000016 was not found.';
  end if;

  select count(*)
  into v_count
  from public.supplier_payment_allocations spa
  where spa.supplier_payment_id = v_supplier_payment_id
    and spa.quick_purchase_id = v_qp_id
    and spa.goods_receipt_id is null
    and round(coalesce(spa.amount, 0), 2) = 10.00;

  if v_count <> 1 then
    raise exception
      'Historical AP reconciliation 165: expected exactly one AED 10.00 SPAY-2026-000016 allocation to QP-2026-16329358.';
  end if;


  /*
   * Validate GRN-2026-000009.
   *
   * Its historical payable is reconstructed as:
   *
   *   paid_amount                  5
   * + direct supplier-return AP   10
   * + current balance              0
   *                               --
   *                               15
   */
  select
    gr.received_date,
    gr.supplier_id,
    gr.warehouse_id
  into
    v_grn_date,
    v_grn_supplier_id,
    v_grn_warehouse_id
  from public.goods_receipts gr
  where gr.id = v_grn_id
    and gr.receipt_number = 'GRN-2026-000009'
    and gr.status = 'completed'
  for update;

  if not found then
    raise exception
      'Historical AP reconciliation 165: expected completed GRN-2026-000009 was not found.';
  end if;


  select count(*)
  into v_count
  from public.goods_receipts gr
  where gr.id = v_grn_id
    and round(coalesce(gr.paid_amount, 0), 2) = 5.00
    and round(coalesce(gr.balance_due, 0), 2) = 0.00
    and gr.payment_status = 'paid';

  if v_count <> 1 then
    raise exception
      'Historical AP reconciliation 165: GRN-2026-000009 payment state no longer matches the audited state.';
  end if;


  select coalesce(sum(sr.ap_reduction_amount), 0)
  into v_amount
  from public.supplier_returns sr
  where sr.goods_receipt_id = v_grn_id
    and sr.status = 'posted';

  if round(coalesce(v_amount, 0), 2) <> 10.00 then
    raise exception
      'Historical AP reconciliation 165: GRN-2026-000009 expected AED 10.00 direct supplier-return AP reduction, found AED %.',
      round(coalesce(v_amount, 0), 2);
  end if;


  /*
   * Validate that the original GRN recognition is absent.
   */
  select count(*)
  into v_count
  from public.gl_journal_entries je
  where je.source_type = 'goods_receipt'
    and je.source_id = v_grn_id
    and je.status = 'posted';

  if v_count <> 0 then
    raise exception
      'Historical AP reconciliation 165: GRN-2026-000009 now has an original posted goods_receipt journal; refusing historical repair.';
  end if;


  /*
   * Resolve required GL accounts by code.
   */
  select id
  into v_inventory_account_id
  from public.gl_accounts
  where account_code = '1300';

  if v_inventory_account_id is null then
    raise exception
      'Historical AP reconciliation 165: Inventory account 1300 was not found.';
  end if;


  select id
  into v_ap_account_id
  from public.gl_accounts
  where account_code = '2100';

  if v_ap_account_id is null then
    raise exception
      'Historical AP reconciliation 165: Accounts Payable account 2100 was not found.';
  end if;


  select id
  into v_supplier_advances_account_id
  from public.gl_accounts
  where account_code = '1500';

  if v_supplier_advances_account_id is null then
    raise exception
      'Historical AP reconciliation 165: Supplier Advances account 1500 was not found.';
  end if;


  /*
   * Correction 1:
   * Missing recognition for QP-2026-16329358.
   *
   * Dedicated source type makes post_erp_gl_journal idempotent.
   */
  v_qp_recognition_journal_id :=
    public.post_erp_gl_journal(
      'historical_quick_purchase_ap_recognition',
      v_qp_id,
      'QP-2026-16329358',
      v_qp_date,
      v_qp_date,
      'Historical AP reconciliation: missing recognition for QP-2026-16329358',
      'AED',
      1,
      jsonb_build_array(
        jsonb_build_object(
          'glAccountId', v_inventory_account_id,
          'debit', 10.00,
          'credit', 0,
          'baseDebit', 10.00,
          'baseCredit', 0,
          'description',
            'Historical recognition - QP-2026-16329358',
          'supplierId', v_qp_supplier_id,
          'warehouseId', v_qp_warehouse_id
        ),
        jsonb_build_object(
          'glAccountId', v_ap_account_id,
          'debit', 0,
          'credit', 10.00,
          'baseDebit', 0,
          'baseCredit', 10.00,
          'description',
            'Historical AP recognition - QP-2026-16329358',
          'supplierId', v_qp_supplier_id
        )
      )
    );


  /*
   * Correction 2:
   * Apply the AED 10 supplier advance represented by
   * SPAY-2026-000016 to QP-2026-16329358.
   */
  v_qp_advance_application_journal_id :=
    public.post_erp_gl_journal(
      'historical_supplier_advance_application',
      v_qp_id,
      'QP-2026-16329358',
      v_qp_date,
      v_qp_date,
      'Historical AP reconciliation: apply supplier advance to QP-2026-16329358',
      'AED',
      1,
      jsonb_build_array(
        jsonb_build_object(
          'glAccountId', v_ap_account_id,
          'debit', 10.00,
          'credit', 0,
          'baseDebit', 10.00,
          'baseCredit', 0,
          'description',
            'Historical supplier advance application - QP-2026-16329358',
          'supplierId', v_qp_supplier_id
        ),
        jsonb_build_object(
          'glAccountId', v_supplier_advances_account_id,
          'debit', 0,
          'credit', 10.00,
          'baseDebit', 0,
          'baseCredit', 10.00,
          'description',
            'Historical supplier advance application - QP-2026-16329358',
          'supplierId', v_qp_supplier_id
        )
      )
    );


  /*
   * Correction 3:
   * Missing recognition for GRN-2026-000009.
   */
  v_grn_recognition_journal_id :=
    public.post_erp_gl_journal(
      'historical_goods_receipt_ap_recognition',
      v_grn_id,
      'GRN-2026-000009',
      v_grn_date,
      v_grn_date,
      'Historical AP reconciliation: missing recognition for GRN-2026-000009',
      'AED',
      1,
      jsonb_build_array(
        jsonb_build_object(
          'glAccountId', v_inventory_account_id,
          'debit', 15.00,
          'credit', 0,
          'baseDebit', 15.00,
          'baseCredit', 0,
          'description',
            'Historical recognition - GRN-2026-000009',
          'supplierId', v_grn_supplier_id,
          'warehouseId', v_grn_warehouse_id
        ),
        jsonb_build_object(
          'glAccountId', v_ap_account_id,
          'debit', 0,
          'credit', 15.00,
          'baseDebit', 0,
          'baseCredit', 15.00,
          'description',
            'Historical AP recognition - GRN-2026-000009',
          'supplierId', v_grn_supplier_id
        )
      )
    );


  return jsonb_build_object(
    'status', 'completed',

    'quick_purchase',
      'QP-2026-16329358',

    'quick_purchase_recognition_amount',
      10.00,

    'quick_purchase_recognition_journal_id',
      v_qp_recognition_journal_id,

    'supplier_advance_application_amount',
      10.00,

    'supplier_advance_application_journal_id',
      v_qp_advance_application_journal_id,

    'goods_receipt',
      'GRN-2026-000009',

    'goods_receipt_recognition_amount',
      15.00,

    'goods_receipt_recognition_journal_id',
      v_grn_recognition_journal_id,

    'gross_ap_recognition_repair',
      25.00,

    'ap_reduction_repair',
      10.00,

    'net_accounts_payable_repair',
      15.00
  );

end;
$$;


/*
 * This is a one-purpose administrative reconciliation function.
 * Do not expose it to ordinary authenticated users.
 */
revoke all
on function public.reconcile_historical_accounts_payable_165()
from public;

revoke all
on function public.reconcile_historical_accounts_payable_165()
from anon;

grant execute
on function public.reconcile_historical_accounts_payable_165()
to authenticated;