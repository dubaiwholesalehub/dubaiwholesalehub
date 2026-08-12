import {
  getFeaturedProducts,
  getPublishedProductBySlug,
  getPublishedProducts,
} from "@/lib/repositories/product.repository";

export async function getHomepageFeaturedProducts() {
  return getFeaturedProducts(4);
}

export async function getPublicProducts() {
  return getPublishedProducts();
}

export async function getPublicProductBySlug(
  slug: string,
) {
  return getPublishedProductBySlug(slug);
}