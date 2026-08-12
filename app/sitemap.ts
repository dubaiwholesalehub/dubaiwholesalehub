import type {
  MetadataRoute,
} from "next";

import {
  getPublicProducts,
} from "@/lib/services/product.service";

import {
  getCatalogCategories,
} from "@/lib/services/category.service";

const BASE_URL =
  "https://dubaiwholesalehub.com";

export default async function sitemap():
  Promise<MetadataRoute.Sitemap> {

  const [
    products,
    categories,
  ] = await Promise.all([
    getPublicProducts(),
    getCatalogCategories(),
  ]);

  const staticPages:
    MetadataRoute.Sitemap = [
      {
        url: BASE_URL,
        changeFrequency:
          "weekly",
        priority: 1,
      },
      {
        url:
          `${BASE_URL}/products`,
        changeFrequency:
          "daily",
        priority: 0.9,
      },
      {
        url:
          `${BASE_URL}/categories`,
        changeFrequency:
          "weekly",
        priority: 0.8,
      },
      {
        url:
          `${BASE_URL}/sourcing`,
        changeFrequency:
          "monthly",
        priority: 0.8,
      },
      {
        url:
          `${BASE_URL}/export`,
        changeFrequency:
          "monthly",
        priority: 0.8,
      },
      {
        url:
          `${BASE_URL}/contact`,
        changeFrequency:
          "monthly",
        priority: 0.7,
      },
    ];

  const productPages =
    products.map(
      (product) => ({
        url:
          `${BASE_URL}/products/${product.slug}`,

        changeFrequency:
          "weekly" as const,

        priority:
          0.8,
      }),
    );

  const categoryPages =
    categories.map(
      (category) => ({
        url:
          `${BASE_URL}/categories/${category.slug}`,

        changeFrequency:
          "weekly" as const,

        priority:
          0.7,
      }),
    );

  return [
    ...staticPages,
    ...categoryPages,
    ...productPages,
  ];
}