/*
 * =========================================================
 * 063 — Harden ERP Role Access
 *
 * Purpose:
 * - Replace broad "any authenticated user" access
 *   on core ERP tables with management-role access.
 * - Preserve specialized RFQ policies.
 * - Preserve public catalog policies.
 *
 * Current management roles are defined by public.is_admin():
 * super_admin, admin, manager
 * =========================================================
 */


/* =========================================================
 * Customers
 * ========================================================= */

drop policy if exists
  "Authenticated users can create customers"
on public.customers;

drop policy if exists
  "Authenticated users can update customers"
on public.customers;

drop policy if exists
  "Authenticated users can view customers"
on public.customers;

create policy
  "Management can create customers"
on public.customers
for insert
to authenticated
with check (
  public.is_admin()
);

create policy
  "Management can update customers"
on public.customers
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

create policy
  "Management can view customers"
on public.customers
for select
to authenticated
using (
  public.is_admin()
);


/* =========================================================
 * Customer Contacts
 * ========================================================= */

drop policy if exists
  "Authenticated users can create customer contacts"
on public.customer_contacts;

drop policy if exists
  "Authenticated users can delete customer contacts"
on public.customer_contacts;

drop policy if exists
  "Authenticated users can update customer contacts"
on public.customer_contacts;

drop policy if exists
  "Authenticated users can view customer contacts"
on public.customer_contacts;

create policy
  "Management can manage customer contacts"
on public.customer_contacts
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


/* =========================================================
 * Customer Addresses
 * ========================================================= */

drop policy if exists
  "Authenticated users can create customer addresses"
on public.customer_addresses;

drop policy if exists
  "Authenticated users can delete customer addresses"
on public.customer_addresses;

drop policy if exists
  "Authenticated users can update customer addresses"
on public.customer_addresses;

drop policy if exists
  "Authenticated users can view customer addresses"
on public.customer_addresses;

create policy
  "Management can manage customer addresses"
on public.customer_addresses
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


/* =========================================================
 * Sales Quotations
 * ========================================================= */

drop policy if exists
  "Authenticated users can create sales quotations"
on public.sales_quotations;

drop policy if exists
  "Authenticated users can delete draft sales quotations"
on public.sales_quotations;

drop policy if exists
  "Authenticated users can update sales quotations"
on public.sales_quotations;

drop policy if exists
  "Authenticated users can view sales quotations"
on public.sales_quotations;

create policy
  "Management can manage sales quotations"
on public.sales_quotations
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


/* =========================================================
 * Sales Quotation Items
 * ========================================================= */

drop policy if exists
  "Authenticated users can create sales quotation items"
on public.sales_quotation_items;

drop policy if exists
  "Authenticated users can delete sales quotation items"
on public.sales_quotation_items;

drop policy if exists
  "Authenticated users can update sales quotation items"
on public.sales_quotation_items;

drop policy if exists
  "Authenticated users can view sales quotation items"
on public.sales_quotation_items;

create policy
  "Management can manage sales quotation items"
on public.sales_quotation_items
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


/* =========================================================
 * Sales Orders
 * ========================================================= */

drop policy if exists
  "Authenticated users can create sales orders"
on public.sales_orders;

drop policy if exists
  "Authenticated users can delete draft sales orders"
on public.sales_orders;

drop policy if exists
  "Authenticated users can update sales orders"
on public.sales_orders;

drop policy if exists
  "Authenticated users can view sales orders"
on public.sales_orders;

create policy
  "Management can manage sales orders"
on public.sales_orders
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


/* =========================================================
 * Sales Order Items
 * ========================================================= */

drop policy if exists
  "Authenticated users can create sales order items"
on public.sales_order_items;

drop policy if exists
  "Authenticated users can delete sales order items"
on public.sales_order_items;

drop policy if exists
  "Authenticated users can update sales order items"
on public.sales_order_items;

drop policy if exists
  "Authenticated users can view sales order items"
on public.sales_order_items;

create policy
  "Management can manage sales order items"
on public.sales_order_items
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


/* =========================================================
 * Delivery Orders
 * ========================================================= */

drop policy if exists
  "Authenticated users can create delivery orders"
on public.delivery_orders;

drop policy if exists
  "Authenticated users can delete draft delivery orders"
on public.delivery_orders;

drop policy if exists
  "Authenticated users can update active delivery orders"
on public.delivery_orders;

drop policy if exists
  "Authenticated users can view delivery orders"
on public.delivery_orders;

create policy
  "Management can manage delivery orders"
on public.delivery_orders
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


/* =========================================================
 * Delivery Order Items
 * ========================================================= */

drop policy if exists
  "Authenticated users can create delivery order items"
on public.delivery_order_items;

drop policy if exists
  "Authenticated users can delete draft delivery order items"
on public.delivery_order_items;

drop policy if exists
  "Authenticated users can update delivery order items"
on public.delivery_order_items;

drop policy if exists
  "Authenticated users can view delivery order items"
on public.delivery_order_items;

create policy
  "Management can manage delivery order items"
on public.delivery_order_items
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


/* =========================================================
 * Inventory Transfers
 * ========================================================= */

drop policy if exists
  "Authenticated users can create inventory transfers"
on public.inventory_transfers;

drop policy if exists
  "Authenticated users can delete draft inventory transfers"
on public.inventory_transfers;

drop policy if exists
  "Authenticated users can update inventory transfers"
on public.inventory_transfers;

drop policy if exists
  "Authenticated users can view inventory transfers"
on public.inventory_transfers;

create policy
  "Management can manage inventory transfers"
on public.inventory_transfers
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


/* =========================================================
 * Inventory Transfer Items
 * ========================================================= */

drop policy if exists
  "Authenticated users can create inventory transfer items"
on public.inventory_transfer_items;

drop policy if exists
  "Authenticated users can delete inventory transfer items"
on public.inventory_transfer_items;

drop policy if exists
  "Authenticated users can update inventory transfer items"
on public.inventory_transfer_items;

drop policy if exists
  "Authenticated users can view inventory transfer items"
on public.inventory_transfer_items;

create policy
  "Management can manage inventory transfer items"
on public.inventory_transfer_items
for all
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


/* =========================================================
 * Purchase Orders
 *
 * Keep RFQ-manager mutation policies intact.
 * Tighten broad authenticated SELECT only.
 * ========================================================= */

drop policy if exists
  "Authenticated users can view purchase orders"
on public.purchase_orders;

create policy
  "Management can view purchase orders"
on public.purchase_orders
for select
to authenticated
using (
  public.is_admin()
);


/* =========================================================
 * Purchase Order Items
 * ========================================================= */

drop policy if exists
  "Authenticated users can view purchase order items"
on public.purchase_order_items;

create policy
  "Management can view purchase order items"
on public.purchase_order_items
for select
to authenticated
using (
  public.is_admin()
);


/* =========================================================
 * End
 * ========================================================= */