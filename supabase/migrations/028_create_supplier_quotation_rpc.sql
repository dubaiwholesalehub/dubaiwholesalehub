create or replace function public.create_supplier_quotation(
  p_rfq_id uuid,
  p_rfq_supplier_id uuid,
  p_quotation_number text,
  p_quotation_date date,
  p_valid_until date,
  p_currency_code text,
  p_payment_terms text,
  p_lead_time_days integer,
  p_incoterm text,
  p_loading_port text,
  p_delivery_location text,
  p_packaging text,
  p_warranty text,
  p_supplier_notes text,
  p_internal_notes text,
  p_discount_amount numeric,
  p_shipping_amount numeric,
  p_other_charges numeric,
  p_tax_amount numeric,
  p_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_quotation_id uuid;
  v_supplier_id uuid;
  v_subtotal numeric := 0;
  v_total_amount numeric := 0;
  v_item_count integer := 0;
begin
  /*
   * Validate the RFQ supplier and obtain the actual supplier ID.
   */
  select rs.supplier_id
  into v_supplier_id
  from public.rfq_suppliers rs
  where rs.id = p_rfq_supplier_id
    and rs.rfq_id = p_rfq_id;

  if v_supplier_id is null then
    raise exception
      'The selected supplier is not assigned to this RFQ.';
  end if;

  /*
   * Basic header validation.
   */
  if nullif(trim(p_currency_code), '') is null then
    raise exception 'Currency code is required.';
  end if;

  if p_quotation_date is null then
    raise exception 'Quotation date is required.';
  end if;

  if p_valid_until is not null
     and p_valid_until < p_quotation_date then
    raise exception
      'Valid-until date cannot be earlier than quotation date.';
  end if;

  if p_lead_time_days is not null
     and p_lead_time_days < 0 then
    raise exception 'Lead time cannot be negative.';
  end if;

  if coalesce(p_discount_amount, 0) < 0
     or coalesce(p_shipping_amount, 0) < 0
     or coalesce(p_other_charges, 0) < 0
     or coalesce(p_tax_amount, 0) < 0 then
    raise exception 'Commercial charges cannot be negative.';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception
      'At least one quotation item is required.';
  end if;

  /*
   * Validate item values.
   */
  if exists (
    select 1
    from jsonb_to_recordset(p_items) as item(
      rfq_item_id uuid,
      quoted_quantity numeric,
      unit_price numeric,
      moq numeric,
      lead_time_days integer,
      is_compliant boolean
    )
    where item.rfq_item_id is null
       or item.quoted_quantity <= 0
       or item.unit_price < 0
       or coalesce(item.moq, 0) < 0
       or coalesce(item.lead_time_days, 0) < 0
  ) then
    raise exception
      'Quotation items contain invalid quantities, prices, MOQ, or lead times.';
  end if;

  /*
   * Ensure every submitted item belongs to this RFQ.
   */
  select count(*)
  into v_item_count
  from jsonb_to_recordset(p_items) as item(
    rfq_item_id uuid,
    quoted_quantity numeric,
    unit_price numeric,
    moq numeric,
    lead_time_days integer,
    is_compliant boolean
  )
  join public.rfq_items ri
    on ri.id = item.rfq_item_id
   and ri.rfq_id = p_rfq_id;

  if v_item_count <> jsonb_array_length(p_items) then
    raise exception
      'One or more submitted items do not belong to this RFQ.';
  end if;

  /*
   * Calculate subtotal on the server.
   * Never trust a subtotal sent by the browser.
   */
  select coalesce(
    sum(item.quoted_quantity * item.unit_price),
    0
  )
  into v_subtotal
  from jsonb_to_recordset(p_items) as item(
    rfq_item_id uuid,
    quoted_quantity numeric,
    unit_price numeric,
    moq numeric,
    lead_time_days integer,
    is_compliant boolean
  );

  v_total_amount :=
    v_subtotal
    - coalesce(p_discount_amount, 0)
    + coalesce(p_shipping_amount, 0)
    + coalesce(p_other_charges, 0)
    + coalesce(p_tax_amount, 0);

  if v_total_amount < 0 then
    raise exception
      'The quotation total cannot be negative.';
  end if;

  /*
   * Insert the quotation header.
   *
   * The status column is intentionally omitted so the database
   * uses its configured default, normally "draft".
   */
  insert into public.supplier_quotations (
    rfq_id,
    rfq_supplier_id,
    supplier_id,
    quotation_number,
    quotation_date,
    valid_until,
    currency_code,
    payment_terms,
    lead_time_days,
    incoterm,
    loading_port,
    delivery_location,
    packaging,
    warranty,
    supplier_notes,
    internal_notes,
    subtotal,
    discount_amount,
    shipping_amount,
    other_charges,
    tax_amount,
    total_amount,
    revision_number,
    created_by,
    updated_by
  )
  values (
    p_rfq_id,
    p_rfq_supplier_id,
    v_supplier_id,
    nullif(trim(p_quotation_number), ''),
    p_quotation_date,
    p_valid_until,
    upper(trim(p_currency_code)),
    nullif(trim(p_payment_terms), ''),
    p_lead_time_days,
    nullif(trim(p_incoterm), ''),
    nullif(trim(p_loading_port), ''),
    nullif(trim(p_delivery_location), ''),
    nullif(trim(p_packaging), ''),
    nullif(trim(p_warranty), ''),
    nullif(trim(p_supplier_notes), ''),
    nullif(trim(p_internal_notes), ''),
    v_subtotal,
    coalesce(p_discount_amount, 0),
    coalesce(p_shipping_amount, 0),
    coalesce(p_other_charges, 0),
    coalesce(p_tax_amount, 0),
    v_total_amount,
    1,
    auth.uid(),
    auth.uid()
  )
  returning id into v_quotation_id;

  /*
   * Bulk insert all quotation items.
   */
  insert into public.supplier_quotation_items (
    quotation_id,
    rfq_item_id,
    quoted_quantity,
    unit_price,
    moq,
    lead_time_days,
    is_compliant,
    discount_percent,
    discount_amount,
    tax_percent,
    tax_amount,
    line_subtotal,
    line_total
  )
  select
    v_quotation_id,
    item.rfq_item_id,
    item.quoted_quantity,
    item.unit_price,
    nullif(item.moq, 0),
    nullif(item.lead_time_days, 0),
    coalesce(item.is_compliant, true),
    0,
    0,
    0,
    0,
    item.quoted_quantity * item.unit_price,
    item.quoted_quantity * item.unit_price
  from jsonb_to_recordset(p_items) as item(
    rfq_item_id uuid,
    quoted_quantity numeric,
    unit_price numeric,
    moq numeric,
    lead_time_days integer,
    is_compliant boolean
  );

  return v_quotation_id;
end;
$$;

revoke all
on function public.create_supplier_quotation(
  uuid,
  uuid,
  text,
  date,
  date,
  text,
  text,
  integer,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  jsonb
)
from public;

grant execute
on function public.create_supplier_quotation(
  uuid,
  uuid,
  text,
  date,
  date,
  text,
  text,
  integer,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  jsonb
)
to authenticated;