/*
 * =========================================================
 * 189 - Add Sales Order Invoice Adjustments
 *
 * PURPOSE
 * -------
 * Add explicit Sales Order header-level fields for:
 *
 *   1. Invoice discount
 *   2. Round-off adjustment
 *
 * Existing shipping_amount remains the canonical field for
 * delivery charges.
 *
 * IMPORTANT
 * ---------
 * This migration only adds the data model.
 *
 * It does NOT yet change:
 *   - Sales Order total calculations
 *   - Quick Sale calculations
 *   - VAT calculations
 *   - General Ledger posting
 *   - Invoice presentation
 *
 * Those integrations will be implemented separately.
 * =========================================================
 */


alter table public.sales_orders
  add column if not exists
    invoice_discount_amount numeric(18, 2)
      not null
      default 0,

  add column if not exists
    round_off_amount numeric(18, 2)
      not null
      default 0;


/*
 * ---------------------------------------------------------
 * Invoice Discount Validation
 *
 * Discount cannot be negative.
 * ---------------------------------------------------------
 */

alter table public.sales_orders
  drop constraint if exists
    sales_orders_invoice_discount_check;

alter table public.sales_orders
  add constraint
    sales_orders_invoice_discount_check
  check (
    invoice_discount_amount >= 0
  );


/*
 * ---------------------------------------------------------
 * Round-Off Validation
 *
 * Round-off intentionally supports:
 *
 *   negative value -> reduce invoice
 *   positive value -> increase invoice
 *
 * Keep the permitted adjustment deliberately small.
 * ---------------------------------------------------------
 */

alter table public.sales_orders
  drop constraint if exists
    sales_orders_round_off_check;

alter table public.sales_orders
  add constraint
    sales_orders_round_off_check
  check (
    round_off_amount between -10.00 and 10.00
  );


/*
 * ---------------------------------------------------------
 * Documentation
 * ---------------------------------------------------------
 */

comment on column
  public.sales_orders.invoice_discount_amount
is
  'Header-level invoice discount applied in addition to any Sales Order item discounts.';


comment on column
  public.sales_orders.round_off_amount
is
  'Final invoice round-off adjustment. Negative reduces the invoice total; positive increases the invoice total.';


comment on column
  public.sales_orders.shipping_amount
is
  'Sales Order delivery/shipping charge. Displayed as Delivery Charges in Quick Sale.';