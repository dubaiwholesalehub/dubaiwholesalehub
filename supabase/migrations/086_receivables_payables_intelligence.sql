/*
 * =========================================================
 * 086 — Receivables & Payables Intelligence
 *
 * Purpose
 * -------
 *
 * Management intelligence over the EXISTING:
 *
 * Customer Receipts
 * Customer Receipt Allocations
 * Sales Order balances
 * Supplier Payments
 * Supplier Payment Allocations
 * Quick Purchase balances
 * Customer Advances
 * Supplier Advances
 *
 * This migration DOES NOT create another AR/AP ledger.
 *
 *
 * Accounting sources of truth
 * ----------------------------
 *
 * Customer Receivable
 *
 *   sales_orders.balance_due
 *
 *   balance_due itself is synchronized from posted
 *   Customer Receipt allocations.
 *
 *
 * Supplier Payable
 *
 *   quick_purchases.balance_due
 *
 *   balance_due itself is synchronized from posted
 *   Supplier Payment allocations and legacy opening payment.
 *
 *
 * Base amounts
 * ------------
 *
 *   document amount × exchange_rate
 *
 * The ERP operational base currency is currently AED.
 *
 *
 * Aging
 * -----
 *
 * Current
 * 1–30 days
 * 31–60 days
 * 61–90 days
 * 90+ days
 *
 *
 * IMPORTANT
 * ---------
 *
 * This is CURRENT exposure intelligence.
 *
 * It does not attempt to reconstruct historical AR/AP
 * balances as of a past reporting date.
 * =========================================================
 */


/* =========================================================
 * 1. Supplier Default Payment Terms
 *
 * Customer master already has payment_terms_days.
 *
 * Supplier master did not previously have equivalent
 * structured terms.
 * ========================================================= */

alter table
  public.suppliers

add column if not exists
  payment_terms_days integer
  not null
  default 0;


do $$
begin

  if not exists (
    select
      1

    from
      pg_constraint

    where
      conname =
        'suppliers_payment_terms_days_check'

      and
      conrelid =
        'public.suppliers'::regclass
  )
  then

    alter table
      public.suppliers

    add constraint
      suppliers_payment_terms_days_check

    check (
      payment_terms_days >=
      0
    );

  end if;

end;
$$;


/* =========================================================
 * 2. Quick Purchase Payment-Term Snapshot
 *
 * The supplier's terms are copied onto the Quick Purchase
 * when the purchase is created.
 *
 * Historical purchase due dates therefore do NOT move when
 * supplier master terms are later changed.
 *
 * Existing purchases receive 0 days because we cannot safely
 * invent historical supplier terms.
 * ========================================================= */

alter table
  public.quick_purchases

add column if not exists
  payment_terms_days integer
  not null
  default 0;


do $$
begin

  if not exists (
    select
      1

    from
      pg_constraint

    where
      conname =
        'quick_purchases_payment_terms_days_check'

      and
      conrelid =
        'public.quick_purchases'::regclass
  )
  then

    alter table
      public.quick_purchases

    add constraint
      quick_purchases_payment_terms_days_check

    check (
      payment_terms_days >=
      0
    );

  end if;

end;
$$;


/* =========================================================
 * 3. Snapshot Supplier Terms on New Quick Purchase
 *
 * Existing Quick Purchase screens do not need to change.
 *
 * If the purchase is created against a registered supplier,
 * supplier.payment_terms_days is copied automatically.
 *
 * Local / anonymous shop purchases remain 0 days.
 * ========================================================= */

create or replace function
  public.snapshot_quick_purchase_payment_terms()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_supplier_terms integer;

begin

  if
    new.supplier_id
      is not null

    and
    coalesce(
      new.payment_terms_days,
      0
    ) =
    0
  then

    select
      payment_terms_days

    into
      v_supplier_terms

    from
      public.suppliers

    where
      id =
        new.supplier_id;


    if found then

      new.payment_terms_days :=
        coalesce(
          v_supplier_terms,
          0
        );

    end if;

  end if;


  return
    new;

end;
$$;


drop trigger if exists
  snapshot_quick_purchase_payment_terms
on
  public.quick_purchases;


create trigger
  snapshot_quick_purchase_payment_terms

before insert
on public.quick_purchases

for each row

execute function
  public.snapshot_quick_purchase_payment_terms();


/* =========================================================
 * 4. Receivable Open Items
 *
 * Draft orders are NOT receivables.
 *
 * Cancelled / closed orders are excluded.
 *
 * Due date:
 *
 *   order_date + payment_terms_days
 *
 * balance_due remains the existing ERP source of truth.
 * ========================================================= */

create or replace view
  public.receivable_open_items

with (
  security_invoker = true
)

as

