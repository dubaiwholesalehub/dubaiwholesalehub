alter table public.wholesale_collections
add column if not exists whatsapp_number text;

comment on column public.wholesale_collections.whatsapp_number is
'WhatsApp number used for customer enquiries from this collection, stored in international digits-only format.';