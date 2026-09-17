import {
  ArrowLeft,
  FilePenLine,
} from "lucide-react";
import { notFound } from "next/navigation";

import PageHeader from "@/components/admin/shared/PageHeader";
import SalesOrderModificationForm from "@/components/admin/sales/orders/SalesOrderModificationForm";
import {
  isManagementRole,
  requireSalesAccess,
} from "@/lib/auth/require-admin";
import { getStockAdjustmentOptions } from "@/lib/inventory/inventory-operation.repository";
import {
  getSalesOrderById,
  getSalesOrderFormOptions,
} from "@/lib/repositories/sales-order.repository";
import { getSalesQuotationItemFormOptions } from "@/lib/repositories/sales-quotation.repository";
import { createClient } from "@/lib/supabase/server";

interface ModifySalesOrderPageProps {
  params: Promise<{
    id: string;
  }>;
}

const MODIFIABLE_STATUSES = new Set([
  "confirmed",
  "processing",
  "partially_fulfilled",
  "fulfilled",
  "completed",
]);

export default async function ModifySalesOrderPage({
  params,
}: ModifySalesOrderPageProps) {
  const { id } = await params;
  const { profile } = await requireSalesAccess();

  if (!isManagementRole(profile.role)) {
    notFound();
  }

  const supabase = await createClient();

  const [order, options, itemOptions, inventoryOptions, marginPolicyResult] =
    await Promise.all([
      getSalesOrderById(id),
      getSalesOrderFormOptions(),
      getSalesQuotationItemFormOptions(),
      getStockAdjustmentOptions(),
      supabase
        .from("sales_margin_policy")
        .select(
          `
            warning_margin_percentage,
            minimum_margin_percentage
          `,
        )
        .eq("is_active", true)
        .limit(1)
        .maybeSingle(),
    ]);

  if (marginPolicyResult.error) {
    throw new Error(
      `Unable to load sales margin policy: ${marginPolicyResult.error.message}`,
    );
  }

  if (!order) {
    notFound();
  }

  if (!MODIFIABLE_STATUSES.has(order.status)) {
    throw new Error(
      order.status === "draft"
        ? "Draft Sales Orders should be changed using Edit Sales Order."
        : "This Sales Order status cannot be modified through the posted-sale correction workflow.",
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Modify ${order.order_number}`}
        description="Controlled correction of a posted Sales Order with permanent revision, inventory and accounting audit history."
        icon={FilePenLine}
        backLink={{
          href: `/admin/sales/orders/${order.id}`,
          label: order.order_number,
          icon: ArrowLeft,
        }}
      />

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/20">
        <p className="font-semibold">Posted Sale Modification</p>
        <p className="mt-1 leading-6">
          Use this screen to correct an entry or commercial value on the original
          posted sale. If goods were genuinely delivered and later returned by the
          customer, use the Sales Return workflow instead.
        </p>
      </div>

      <SalesOrderModificationForm
        order={{
          id: order.id,
          orderNumber: order.order_number,
          currencyCode: order.currency_code,
          status: order.status,
          fulfilmentStatus: order.fulfilment_status,
          paymentStatus: order.payment_status,
          customerName: order.customer?.display_name ?? "Unknown customer",
          defaultWarehouseId: order.warehouse_id,
          subtotal: order.subtotal,
          itemDiscountAmount: order.discount_amount,
          invoiceDiscountAmount: order.invoice_discount_amount,
          taxAmount: order.tax_amount,
          shippingAmount: order.shipping_amount,
          roundOffAmount: order.round_off_amount,
          grandTotal: order.grand_total,
          paidAmount: order.paid_amount,
          balanceDue: order.balance_due,
          customerNotes: order.customer_notes,
          internalNotes: order.internal_notes,
          items: order.items.map((item) => ({
            id: item.id,
            lineNumber: item.line_number,
            productId: item.product_id,
            unitId: item.unit_id,
            warehouseId: item.warehouse_id ?? order.warehouse_id,
            sku: item.sku,
            itemName: item.item_name,
            description: item.description,
            quantity: item.quantity,
            quantityFulfilled: item.quantity_fulfilled,
            unitPrice: item.unit_price,
            discountPercentage: item.discount_percentage,
            taxPercentage: item.tax_percentage,
            fulfilmentMethod: item.fulfilment_method,
            lineNotes: item.line_notes,
          })),
        }}
        products={itemOptions.products}
        units={itemOptions.units}
        warehouses={options.warehouses}
        stock={inventoryOptions.stock.map((row) => ({
          warehouseId: row.warehouseId,
          productId: row.productId,
          quantityOnHand: row.quantityOnHand,
          quantityReserved: row.quantityReserved,
          quantityAvailable: row.quantityAvailable,
          averageUnitCost: row.averageUnitCost,
        }))}
        marginPolicy={{
          warningMarginPercentage: Number(
            marginPolicyResult.data?.warning_margin_percentage ?? 15,
          ),
          minimumMarginPercentage: Number(
            marginPolicyResult.data?.minimum_margin_percentage ?? 0,
          ),
        }}
      />
    </div>
  );
}
