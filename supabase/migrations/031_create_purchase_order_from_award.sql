-- ============================================================
-- CREATE PURCHASE ORDER FROM AWARDED SUPPLIER QUOTATION
-- Milestone 6.2
-- ============================================================


-- ============================================================
-- 1. PURCHASE ORDER SOURCE
-- ============================================================

create type public.purchase_order_source as enum (
    'manual',
    'rfq_award'
);


comment on type public.purchase_order_source is
'Identifies whether a Purchase Order was created manually or from an RFQ award.';


alter table public.purchase_orders
add column source public.purchase_order_source
not null
default 'manual';


comment on column public.purchase_orders.source is
'Origin of the Purchase Order: manual or rfq_award.';


-- Replace the original source consistency rule with a stronger rule.
alter table public.purchase_orders
drop constraint if exists purchase_orders_source_consistency;


alter table public.purchase_orders
add constraint purchase_orders_source_consistency
check (
    (
        source = 'manual'
        and rfq_id is null
        and supplier_quotation_id is null
    )
    or
    (
        source = 'rfq_award'
        and rfq_id is not null
        and supplier_quotation_id is not null
    )
);


create index idx_purchase_orders_source
on public.purchase_orders(source);


-- ============================================================
-- 2. CREATE PO FROM AWARDED QUOTATION
-- ============================================================

create or replace function public.create_purchase_order_from_award(
    target_rfq_id uuid
)
returns public.purchase_orders
language plpgsql
security definer
set search_path = public
as $$
declare
    target_rfq public.rfqs;
    awarded_quotation public.supplier_quotations;
    created_purchase_order public.purchase_orders;
    existing_purchase_order public.purchase_orders;
    copied_item_count integer;
