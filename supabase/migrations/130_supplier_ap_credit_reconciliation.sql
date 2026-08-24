/*
 * =========================================================
 * 130 — Supplier AP & Credit Reconciliation
 *
 * PART A — Supplier Payable Summary
 *
 * PURPOSE
 * -------
 *
 * Extends the existing Supplier Payable intelligence so that
 * management reporting includes:
 *
 *   1. Supplier payment advances
 *   2. Available Supplier Return credits
 *
 *
 * ACCOUNTING MODEL
 * ----------------
 *
 * Gross Supplier Payable
 *   -
 * Payment Supplier Advances
 *   -
 * Available Supplier Return Credits
 *   =
 * Net Payable Exposure
 *
 *
 * IMPORTANT
 * ---------
 *
 * Existing supplier_advance semantics are preserved.
 *
 * supplier_advance continues to mean:
 *
 *   unallocated posted Supplier Payments
 *
 * Supplier Return credit is exposed separately.
 *
 * Existing view column positions are preserved. New columns
 * are appended after net_payable_exposure.
 * =========================================================
 */
create
or replace view public.supplier_payable_summary with (security_invoker = true) as with payable as (
    select
        open_item.supplier_id,
        count(*) as open_purchase_count,
        sum(open_item.base_outstanding_amount) as total_payable,
        sum(
            case
                when open_item.aging_bucket = 'current' then open_item.base_outstanding_amount
                else 0
            end
        ) as current_amount,
        sum(
            case
                when open_item.aging_bucket = '1_30' then open_item.base_outstanding_amount
                else 0
            end
        ) as days_1_30_amount,
        sum(
            case
                when open_item.aging_bucket = '31_60' then open_item.base_outstanding_amount
                else 0
            end
        ) as days_31_60_amount,
        sum(
            case
                when open_item.aging_bucket = '61_90' then open_item.base_outstanding_amount
                else 0
            end
        ) as days_61_90_amount,
        sum(
            case
                when open_item.aging_bucket = '90_plus' then open_item.base_outstanding_amount
                else 0
            end
        ) as days_90_plus_amount,
        sum(
            case
                when open_item.days_overdue > 0 then open_item.base_outstanding_amount
                else 0
            end
        ) as overdue_amount,
        max(open_item.days_overdue) as maximum_days_overdue,
        min(open_item.due_date) as oldest_due_date
    from
        public.payable_open_items open_item
    where
        open_item.supplier_id is not null
    group by
        open_item.supplier_id
),
payment_advance as (
    select
        payment.supplier_id,
        sum(
            round(
                payment.unallocated_amount * payment.exchange_rate,
                2
            )
        ) as supplier_advance
    from
        public.supplier_payments payment
    where
        payment.status = 'posted'
        and payment.unallocated_amount > 0
    group by
        payment.supplier_id
),
supplier_return_credit as (
    select
        credit.supplier_id,
        sum(
            round(
                credit.supplier_credit_available * credit.exchange_rate,
                2
            )
        ) as supplier_return_credit
    from
        public.available_supplier_return_credits credit
    where
        credit.supplier_id is not null
        and coalesce(
            credit.supplier_credit_available,
            0
        ) > 0
    group by
        credit.supplier_id
)
select
    supplier.id as supplier_id,
    supplier.company_name as supplier_name,
    supplier.contact_name,
    supplier.phone,
    supplier.email,
    supplier.payment_terms_days,
    coalesce(payable.open_purchase_count, 0) as open_purchase_count,
    round(
        coalesce(payable.total_payable, 0),
        2
    ) as total_payable,
    round(
        coalesce(payable.current_amount, 0),
        2
    ) as current_amount,
    round(
        coalesce(payable.days_1_30_amount, 0),
        2
    ) as days_1_30_amount,
    round(
        coalesce(
            payable.days_31_60_amount,
            0
        ),
        2
    ) as days_31_60_amount,
    round(
        coalesce(
            payable.days_61_90_amount,
            0
        ),
        2
    ) as days_61_90_amount,
    round(
        coalesce(
            payable.days_90_plus_amount,
            0
        ),
        2
    ) as days_90_plus_amount,
    round(
        coalesce(payable.overdue_amount, 0),
        2
    ) as overdue_amount,
    coalesce(payable.maximum_days_overdue, 0) as maximum_days_overdue,
    payable.oldest_due_date,
    round(
        coalesce(
            payment_advance.supplier_advance,
            0
        ),
        2
    ) as supplier_advance,
    round(
        greatest(
            coalesce(
                payable.total_payable,
                0
            ) - coalesce(
                payment_advance.supplier_advance,
                0
            ) - coalesce(
                supplier_return_credit.supplier_return_credit,
                0
            ),
            0
        ),
        2
    ) as net_payable_exposure,
    round(
        coalesce(
            supplier_return_credit.supplier_return_credit,
            0
        ),
        2
    ) as supplier_return_credit,
    round(
        coalesce(
            payment_advance.supplier_advance,
            0
        ) + coalesce(
            supplier_return_credit.supplier_return_credit,
            0
        ),
        2
    ) as total_supplier_credit