select
  sales_order.id
    as sales_order_id,

  sales_order.order_number,

  sales_order.customer_id,

  customer.customer_number,

  customer.display_name
    as customer_name,

  customer.company_name,

  customer.currency_code
    as customer_currency_code,

  customer.credit_limit,

  sales_order.order_date,

  sales_order.payment_terms_days,

  (
    sales_order.order_date
    +
    sales_order.payment_terms_days
  )
    as due_date,

  greatest(
    current_date
    -
    (
      sales_order.order_date
      +
      sales_order.payment_terms_days
    ),
    0
  )
    as days_overdue,

  case

    when
      (
        sales_order.order_date
        +
        sales_order.payment_terms_days
      )
      >=
      current_date
    then
      'current'


    when
      current_date
      -
      (
        sales_order.order_date
        +
        sales_order.payment_terms_days
      )
      between
        1
        and
        30
    then
      '1_30'


    when
      current_date
      -
      (
        sales_order.order_date
        +
        sales_order.payment_terms_days
      )
      between
        31
        and
        60
    then
      '31_60'


    when
      current_date
      -
      (
        sales_order.order_date
        +
        sales_order.payment_terms_days
      )
      between
        61
        and
        90
    then
      '61_90'


    else
      '90_plus'

  end
    as aging_bucket,

  sales_order.currency_code,

  sales_order.exchange_rate,

  sales_order.grand_total,

  sales_order.paid_amount,

  sales_order.balance_due
    as outstanding_amount,

  round(
    sales_order.balance_due
    *
    sales_order.exchange_rate,
    2
  )
    as base_outstanding_amount,

  sales_order.payment_status,

  sales_order.status,

  sales_order.source,

  sales_order.customer_reference,

  sales_order.external_reference

from
  public.sales_orders
    sales_order

inner join
  public.customers
    customer

  on
    customer.id =
      sales_order.customer_id

where
  sales_order.status in (
    'confirmed',
    'processing',
    'partially_fulfilled',
    'fulfilled',
    'completed'
  )

  and
    sales_order.balance_due >
      0;


/* =========================================================
 * 5. Payable Open Items
 *
 * Posted Quick Purchases only.
 *
 * Supplier may be NULL for anonymous / local-shop purchase.
 *
 * Due date:
 *
 *   purchase_date + payment_terms_days
 * ========================================================= */

create or replace view
  public.payable_open_items

with (
  security_invoker = true
)

as

select
  purchase.id
    as quick_purchase_id,

  purchase.purchase_number,

  purchase.purchase_date,

  purchase.supplier_id,

  supplier.company_name
    as supplier_name,

  purchase.store_name,

  purchase.supplier_invoice_number,

  purchase.supplier_invoice_date,

  purchase.payment_terms_days,

  (
    purchase.purchase_date
    +
    purchase.payment_terms_days
  )
    as due_date,

  greatest(
    current_date
    -
    (
      purchase.purchase_date
      +
      purchase.payment_terms_days
    ),
    0
  )
    as days_overdue,

  case

    when
      (
        purchase.purchase_date
        +
        purchase.payment_terms_days
      )
      >=
      current_date
    then
      'current'


    when
      current_date
      -
      (
        purchase.purchase_date
        +
        purchase.payment_terms_days
      )
      between
        1
        and
        30
    then
      '1_30'


    when
      current_date
      -
      (
        purchase.purchase_date
        +
        purchase.payment_terms_days
      )
      between
        31
        and
        60
    then
      '31_60'


    when
      current_date
      -
      (
        purchase.purchase_date
        +
        purchase.payment_terms_days
      )
      between
        61
        and
        90
    then
      '61_90'


    else
      '90_plus'

  end
    as aging_bucket,

  purchase.currency_code,

  purchase.exchange_rate,

  purchase.grand_total,

  purchase.paid_amount,

  purchase.balance_due
    as outstanding_amount,

  round(
    purchase.balance_due
    *
    purchase.exchange_rate,
    2
  )
    as base_outstanding_amount,

  purchase.payment_status,

  purchase.status,

  purchase.warehouse_id

from
  public.quick_purchases
    purchase

left join
  public.suppliers
    supplier

  on
    supplier.id =
      purchase.supplier_id

where
  purchase.status =
    'posted'

  and
    purchase.balance_due >
      0;


/* =========================================================
 * 6. Customer Receivable Summary
 *
 * One row per customer with current open receivables,
 * aging, advances and credit-control information.
 *
 * Credit limit comparison is performed only when customer
 * currency is AED because customer.credit_limit is stored
 * without an independent FX conversion rate.
 * ========================================================= */

create or replace view
  public.customer_receivable_summary

with (
  security_invoker = true
)

as

