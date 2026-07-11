import { getFeaturedProducts } from "@/lib/repositories/product.repository";

export async function getHomepageFeaturedProducts() {
  return getFeaturedProducts(4);
}