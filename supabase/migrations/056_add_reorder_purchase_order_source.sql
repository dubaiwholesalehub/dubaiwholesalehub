/*
 * HM ERP
 * Purchase Order Source — Reorder Intelligence
 *
 * Adds a dedicated source value for Purchase Orders generated
 * from the Reorder Intelligence engine.
 */

alter type public.purchase_order_source
add value if not exists 'reorder';

comment on type public.purchase_order_source is
  'Origin of a Purchase Order: manual entry, RFQ award, or reorder intelligence.';