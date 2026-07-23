"use server";

import {
  createRfq,
  type CreateRfqPayload,
} from "@/lib/repositories/rfq/rfq-create.repository";

export interface CreateRfqActionInput {
  rfq: CreateRfqPayload["rfq"];
  items: CreateRfqPayload["items"];
  suppliers: CreateRfqPayload["suppliers"];
}

export type CreateRfqActionResult =
  | {
      success: true;
      rfqId: string;
      rfqNumber: string;
    }
  | {
      success: false;
      message: string;
    };

export async function createRfqAction(
  input: CreateRfqActionInput,
): Promise<CreateRfqActionResult> {
  try {
    validateCreateRfqInput(input);

    const result = await createRfq({
      rfq: input.rfq,
      items: input.items,
      suppliers: input.suppliers,
    });

    return {
      success: true,
      rfqId: result.rfqId,
      rfqNumber: result.rfqNumber,
    };
  } catch (error) {
    console.error("Failed to create RFQ:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to create the RFQ.",
    };
  }
}

function validateCreateRfqInput(
  input: CreateRfqActionInput,
) {
  if (!isJsonObject(input.rfq)) {
    throw new Error(
      "Invalid RFQ information.",
    );
  }

  const title = readString(
    input.rfq.title,
  );

  const currencyCode = readString(
    input.rfq.currency_code,
  );

  const responseDeadline = readString(
    input.rfq.response_deadline,
  );

  const requiredDeliveryDate = readString(
    input.rfq.required_delivery_date,
  );

  if (!title) {
    throw new Error("RFQ title is required.");
  }

  if (!currencyCode) {
    throw new Error(
      "RFQ currency is required.",
    );
  }

  if (currencyCode.length !== 3) {
    throw new Error(
      "Currency code must contain three characters.",
    );
  }

  if (!responseDeadline) {
    throw new Error(
      "Response deadline is required.",
    );
  }

  if (!requiredDeliveryDate) {
    throw new Error(
      "Required delivery date is required.",
    );
  }

  if (!Array.isArray(input.items)) {
    throw new Error(
      "Invalid RFQ item information.",
    );
  }

  if (input.items.length === 0) {
    throw new Error(
      "Add at least one RFQ item.",
    );
  }

  if (!Array.isArray(input.suppliers)) {
    throw new Error(
      "Invalid supplier information.",
    );
  }

  if (input.suppliers.length === 0) {
    throw new Error(
      "Select at least one supplier.",
    );
  }

  input.items.forEach((item, index) => {
    if (!isJsonObject(item)) {
      throw new Error(
        `Invalid item information on line ${
          index + 1
        }.`,
      );
    }

    const itemName = readString(
      item.item_name,
    );

    const quantity = readNumber(
      item.requested_quantity,
    );

    if (!itemName) {
      throw new Error(
        `Item name is required on line ${
          index + 1
        }.`,
      );
    }

    if (
      quantity === null ||
      quantity <= 0
    ) {
      throw new Error(
        `Quantity must be greater than zero on line ${
          index + 1
        }.`,
      );
    }
  });

  input.suppliers.forEach(
    (supplier, index) => {
      if (!isJsonObject(supplier)) {
        throw new Error(
          `Invalid supplier information at position ${
            index + 1
          }.`,
        );
      }

      const supplierId = readString(
        supplier.supplier_id,
      );

      if (!supplierId) {
        throw new Error(
          `Supplier ID is missing at position ${
            index + 1
          }.`,
        );
      }
    },
  );
}

function isJsonObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function readString(
  value: unknown,
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function readNumber(
  value: unknown,
): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value === "string" &&
    value.trim()
  ) {
    const parsed = Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : null;
  }

  return null;
}