import type { Database } from "@/types/database";

export type ProductRow =
  Database["public"]["Tables"]["products"]["Row"];

export type ProductStatus =
  Database["public"]["Enums"]["product_status"];

export type ProductImage = {
  id: string;
  storage_path: string;
  is_primary: boolean | null;
  sort_order: number | null;
  alt_text: string | null;
};

export type Product = ProductRow & {
  category: {
    id: string;
    name: string;
  } | null;

  subcategory: {
    id: string;
    name: string;
  } | null;

  brand: {
    id: string;
    name: string;
  } | null;

  country: {
    id: string;
    name: string;
  } | null;

  unit: {
    id: string;
    name: string;
    short_name: string;
  } | null;

  product_images: ProductImage[];
};

export type CategoryOption = {
  id: string;
  name: string;
};

export type SubcategoryOption = {
  id: string;
  name: string;
  category_id: string;
};

export type BrandOption = {
  id: string;
  name: string;
};

export type CountryOption = {
  id: string;
  name: string;
};

export type UnitOption = {
  id: string;
  name: string;
  short_name: string;
};

export interface ProductFormOptions {
  categories: CategoryOption[];
  subcategories: SubcategoryOption[];
  brands: BrandOption[];
  countries: CountryOption[];
  units: UnitOption[];
}