"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createProductSupplier } from "@/lib/repositories/product-supplier.repository";
import { productSchema } from "@/schemas/product.schema";
import { productSupplierSchema } from "@/schemas/product-supplier.schema";

const BUCKET_NAME = "products-images";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
]);

export type QuickProductResult =
    | {
        success: true;
        message: string;
        productId: string;
        slug: string;
        intent: "save" | "add-another";
    }
    | {
        success: false;
        message: string;
    };

function optionalValue(
    formData: FormData,
    key: string,
) {
    const value = String(
        formData.get(key) ?? "",
    ).trim();

    return value || undefined;
}

function createSlug(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function getExtension(file: File) {
    const extension = file.name
        .split(".")
        .pop()
        ?.toLowerCase()
        .replace(/[^a-z0-9]/g, "");

    if (extension) {
        return extension;
    }

    switch (file.type) {
        case "image/jpeg":
            return "jpg";

        case "image/png":
            return "png";

        case "image/webp":
            return "webp";

        case "image/gif":
            return "gif";

        default:
            return "bin";
    }
}

function parseProduct(formData: FormData) {
    return productSchema.safeParse({
        name: String(
            formData.get("name") ?? "",
        ),

        slug: optionalValue(
            formData,
            "slug",
        ),

        sku: optionalValue(
            formData,
            "sku",
        ),

        barcode: optionalValue(
            formData,
            "barcode",
        ),

        modelNumber: optionalValue(
            formData,
            "modelNumber",
        ),

        categoryId: String(
            formData.get("categoryId") ?? "",
        ),

        subcategoryId: optionalValue(
            formData,
            "subcategoryId",
        ),

        brandId: optionalValue(
            formData,
            "brandId",
        ),

        countryId: optionalValue(
            formData,
            "countryId",
        ),

        unitId: optionalValue(
            formData,
            "unitId",
        ),

        shortDescription: optionalValue(
            formData,
            "shortDescription",
        ),

        description: optionalValue(
            formData,
            "description",
        ),

        moq:
            formData.get("moq") ?? 1,

        cartonQuantity:
            formData.get("cartonQuantity") ??
            "",

        leadTime: optionalValue(
            formData,
            "leadTime",
        ),

        packaging: optionalValue(
            formData,
            "packaging",
        ),

        warranty: optionalValue(
            formData,
            "warranty",
        ),

        hsCode: optionalValue(
            formData,
            "hsCode",
        ),

        status: String(
            formData.get("status") ??
            "draft",
        ),

        featured:
            formData.get("featured") ===
            "on",

        isNew:
            formData.get("isNew") ===
            "on",

        fulfilmentMethod: String(
            formData.get(
                "fulfilmentMethod",
            ) ?? "stock",
        ),

        procurementLeadTimeDays:
            formData.get(
                "procurementLeadTimeDays",
            ) ?? 0,

        minimumStockQuantity:
            formData.get(
                "minimumStockQuantity",
            ) ?? 0,

        reorderQuantity:
            formData.get(
                "reorderQuantity",
            ) ?? 0,

        safetyStockDays:
            formData.get(
                "safetyStockDays",
            ) ?? 7,

        allowBackorder:
            formData.get(
                "allowBackorder",
            ) === "on",

        procurementNotes:
            optionalValue(
                formData,
                "procurementNotes",
            ),

        metaTitle:
            optionalValue(
                formData,
                "metaTitle",
            ),

        metaDescription:
            optionalValue(
                formData,
                "metaDescription",
            ),
    });
}

export async function createQuickProduct(
    formData: FormData,
): Promise<QuickProductResult> {
    const parsed =
        parseProduct(formData);

    if (!parsed.success) {
        return {
            success: false,
            message:
                parsed.error.issues[0]
                    ?.message ??
                "Please check the product information.",
        };
    }

    const slug = createSlug(
        parsed.data.slug ||
        parsed.data.name,
    );

    if (!slug) {
        return {
            success: false,
            message:
                "A valid product slug is required.",
        };
    }

    const files = formData
        .getAll("images")
        .filter(
            (value): value is File =>
                value instanceof File &&
                value.size > 0,
        );

    if (files.length > 10) {
        return {
            success: false,
            message:
                "You can upload a maximum of 10 images at once.",
        };
    }

    for (const file of files) {
        if (
            !ALLOWED_IMAGE_TYPES.has(
                file.type,
            )
        ) {
            return {
                success: false,
                message: `${file.name} is not a supported image format.`,
            };
        }

        if (
            file.size > MAX_FILE_SIZE
        ) {
            return {
                success: false,
                message: `${file.name} exceeds the current 5 MB upload limit.`,
            };
        }
    }

    const { supabase } =
        await requireAdmin();

    let productId:
        | string
        | null = null;

    const uploadedPaths:
        string[] = [];

    try {
        const productPayload = {
            name: parsed.data.name,
            slug,

            sku:
                parsed.data.sku || null,

            barcode:
                parsed.data.barcode ||
                null,

            model_number:
                parsed.data.modelNumber ||
                null,

            category_id:
                parsed.data.categoryId,

            subcategory_id:
                parsed.data
                    .subcategoryId || null,

            brand_id:
                parsed.data.brandId ||
                null,

            country_id:
                parsed.data.countryId ||
                null,

            unit_id:
                parsed.data.unitId ||
                null,

            short_description:
                parsed.data
                    .shortDescription ||
                null,

            description:
                parsed.data.description ||
                null,

            moq:
                parsed.data.moq,

            carton_quantity:
                parsed.data
                    .cartonQuantity ??
                null,

            lead_time:
                parsed.data.leadTime ||
                null,

            packaging:
                parsed.data.packaging ||
                null,

            warranty:
                parsed.data.warranty ||
                null,

            hs_code:
                parsed.data.hsCode ||
                null,

            status:
                parsed.data.status,

            featured:
                parsed.data.featured,

            is_new:
                parsed.data.isNew,

            fulfilment_method:
                parsed.data
                    .fulfilmentMethod,

            procurement_lead_time_days:
                parsed.data
                    .fulfilmentMethod ===
                    "service"
                    ? 0
                    : parsed.data
                        .procurementLeadTimeDays,

            minimum_stock_quantity:
                parsed.data
                    .minimumStockQuantity,

            reorder_quantity:
                parsed.data
                    .reorderQuantity,

            safety_stock_days:
                parsed.data
                    .safetyStockDays,

            allow_backorder:
                parsed.data
                    .fulfilmentMethod ===
                    "service"
                    ? false
                    : parsed.data
                        .allowBackorder,

            procurement_notes:
                parsed.data
                    .procurementNotes ||
                null,

            meta_title:
                parsed.data.metaTitle ||
                null,

            meta_description:
                parsed.data
                    .metaDescription ||
                null,
        };

        const {
            data: product,
            error: productError,
        } = await supabase
            .from("products")
            .insert(productPayload)
            .select("id, slug")
            .single();

        if (productError) {
            if (
                productError.code ===
                "23505"
            ) {
                throw new Error(
                    "The product slug, SKU, or another unique value already exists.",
                );
            }

            throw new Error(
                `Unable to create product: ${productError.message}`,
            );
        }

        productId = product.id;

        for (
            const [
                index,
                file,
            ] of files.entries()
        ) {
            const extension =
                getExtension(file);

            const imageBaseName =
                parsed.data.name
                    .trim()
                    .toLowerCase()
                    .replace(/&/g, "and")
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-+|-+$/g, "") ||
                "product";

            const shortUnique =
                randomUUID().slice(0, 6);

            const storagePath = [
                product.id,
                `${imageBaseName}-dubaiwholesalehub-${index + 1}-${shortUnique}.${extension}`,
            ].join("/");

            const buffer =
                await file.arrayBuffer();

            const {
                error: uploadError,
            } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(
                    storagePath,
                    buffer,
                    {
                        contentType:
                            file.type,

                        cacheControl:
                            "31536000",

                        upsert: false,
                    },
                );

            if (uploadError) {
                throw new Error(
                    `Unable to upload ${file.name}: ${uploadError.message}`,
                );
            }

            uploadedPaths.push(
                storagePath,
            );

            const {
                error: imageError,
            } = await supabase
                .from("product_images")
                .insert({
                    product_id:
                        product.id,

                    storage_path:
                        storagePath,

                    alt_text:
                        `${parsed.data.name} wholesale product from Dubai Wholesale Hub`,

                    sort_order:
                        index,

                    is_primary:
                        index === 0,
                });

            if (imageError) {
                throw new Error(
                    `Unable to save image information: ${imageError.message}`,
                );
            }
        }

        const supplierId =
            optionalValue(
                formData,
                "supplierId",
            );

        if (supplierId) {
            const supplierParsed =
                productSupplierSchema.safeParse(
                    {
                        productId:
                            product.id,

                        supplierId,

                        supplierSku:
                            optionalValue(
                                formData,
                                "supplierSku",
                            ),

                        costPrice:
                            formData.get(
                                "supplierCostPrice",
                            ) ?? "",

                        currencyCode:
                            String(
                                formData.get(
                                    "supplierCurrencyCode",
                                ) ?? "AED",
                            ),

                        moq:
                            formData.get(
                                "supplierMoq",
                            ) ?? "",

                        leadTime:
                            optionalValue(
                                formData,
                                "supplierLeadTime",
                            ),

                        leadTimeDays:
                            formData.get(
                                "supplierLeadTimeDays",
                            ) ?? "",

                        packaging:
                            optionalValue(
                                formData,
                                "supplierPackaging",
                            ),

                        paymentTerms:
                            optionalValue(
                                formData,
                                "supplierPaymentTerms",
                            ),

                        incoterm:
                            optionalValue(
                                formData,
                                "supplierIncoterm",
                            ),

                        loadingPort:
                            optionalValue(
                                formData,
                                "supplierLoadingPort",
                            ),

                        priority:
                            formData.get(
                                "supplierPriority",
                            ) ?? "0",

                        lastPurchasePrice:
                            formData.get(
                                "supplierLastPurchasePrice",
                            ) ?? "",

                        notes:
                            optionalValue(
                                formData,
                                "supplierNotes",
                            ),

                        isPreferred:
                            formData.get(
                                "supplierPreferred",
                            ) === "on",

                        isActive: true,
                    },
                );

            if (
                !supplierParsed.success
            ) {
                throw new Error(
                    supplierParsed.error
                        .issues[0]?.message ??
                    "Please check the supplier information.",
                );
            }

            await createProductSupplier(
                supplierParsed.data,
            );
        }

        revalidatePath("/");
        revalidatePath(
            "/products",
        );
        revalidatePath(
            `/products/${slug}`,
        );
        revalidatePath(
            "/admin/products",
        );

        const intent =
            formData.get(
                "submitIntent",
            ) === "add-another"
                ? "add-another"
                : "save";

        return {
            success: true,
            message:
                "Product created successfully.",
            productId:
                product.id,
            slug:
                product.slug,
            intent,
        };
    } catch (error) {
        /*
         * Storage is outside the PostgreSQL transaction,
         * so perform compensating cleanup.
         */

        if (
            uploadedPaths.length > 0
        ) {
            await supabase.storage
                .from(BUCKET_NAME)
                .remove(
                    uploadedPaths,
                );
        }

        if (productId) {
            await supabase
                .from(
                    "product_suppliers",
                )
                .delete()
                .eq(
                    "product_id",
                    productId,
                );

            await supabase
                .from(
                    "product_images",
                )
                .delete()
                .eq(
                    "product_id",
                    productId,
                );

            await supabase
                .from("products")
                .delete()
                .eq("id", productId);
        }

        return {
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Unable to create the product.",
        };
    }
}