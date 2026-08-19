/*
 * =========================================================
 * 091 — Quick Purchase General Ledger Integration
 *
 * PURPOSE
 * -------
 *
 * Connects posted registered-supplier Quick Purchases to the
 * formal General Ledger.
 *
 *
 * ACCOUNTING EVENT
 * ----------------
 *
 *   Dr Inventory
 *   Dr VAT Recoverable       [when applicable]
 *   Dr VAT Pending           [when applicable]
 *      Cr Accounts Payable
 *
 *
 * IMPORTANT
 * ---------
 *
 * This migration recognizes the PURCHASE / LIABILITY event.
 *
 * It does NOT recognize money leaving Cash / Bank.
 *
 * Supplier Payment accounting remains a separate economic
 * event and will be integrated independently.
 *
 *
 * REGISTERED SUPPLIERS ONLY
 * -------------------------
 *
 * Quick Purchases without supplier_id are intentionally not
 * posted by this adapter yet.
 *
 * The current local-shop / unregistered-supplier workflow can
 * preserve direct payment amounts on quick_purchases without
 * creating a supplier_payment tied to a financial account.
 *
 * Posting those purchases to Accounts Payable would therefore
 * create a liability that cannot yet be safely cleared through
 * the formal GL treasury workflow.
 *
 *
 * SOURCE
 * ------
 *
 *   source_type = quick_purchase
 *   source_id   = quick_purchases.id
 *
 * Repeated calls are idempotent through:
 *
 *   public.post_erp_gl_journal(...)
 *
 *
 * INVENTORY VALUE
 * ---------------
 *
 * Operational inventory already records product cost before
 * recoverable VAT.
 *
 * Therefore:
 *
 *   inventory amount =
 *
 *     grand_total
 *     - recoverable_tax_amount
 *     - pending_tax_amount
 *
 *
 * Example
 * -------
 *
 * Product cost       AED 100
 * Recoverable VAT    AED   5
 * Grand total        AED 105
 *
 * Journal:
 *
 *   Dr Inventory              100
 *   Dr VAT Recoverable          5
 *      Cr Accounts Payable        105
 *
 *
 * VAT Pending Example
 * -------------------
 *
 * Product cost       AED 100
 * Pending VAT        AED   5
 * Grand total        AED 105
 *
 * Journal:
 *
 *   Dr Inventory              100
 *   Dr VAT Pending              5
 *      Cr Accounts Payable        105
 *
 *
 * PAYMENT NOTE
 * ------------
 *
 * If the Quick Purchase workflow:
 *
 * - applies an existing Supplier Advance, or
 * - creates a new Supplier Payment,
 *
 * those events remain operationally separate.
 *
 * They must NOT be included in this Quick Purchase journal.
 * =========================================================
 */


/* =========================================================
 * 1. Quick Purchase → GL Posting Adapter
 * ========================================================= */