with receivable as (

  select
    open_item.customer_id,

    count(*)
      as open_order_count,

    sum(
      open_item.base_outstanding_amount
    )
      as total_receivable,

    sum(
      case
        when
          open_item.aging_bucket =
            'current'
        then
          open_item.base_outstanding_amount
        else
          0
      end
    )
      as current_amount,

    sum(
      case
        when
          open_item.aging_bucket =
            '1_30'
        then
          open_item.base_outstanding_amount
        else
          0
      end
    )
      as days_1_30_amount,

    sum(
      case
        when
          open_item.aging_bucket =
            '31_60'
        then
          open_item.base_outstanding_amount
        else
          0
      end
    )
      as days_31_60_amount,

    sum(
      case
        when
          open_item.aging_bucket =
            '61_90'
        then
          open_item.base_outstanding_amount
        else
          0
      end
    )
      as days_61_90_amount,

    sum(
      case
        when
          open_item.aging_bucket =
            '90_plus'
        then
          open_item.base_outstanding_amount
        else
          0
      end
    )
      as days_90_plus_amount,

    sum(
      case
        when
          open_item.days_overdue >
            0
        then
          open_item.base_outstanding_amount
        else
          0
      end
    )
      as overdue_amount,

    max(
      open_item.days_overdue
    )
      as maximum_days_overdue,

    min(
      open_item.due_date
    )
      as oldest_due_date

  from
    public.receivable_open_items
      open_item

  group by
    open_item.customer_id
),


advance as (

  select
    receipt.customer_id,

    sum(
      round(
        receipt.unallocated_amount
        *
        receipt.exchange_rate,
        2
      )
    )
      as customer_advance

  from
    public.customer_receipts
      receipt

  where
    receipt.status =
      'posted'

    and
      receipt.unallocated_amount >
        0

  group by
    receipt.customer_id
)


select
  customer.id
    as customer_id,

  customer.customer_number,

  customer.display_name
    as customer_name,

  customer.company_name,

  customer.currency_code,

  customer.credit_limit,

  customer.payment_terms_days,

  coalesce(
    receivable.open_order_count,
    0
  )
    as open_order_count,

  round(
    coalesce(
      receivable.total_receivable,
      0
    ),
    2
  )
    as total_receivable,

  round(
    coalesce(
      receivable.current_amount,
      0
    ),
    2
  )
    as current_amount,

  round(
    coalesce(
      receivable.days_1_30_amount,
      0
    ),
    2
  )
    as days_1_30_amount,

  round(
    coalesce(
      receivable.days_31_60_amount,
      0
    ),
    2
  )
    as days_31_60_amount,

  round(
    coalesce(
      receivable.days_61_90_amount,
      0
    ),
    2
  )
    as days_61_90_amount,

  round(
    coalesce(
      receivable.days_90_plus_amount,
      0
    ),
    2
  )
    as days_90_plus_amount,

  round(
    coalesce(
      receivable.overdue_amount,
      0
    ),
    2
  )
    as overdue_amount,

  coalesce(
    receivable.maximum_days_overdue,
    0
  )
    as maximum_days_overdue,

  receivable.oldest_due_date,

  round(
    coalesce(
      advance.customer_advance,
      0
    ),
    2
  )
    as customer_advance,

  round(
    greatest(
      coalesce(
        receivable.total_receivable,
        0
      )
      -
      coalesce(
        advance.customer_advance,
        0
      ),
      0
    ),
    2
  )
    as net_receivable_exposure,

  case
    when
      upper(
        customer.currency_code
      ) =
      'AED'

      and
      customer.credit_limit >
        0
    then
      round(
        coalesce(
          receivable.total_receivable,
          0
        )
        /
        customer.credit_limit
        *
        100,
        2
      )

    else
      null

  end
    as credit_utilization_percentage,

  case
    when
      upper(
        customer.currency_code
      ) =
      'AED'

      and
      customer.credit_limit >
        0
    then
      round(
        greatest(
          customer.credit_limit
          -
          coalesce(
            receivable.total_receivable,
            0
          ),
          0
        ),
        2
      )

    else
      null

  end
    as available_credit,

  case
    when
      upper(
        customer.currency_code
      ) =
      'AED'

      and
      customer.credit_limit >
        0

      and
      coalesce(
        receivable.total_receivable,
        0
      )
      >
      customer.credit_limit
    then
      true

    else
      false

  end
    as over_credit_limit

from
  public.customers
    customer

left join
  receivable

  on
    receivable.customer_id =
      customer.id

left join
  advance

  on
    advance.customer_id =
      customer.id

where
  coalesce(
    receivable.total_receivable,
    0
  )
  >
  0

  or

  coalesce(
    advance.customer_advance,
    0
  )
  >
  0;


/* =========================================================
 * 7. Supplier Payable Summary
 * ========================================================= */

create or replace view
  public.supplier_payable_summary

with (
  security_invoker = true
)

as

