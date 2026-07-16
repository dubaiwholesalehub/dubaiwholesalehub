"use client";

import { useMemo, useState } from "react";
import { PackageSearch } from "lucide-react";

import ProductFilters, {
  type ProductStatusFilter,
} from "@/components/admin/products/ProductFilters";
import ProductForm from "@/components/admin/products/ProductForm";
import ProductTable from "@/components/admin/products/ProductTable";
import type {
  Product,
  ProductFormOptions,
} from "@/components/admin/products/product-types";
import SlideOver from "@/components/admin/ui/SlideOver";

import {
  createProduct,
  updateProduct,
} from "@/app/admin/(protected)/products/actions";

interface ProductManagerProps {
  products: Product[];
  options: ProductFormOptions;
}

export default function ProductManager({
  products,
  options,
}: ProductManagerProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] =
    useState<ProductStatusFilter>("all");
  const [categoryId, setCategoryId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !term ||
        [
          product.name,
          product.slug,
          product.sku ?? "",
          product.barcode ?? "",
          product.model_number ?? "",
          product.category?.name ?? "",
          product.brand?.name ?? "",
        ].some((value) =>
          value.toLowerCase().includes(term),
        );

      const matchesStatus =
        status === "all" || product.status === status;

      const matchesCategory =
        !categoryId ||
        product.category_id === categoryId;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCategory
      );
    });
  }, [categoryId, products, search, status]);

  function clearFilters() {
    setSearch("");
    setStatus("all");
    setCategoryId("");
  }

  return (
    <>
      <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <ProductFilters
          search={search}
          status={status}
          categoryId={categoryId}
          categories={options.categories}
          resultCount={filteredProducts.length}
          totalCount={products.length}
          onSearchChange={setSearch}
          onStatusChange={setStatus}
          onCategoryChange={setCategoryId}
          onClear={clearFilters}
          onCreate={() => setCreateOpen(true)}
        />

        <ProductTable
          products={filteredProducts}
          onEdit={setEditingProduct}
          onCreate={() => setCreateOpen(true)}
        />
      </section>

      <SlideOver
        open={createOpen}
        title="Create product"
        description="Add a wholesale product to your catalog."
        onClose={() => setCreateOpen(false)}
      >
        <ProductForm
          action={createProduct}
          options={options}
          submitLabel="Create product"
        />
      </SlideOver>

      <SlideOver
        open={Boolean(editingProduct)}
        title="Edit product"
        description="Update product, wholesale and publishing details."
        onClose={() => setEditingProduct(null)}
      >
        {editingProduct && (
          <ProductForm
            action={updateProduct}
            product={editingProduct}
            options={options}
            submitLabel="Save product"
          />
        )}
      </SlideOver>
    </>
  );
}