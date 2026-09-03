alter table public.sales_invoice_documents
add column if not exists customer_display_name text,
add column if not exists customer_mark text;

comment on column public.sales_invoice_documents.customer_display_name is
'Optional invoice-only customer display name. Does not modify the customer master or sales order.';

comment on column public.sales_invoice_documents.customer_mark is
'Optional invoice-only customer mark/reference text for printing. Does not modify accounting data.';