create or replace function
  public.post_quick_purchase_gl(
    p_quick_purchase_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase
    public.quick_purchases%rowtype;

  v_inventory_account_id uuid;

  v_vat_recoverable_account_id uuid;

  v_vat_pending_account_id uuid;

  v_accounts_payable_account_id uuid;


  v_inventory_amount
    numeric(18, 2);

  v_recoverable_vat_amount
    numeric(18, 2);

  v_pending_vat_amount
    numeric(18, 2);

  v_payable_amount
    numeric(18, 2);


  v_base_inventory_amount
    numeric(18, 2);

  v_base_recoverable_vat_amount
    numeric(18, 2);

  v_base_pending_vat_amount
    numeric(18, 2);

  v_base_payable_amount
    numeric(18, 2);


  v_lines jsonb;

  v_journal_id uuid;

begin

  /* =======================================================
   * Authentication
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
   * Validate Input
   * ======================================================= */

  if
    p_quick_purchase_id is null
  then
    raise exception
      'Quick Purchase ID is required.';
  end if;


  /* =======================================================
   * Lock Quick Purchase
   * ======================================================= */

  select
    *

  into
    v_purchase

  from
    public.quick_purchases

  where
    id =
      p_quick_purchase_id

  for update;


  if not found then
    raise exception
      'Quick Purchase was not found.';
  end if;


  /* =======================================================
   * Purchase Must Be Posted
   * ======================================================= */

  if
    v_purchase.status <>
      'posted'
  then
    raise exception
      'Quick Purchase % must be posted before General Ledger posting.',
      v_purchase.purchase_number;
  end if;


  /* =======================================================
   * Registered Supplier Required
   * ======================================================= */

  if
    v_purchase.supplier_id is null
  then
    raise exception
      'Quick Purchase % does not have a registered supplier. Local-shop Quick Purchase GL posting is not yet supported.',
      v_purchase.purchase_number;
  end if;


  /* =======================================================
   * Validate Currency
   * ======================================================= */

  if
    v_purchase.currency_code is null
    or
    trim(
      v_purchase.currency_code
    ) = ''
  then
    raise exception
      'Quick Purchase % does not have a valid currency.',
      v_purchase.purchase_number;
  end if;


  if
    v_purchase.exchange_rate is null
    or
    v_purchase.exchange_rate <= 0
  then
    raise exception
      'Quick Purchase % does not have a valid exchange rate.',
      v_purchase.purchase_number;
  end if;


  /* =======================================================
   * Accounting Amounts
   * ======================================================= */

  v_payable_amount :=
    round(
      coalesce(
        v_purchase.grand_total,
        0
      ),
      2
    );


  v_recoverable_vat_amount :=
    round(
      coalesce(
        v_purchase.recoverable_tax_amount,
        0
      ),
      2
    );


  v_pending_vat_amount :=
    round(
      coalesce(
        v_purchase.pending_tax_amount,
        0
      ),
      2
    );


  v_inventory_amount :=
    round(
      v_payable_amount
      -
      v_recoverable_vat_amount
      -
      v_pending_vat_amount,
      2
    );


  /* =======================================================
   * Validate Accounting Totals
   * ======================================================= */

  if
    v_payable_amount <= 0
  then
    raise exception
      'Quick Purchase % has zero or negative accounting value.',
      v_purchase.purchase_number;
  end if;


  if
    v_recoverable_vat_amount < 0
    or
    v_pending_vat_amount < 0
  then
    raise exception
      'Quick Purchase % contains invalid VAT accounting amounts.',
      v_purchase.purchase_number;
  end if;


  if
    v_inventory_amount < 0
  then
    raise exception
      'Quick Purchase % VAT amounts exceed its total accounting value.',
      v_purchase.purchase_number;
  end if;


  if
    abs(
      v_payable_amount
      -
      (
        v_inventory_amount
        +
        v_recoverable_vat_amount
        +
        v_pending_vat_amount
      )
    ) > 0.01
  then
    raise exception
      'Quick Purchase % accounting totals are inconsistent.',
      v_purchase.purchase_number;
  end if;


  /* =======================================================
   * Base Currency = AED
   * ======================================================= */

  v_base_inventory_amount :=
    round(
      v_inventory_amount
      *
      v_purchase.exchange_rate,
      2
    );


  v_base_recoverable_vat_amount :=
    round(
      v_recoverable_vat_amount
      *
      v_purchase.exchange_rate,
      2
    );


  v_base_pending_vat_amount :=
    round(
      v_pending_vat_amount
      *
      v_purchase.exchange_rate,
      2
    );


  /*
   * Derive AP base amount from the debit components rather
   * than independently multiplying the total.
   *
   * This prevents tiny FX rounding differences from producing
   * an otherwise valid but unbalanced base-currency journal.
   */

  v_base_payable_amount :=
    round(
      v_base_inventory_amount
      +
      v_base_recoverable_vat_amount
      +
      v_base_pending_vat_amount,
      2
    );


  /* =======================================================
   * Resolve Stable GL Mappings
   * ======================================================= */

  v_inventory_account_id :=
    public.get_mapped_gl_account(
      'inventory'
    );


  v_accounts_payable_account_id :=
    public.get_mapped_gl_account(
      'accounts_payable'
    );


  if
    v_recoverable_vat_amount > 0
  then

    v_vat_recoverable_account_id :=
      public.get_mapped_gl_account(
        'vat_recoverable'
      );

  end if;


  if
    v_pending_vat_amount > 0
  then

    v_vat_pending_account_id :=
      public.get_mapped_gl_account(
        'vat_pending'
      );

  end if;


  /* =======================================================
   * Build Inventory Debit
   * ======================================================= */

  v_lines :=
    jsonb_build_array(

      jsonb_build_object(
        'glAccountId',
          v_inventory_account_id,

        'debit',
          v_inventory_amount,

        'credit',
          0,

        'baseDebit',
          v_base_inventory_amount,

        'baseCredit',
          0,

        'description',
          'Inventory Purchase - '
          ||
          v_purchase.purchase_number,

        'supplierId',
          v_purchase.supplier_id
      )
    );


  /* =======================================================
   * Recoverable VAT Debit
   * ======================================================= */

  if
    v_recoverable_vat_amount > 0
  then

    v_lines :=
      v_lines
      ||
      jsonb_build_array(

        jsonb_build_object(
          'glAccountId',
            v_vat_recoverable_account_id,

          'debit',
            v_recoverable_vat_amount,

          'credit',
            0,

          'baseDebit',
            v_base_recoverable_vat_amount,

          'baseCredit',
            0,

          'description',
            'Recoverable Input VAT - '
            ||
            v_purchase.purchase_number,

          'supplierId',
            v_purchase.supplier_id
        )
      );

  end if;


  /* =======================================================
   * Pending VAT Debit
   * ======================================================= */

  if
    v_pending_vat_amount > 0
  then

    v_lines :=
      v_lines
      ||
      jsonb_build_array(

        jsonb_build_object(
          'glAccountId',
            v_vat_pending_account_id,

          'debit',
            v_pending_vat_amount,

          'credit',
            0,

          'baseDebit',
            v_base_pending_vat_amount,

          'baseCredit',
            0,

          'description',
            'Input VAT Pending - '
            ||
            v_purchase.purchase_number,

          'supplierId',
            v_purchase.supplier_id
        )
      );

  end if;


  /* =======================================================
   * Accounts Payable Credit
   * ======================================================= */

  v_lines :=
    v_lines
    ||
    jsonb_build_array(

      jsonb_build_object(
        'glAccountId',
          v_accounts_payable_account_id,

        'debit',
          0,

        'credit',
          v_payable_amount,

        'baseDebit',
          0,

        'baseCredit',
          v_base_payable_amount,

        'description',
          'Accounts Payable - '
          ||
          v_purchase.purchase_number,

        'supplierId',
          v_purchase.supplier_id
      )
    );


  /* =======================================================
   * Post Through Controlled GL Engine
   *
   * Migration 088 provides:
   *
   * - open-period validation
   * - GL account validation
   * - duplicate-source protection
   * - journal balancing
   * - immutable posting
   * - idempotent ERP source handling
   * ======================================================= */

  v_journal_id :=
    public.post_erp_gl_journal(
      'quick_purchase',
      v_purchase.id,
      v_purchase.purchase_number,
      v_purchase.purchase_date,
      v_purchase.purchase_date,

      'Quick Purchase liability recognition - '
      ||
      v_purchase.purchase_number,

      v_purchase.currency_code,
      v_purchase.exchange_rate,
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
  public.post_quick_purchase_gl(
    uuid
  )
from public;


grant execute
on function
  public.post_quick_purchase_gl(
    uuid
  )
to authenticated;


/* =========================================================
 * 3. Documentation
 * ========================================================= */

comment on function
  public.post_quick_purchase_gl(
    uuid
  )
is
  'Posts a registered-supplier Quick Purchase to the General Ledger by debiting Inventory plus applicable Recoverable/Pending Input VAT and crediting Accounts Payable. Supplier Payments remain a separate accounting event.';