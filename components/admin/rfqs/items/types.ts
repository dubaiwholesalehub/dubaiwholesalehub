export interface RfqProductOption {
  id: string;
  name: string;
  sku: string | null;
  short_description: string | null;
  unit_id: string | null;
  moq: number | null;
  packaging: string | null;

  unit: {
    id: string;
    name: string;
    short_name: string;
  } | null;

  brand: {
    id: string;
    name: string;
  } | null;

  category: {
    id: string;
    name: string;
  } | null;
}

export interface RfqUnitOption {
  id: string;
  name: string;
  short_name: string;
}

export interface RfqDraftItem {
  id: string;
  productId: string | null;
  itemName: string;
  productSku: string | null;
  itemDescription: string;
  requestedQuantity: number;
  unitId: string;
  unitName: string;
  targetUnitPrice: number | null;
  targetDeliveryDate: string;
  specifications: string;
  packagingRequirements: string;
  notes: string;
}

export interface ItemDraftForm {
  productId: string;
  itemName: string;
  productSku: string;
  itemDescription: string;
  requestedQuantity: string;
  unitId: string;
  targetUnitPrice: string;
  targetDeliveryDate: string;
  specifications: string;
  packagingRequirements: string;
  notes: string;
}

export interface ItemDraftErrors {
  itemName?: string;
  requestedQuantity?: string;
  unitId?: string;
}

export const initialItemDraft: ItemDraftForm = {
  productId: "",
  itemName: "",
  productSku: "",
  itemDescription: "",
  requestedQuantity: "1",
  unitId: "",
  targetUnitPrice: "",
  targetDeliveryDate: "",
  specifications: "",
  packagingRequirements: "",
  notes: "",
};