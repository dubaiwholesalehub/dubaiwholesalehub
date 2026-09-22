begin;

insert into public.gl_accounts
(account_code,account_name,parent_id,account_class,statement_type,normal_balance,description,is_posting_account,is_control_account,allow_manual_posting,is_system_account,display_order)
values
('4150','Delivery Income',(select id from public.gl_accounts where account_code='4000'),'revenue','profit_loss','credit','Delivery and shipping charges billed to customers.',true,false,false,true,4150),
('4390','Rounding Differences',(select id from public.gl_accounts where account_code='4000'),'revenue','profit_loss','credit','Small invoice rounding differences. Positive round-off is credited; negative round-off is debited.',true,false,false,true,4390)
on conflict (account_code) do nothing;

create or replace function public.post_sales_order_revenue_gl(p_sales_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.sales_orders%rowtype;
  v_receivable_account_id uuid;
  v_revenue_account_id uuid;
  v_delivery_account_id uuid;
  v_rounding_account_id uuid;
  v_vat_account_id uuid;
  v_merchandise_revenue numeric(18,2);
  v_delivery_income numeric(18,2);
  v_round_off numeric(18,2);
  v_tax_amount numeric(18,2);
  v_total_receivable numeric(18,2);
  v_base_merchandise_revenue numeric(18,2);
  v_base_delivery_income numeric(18,2);
  v_base_round_off numeric(18,2);
  v_base_tax_amount numeric(18,2);
  v_base_total_receivable numeric(18,2);
  v_lines jsonb;
  v_journal_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;
  if not public.is_admin() then
    raise exception 'Administrator access is required.';
  end if;
  if p_sales_order_id is null then
    raise exception 'Sales Order ID is required.';
  end if;

  select * into v_order
  from public.sales_orders
  where id = p_sales_order_id;

  if not found then
    raise exception 'Sales Order % does not exist.', p_sales_order_id;
  end if;
  if v_order.status in ('draft','cancelled') then
    raise exception 'Sales Order % cannot be posted to GL while status is %.',
      v_order.order_number, v_order.status;
  end if;
  if v_order.exchange_rate is null or v_order.exchange_rate <= 0 then
    raise exception 'Sales Order % has an invalid exchange rate.', v_order.order_number;
  end if;

  v_tax_amount := round(coalesce(v_order.tax_amount,0),2);
  v_delivery_income := round(coalesce(v_order.shipping_amount,0),2);
  v_round_off := round(coalesce(v_order.round_off_amount,0),2);
  v_total_receivable := round(coalesce(v_order.grand_total,0),2);

  /* Invoice discount is already reflected in grand_total. */
  v_merchandise_revenue := round(
    v_total_receivable - v_tax_amount - v_delivery_income - v_round_off, 2
  );

  if v_total_receivable < 0
     or v_merchandise_revenue < 0
     or v_tax_amount < 0
     or v_delivery_income < 0 then
    raise exception 'Sales Order % contains invalid accounting totals.', v_order.order_number;
  end if;
  if v_total_receivable = 0 then
    raise exception 'Sales Order % has zero accounting value.', v_order.order_number;
  end if;

  v_base_merchandise_revenue := round(v_merchandise_revenue*v_order.exchange_rate,2);
  v_base_delivery_income := round(v_delivery_income*v_order.exchange_rate,2);
  v_base_round_off := round(v_round_off*v_order.exchange_rate,2);
  v_base_tax_amount := round(v_tax_amount*v_order.exchange_rate,2);
  v_base_total_receivable := round(v_total_receivable*v_order.exchange_rate,2);

  v_receivable_account_id := public.get_mapped_gl_account('accounts_receivable');
  v_revenue_account_id := public.get_mapped_gl_account('sales_revenue');

  if v_tax_amount > 0 then
    v_vat_account_id := public.get_mapped_gl_account('vat_payable');
  end if;

  if v_delivery_income > 0 then
    select id into v_delivery_account_id
    from public.gl_accounts where account_code='4150';
    if v_delivery_account_id is null then
      raise exception 'Delivery Income GL account 4150 is not configured.';
    end if;
  end if;

  if v_round_off <> 0 then
    select id into v_rounding_account_id
    from public.gl_accounts where account_code='4390';
    if v_rounding_account_id is null then
      raise exception 'Rounding Differences GL account 4390 is not configured.';
    end if;
  end if;

  v_lines := jsonb_build_array(
    jsonb_build_object(
      'glAccountId',v_receivable_account_id,
      'debit',v_total_receivable,'credit',0,
      'baseDebit',v_base_total_receivable,'baseCredit',0,
      'description','Accounts Receivable - '||v_order.order_number,
      'customerId',v_order.customer_id
    ),
    jsonb_build_object(
      'glAccountId',v_revenue_account_id,
      'debit',0,'credit',v_merchandise_revenue,
      'baseDebit',0,'baseCredit',v_base_merchandise_revenue,
      'description','Sales Revenue - '||v_order.order_number,
      'customerId',v_order.customer_id
    )
  );

  if v_delivery_income > 0 then
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'glAccountId',v_delivery_account_id,
      'debit',0,'credit',v_delivery_income,
      'baseDebit',0,'baseCredit',v_base_delivery_income,
      'description','Delivery Income - '||v_order.order_number,
      'customerId',v_order.customer_id
    ));
  end if;

  if v_tax_amount > 0 then
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'glAccountId',v_vat_account_id,
      'debit',0,'credit',v_tax_amount,
      'baseDebit',0,'baseCredit',v_base_tax_amount,
      'description','Output VAT - '||v_order.order_number,
      'customerId',v_order.customer_id
    ));
  end if;

  if v_round_off > 0 then
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'glAccountId',v_rounding_account_id,
      'debit',0,'credit',v_round_off,
      'baseDebit',0,'baseCredit',v_base_round_off,
      'description','Rounding Difference - '||v_order.order_number,
      'customerId',v_order.customer_id
    ));
  elsif v_round_off < 0 then
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'glAccountId',v_rounding_account_id,
      'debit',abs(v_round_off),'credit',0,
      'baseDebit',abs(v_base_round_off),'baseCredit',0,
      'description','Rounding Difference - '||v_order.order_number,
      'customerId',v_order.customer_id
    ));
  end if;

  v_journal_id := public.post_erp_gl_journal(
    'sales_order_revenue',v_order.id,v_order.order_number,
    v_order.order_date,v_order.order_date,
    'Sales Order revenue recognition - '||v_order.order_number,
    v_order.currency_code,v_order.exchange_rate,v_lines
  );

  return v_journal_id;
end;
$$;

comment on function public.post_sales_order_revenue_gl(uuid) is
'Posts Sales Order AR, net merchandise Sales Revenue, Delivery Income, Output VAT and signed Rounding Differences through the canonical immutable GL posting engine. Historical posted journals are not rewritten.';

commit;
