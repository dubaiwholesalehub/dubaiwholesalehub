export interface RfqSupplierCountry {
    id: string;
    name: string;
    iso2: string | null;
}

export interface RfqSupplierOption {
    id: string;
    company_name: string;
    contact_name: string | null;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    website: string | null;
    city: string | null;
    notes: string | null;
    country_id: string | null;
    is_active: boolean | null;
    country:
    | RfqSupplierCountry
    | RfqSupplierCountry[]
    | null;
}

export interface RfqSupplierCountryOption {
    id: string;
    name: string;
    iso2: string | null;
}

export interface RfqSelectedSupplier {
    supplierId: string;
    companyName: string;
    contactName: string | null;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    city: string | null;
    countryId: string | null;
    countryName: string | null;
    countryIso2: string | null;
    notes: string;
}