with payable as (

  select
    open_item.supplier_id,

    count(*)
      as open_purchase_count,

    sum(
      open_item.base_outstanding_amount
    )
      as total_payable,

    sum(
      case
        when
          open_item.aging_bucket =
            'current'
        then
          open_item.base_outstanding_amount
        else
          0
      end
    )
      as current_amount,

    sum(
      case
        when
          open_item.aging_bucket =
            '1_30'
        then
          open_item.base_outstanding_amount
        else
          0
      end
    )
      as days_1_30_amount,

    sum(
      case
        when
          open_item.aging_bucket =
            '31_60'
        then
          open_item.base_outstanding_amount
        else
          0
      end
    )
      as days_31_60_amount,

    sum(
      case
        when
          open_item.aging_bucket =
            '61_90'
        then
          open_item.base_outstanding_amount
        else
          0
      end
    )
      as days_61_90_amount,

    sum(
      case
        when
          open_item.aging_bucket =
            '90_plus'
        then
          open_item.base_outstanding_amount
        else
          0
      end
    )
      as days_90_plus_amount,

    sum(
      case
        when
          open_item.days_overdue >
            0
        then
          open_item.base_outstanding_amount
        else
          0
      end
    )
      as overdue_amount,

    max(
      open_item.days_overdue
    )
      as maximum_days_overdue,

    min(
      open_item.due_date
    )
      as oldest_due_date

  from
    public.payable_open_items
      open_item

  where
    open_item.supplier_id
      is not null

  group by
    open_item.supplier_id
),


advance as (

  select
    payment.supplier_id,

    sum(
      round(
        payment.unallocated_amount
        *
        payment.exchange_rate,
        2
      )
    )
      as supplier_advance

  from
    public.supplier_payments
      payment

  where
    payment.status =
      'posted'

    and
      payment.unallocated_amount >
        0

  group by
    payment.supplier_id
)


select
  supplier.id
    as supplier_id,

  supplier.company_name
    as supplier_name,

  supplier.contact_name,

  supplier.phone,

  supplier.email,

  supplier.payment_terms_days,

  coalesce(
    payable.open_purchase_count,
    0
  )
    as open_purchase_count,

  round(
    coalesce(
      payable.total_payable,
      0
    ),
    2
  )
    as total_payable,

  round(
    coalesce(
      payable.current_amount,
      0
    ),
    2
  )
    as current_amount,

  round(
    coalesce(
      payable.days_1_30_amount,
      0
    ),
    2
  )
    as days_1_30_amount,

  round(
    coalesce(
      payable.days_31_60_amount,
      0
    ),
    2
  )
    as days_31_60_amount,

  round(
    coalesce(
      payable.days_61_90_amount,
      0
    ),
    2
  )
    as days_61_90_amount,

  round(
    coalesce(
      payable.days_90_plus_amount,
      0
    ),
    2
  )
    as days_90_plus_amount,

  round(
    coalesce(
      payable.overdue_amount,
      0
    ),
    2
  )
    as overdue_amount,

  coalesce(
    payable.maximum_days_overdue,
    0
  )
    as maximum_days_overdue,

  payable.oldest_due_date,

  round(
    coalesce(
      advance.supplier_advance,
      0
    ),
    2
  )
    as supplier_advance,

  round(
    greatest(
      coalesce(
        payable.total_payable,
        0
      )
      -
      coalesce(
        advance.supplier_advance,
        0
      ),
      0
    ),
    2
  )
    as net_payable_exposure

from
  public.suppliers
    supplier

left join
  payable

  on
    payable.supplier_id =
      supplier.id

left join
  advance

  on
    advance.supplier_id =
      supplier.id

where
  coalesce(
    payable.total_payable,
    0
  )
  >
  0

  or

  coalesce(
    advance.supplier_advance,
    0
  )
  >
  0;


/* =========================================================
 * 8. Performance Indexes
 * ========================================================= */

create index if not exists
  sales_orders_receivable_open_idx

on public.sales_orders (
  customer_id,
  order_date
)

where
  balance_due >
    0

  and
  status in (
    'confirmed',
    'processing',
    'partially_fulfilled',
    'fulfilled',
    'completed'
  );


create index if not exists
  quick_purchases_payable_open_idx

on public.quick_purchases (
  supplier_id,
  purchase_date
)

where
  balance_due >
    0

  and
  status =
    'posted';


create index if not exists
  customer_receipts_unallocated_idx

on public.customer_receipts (
  customer_id,
  receipt_date
)

where
  status =
    'posted'

  and
  unallocated_amount >
    0;


create index if not exists
  supplier_payments_unallocated_idx

on public.supplier_payments (
  supplier_id,
  payment_date
)

where
  status =
    'posted'

  and
  unallocated_amount >
    0;


/* =========================================================
 * 9. Management Intelligence RPC
 *
 * Returns current AR / AP management intelligence in
 * one database call.
 * ========================================================= */

create or replace function
  public.get_receivables_payables_intelligence()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;

  v_summary jsonb;

  v_receivable_aging jsonb;

  v_payable_aging jsonb;

  v_top_debtors jsonb;

  v_top_creditors jsonb;

  v_overdue_receivables jsonb;

  v_overdue_payables jsonb;

  v_recent_receipts jsonb;

  v_recent_supplier_payments jsonb;

  v_risks jsonb;

