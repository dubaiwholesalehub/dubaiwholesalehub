/*
 * HM ERP
 * Allow Reorder Intelligence Purchase Orders
 *
 * Reorder-generated Purchase Orders behave like manual Purchase
 * Orders from a source-reference perspective:
 *
 * - source = reorder
 * - rfq_id = null
 * - supplier_quotation_id = null
 *
 * RFQ-award Purchase Orders must still keep both references.
 */

alter table public.purchase_orders
drop constraint if exists purchase_orders_source_consistency;


alter table public.purchase_orders
add constraint purchase_orders_source_consistency
check (
  (
    source in (
      'manual'::public.purchase_order_source,
      'reorder'::public.purchase_order_source
    )
    and rfq_id is null
    and supplier_quotation_id is null
  )
  or
  (
    source = 'rfq_award'::public.purchase_order_source
    and rfq_id is not null
    and supplier_quotation_id is not null
  )
);


comment on column public.purchase_orders.source is
  'Origin of the Purchase Order: manual, RFQ award, or reorder intelligence.';