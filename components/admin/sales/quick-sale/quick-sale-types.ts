export type QuickSaleCustomer = {
    id: string;
    customerNumber: string | null;
    displayName: string;
    companyName: string | null;
};

export type QuickSaleWarehouse = {
    id: string;
    code: string;
    name: string;
};

export type QuickSaleProduct = {
    id: string;
    name: string;
    sku: string | null;
    unitId: string | null;
    unitName: string | null;
    unitShortName: string | null;
    defaultFulfilmentMethod: string;
};

export type QuickSaleStock = {
    warehouseId: string;
    productId: string;
    quantityOnHand: number;
    quantityReserved: number;
    quantityAvailable: number;
    averageUnitCost: number;
};

export type QuickSaleSupplier = {
    id: string;
    companyName: string;
};

export type QuickSaleCountry = {
    id: string;
    name: string;
    iso2: string | null;
};

export type QuickSaleOptions = {
    customers: QuickSaleCustomer[];
    warehouses: QuickSaleWarehouse[];
    products: QuickSaleProduct[];
    stock: QuickSaleStock[];
    suppliers: QuickSaleSupplier[];
    countries: QuickSaleCountry[];
    purchaseInfo: QuickSalePurchaseInfo[];
};

export type QuickSalePurchaseInfo = {
    productId: string;

    supplierId: string | null;
    supplierName: string | null;

    isPreferred: boolean;

    costPrice: number | null;
    lastPurchasePrice: number | null;
    suggestedPurchasePrice: number | null;

    currencyCode: string;

    lastPriceUpdate: string | null;
};

export type QuickSaleTaxTreatment =
    | "local_5"
    | "export_verified"
    | "export_pending"
    | "review";

export type QuickSalePaymentMethod =
    | "cash"
    | "bank"
    | "credit"
    | "partial";

export type QuickSaleDeliveryMode =
    | "now"
    | "later";

export type QuickSaleItemInput = {
    productId: string;
    quantity: number;
    fulfilment:
    | "stock"
    | "local_purchase";

    supplierId?: string;
    purchaseCost?: number;

    sellingPrice: number;
};

export type CompleteQuickSaleInput = {
    customerId: string;
    warehouseId: string;
    saleDate: string;

    taxTreatment:
    QuickSaleTaxTreatment;

    destinationCountryId?: string;
    cargoCompany?: string;
    cargoReference?: string;

    paymentMethod:
    QuickSalePaymentMethod;

    amountReceived: number;

    deliveryMode:
    QuickSaleDeliveryMode;

    items: QuickSaleItemInput[];
};

export type CompleteQuickSaleResult =
    | {
        success: true;

        salesOrderId: string;
        orderNumber: string;

        deliveryOrderId:
        | string
        | null;

        message: string;
    }
    | {
        success: false;
        message: string;
    };