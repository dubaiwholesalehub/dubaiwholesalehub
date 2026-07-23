import type {
  RfqSelectedSupplier,
  RfqSupplierCountry,
  RfqSupplierOption,
} from "@/components/admin/rfqs/suppliers/types";

export function getSupplierCountry(
  supplier: RfqSupplierOption,
): RfqSupplierCountry | null {
  if (!supplier.country) {
    return null;
  }

  if (Array.isArray(supplier.country)) {
    return supplier.country[0] ?? null;
  }

  return supplier.country;
}

export function getSupplierLocation(
  supplier: RfqSupplierOption,
): string {
  const country = getSupplierCountry(supplier);

  return [supplier.city, country?.name]
    .filter(Boolean)
    .join(", ");
}

export function filterRfqSuppliers(
  suppliers: RfqSupplierOption[],
  searchQuery: string,
  countryId: string,
): RfqSupplierOption[] {
  const normalizedQuery = searchQuery
    .trim()
    .toLowerCase();

  return suppliers.filter((supplier) => {
    const country = getSupplierCountry(supplier);

    const matchesCountry =
      !countryId ||
      supplier.country_id === countryId ||
      country?.id === countryId;

    if (!matchesCountry) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const searchableText = [
      supplier.company_name,
      supplier.contact_name,
      supplier.email,
      supplier.phone,
      supplier.whatsapp,
      supplier.city,
      country?.name,
      country?.iso2,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalizedQuery);
  });
}

export function createSelectedSupplier(
  supplier: RfqSupplierOption,
): RfqSelectedSupplier {
  const country = getSupplierCountry(supplier);

  return {
    supplierId: supplier.id,
    companyName: supplier.company_name,
    contactName: supplier.contact_name,
    email: supplier.email,
    phone: supplier.phone,
    whatsapp: supplier.whatsapp,
    city: supplier.city,
    countryId:
      supplier.country_id ?? country?.id ?? null,
    countryName: country?.name ?? null,
    countryIso2: country?.iso2 ?? null,
    notes: "",
  };
}

export function countSelectedSupplierCountries(
  suppliers: RfqSelectedSupplier[],
): number {
  return new Set(
    suppliers
      .map((supplier) => supplier.countryId)
      .filter(
        (countryId): countryId is string =>
          Boolean(countryId),
      ),
  ).size;
}

export function hasSupplierContactMethod(
  supplier: RfqSupplierOption,
): boolean {
  return Boolean(
    supplier.email ||
      supplier.phone ||
      supplier.whatsapp,
  );
}