create or replace function public.get_inventory_transaction_details(
    p_transaction_id uuid
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as
$$
declare
    v_transaction jsonb;
    v_items jsonb;
begin

    select
        jsonb_build_object(

            'id', it.id,
            'transaction_number', it.transaction_number,
            'transaction_type', it.transaction_type,
            'status', it.status,
            'transaction_date', it.transaction_date,

            'warehouse',
            jsonb_build_object(
                'id', w.id,
                'name', w.name
            ),

            'related_warehouse',
            case
                when rw.id is null then null
                else jsonb_build_object(
                    'id', rw.id,
                    'name', rw.name
                )
            end,

            'reference_type', it.reference_type,
            'reference_id', it.reference_id,
            'reference_number', it.reference_number,

            'description', it.description,
            'internal_notes', it.internal_notes,

            'created_at', it.created_at,
            'updated_at', it.updated_at,

            'posted_at', it.posted_at,
            'reversed_at', it.reversed_at,
            'cancelled_at', it.cancelled_at,

            'created_by', it.created_by,
            'posted_by', it.posted_by,
            'reversed_by', it.reversed_by,
            'cancelled_by', it.cancelled_by,

            'line_count',
            (
                select count(*)
                from inventory_transaction_items i
                where i.inventory_transaction_id = it.id
            ),

            'total_quantity',
            (
                select
                    coalesce(sum(abs(quantity_change)),0)
                from inventory_transaction_items i
                where i.inventory_transaction_id = it.id
            ),

            'total_value',
            (
                select
                    coalesce(sum(total_cost),0)
                from inventory_transaction_items i
                where i.inventory_transaction_id = it.id
            )

        )

    into v_transaction

    from inventory_transactions it

    inner join warehouses w
        on w.id = it.warehouse_id

    left join warehouses rw
        on rw.id = it.related_warehouse_id

    where it.id = p_transaction_id;

    if v_transaction is null then
        return null;
    end if;

    select

        coalesce(

            jsonb_agg(

                jsonb_build_object(

                    'id', iti.id,

                    'line_number',
                    iti.line_number,

                    'product_id',
                    p.id,

                    'sku',
                    p.sku,

                    'product_name',
                    p.name,

                    'quantity',
                    iti.quantity_change,

                    'unit_cost',
                    iti.unit_cost,

                    'total_cost',
                    iti.total_cost,

                    'batch_number',
                    iti.batch_number,

                    'lot_number',
                    iti.lot_number,

                    'serial_number',
                    iti.serial_number,

                    'manufacturing_date',
                    iti.manufacturing_date,

                    'expiry_date',
                    iti.expiry_date,

                    'notes',
                    iti.notes,

                    'source_document_item_id',
                    iti.source_document_item_id

                )

                order by iti.line_number

            ),

            '[]'::jsonb

        )

    into v_items

    from inventory_transaction_items iti

    inner join products p

        on p.id = iti.product_id

    where iti.inventory_transaction_id = p_transaction_id;

    return jsonb_build_object(

        'transaction',
        v_transaction,

        'items',
        v_items

    );

end;
$$;