import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";

import { requireAdmin } from "@/lib/auth/require-admin";

import { getCustomerLookupOptions } from "@/lib/repositories/customer.repository";

import { getWarehouseLookupOptions } from "@/lib/repositories/warehouse.repository";

import { getStockAdjustmentOptions } from "@/lib/inventory/inventory-operation.repository";

import { createClient } from "@/lib/supabase/server";

import QuickSaleForm from "@/components/admin/sales/quick-sale/QuickSaleForm";

import type { QuickSaleOptions } from "@/components/admin/sales/quick-sale/quick-sale-types";

import { getQuickSalePurchaseInfo } from "@/lib/repositories/product-supplier.repository";

export default async function QuickSalePage() {
  await requireAdmin();

  const supabase = await createClient();

  const [
    customers,
    warehouses,
    inventoryOptions,
    purchaseInfo,
    suppliersResult,
    countriesResult,
  ] = await Promise.all([
    getCustomerLookupOptions(),

    getWarehouseLookupOptions(),

    getStockAdjustmentOptions(),

    getQuickSalePurchaseInfo(),

    supabase
      .from("suppliers")
      .select(
        `
        id,
        company_name
      `,
      )
      .eq("is_active", true)
      .order("company_name"),

    supabase
      .from("countries")
      .select(
        `
        id,
        name,
        iso2
      `,
      )
      .order("name"),
  ]);

  if (suppliersResult.error) {
    throw new Error(
      `Unable to load suppliers: ${suppliersResult.error.message}`,
    );
  }

  if (countriesResult.error) {
    throw new Error(
      `Unable to load countries: ${countriesResult.error.message}`,
    );
  }

  const options: QuickSaleOptions = {
    customers: customers.map((customer) => ({
      id: customer.id,

      customerNumber: customer.customer_number,

      displayName: customer.display_name,

      companyName: customer.company_name,
    })),
    purchaseInfo,
    warehouses: warehouses.map((warehouse) => ({
      id: warehouse.id,
      code: warehouse.code,
      name: warehouse.name,
    })),

    products: inventoryOptions.products.map((product) => ({
      id: product.id,

      name: product.name,

      sku: product.sku ?? null,

      unitId: product.unit_id ?? null,

      unitName: product.unit?.name ?? null,

      unitShortName: product.unit?.short_name ?? null,

      defaultFulfilmentMethod: product.fulfilment_method,
    })),

    stock: inventoryOptions.stock.map((row) => ({
      warehouseId: row.warehouseId,

      productId: row.productId,

      quantityOnHand: row.quantityOnHand,

      quantityReserved: row.quantityReserved,

      quantityAvailable: row.quantityAvailable,

      averageUnitCost: row.averageUnitCost,
    })),

    suppliers: (suppliersResult.data ?? []).map((supplier) => ({
      id: supplier.id,

      companyName: supplier.company_name,
    })),

    countries: (countriesResult.data ?? []).map((country) => ({
      id: country.id,

      name: country.name,

      iso2: country.iso2 ?? null,
    })),
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-16">
      <div>
        <Link
          href="/admin/sales/orders"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-amber-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Sales Orders
        </Link>

        <div className="mt-5 flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Zap className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Quick Sale
            </h1>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
              Enter multiple products, stock or local purchases, VAT/export
              treatment, payment and delivery from one screen.
            </p>
          </div>
        </div>
      </div>

      <QuickSaleForm options={options} />
    </div>
  );
}
