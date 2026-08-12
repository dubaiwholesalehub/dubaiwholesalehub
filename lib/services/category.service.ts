import {
    getCategories,
    getPublicCategories,
    getPublicCategoryBySlug,
} from "@/lib/repositories/category.repository";

export async function getHomepageCategories() {
    return getCategories();
}

export async function getCatalogCategories() {
    return getPublicCategories();
}

export async function getCatalogCategoryBySlug(
    slug: string,
) {
    return getPublicCategoryBySlug(
        slug,
    );
}