begin
    -- --------------------------------------------------------
    -- Permission validation
    -- --------------------------------------------------------

    if not public.can_manage_rfqs() then
        raise exception
            'You do not have permission to create Purchase Orders.';
    end if;


    -- --------------------------------------------------------
    -- Lock and validate RFQ
    -- --------------------------------------------------------

    select *
    into target_rfq
    from public.rfqs
    where id = target_rfq_id
    for update;


    if not found then
        raise exception
            'RFQ does not exist.';
    end if;


    if target_rfq.status <> 'awarded' then
        raise exception
            'A Purchase Order can only be created from an awarded RFQ. Current RFQ status: %.',
            target_rfq.status;
    end if;


    if target_rfq.awarded_supplier_id is null then
        raise exception
            'The RFQ does not have an awarded supplier.';
    end if;


    if target_rfq.awarded_quotation_id is null then
        raise exception
            'The RFQ does not have an awarded supplier quotation.';
    end if;


    -- --------------------------------------------------------
    -- Lock and validate awarded quotation
    -- --------------------------------------------------------

    select *
    into awarded_quotation
    from public.supplier_quotations
    where id = target_rfq.awarded_quotation_id
      and rfq_id = target_rfq.id
      and supplier_id = target_rfq.awarded_supplier_id
    for update;


    if not found then
        raise exception
            'The awarded supplier quotation could not be found.';
    end if;


    if awarded_quotation.status <> 'accepted' then
        raise exception
            'Only an accepted supplier quotation can generate a Purchase Order. Current quotation status: %.',
            awarded_quotation.status;
    end if;


    -- --------------------------------------------------------
    -- Prevent duplicate Purchase Orders
    -- --------------------------------------------------------

    select *
    into existing_purchase_order
    from public.purchase_orders
    where supplier_quotation_id = awarded_quotation.id
    limit 1;


    if found then
        raise exception
            'Purchase Order % already exists for this awarded quotation.',
            existing_purchase_order.po_number;
    end if;


    -- --------------------------------------------------------
    -- Ensure quotation contains items
    -- --------------------------------------------------------

    if not exists (
        select 1
        from public.supplier_quotation_items
        where quotation_id = awarded_quotation.id
    ) then
        raise exception
            'The awarded supplier quotation does not contain any items.';
    end if;


    -- --------------------------------------------------------
    -- Create Purchase Order header
    -- --------------------------------------------------------

    insert into public.purchase_orders (
        source,
        status,
        rfq_id,
        supplier_id,
        supplier_quotation_id,
        order_date,
        expected_delivery_date,
        currency_code,
        subtotal,
        discount_amount,
        shipping_amount,
        tax_amount,
        other_charges,
        total_amount,
        payment_terms,
        incoterm,
        loading_port,
        delivery_location,
        delivery_terms,
        lead_time,
        lead_time_days,
        packaging,
        warranty,
        supplier_notes,
        internal_notes,
        created_by,
        updated_by
    )
    values (
        'rfq_award'::public.purchase_order_source,
        'draft'::public.purchase_order_status,
        target_rfq.id,
        awarded_quotation.supplier_id,
        awarded_quotation.id,
        current_date,
        target_rfq.required_delivery_date,
        awarded_quotation.currency_code,
        awarded_quotation.subtotal,
        awarded_quotation.discount_amount,
        awarded_quotation.shipping_amount,
        awarded_quotation.tax_amount,
        awarded_quotation.other_charges,
        awarded_quotation.total_amount,
        awarded_quotation.payment_terms,
        awarded_quotation.incoterm,
        awarded_quotation.loading_port,
        awarded_quotation.delivery_location,
        concat_ws(
            E'\n',
            case
                when awarded_quotation.incoterm is not null
                    then 'Incoterm: ' || awarded_quotation.incoterm
            end,
            case
                when awarded_quotation.loading_port is not null
                    then 'Loading Port: ' || awarded_quotation.loading_port
            end,
            case
                when awarded_quotation.delivery_location is not null
                    then 'Delivery Location: ' || awarded_quotation.delivery_location
            end
        ),
        awarded_quotation.lead_time,
        awarded_quotation.lead_time_days,
        awarded_quotation.packaging,
        awarded_quotation.warranty,
        awarded_quotation.supplier_notes,
        awarded_quotation.internal_notes,
        auth.uid(),
        auth.uid()
    )
    returning *
    into created_purchase_order;


    -- --------------------------------------------------------
    -- Copy awarded quotation items
    -- --------------------------------------------------------

    insert into public.purchase_order_items (
        purchase_order_id,
        line_number,
        rfq_item_id,
        supplier_quotation_item_id,
        product_id,
        item_name,
        item_description,
        product_sku,
        supplier_sku,
        ordered_quantity,
        received_quantity,
        unit_id,
        unit_price,
        discount_percent,
        discount_amount,
        line_subtotal,
        tax_percent,
        tax_amount,
        line_total,
        country_of_origin_id,
        lead_time,
        lead_time_days,
        packaging,
        warranty,
        item_notes
    )
    select
        created_purchase_order.id,
        rfq_item.line_number,
        quotation_item.rfq_item_id,
        quotation_item.id,
        rfq_item.product_id,
        rfq_item.item_name,
        rfq_item.item_description,
        rfq_item.product_sku,
        quotation_item.supplier_sku,
        quotation_item.quoted_quantity,
        0,
        rfq_item.unit_id,
        quotation_item.unit_price,
        quotation_item.discount_percent,
        quotation_item.discount_amount,
        quotation_item.line_subtotal,
        quotation_item.tax_percent,
        quotation_item.tax_amount,
        quotation_item.line_total,
        quotation_item.country_of_origin_id,
        quotation_item.lead_time,
        quotation_item.lead_time_days,
        coalesce(
            quotation_item.packaging,
            rfq_item.packaging_requirements
        ),
        quotation_item.warranty,
        concat_ws(
            E'\n',
            quotation_item.item_notes,
            case
                when rfq_item.specifications is not null
                    then 'Specifications: ' || rfq_item.specifications
            end,
            case
                when rfq_item.notes is not null
                    then 'RFQ Notes: ' || rfq_item.notes
            end
        )
    from public.supplier_quotation_items quotation_item
    inner join public.rfq_items rfq_item
        on rfq_item.id = quotation_item.rfq_item_id
    where quotation_item.quotation_id = awarded_quotation.id
      and rfq_item.rfq_id = target_rfq.id
    order by rfq_item.line_number;


    get diagnostics copied_item_count = row_count;


    if copied_item_count = 0 then
        raise exception
            'No valid quotation items could be copied to the Purchase Order.';
    end if;


    return created_purchase_order;


exception
    when unique_violation then
        raise exception
            'A Purchase Order already exists for this awarded quotation.';
end;
$$;


-- ============================================================
-- 3. FUNCTION SECURITY
-- ============================================================

revoke all
on function public.create_purchase_order_from_award(uuid)
from public;


grant execute
on function public.create_purchase_order_from_award(uuid)
to authenticated;


comment on function public.create_purchase_order_from_award(uuid) is
'Creates a draft Purchase Order transactionally from the accepted quotation awarded to an RFQ. Copies quotation commercial terms, totals and item pricing, and prevents duplicate Purchase Orders.';