from
    public.suppliers supplier
    left join payable on payable.supplier_id = supplier.id
    left join payment_advance on payment_advance.supplier_id = supplier.id
    left join supplier_return_credit on supplier_return_credit.supplier_id = supplier.id
where
    coalesce(payable.total_payable, 0) > 0
    or coalesce(
        payment_advance.supplier_advance,
        0
    ) > 0
    or coalesce(
        supplier_return_credit.supplier_return_credit,
        0
    ) > 0;

/* =========================================================
 * Documentation
 * ========================================================= */
comment on view public.supplier_payable_summary is 'Current supplier payable aging, payment advances, available Supplier Return credits, total supplier credit and net payable exposure.';

/* =========================================================
 * PART B - Supplier Credit-Aware Management Intelligence
 * ========================================================= */
create
or replace function public.get_receivables_payables_intelligence() returns jsonb language plpgsql security definer
set
    search_path = public as $$ declare v_user_id uuid;

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
v_user_id := auth.uid();

if v_user_id is null then raise exception 'Authentication is required.';

end if;

if not public.is_admin() then raise exception 'You are not authorized to view receivables and payables intelligence.';

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
                        days_overdue > 0
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
                        days_overdue > 0
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
                            unallocated_amount * exchange_rate
                        )
                    from
                        public.customer_receipts
                    where
                        status = 'posted'
                        and unallocated_amount > 0
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
                            supplier_advance
                        )
                    from
                        public.supplier_payable_summary
                ),
                0
            ),
            2
        ),
        'supplierReturnCredits',
        round(
            coalesce(
                (
                    select
                        sum(
                            supplier_return_credit
                        )
                    from
                        public.supplier_payable_summary
                ),
                0
            ),
            2
        ),
        'totalSupplierCredits',
        round(
            coalesce(
                (
                    select
                        sum(
                            total_supplier_credit
                        )
                    from
                        public.supplier_payable_summary
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
                        supplier_id is null
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
                            amount * exchange_rate
                        )
                    from
                        public.customer_receipts
                    where
                        status = 'posted'
                        and receipt_date between current_date - 29
                        and current_date
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
                            amount * exchange_rate
                        )
                    from
                        public.supplier_payments
                    where
                        status = 'posted'
                        and payment_date between current_date - 29
                        and current_date
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
                    ) - coalesce(
                        (
                            select
                                sum(
                                    unallocated_amount * exchange_rate
                                )
                            from
                                public.customer_receipts
                            where
                                status = 'posted'
                                and unallocated_amount > 0
                        ),
                        0
                    ),
                    0
                )
            ) - (
                coalesce(
                    (
                        select
                            sum(
                                net_payable_exposure
                            )
                        from
                            public.supplier_payable_summary
                    ),
                    0
                )
            ),
            2
        )
    ) into v_summary;

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
                        when aging_bucket = 'current' then base_outstanding_amount
                        else 0
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
                        when aging_bucket = '1_30' then base_outstanding_amount
                        else 0
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
                        when aging_bucket = '31_60' then base_outstanding_amount
                        else 0
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
                        when aging_bucket = '61_90' then base_outstanding_amount
                        else 0
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
                        when aging_bucket = '90_plus' then base_outstanding_amount
                        else 0
                    end
                ),
                0
            ),
            2
        )
    ) into v_receivable_aging
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
                        when aging_bucket = 'current' then base_outstanding_amount
                        else 0
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
                        when aging_bucket = '1_30' then base_outstanding_amount
                        else 0
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
                        when aging_bucket = '31_60' then base_outstanding_amount
                        else 0
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
                        when aging_bucket = '61_90' then base_outstanding_amount
                        else 0
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
                        when aging_bucket = '90_plus' then base_outstanding_amount
                        else 0
                    end
                ),
                0
            ),
            2
        )
    ) into v_payable_aging
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
                    row_data ->> 'totalReceivable'
                ) :: numeric desc
        ),
        '[]' :: jsonb
    ) into v_top_debtors
from
    (
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
            ) as row_data
        from
            public.customer_receivable_summary
        where
            total_receivable > 0
        order by
            total_receivable desc
        limit
            100
    ) debtor_rows;

/* =======================================================
 * Top Creditors
 * ======================================================= */
select
    coalesce(
        jsonb_agg(
            row_data
            order by
                (
                    row_data ->> 'totalPayable'
                ) :: numeric desc
        ),
        '[]' :: jsonb
    ) into v_top_creditors
from
    (
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
                'supplierReturnCredit',
                supplier_return_credit,
                'totalSupplierCredit',
                total_supplier_credit,
                'netPayableExposure',
                net_payable_exposure,
                'maximumDaysOverdue',
                maximum_days_overdue,
                'oldestDueDate',
                oldest_due_date
            ) as row_data
        from
            public.supplier_payable_summary
        where
            total_payable > 0
            or total_supplier_credit > 0
        order by
            total_payable desc
        limit
            100
    ) creditor_rows;

/* =======================================================
 * Most Overdue Receivables
 * ======================================================= */
