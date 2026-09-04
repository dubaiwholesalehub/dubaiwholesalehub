"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";

import {
    createCustomer,
    createCustomerAddress,
    createCustomerContact,
    setCustomerStatus,
    updateCustomer,
    updateCustomerAddress,
    updateCustomerContact,
} from "@/lib/repositories/customer.repository";

import {
    customerAddressSchema,
    customerContactSchema,
    customerSchema,
    type CustomerAddressValidatedValues,
    type CustomerContactValidatedValues,
    type CustomerValidatedValues,
} from "@/lib/validation/customer.schema";
import type {
    CustomerStatus,
} from "@/lib/repositories/customer.repository";

const CUSTOMER_LIST_URL = "/admin/customers";

function getErrorMessage(
    error: unknown,
    fallback: string,
): string {
    if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string"
    ) {
        return error.message;
    }

    return fallback;
}

export async function createCustomerAction(
    values: CustomerValidatedValues,
): Promise<void> {
    await requireAdmin();
    let customerId: string;

    try {
        const validated =
            customerSchema.parse(values);

        const customer = await createCustomer({
            customer_type:
                validated.customer_type,

            display_name:
                validated.display_name,

            company_name:
                validated.company_name ?? null,

            first_name:
                validated.first_name ?? null,

            last_name:
                validated.last_name ?? null,

            email:
                validated.email ?? null,

            phone:
                validated.phone ?? null,

            whatsapp:
                validated.whatsapp ?? null,

            tax_registration_number:
                validated.tax_registration_number ??
                null,

            currency_code:
                validated.currency_code,

            credit_limit:
                validated.credit_limit,

            payment_terms_days:
                validated.payment_terms_days,

            status:
                validated.status,

            source:
                validated.source,

            external_customer_id:
                validated.external_customer_id ??
                null,

            internal_notes:
                validated.internal_notes ?? null,
        });

        customerId = customer.id;
    } catch (error) {
        throw new Error(
            getErrorMessage(
                error,
                "Unable to create the customer.",
            ),
        );
    }

    revalidatePath(CUSTOMER_LIST_URL);

    redirect(
        `/admin/customers/${customerId}`,
    );
}

export async function updateCustomerAction(
    customerId: string,
    values: CustomerValidatedValues,
): Promise<void> {
    await requireAdmin();
    const id = customerId.trim();

    if (!id) {
        throw new Error(
            "Customer ID is required.",
        );
    }

    try {
        const validated =
            customerSchema.parse(values);

        await updateCustomer(id, {
            customer_type:
                validated.customer_type,

            display_name:
                validated.display_name,

            company_name:
                validated.company_name ?? null,

            first_name:
                validated.first_name ?? null,

            last_name:
                validated.last_name ?? null,

            email:
                validated.email ?? null,

            phone:
                validated.phone ?? null,

            whatsapp:
                validated.whatsapp ?? null,

            tax_registration_number:
                validated.tax_registration_number ??
                null,

            currency_code:
                validated.currency_code,

            credit_limit:
                validated.credit_limit,

            payment_terms_days:
                validated.payment_terms_days,

            status:
                validated.status,

            source:
                validated.source,

            external_customer_id:
                validated.external_customer_id ??
                null,

            internal_notes:
                validated.internal_notes ?? null,
        });
    } catch (error) {
        throw new Error(
            getErrorMessage(
                error,
                "Unable to update the customer.",
            ),
        );
    }

    revalidatePath(CUSTOMER_LIST_URL);

    revalidatePath(
        `/admin/customers/${id}`,
    );

    redirect(
        `/admin/customers/${id}`,
    );
}

export async function createCustomerContactAction(
    customerId: string,
    values: CustomerContactValidatedValues,
): Promise<void> {
    await requireAdmin();
    const id = customerId.trim();

    if (!id) {
        throw new Error(
            "Customer ID is required.",
        );
    }

    try {
        const validated =
            customerContactSchema.parse(values);

        await createCustomerContact({
            customer_id: id,

            contact_name:
                validated.contact_name,

            job_title:
                validated.job_title ?? null,

            email:
                validated.email ?? null,

            phone:
                validated.phone ?? null,

            whatsapp:
                validated.whatsapp ?? null,

            is_primary:
                validated.is_primary,

            is_active:
                validated.is_active,

            notes:
                validated.notes ?? null,
        });
    } catch (error) {
        throw new Error(
            getErrorMessage(
                error,
                "Unable to create the customer contact.",
            ),
        );
    }

    revalidatePath(
        `/admin/customers/${id}`,
    );

    redirect(
        `/admin/customers/${id}`,
    );
}

