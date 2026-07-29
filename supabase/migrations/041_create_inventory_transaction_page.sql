create or replace function public.get_inventory_transaction_page(
    p_search text default null,
    p_transaction_type text default null,
    p_warehouse_id uuid default null,
    p_status text default null,
    p_from_date date default null,
    p_to_date date default null,
    p_sort_by text default 'transaction_date',
    p_sort_direction text default 'desc',
    p_page integer default 1,
    p_page_size integer default 25
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
    v_page integer := greatest(coalesce(p_page,1),1);
    v_page_size integer := least(greatest(coalesce(p_page_size,25),1),100);
    v_offset integer;
    v_total_count bigint;
    v_items jsonb;
begin

    if lower(p_sort_direction) not in ('asc','desc') then
        raise exception 'Invalid sort direction';
    end if;

    if p_sort_by not in (
        'transaction_number',
        'transaction_date',
        'warehouse_name',
        'total_value'
    ) then
        raise exception 'Invalid sort column';
    end if;

    v_offset := (v_page-1)*v_page_size;

    with tx as (

        select

            it.id,

            it.transaction_number,
            it.transaction_type,
            it.status,
            it.transaction_date,

            it.reference_number,
            it.reference_type,

            it.description,

            w.id as warehouse_id,
            w.name as warehouse_name,

            count(iti.id) as line_count,

            coalesce(sum(abs(iti.quantity_change)),0) as total_quantity,

            coalesce(sum(iti.total_cost),0) as total_value,

            it.created_at

        from inventory_transactions it

        inner join warehouses w
            on w.id = it.warehouse_id

        left join inventory_transaction_items iti
            on iti.inventory_transaction_id = it.id

        where

            (
                p_search is null
                or btrim(p_search) = ''
                or it.transaction_number ilike '%'||btrim(p_search)||'%'
                or coalesce(it.reference_number,'') ilike '%'||btrim(p_search)||'%'
                or coalesce(it.description,'') ilike '%'||btrim(p_search)||'%'
                or w.name ilike '%'||btrim(p_search)||'%'
            )

            and (
                p_transaction_type is null
                or it.transaction_type = p_transaction_type
            )

            and (
                p_status is null
                or it.status = p_status
            )

            and (
                p_warehouse_id is null
                or it.warehouse_id = p_warehouse_id
            )

            and (
                p_from_date is null
                or it.transaction_date >= p_from_date
            )

            and (
                p_to_date is null
                or it.transaction_date <= p_to_date
            )

        group by

            it.id,
            w.id

    )

    select count(*)
    into v_total_count
    from tx;

    with tx as (

        select

            it.id,

            it.transaction_number,
            it.transaction_type,
            it.status,
            it.transaction_date,

            it.reference_number,
            it.reference_type,

            it.description,

            w.id as warehouse_id,
            w.name as warehouse_name,

            count(iti.id) as line_count,

            coalesce(sum(abs(iti.quantity_change)),0) as total_quantity,

            coalesce(sum(iti.total_cost),0) as total_value,

            it.created_at

        from inventory_transactions it

        inner join warehouses w
            on w.id = it.warehouse_id

        left join inventory_transaction_items iti
            on iti.inventory_transaction_id = it.id

        where

            (
                p_search is null
                or btrim(p_search) = ''
                or it.transaction_number ilike '%'||btrim(p_search)||'%'
                or coalesce(it.reference_number,'') ilike '%'||btrim(p_search)||'%'
                or coalesce(it.description,'') ilike '%'||btrim(p_search)||'%'
                or w.name ilike '%'||btrim(p_search)||'%'
            )

            and (
                p_transaction_type is null
                or it.transaction_type = p_transaction_type
            )

            and (
                p_status is null
                or it.status = p_status
            )

            and (
                p_warehouse_id is null
                or it.warehouse_id = p_warehouse_id
            )

            and (
                p_from_date is null
                or it.transaction_date >= p_from_date
            )

            and (
                p_to_date is null
                or it.transaction_date <= p_to_date
            )

        group by

            it.id,
            w.id

    ),

    sorted as (

        select *

        from tx

        order by

            case
                when p_sort_by='transaction_number'
                and lower(p_sort_direction)='asc'
                then transaction_number
            end asc,

            case
                when p_sort_by='transaction_number'
                and lower(p_sort_direction)='desc'
                then transaction_number
            end desc,

            case
                when p_sort_by='transaction_date'
                and lower(p_sort_direction)='asc'
                then transaction_date
            end asc,

            case
                when p_sort_by='transaction_date'
                and lower(p_sort_direction)='desc'
                then transaction_date
            end desc,

            case
                when p_sort_by='warehouse_name'
                and lower(p_sort_direction)='asc'
                then warehouse_name
            end asc,

            case
                when p_sort_by='warehouse_name'
                and lower(p_sort_direction)='desc'
                then warehouse_name
            end desc,

            case
                when p_sort_by='total_value'
                and lower(p_sort_direction)='asc'
                then total_value
            end asc,

            case
                when p_sort_by='total_value'
                and lower(p_sort_direction)='desc'
                then total_value
            end desc,

            transaction_date desc

        limit v_page_size
        offset v_offset

    )

    select
        coalesce(jsonb_agg(to_jsonb(sorted)),'[]'::jsonb)
    into v_items
    from sorted;

    return jsonb_build_object(

        'items',v_items,

        'pagination',

        jsonb_build_object(

            'page',v_page,
            'page_size',v_page_size,
            'total_count',v_total_count,

            'total_pages',

            case
                when v_total_count=0 then 0
                else ceil(v_total_count::numeric/v_page_size)::integer
            end

        )

    );

end;
$$;