select
    coalesce(
        jsonb_agg(
            row_data
            order by
                (
                    row_data ->> 'daysOverdue'
                ) :: integer desc,
                (
                    row_data ->> 'baseOutstandingAmount'
                ) :: numeric desc
        ),
        '[]' :: jsonb
    ) into v_overdue_receivables
from
    (
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
            ) as row_data
        from
            public.receivable_open_items
        where
            days_overdue > 0
        order by
            days_overdue desc,
            base_outstanding_amount desc
        limit
            50
    ) overdue_rows;

/* =======================================================
 * Most Overdue Payables
 * ======================================================= */
select
    coalesce(
        jsonb_agg(
            row_data
            order by
                (
                    row_data ->> 'daysOverdue'
                ) :: integer desc,
                (
                    row_data ->> 'baseOutstandingAmount'
                ) :: numeric desc
        ),
        '[]' :: jsonb
    ) into v_overdue_payables
from
    (
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
            ) as row_data
        from
            public.payable_open_items
        where
            days_overdue > 0
        order by
            days_overdue desc,
            base_outstanding_amount desc
        limit
            50
    ) overdue_rows;

/* =======================================================
 * Recent Customer Collections
 * ======================================================= */
select
    coalesce(
        jsonb_agg(
            row_data
            order by
                row_data ->> 'receiptDate' desc
        ),
        '[]' :: jsonb
    ) into v_recent_receipts
from
    (
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
                    receipt.amount * receipt.exchange_rate,
                    2
                ),
                'allocatedAmount',
                receipt.allocated_amount,
                'unallocatedAmount',
                receipt.unallocated_amount,
                'referenceNumber',
                receipt.reference_number
            ) as row_data
        from
            public.customer_receipts receipt
            inner join public.customers customer on customer.id = receipt.customer_id
        where
            receipt.status = 'posted'
        order by
            receipt.receipt_date desc,
            receipt.created_at desc
        limit
            20
    ) receipt_rows;

/* =======================================================
 * Recent Supplier Payments
 * ======================================================= */
select
    coalesce(
        jsonb_agg(
            row_data
            order by
                row_data ->> 'paymentDate' desc
        ),
        '[]' :: jsonb
    ) into v_recent_supplier_payments
from
    (
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
                    payment.amount * payment.exchange_rate,
                    2
                ),
                'allocatedAmount',
                payment.allocated_amount,
                'unallocatedAmount',
                payment.unallocated_amount,
                'referenceNumber',
                payment.reference_number
            ) as row_data
        from
            public.supplier_payments payment
            inner join public.suppliers supplier on supplier.id = payment.supplier_id
        where
            payment.status = 'posted'
        order by
            payment.payment_date desc,
            payment.created_at desc
        limit
            20
    ) payment_rows;

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
                overdue_amount > 0
        ),
        'customersOverCreditLimit',
        (
            select
                count(*)
            from
                public.customer_receivable_summary
            where
                over_credit_limit = true
        ),
        'customers90Plus',
        (
            select
                count(*)
            from
                public.customer_receivable_summary
            where
                days_90_plus_amount > 0
        ),
        'suppliersWithOverdueBalance',
        (
            select
                count(*)
            from
                public.supplier_payable_summary
            where
                overdue_amount > 0
        ),
        'suppliers90Plus',
        (
            select
                count(*)
            from
                public.supplier_payable_summary
            where
                days_90_plus_amount > 0
        ),
        'oldestReceivableDays',
        coalesce(
            (
                select
                    max(days_overdue)
                from
                    public.receivable_open_items
            ),
            0
        ),
        'oldestPayableDays',
        coalesce(
            (
                select
                    max(days_overdue)
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
                        aging_bucket = '90_plus'
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
                        aging_bucket = '90_plus'
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
                supplier_id is null
        )
    ) into v_risks;

/* =======================================================
 * Final Management Payload
 * ======================================================= */
return jsonb_build_object(
    'referenceDate',
    current_date,
    'generatedAt',
    now(),
    'summary',
    coalesce(
        v_summary,
        '{}' :: jsonb
    ),
    'receivableAging',
    coalesce(
        v_receivable_aging,
        '{}' :: jsonb
    ),
    'payableAging',
    coalesce(
        v_payable_aging,
        '{}' :: jsonb
    ),
    'topDebtors',
    coalesce(
        v_top_debtors,
        '[]' :: jsonb
    ),
    'topCreditors',
    coalesce(
        v_top_creditors,
        '[]' :: jsonb
    ),
    'overdueReceivables',
    coalesce(
        v_overdue_receivables,
        '[]' :: jsonb
    ),
    'overduePayables',
    coalesce(
        v_overdue_payables,
        '[]' :: jsonb
    ),
    'recentReceipts',
    coalesce(
        v_recent_receipts,
        '[]' :: jsonb
    ),
    'recentSupplierPayments',
    coalesce(
        v_recent_supplier_payments,
        '[]' :: jsonb
    ),
    'risks',
    coalesce(v_risks, '{}' :: jsonb)
);

end;

$$;