begin

  /* =======================================================
   * Security
   * ======================================================= */

  v_user_id :=
    auth.uid();


  if
    v_user_id is null
  then
    raise exception
      'Authentication is required.';
  end if;


  if not public.is_admin() then
    raise exception
      'You are not authorized to view receivables and payables intelligence.';
  end if;


  /* =======================================================
   * Summary
   * ======================================================= */

  select
    jsonb_build_object(

      'baseCurrency',
        'AED',


      'totalReceivables',
        round(
          coalesce(
            (
              select
                sum(
                  base_outstanding_amount
                )

              from
                public.receivable_open_items
            ),
            0
          ),
          2
        ),


      'overdueReceivables',
        round(
          coalesce(
            (
              select
                sum(
                  base_outstanding_amount
                )

              from
                public.receivable_open_items

              where
                days_overdue >
                  0
            ),
            0
          ),
          2
        ),


      'totalPayables',
        round(
          coalesce(
            (
              select
                sum(
                  base_outstanding_amount
                )

              from
                public.payable_open_items
            ),
            0
          ),
          2
        ),


      'overduePayables',
        round(
          coalesce(
            (
              select
                sum(
                  base_outstanding_amount
                )

              from
                public.payable_open_items

              where
                days_overdue >
                  0
            ),
            0
          ),
          2
        ),


      'customerAdvances',
        round(
          coalesce(
            (
              select
                sum(
                  unallocated_amount
                  *
                  exchange_rate
                )

              from
                public.customer_receipts

              where
                status =
                  'posted'

                and
                unallocated_amount >
                  0
            ),
            0
          ),
          2
        ),


      'supplierAdvances',
        round(
          coalesce(
            (
              select
                sum(
                  unallocated_amount
                  *
                  exchange_rate
                )

              from
                public.supplier_payments

              where
                status =
                  'posted'

                and
                unallocated_amount >
                  0
            ),
            0
          ),
          2
        ),


      'unassignedPayables',
        round(
          coalesce(
            (
              select
                sum(
                  base_outstanding_amount
                )

              from
                public.payable_open_items

              where
                supplier_id
                  is null
            ),
            0
          ),
          2
        ),


      'openReceivableCount',
        (
          select
            count(*)

          from
            public.receivable_open_items
        ),


      'openPayableCount',
        (
          select
            count(*)

          from
            public.payable_open_items
        ),


      'collectionsLast30Days',
        round(
          coalesce(
            (
              select
                sum(
                  amount
                  *
                  exchange_rate
                )

              from
                public.customer_receipts

              where
                status =
                  'posted'

                and
                receipt_date
                  between
                    current_date - 29
                    and
                    current_date
            ),
            0
          ),
          2
        ),


      'supplierPaymentsLast30Days',
        round(
          coalesce(
            (
              select
                sum(
                  amount
                  *
                  exchange_rate
                )

              from
                public.supplier_payments

              where
                status =
                  'posted'

                and
                payment_date
                  between
                    current_date - 29
                    and
                    current_date
            ),
            0
          ),
          2
        ),


      /*
       * Trade position:
       *
       * Receivable after customer advances
       * MINUS
       * Payable after supplier advances
       */
      'netTradePosition',
        round(
          (
            greatest(
              coalesce(
                (
                  select
                    sum(
                      base_outstanding_amount
                    )

                  from
                    public.receivable_open_items
                ),
                0
              )
              -
              coalesce(
                (
                  select
                    sum(
                      unallocated_amount
                      *
                      exchange_rate
                    )

                  from
                    public.customer_receipts

                  where
                    status =
                      'posted'

                    and
                    unallocated_amount >
                      0
                ),
                0
              ),
              0
            )
          )
          -
          (
            greatest(
              coalesce(
                (
                  select
                    sum(
                      base_outstanding_amount
                    )

                  from
                    public.payable_open_items
                ),
                0
              )
              -
              coalesce(
                (
                  select
                    sum(
                      unallocated_amount
                      *
                      exchange_rate
                    )

                  from
                    public.supplier_payments

                  where
                    status =
                      'posted'

                    and
                    unallocated_amount >
                      0
                ),
                0
              ),
              0
            )
          ),
          2
        )

    )

  into
    v_summary;


  /* =======================================================
   * Receivable Aging
   * ======================================================= */

  select
    jsonb_build_object(

      'current',
        round(
          coalesce(
            sum(
              case
                when
                  aging_bucket =
                    'current'
                then
                  base_outstanding_amount
                else
                  0
              end
            ),
            0
          ),
          2
        ),

      'days1To30',
        round(
          coalesce(
            sum(
              case
                when
                  aging_bucket =
                    '1_30'
                then
                  base_outstanding_amount
                else
                  0
              end
            ),
            0
          ),
          2
        ),

      'days31To60',
        round(
          coalesce(
            sum(
              case
                when
                  aging_bucket =
                    '31_60'
                then
                  base_outstanding_amount
                else
                  0
              end
            ),
            0
          ),
          2
        ),

      'days61To90',
        round(
          coalesce(
            sum(
              case
                when
                  aging_bucket =
                    '61_90'
                then
                  base_outstanding_amount
                else
                  0
              end
            ),
            0
          ),
          2
        ),

      'days90Plus',
        round(
          coalesce(
            sum(
              case
                when
                  aging_bucket =
                    '90_plus'
                then
                  base_outstanding_amount
                else
                  0
              end
            ),
            0
          ),
          2
        )

    )

  into
    v_receivable_aging

  from
    public.receivable_open_items;


  /* =======================================================
   * Payable Aging
   * ======================================================= */

  select
    jsonb_build_object(

      'current',
        round(
          coalesce(
            sum(
              case
                when
                  aging_bucket =
                    'current'
                then
                  base_outstanding_amount
                else
                  0
              end
            ),
            0
          ),
          2
        ),

      'days1To30',
        round(
          coalesce(
            sum(
              case
                when
                  aging_bucket =
                    '1_30'
                then
                  base_outstanding_amount
                else
                  0
              end
            ),
            0
          ),
          2
        ),

      'days31To60',
        round(
          coalesce(
            sum(
              case
                when
                  aging_bucket =
                    '31_60'
                then
                  base_outstanding_amount
                else
                  0
              end
            ),
            0
          ),
          2
        ),

      'days61To90',
        round(
          coalesce(
            sum(
              case
                when
                  aging_bucket =
                    '61_90'
                then
                  base_outstanding_amount
                else
                  0
              end
            ),
            0
          ),
          2
        ),

      'days90Plus',
        round(
          coalesce(
            sum(
              case
                when
                  aging_bucket =
                    '90_plus'
                then
                  base_outstanding_amount
                else
                  0
              end
            ),
            0
          ),
          2
        )

    )

  into
    v_payable_aging

  from
    public.payable_open_items;


  /* =======================================================
   * Top Debtors
   * ======================================================= */

  select
    coalesce(
      jsonb_agg(
        row_data
        order by
          (
            row_data
              ->>
            'totalReceivable'
          )::numeric
          desc
      ),
      '[]'::jsonb
    )

  into
    v_top_debtors

  from (
    select
      jsonb_build_object(

        'customerId',
          customer_id,

        'customerNumber',
          customer_number,

        'customerName',
          customer_name,

        'companyName',
          company_name,

        'currencyCode',
          currency_code,

        'creditLimit',
          credit_limit,

        'openOrderCount',
          open_order_count,

        'totalReceivable',
          total_receivable,

        'overdueAmount',
          overdue_amount,

        'currentAmount',
          current_amount,

        'days1To30',
          days_1_30_amount,

        'days31To60',
          days_31_60_amount,

        'days61To90',
          days_61_90_amount,

        'days90Plus',
          days_90_plus_amount,

        'customerAdvance',
          customer_advance,

        'netReceivableExposure',
          net_receivable_exposure,

        'maximumDaysOverdue',
          maximum_days_overdue,

        'oldestDueDate',
          oldest_due_date,

        'creditUtilizationPercentage',
          credit_utilization_percentage,

        'availableCredit',
          available_credit,

        'overCreditLimit',
          over_credit_limit

      )
        as row_data

    from
      public.customer_receivable_summary

    where
      total_receivable >
        0

    order by
      total_receivable
        desc

    limit
      100
  )
    debtor_rows;


  /* =======================================================
   * Top Creditors
   * ======================================================= */

  select
    coalesce(
      jsonb_agg(
        row_data
        order by
          (
            row_data
              ->>
            'totalPayable'
          )::numeric
          desc
      ),
      '[]'::jsonb
    )

  into
    v_top_creditors

  from (
    select
      jsonb_build_object(

        'supplierId',
          supplier_id,

        'supplierName',
          supplier_name,

        'contactName',
          contact_name,

        'phone',
          phone,

        'email',
          email,

        'paymentTermsDays',
          payment_terms_days,

        'openPurchaseCount',
          open_purchase_count,

        'totalPayable',
          total_payable,

        'overdueAmount',
          overdue_amount,

        'currentAmount',
          current_amount,

        'days1To30',
          days_1_30_amount,

        'days31To60',
          days_31_60_amount,

        'days61To90',
          days_61_90_amount,

        'days90Plus',
          days_90_plus_amount,

        'supplierAdvance',
          supplier_advance,

        'netPayableExposure',
          net_payable_exposure,

        'maximumDaysOverdue',
          maximum_days_overdue,

        'oldestDueDate',
          oldest_due_date

      )
        as row_data

    from
      public.supplier_payable_summary

    where
      total_payable >
        0

    order by
      total_payable
        desc

    limit
      100
  )
    creditor_rows;


  /* =======================================================
   * Most Overdue Receivables
   * ======================================================= */

  select
    coalesce(
      jsonb_agg(
        row_data
        order by
          (
            row_data
              ->>
            'daysOverdue'
          )::integer
          desc,

          (
            row_data
              ->>
            'baseOutstandingAmount'
          )::numeric
          desc
      ),
      '[]'::jsonb
    )

  into
    v_overdue_receivables

  from (
    select
      jsonb_build_object(

        'salesOrderId',
          sales_order_id,

        'orderNumber',
          order_number,

        'customerId',
          customer_id,

        'customerNumber',
          customer_number,

        'customerName',
          customer_name,

        'orderDate',
          order_date,

        'dueDate',
          due_date,

        'daysOverdue',
          days_overdue,

        'agingBucket',
          aging_bucket,

        'currencyCode',
          currency_code,

        'outstandingAmount',
          outstanding_amount,

        'baseOutstandingAmount',
          base_outstanding_amount,

        'paymentStatus',
          payment_status,

        'source',
          source

      )
        as row_data

    from
      public.receivable_open_items

    where
      days_overdue >
        0

    order by
      days_overdue
        desc,

      base_outstanding_amount
        desc

    limit
      50
  )
    overdue_rows;


  /* =======================================================
   * Most Overdue Payables
   * ======================================================= */

  select
    coalesce(
      jsonb_agg(
        row_data
        order by
          (
            row_data
              ->>
            'daysOverdue'
          )::integer
          desc,

          (
            row_data
              ->>
            'baseOutstandingAmount'
          )::numeric
          desc
      ),
      '[]'::jsonb
    )

  into
    v_overdue_payables

  from (
    select
      jsonb_build_object(

        'quickPurchaseId',
          quick_purchase_id,

        'purchaseNumber',
          purchase_number,

        'supplierId',
          supplier_id,

        'supplierName',
          coalesce(
            supplier_name,
            store_name,
            'Unassigned / Local Shop'
          ),

        'supplierInvoiceNumber',
          supplier_invoice_number,

        'purchaseDate',
          purchase_date,

        'dueDate',
          due_date,

        'daysOverdue',
          days_overdue,

        'agingBucket',
          aging_bucket,

        'currencyCode',
          currency_code,

        'outstandingAmount',
          outstanding_amount,

        'baseOutstandingAmount',
          base_outstanding_amount,

        'paymentStatus',
          payment_status

      )
        as row_data

    from
      public.payable_open_items

    where
      days_overdue >
        0

    order by
      days_overdue
        desc,

      base_outstanding_amount
        desc

    limit
      50
  )
    overdue_rows;


  /* =======================================================
   * Recent Customer Collections
   * ======================================================= */

  select
    coalesce(
      jsonb_agg(
        row_data
        order by
          row_data
            ->>
          'receiptDate'
          desc
      ),
      '[]'::jsonb
    )

  into
    v_recent_receipts

  from (
    select
      jsonb_build_object(

        'receiptId',
          receipt.id,

        'receiptNumber',
          receipt.receipt_number,

        'receiptDate',
          receipt.receipt_date,

        'customerId',
          receipt.customer_id,

        'customerName',
          customer.display_name,

        'companyName',
          customer.company_name,

        'paymentMethod',
          receipt.payment_method,

        'currencyCode',
          receipt.currency_code,

        'amount',
          receipt.amount,

        'baseAmount',
          round(
            receipt.amount
            *
            receipt.exchange_rate,
            2
          ),

        'allocatedAmount',
          receipt.allocated_amount,

        'unallocatedAmount',
          receipt.unallocated_amount,

        'referenceNumber',
          receipt.reference_number

      )
        as row_data

    from
      public.customer_receipts
        receipt

    inner join
      public.customers
        customer

      on
        customer.id =
          receipt.customer_id

    where
      receipt.status =
        'posted'

    order by
      receipt.receipt_date
        desc,

      receipt.created_at
        desc

    limit
      20
  )
    receipt_rows;


  /* =======================================================
   * Recent Supplier Payments
   * ======================================================= */

  select
    coalesce(
      jsonb_agg(
        row_data
        order by
          row_data
            ->>
          'paymentDate'
          desc
      ),
      '[]'::jsonb
    )

  into
    v_recent_supplier_payments

  from (
    select
      jsonb_build_object(

        'paymentId',
          payment.id,

        'paymentNumber',
          payment.payment_number,

        'paymentDate',
          payment.payment_date,

        'supplierId',
          payment.supplier_id,

        'supplierName',
          supplier.company_name,

        'paymentMethod',
          payment.payment_method,

        'currencyCode',
          payment.currency_code,

        'amount',
          payment.amount,

        'baseAmount',
          round(
            payment.amount
            *
            payment.exchange_rate,
            2
          ),

        'allocatedAmount',
          payment.allocated_amount,

        'unallocatedAmount',
          payment.unallocated_amount,

        'referenceNumber',
          payment.reference_number

      )
        as row_data

    from
      public.supplier_payments
        payment

    inner join
      public.suppliers
        supplier

      on
        supplier.id =
          payment.supplier_id

    where
      payment.status =
        'posted'

    order by
      payment.payment_date
        desc,

      payment.created_at
        desc

    limit
      20
  )
    payment_rows;


  /* =======================================================
   * Risk Indicators
   * ======================================================= */

  select
    jsonb_build_object(

      'customersWithOverdueBalance',
        (
          select
            count(*)

          from
            public.customer_receivable_summary

          where
            overdue_amount >
              0
        ),


      'customersOverCreditLimit',
        (
          select
            count(*)

          from
            public.customer_receivable_summary

          where
            over_credit_limit =
              true
        ),


      'customers90Plus',
        (
          select
            count(*)

          from
            public.customer_receivable_summary

          where
            days_90_plus_amount >
              0
        ),


      'suppliersWithOverdueBalance',
        (
          select
            count(*)

          from
            public.supplier_payable_summary

          where
            overdue_amount >
              0
        ),


      'suppliers90Plus',
        (
          select
            count(*)

          from
            public.supplier_payable_summary

          where
            days_90_plus_amount >
              0
        ),


      'oldestReceivableDays',
        coalesce(
          (
            select
              max(
                days_overdue
              )

            from
              public.receivable_open_items
          ),
          0
        ),


      'oldestPayableDays',
        coalesce(
          (
            select
              max(
                days_overdue
              )

            from
              public.payable_open_items
          ),
          0
        ),


      'receivable90PlusAmount',
        round(
          coalesce(
            (
              select
                sum(
                  base_outstanding_amount
                )

              from
                public.receivable_open_items

              where
                aging_bucket =
                  '90_plus'
            ),
            0
          ),
          2
        ),


      'payable90PlusAmount',
        round(
          coalesce(
            (
              select
                sum(
                  base_outstanding_amount
                )

              from
                public.payable_open_items

              where
                aging_bucket =
                  '90_plus'
            ),
            0
          ),
          2
        ),


      'unassignedPayableCount',
        (
          select
            count(*)

          from
            public.payable_open_items

          where
            supplier_id
              is null
        )

    )

  into
    v_risks;


  /* =======================================================
   * Final Management Payload
   * ======================================================= */

  return
    jsonb_build_object(

      'referenceDate',
        current_date,

      'generatedAt',
        now(),

      'summary',
        coalesce(
          v_summary,
          '{}'::jsonb
        ),

      'receivableAging',
        coalesce(
          v_receivable_aging,
          '{}'::jsonb
        ),

      'payableAging',
        coalesce(
          v_payable_aging,
          '{}'::jsonb
        ),

      'topDebtors',
        coalesce(
          v_top_debtors,
          '[]'::jsonb
        ),

      'topCreditors',
        coalesce(
          v_top_creditors,
          '[]'::jsonb
        ),

      'overdueReceivables',
        coalesce(
          v_overdue_receivables,
          '[]'::jsonb
        ),

      'overduePayables',
        coalesce(
          v_overdue_payables,
          '[]'::jsonb
        ),

      'recentReceipts',
        coalesce(
          v_recent_receipts,
          '[]'::jsonb
        ),

      'recentSupplierPayments',
        coalesce(
          v_recent_supplier_payments,
          '[]'::jsonb
        ),

      'risks',
        coalesce(
          v_risks,
          '{}'::jsonb
        )
    );