export async function updateCustomerContactAction(
    customerId: string,
    contactId: string,
    values: CustomerContactValidatedValues,
): Promise<void> {
    await requireAdmin();
    const normalizedCustomerId =
        customerId.trim();

    const normalizedContactId =
        contactId.trim();

    if (!normalizedCustomerId) {
        throw new Error(
            "Customer ID is required.",
        );
    }

    if (!normalizedContactId) {
        throw new Error(
            "Customer contact ID is required.",
        );
    }

    try {
        const validated =
            customerContactSchema.parse(values);

        await updateCustomerContact(
            normalizedContactId,
            {
                contact_name:
                    validated.contact_name,

                job_title:
                    validated.job_title ?? null,

                email:
                    validated.email ?? null,

                phone:
                    validated.phone ?? null,

                whatsapp:
                    validated.whatsapp ?? null,

                is_primary:
                    validated.is_primary,

                is_active:
                    validated.is_active,

                notes:
                    validated.notes ?? null,
            },
        );
    } catch (error) {
        throw new Error(
            getErrorMessage(
                error,
                "Unable to update the customer contact.",
            ),
        );
    }

    revalidatePath(
        `/admin/customers/${normalizedCustomerId}`,
    );

    redirect(
        `/admin/customers/${normalizedCustomerId}`,
    );
}

export async function createCustomerAddressAction(
    customerId: string,
    values: CustomerAddressValidatedValues,
): Promise<void> {
    await requireAdmin();
    const id = customerId.trim();

    if (!id) {
        throw new Error(
            "Customer ID is required.",
        );
    }

    try {
        const validated =
            customerAddressSchema.parse(values);

        await createCustomerAddress({
            customer_id: id,

            address_type:
                validated.address_type,

            address_name:
                validated.address_name ?? null,

            contact_name:
                validated.contact_name ?? null,

            phone:
                validated.phone ?? null,

            address_line_1:
                validated.address_line_1,

            address_line_2:
                validated.address_line_2 ?? null,

            city:
                validated.city ?? null,

            state:
                validated.state ?? null,

            country:
                validated.country ?? null,

            postal_code:
                validated.postal_code ?? null,

            is_default:
                validated.is_default,

            is_active:
                validated.is_active,

            delivery_instructions:
                validated.delivery_instructions ??
                null,
        });
    } catch (error) {
        throw new Error(
            getErrorMessage(
                error,
                "Unable to create the customer address.",
            ),
        );
    }

    revalidatePath(
        `/admin/customers/${id}`,
    );

    redirect(
        `/admin/customers/${id}`,
    );
}

export async function updateCustomerAddressAction(
    customerId: string,
    addressId: string,
    values: CustomerAddressValidatedValues,
): Promise<void> {
    await requireAdmin();
    const normalizedCustomerId =
        customerId.trim();

    const normalizedAddressId =
        addressId.trim();

    if (!normalizedCustomerId) {
        throw new Error(
            "Customer ID is required.",
        );
    }

    if (!normalizedAddressId) {
        throw new Error(
            "Customer address ID is required.",
        );
    }

    try {
        const validated =
            customerAddressSchema.parse(values);

        await updateCustomerAddress(
            normalizedAddressId,
            {
                address_type:
                    validated.address_type,

                address_name:
                    validated.address_name ?? null,

                contact_name:
                    validated.contact_name ?? null,

                phone:
                    validated.phone ?? null,

                address_line_1:
                    validated.address_line_1,

                address_line_2:
                    validated.address_line_2 ?? null,

                city:
                    validated.city ?? null,

                state:
                    validated.state ?? null,

                country:
                    validated.country ?? null,

                postal_code:
                    validated.postal_code ?? null,

                is_default:
                    validated.is_default,

                is_active:
                    validated.is_active,

                delivery_instructions:
                    validated.delivery_instructions ??
                    null,
            },
        );
    } catch (error) {
        throw new Error(
            getErrorMessage(
                error,
                "Unable to update the customer address.",
            ),
        );
    }

    revalidatePath(
        `/admin/customers/${normalizedCustomerId}`,
    );

    redirect(
        `/admin/customers/${normalizedCustomerId}`,
    );
}
export interface CustomerStatusActionState {
    success: boolean;
    message: string | null;
}

export async function changeCustomerStatusAction(
    customerId: string,
    status: CustomerStatus,
): Promise<CustomerStatusActionState> {
    await requireAdmin();
    const id = customerId.trim();

    if (!id) {
        return {
            success: false,
            message: "Customer ID is required.",
        };
    }

    try {
        const customer = await setCustomerStatus(
            id,
            status,
        );

        revalidatePath(
            "/admin/customers",
        );

        revalidatePath(
            `/admin/customers/${id}`,
        );

        const messages: Record<
            CustomerStatus,
            string
        > = {
            active:
                "Customer activated successfully.",

            inactive:
                "Customer marked inactive successfully.",

            blocked:
                "Customer blocked successfully.",
        };

        return {
            success: true,
            message: messages[customer.status],
        };
    } catch (error) {
        return {
            success: false,
            message: getErrorMessage(
                error,
                "Unable to update customer status.",
            ),
        };
    }
}