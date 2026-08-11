import type {
  Product,
} from "@/components/admin/products/product-types";

import {
  getProductIntelligence,
  type ProductIntelligence,
} from "@/lib/inventory/product-intelligence.repository";

import {
  getProductSupplierSummary,
  type ProductSupplierSummary,
} from "@/lib/repositories/product-supplier.repository";

import { createClient } from "@/lib/supabase/server";

/* =========================================================
 * Product Inventory Types
 * ========================================================= */

export interface ProductWarehouseStock {
  id: string;

  warehouseId: string;

  warehouseName: string;

  warehouseCode: string;

  quantityOnHand: number;

  quantityReserved: number;

  quantityAvailable: number;

  averageUnitCost: number;

  lastTransactionAt:
  string | null;
}

export interface ProductInventorySummary {
  totalOnHand: number;

  totalReserved: number;

  totalAvailable: number;

  totalInventoryValue: number;

  warehouseCount: number;

  stockedWarehouseCount: number;

  averageUnitCost: number;
}

/* =========================================================
 * Product Workspace
 * ========================================================= */

export interface ProductWorkspace {
  product: Product;

  inventory:
  ProductInventorySummary;

  warehouseStock:
  ProductWarehouseStock[];

  supplierSummary:
  ProductSupplierSummary;

  intelligence:
  ProductIntelligence;
}

/* =========================================================
 * Helpers
 * ========================================================= */

function toNumber(
  value: unknown,
): number {
  if (
    typeof value === "number"
  ) {
    return Number.isFinite(value)
      ? value
      : 0;
  }

  if (
    typeof value === "string"
  ) {
    const parsed =
      Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  }

  return 0;
}

/* =========================================================
 * Get Product Workspace
 * ========================================================= */

export async function getProductWorkspace(
  productId: string,
): Promise<ProductWorkspace | null> {
  const id =
    productId.trim();

  if (!id) {
    return null;
  }

  const supabase =
    await createClient();

  const [
    productResult,
    stockResult,
    supplierSummary,
    intelligence,
  ] = await Promise.all([
    /* =====================================================
     * Product
     * ===================================================== */

    supabase
      .from("products")
      .select(`
        id,
        name,
        slug,
        sku,
        barcode,
        model_number,

        short_description,
        description,

        fulfilment_method,
        procurement_lead_time_days,
        minimum_stock_quantity,
        reorder_quantity,
        safety_stock_days,
        allow_backorder,
        procurement_notes,

        category_id,
        subcategory_id,
        brand_id,
        country_id,
        unit_id,

        moq,
        carton_quantity,

        lead_time,
        packaging,
        warranty,

        hs_code,

        weight,
        length,
        width,
        height,

        status,

        featured,
        is_new,

        meta_title,
        meta_description,

        created_at,
        updated_at,
        published_at,

        category:categories (
          id,
          name
        ),

        subcategory:subcategories (
          id,
          name
        ),

        brand:brands (
          id,
          name
        ),

        country:countries (
          id,
          name
        ),

        unit:units (
          id,
          name,
          short_name
        ),

        product_images (
          id,
          storage_path,
          is_primary,
          sort_order,
          alt_text
        )
      `)
      .eq(
        "id",
        id,
      )
      .maybeSingle(),

    /* =====================================================
     * Warehouse Stock
     * ===================================================== */

    supabase
      .from(
        "warehouse_stock",
      )
      .select(`
        id,
        warehouse_id,
        product_id,

        quantity_on_hand,
        quantity_reserved,
        quantity_available,

        average_unit_cost,

        last_transaction_at,

        warehouse:warehouses (
          id,
          name,
          code
        )
      `)
      .eq(
        "product_id",
        id,
      )
      .order(
        "quantity_on_hand",
        {
          ascending: false,
        },
      ),

    /* =====================================================
     * Supplier Intelligence
     * ===================================================== */

    getProductSupplierSummary(
      id,
    ),

    /* =====================================================
     * Product Intelligence
     * ===================================================== */

    getProductIntelligence(
      id,
    ),
  ]);

  /* =======================================================
   * Errors
   * ======================================================= */

  if (
    productResult.error
  ) {
    throw new Error(
      `Unable to load product workspace: ${productResult.error.message}`,
    );
  }

  if (
    !productResult.data
  ) {
    return null;
  }

  if (
    stockResult.error
  ) {
    throw new Error(
      `Unable to load product inventory: ${stockResult.error.message}`,
    );
  }

  /* =======================================================
   * Warehouse Stock Mapping
   * ======================================================= */

  const warehouseStock:
    ProductWarehouseStock[] =
    (
      stockResult.data ??
      []
    ).map(
      (stock) => ({
        id:
          stock.id,

        warehouseId:
          stock.warehouse_id,

        warehouseName:
          stock.warehouse
            ?.name ??
          "Unknown warehouse",

        warehouseCode:
          stock.warehouse
            ?.code ??
          "—",

        quantityOnHand:
          toNumber(
            stock.quantity_on_hand,
          ),

        quantityReserved:
          toNumber(
            stock.quantity_reserved,
          ),

        quantityAvailable:
          toNumber(
            stock.quantity_available,
          ),

        averageUnitCost:
          toNumber(
            stock.average_unit_cost,
          ),

        lastTransactionAt:
          stock
            .last_transaction_at,
      }),
    );

  /* =======================================================
   * Inventory Totals
   * ======================================================= */

  const totalOnHand =
    warehouseStock.reduce(
      (
        total,
        stock,
      ) =>
        total +
        stock.quantityOnHand,
      0,
    );

  const totalReserved =
    warehouseStock.reduce(
      (
        total,
        stock,
      ) =>
        total +
        stock.quantityReserved,
      0,
    );

  const totalAvailable =
    warehouseStock.reduce(
      (
        total,
        stock,
      ) =>
        total +
        stock.quantityAvailable,
      0,
    );

  const totalInventoryValue =
    warehouseStock.reduce(
      (
        total,
        stock,
      ) =>
        total +
        (
          stock.quantityOnHand *
          stock.averageUnitCost
        ),
      0,
    );

  const averageUnitCost =
    totalOnHand > 0
      ? totalInventoryValue /
      totalOnHand
      : 0;

  /* =======================================================
   * Return Workspace
   * ======================================================= */

  return {
    product:
      productResult.data,

    inventory: {
      totalOnHand,

      totalReserved,

      totalAvailable,

      totalInventoryValue,

      warehouseCount:
        warehouseStock.length,

      stockedWarehouseCount:
        warehouseStock.filter(
          (stock) =>
            stock.quantityOnHand >
            0,
        ).length,

      averageUnitCost,
    },

    warehouseStock,

    supplierSummary,

    intelligence,
  };
}