end;
$$;


/* =========================================================
 * 10. Permissions
 * ========================================================= */

revoke all
on function
  public.get_receivables_payables_intelligence()
from public;


grant execute
on function
  public.get_receivables_payables_intelligence()
to authenticated;


/* =========================================================
 * 11. Documentation
 * ========================================================= */

comment on column
  public.suppliers.payment_terms_days
is
  'Default supplier credit/payment term in calendar days. Copied onto newly created Quick Purchases.';


comment on column
  public.quick_purchases.payment_terms_days
is
  'Historical payment-term snapshot used to calculate the Quick Purchase payable due date.';


comment on view
  public.receivable_open_items
is
  'Current open customer receivables derived from confirmed-or-later Sales Orders and existing balance_due values.';


comment on view
  public.payable_open_items
is
  'Current open supplier/local-shop payables derived from posted Quick Purchases and existing balance_due values.';


comment on view
  public.customer_receivable_summary
is
  'Current customer receivable aging, advances, overdue exposure and AED credit-control intelligence.';


comment on view
  public.supplier_payable_summary
is
  'Current supplier payable aging, supplier advances and net payable exposure.';


comment on function
  public.get_receivables_payables_intelligence()
is
  'Returns current AR/AP management intelligence including aging, debtors, creditors, advances, overdue exposure, credit-limit alerts, collection activity and supplier payment activity.';