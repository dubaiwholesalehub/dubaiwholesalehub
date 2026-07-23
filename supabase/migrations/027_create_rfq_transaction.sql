create or replace function public.create_rfq_transaction(
    p_rfq jsonb,
    p_items jsonb,
    p_suppliers jsonb
)
returns table (
    rfq_id uuid,
    rfq_number text
)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_user_id uuid;
    v_rfq_id uuid;
    v_rfq_number text;
    v_item jsonb;
    v_supplier jsonb;
    v_line_number integer := 0;
begin
    /*
     * Authentication
     */
    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception 'Authentication required';
    end if;

    /*
     * RFQ validation
     */
    if nullif(trim(p_rfq->>'title'), '') is null then
        raise exception 'RFQ title is required';
    end if;

    if nullif(trim(p_rfq->>'currency_code'), '') is null then
        raise exception 'Currency code is required';
    end if;

    if jsonb_typeof(p_items) is distinct from 'array' then
        raise exception 'RFQ items must be an array';
    end if;

    if jsonb_array_length(p_items) = 0 then
        raise exception 'At least one RFQ item is required';
    end if;

    if jsonb_typeof(p_suppliers) is distinct from 'array' then
        raise exception 'RFQ suppliers must be an array';
    end if;

    if jsonb_array_length(p_suppliers) = 0 then
        raise exception 'At least one supplier is required';
    end if;

    /*
     * Create RFQ
     */
    insert into public.rfqs (
        title,
        description,
        status,
        priority,
        currency_code,
        required_delivery_date,
        response_deadline,
        delivery_location,
        incoterm,
        payment_terms,
        packaging_requirements,
        internal_notes,
        supplier_notes,
        created_by,
        updated_by
    )
    values (
        trim(p_rfq->>'title'),

        nullif(
            trim(coalesce(p_rfq->>'description', '')),
            ''
        ),

        'draft'::public.rfq_status,

        coalesce(
            nullif(trim(p_rfq->>'priority'), ''),
            'normal'
        )::public.rfq_priority,

        upper(
            coalesce(
                nullif(trim(p_rfq->>'currency_code'), ''),
                'AED'
            )
        ),

        case
            when nullif(
                trim(p_rfq->>'required_delivery_date'),
                ''
            ) is null
            then null
            else (
                p_rfq->>'required_delivery_date'
            )::date
        end,

        case
            when nullif(
                trim(p_rfq->>'response_deadline'),
                ''
            ) is null
            then null
            else (
                p_rfq->>'response_deadline'
            )::timestamptz
        end,

        nullif(
            trim(coalesce(
                p_rfq->>'delivery_location',
                ''
            )),
            ''
        ),

        nullif(
            trim(coalesce(p_rfq->>'incoterm', '')),
            ''
        ),

        nullif(
            trim(coalesce(
                p_rfq->>'payment_terms',
                ''
            )),
            ''
        ),

        nullif(
            trim(coalesce(
                p_rfq->>'packaging_requirements',
                ''
            )),
            ''
        ),

        nullif(
            trim(coalesce(
                p_rfq->>'internal_notes',
                ''
            )),
            ''
        ),

        nullif(
            trim(coalesce(
                p_rfq->>'supplier_notes',
                ''
            )),
            ''
        ),

        v_user_id,
        v_user_id
    )
    returning
        id,
        public.rfqs.rfq_number
    into
        v_rfq_id,
        v_rfq_number;

    /*
     * Create RFQ items
     */
    for v_item in
        select value
        from jsonb_array_elements(p_items)
    loop
        v_line_number := v_line_number + 1;

        if nullif(
            trim(v_item->>'item_name'),
            ''
        ) is null then
            raise exception
                'Item name is required for line %',
                v_line_number;
        end if;

        if coalesce(
            (v_item->>'requested_quantity')::numeric,
            0
        ) <= 0 then
            raise exception
                'Requested quantity must be greater than zero for line %',
                v_line_number;
        end if;

        insert into public.rfq_items (
            rfq_id,
            product_id,
            line_number,
            item_name,
            item_description,
            product_sku,
            requested_quantity,
            unit_id,
            target_unit_price,
            target_currency_code,
            target_delivery_date,
            specifications,
            packaging_requirements,
            notes
        )
        values (
            v_rfq_id,

            case
                when nullif(
                    trim(v_item->>'product_id'),
                    ''
                ) is null
                then null
                else (v_item->>'product_id')::uuid
            end,

            v_line_number,

            trim(v_item->>'item_name'),

            nullif(
                trim(coalesce(
                    v_item->>'item_description',
                    ''
                )),
                ''
            ),

            nullif(
                trim(coalesce(
                    v_item->>'product_sku',
                    ''
                )),
                ''
            ),

            (v_item->>'requested_quantity')::numeric,

            case
                when nullif(
                    trim(v_item->>'unit_id'),
                    ''
                ) is null
                then null
                else (v_item->>'unit_id')::uuid
            end,

            case
                when nullif(
                    trim(v_item->>'target_unit_price'),
                    ''
                ) is null
                then null
                else (
                    v_item->>'target_unit_price'
                )::numeric
            end,

            case
                when nullif(
                    trim(v_item->>'target_currency_code'),
                    ''
                ) is null
                then null
                else upper(
                    v_item->>'target_currency_code'
                )
            end,

            case
                when nullif(
                    trim(v_item->>'target_delivery_date'),
                    ''
                ) is null
                then null
                else (
                    v_item->>'target_delivery_date'
                )::date
            end,

            nullif(
                trim(coalesce(
                    v_item->>'specifications',
                    ''
                )),
                ''
            ),

            nullif(
                trim(coalesce(
                    v_item->>'packaging_requirements',
                    ''
                )),
                ''
            ),

            nullif(
                trim(coalesce(v_item->>'notes', '')),
                ''
            )
        );
    end loop;

    /*
     * Create RFQ supplier invitations
     */
    for v_supplier in
        select value
        from jsonb_array_elements(p_suppliers)
    loop
        if nullif(
            trim(v_supplier->>'supplier_id'),
            ''
        ) is null then
            raise exception 'Supplier ID is required';
        end if;

        insert into public.rfq_suppliers (
            rfq_id,
            supplier_id,
            status,
            contact_name,
            contact_email,
            contact_phone,
            contact_whatsapp,
            supplier_reference,
            invitation_message,
            notes
        )
        values (
            v_rfq_id,
            (v_supplier->>'supplier_id')::uuid,
            'invited'::public.rfq_supplier_status,

            nullif(
                trim(coalesce(
                    v_supplier->>'contact_name',
                    ''
                )),
                ''
            ),

            nullif(
                trim(coalesce(
                    v_supplier->>'contact_email',
                    ''
                )),
                ''
            ),

            nullif(
                trim(coalesce(
                    v_supplier->>'contact_phone',
                    ''
                )),
                ''
            ),

            nullif(
                trim(coalesce(
                    v_supplier->>'contact_whatsapp',
                    ''
                )),
                ''
            ),

            nullif(
                trim(coalesce(
                    v_supplier->>'supplier_reference',
                    ''
                )),
                ''
            ),

            nullif(
                trim(coalesce(
                    v_supplier->>'invitation_message',
                    ''
                )),
                ''
            ),

            nullif(
                trim(coalesce(
                    v_supplier->>'notes',
                    ''
                )),
                ''
            )
        );
    end loop;

    /*
     * Initial RFQ status history
     */
    insert into public.rfq_status_history (
        rfq_id,
        previous_status,
        new_status,
        reason,
        notes,
        changed_by
    )
    values (
        v_rfq_id,
        null,
        'draft'::public.rfq_status,
        'RFQ created',
        'Initial RFQ draft created through the admin wizard.',
        v_user_id
    );

    return query
    select
        v_rfq_id,
        v_rfq_number;
end;
$$;

revoke all
on function public.create_rfq_transaction(
    jsonb,
    jsonb,
    jsonb
)
from public;

grant execute
on function public.create_rfq_transaction(
    jsonb,
    jsonb,
    jsonb
)
to authenticated;