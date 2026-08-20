"use server";

import {
  requireAdmin,
} from "@/lib/auth/require-admin";

import {
  createClient,
} from "@/lib/supabase/server";


export type ManualInventoryGlTestResult = {
  transaction: {
    id: string;
    transaction_number: string;
    transaction_date: string;
    transaction_type: string;
    status: string;
    warehouse_id: string;
  };

  expected: {
    accountingItemCount: number;
    expectedLineCount: number;
    totalValue: number;
    caseType:
      | "opening_balance"
      | "adjustment_in"
      | "adjustment_out"
      | "stock_count_increase"
      | "stock_count_decrease"
      | "stock_count_mixed";
  };

  journal: {
    id: string;
    journal_number: string;
    source_type: string;
    source_id: string | null;
    source_number: string | null;
    status: string;
  };

  balance: {
    journal_entry_id: string;
    line_count: number;
    total_base_debit: number;
    total_base_credit: number;
    base_difference: number;
    is_balanced: boolean;
  };

  lines: Array<{
    id: string;
    line_number: number;
    gl_account_id: string;
    description: string | null;
    debit: number;
    credit: number;
    base_debit: number;
    base_credit: number;
    product_id: string | null;
    warehouse_id: string | null;
    source_line_type: string | null;
    source_line_id: string | null;
    source_line_number: number | null;

    gl_account: {
      account_code: string;
      account_name: string;
    } | null;
  }>;

  checks: {
    postedTransaction: boolean;
    supportedType: boolean;
    sourceLinkage: boolean;
    balanced: boolean;
    correctLineCount: boolean;
    inventorySideCorrect: boolean;
    offsetSideCorrect: boolean;
    productLinkage: boolean;
    warehouseLinkage: boolean;
    sourceLineLinkage: boolean;
    onlyExpectedAccounts: boolean;
    idempotent: boolean;
    allPassed: boolean;
  };
};


function numberValue(
  value: unknown,
): number {
  const parsed =
    Number(
      value ??
      0,
    );

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : 0;
}


function moneyEqual(
  left: unknown,
  right: unknown,
): boolean {
  return (
    Math.abs(
      numberValue(left) -
      numberValue(right),
    ) <= 0.01
  );
}


export async function testManualInventoryGlPostingAction(
  inventoryTransactionId: string,
): Promise<ManualInventoryGlTestResult> {
  await requireAdmin();

  const transactionId =
    inventoryTransactionId.trim();

  if (!transactionId) {
    throw new Error(
      "Inventory Transaction ID is required.",
    );
  }


  const supabase =
    await createClient();


  const {
    data: transaction,
    error: transactionError,
  } =
    await supabase
      .from(
        "inventory_transactions",
      )
      .select(`
        id,
        transaction_number,
        transaction_date,
        transaction_type,
        status,
        warehouse_id
      `)
      .eq(
        "id",
        transactionId,
      )
      .single();


  if (
    transactionError ||
    !transaction
  ) {
    throw new Error(
      `Unable to load Inventory Transaction: ${
        transactionError?.message ??
        "Transaction was not found."
      }`,
    );
  }


  const supportedTypes =
    new Set([
      "opening_balance",
      "adjustment_in",
      "adjustment_out",
      "stock_count",
    ]);


  if (
    !supportedTypes.has(
      transaction.transaction_type,
    )
  ) {
    throw new Error(
      `Inventory Transaction ${transaction.transaction_number} is not a supported manual inventory transaction.`,
    );
  }


  const {
    data: itemRows,
    error: itemsError,
  } =
    await supabase
      .from(
        "inventory_transaction_items",
      )
      .select(`
        id,
        line_number,
        product_id,
        warehouse_id,
        quantity_change,
        unit_cost,
        total_cost
      `)
      .eq(
        "inventory_transaction_id",
        transaction.id,
      )
      .order(
        "line_number",
        {
          ascending:
            true,
        },
      );


  if (itemsError) {
    throw new Error(
      `Unable to load manual inventory items: ${itemsError.message}`,
    );
  }


  const items =
    itemRows ??
    [];


  const accountingItems =
    items.filter(
      (
        item,
      ) =>
        numberValue(
          item.total_cost,
        ) >
          0 &&
        numberValue(
          item.quantity_change,
        ) !==
          0,
    );


  if (
    accountingItems.length ===
    0
  ) {
    throw new Error(
      "Manual Inventory Transaction contains no accounting-value movement.",
    );
  }


  const totalValue =
    Number(
      accountingItems
        .reduce(
          (
            total,
            item,
          ) =>
            total +
            Number(
              numberValue(
                item.total_cost,
              ).toFixed(
                2,
              ),
            ),
          0,
        )
        .toFixed(
          2,
        ),
    );


  let caseType:
    ManualInventoryGlTestResult[
      "expected"
    ]["caseType"];


  if (
    transaction.transaction_type ===
    "opening_balance"
  ) {
    caseType =
      "opening_balance";
  } else if (
    transaction.transaction_type ===
    "adjustment_in"
  ) {
    caseType =
      "adjustment_in";
  } else if (
    transaction.transaction_type ===
    "adjustment_out"
  ) {
    caseType =
      "adjustment_out";
  } else {
    const hasIncrease =
      accountingItems.some(
        (
          item,
        ) =>
          numberValue(
            item.quantity_change,
          ) >
          0,
      );

    const hasDecrease =
      accountingItems.some(
        (
          item,
        ) =>
          numberValue(
            item.quantity_change,
          ) <
          0,
      );

    if (
      hasIncrease &&
      hasDecrease
    ) {
      caseType =
        "stock_count_mixed";
    } else if (
      hasIncrease
    ) {
      caseType =
        "stock_count_increase";
    } else {
      caseType =
        "stock_count_decrease";
    }
  }


  const {
    data: mappingRows,
    error: mappingsError,
  } =
    await supabase
      .from(
        "gl_account_mappings",
      )
      .select(`
        mapping_key,
        gl_account_id,
        is_active
      `)
      .in(
        "mapping_key",
        [
          "inventory",
          "opening_balance_equity",
          "inventory_adjustment_gain",
          "inventory_adjustment_loss",
        ],
      )
      .eq(
        "is_active",
        true,
      );


  if (mappingsError) {
    throw new Error(
      `Unable to load Manual Inventory GL mappings: ${mappingsError.message}`,
    );
  }


  const mappings =
    new Map(
      (
        mappingRows ??
        []
      ).map(
        (
          mapping,
        ) => [
          mapping.mapping_key,
          mapping.gl_account_id,
        ],
      ),
    );


  const inventoryGl =
    mappings.get(
      "inventory",
    );

  const openingEquityGl =
    mappings.get(
      "opening_balance_equity",
    );

  const adjustmentGainGl =
    mappings.get(
      "inventory_adjustment_gain",
    );

  const adjustmentLossGl =
    mappings.get(
      "inventory_adjustment_loss",
    );


  if (
    !inventoryGl ||
    !openingEquityGl ||
    !adjustmentGainGl ||
    !adjustmentLossGl
  ) {
    throw new Error(
      "Required Manual Inventory GL mappings are incomplete.",
    );
  }


  const first =
    await supabase.rpc(
      "post_manual_inventory_gl",
      {
        p_inventory_transaction_id:
          transaction.id,
      },
    );


  if (first.error) {
    throw new Error(
      `Manual Inventory GL posting failed: ${first.error.message}`,
    );
  }


  const firstJournalId =
    typeof first.data ===
      "string"
      ? first.data
      : null;


  if (!firstJournalId) {
    throw new Error(
      "Manual Inventory GL posting did not return a journal ID.",
    );
  }


  const second =
    await supabase.rpc(
      "post_manual_inventory_gl",
      {
        p_inventory_transaction_id:
          transaction.id,
      },
    );


  if (second.error) {
    throw new Error(
      `Manual Inventory GL idempotency test failed: ${second.error.message}`,
    );
  }


  const secondJournalId =
    typeof second.data ===
      "string"
      ? second.data
      : null;


  const idempotent =
    firstJournalId ===
    secondJournalId;


  const [
    journalResult,
    balanceResult,
    linesResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "gl_journal_entries",
        )
        .select(`
          id,
          journal_number,
          source_type,
          source_id,
          source_number,
          status
        `)
        .eq(
          "id",
          firstJournalId,
        )
        .single(),

      supabase
        .from(
          "gl_journal_balance",
        )
        .select(`
          journal_entry_id,
          line_count,
          total_base_debit,
          total_base_credit,
          base_difference,
          is_balanced
        `)
        .eq(
          "journal_entry_id",
          firstJournalId,
        )
        .single(),

      supabase
        .from(
          "gl_journal_lines",
        )
        .select(`
          id,
          line_number,
          gl_account_id,
          description,
          debit,
          credit,
          base_debit,
          base_credit,
          product_id,
          warehouse_id,
          source_line_type,
          source_line_id,
          source_line_number,

          gl_account:gl_accounts (
            account_code,
            account_name
          )
        `)
        .eq(
          "journal_entry_id",
          firstJournalId,
        )
        .order(
          "line_number",
          {
            ascending:
              true,
          },
        ),
    ]);


  const loadError =
    journalResult.error ??
    balanceResult.error ??
    linesResult.error;


  if (loadError) {
    throw new Error(
      `Unable to verify Manual Inventory GL journal: ${loadError.message}`,
    );
  }


  const journal =
    journalResult.data;

  const balance =
    balanceResult.data;

  const rawLines =
    linesResult.data ??
    [];


  if (
    !journal ||
    !balance
  ) {
    throw new Error(
      "Manual Inventory GL verification data is incomplete.",
    );
  }


  const lines =
    rawLines.map(
      (
        line,
      ) => {
        const relation =
          Array.isArray(
            line.gl_account,
          )
            ? line.gl_account[0]
            : line.gl_account;

        return {
          id:
            line.id,

          line_number:
            line.line_number,

          gl_account_id:
            line.gl_account_id,

          description:
            line.description,

          debit:
            numberValue(
              line.debit,
            ),

          credit:
            numberValue(
              line.credit,
            ),

          base_debit:
            numberValue(
              line.base_debit,
            ),

          base_credit:
            numberValue(
              line.base_credit,
            ),

          product_id:
            line.product_id,

          warehouse_id:
            line.warehouse_id,

          source_line_type:
            line.source_line_type,

          source_line_id:
            line.source_line_id,

          source_line_number:
            line.source_line_number,

          gl_account:
            relation
              ? {
                account_code:
                  relation.account_code,

                account_name:
                  relation.account_name,
              }
              : null,
        };
      },
    );


  const expectedLineCount =
    accountingItems.length *
    2;


  const postedTransaction =
    transaction.status ===
    "posted";


  const supportedType =
    supportedTypes.has(
      transaction.transaction_type,
    );


  const sourceLinkage =
    journal.source_type ===
      "manual_inventory" &&
    journal.source_id ===
      transaction.id &&
    journal.source_number ===
      transaction.transaction_number;


  const balanced =
    balance.is_balanced ===
      true &&
    moneyEqual(
      balance.total_base_debit,
      balance.total_base_credit,
    ) &&
    moneyEqual(
      balance.base_difference,
      0,
    );


  const correctLineCount =
    lines.length ===
    expectedLineCount;


  let inventoryExpectedDebit =
    0;

  let inventoryExpectedCredit =
    0;

  let offsetExpectedDebit =
    0;

  let offsetExpectedCredit =
    0;

  let expectedOffsetAccounts =
    new Set<string>();


  for (
    const item
    of accountingItems
  ) {
    const amount =
      Number(
        numberValue(
          item.total_cost,
        ).toFixed(
          2,
        ),
      );

    const quantityChange =
      numberValue(
        item.quantity_change,
      );


    if (
      transaction.transaction_type ===
        "opening_balance" ||
      transaction.transaction_type ===
        "adjustment_in" ||
      (
        transaction.transaction_type ===
          "stock_count" &&
        quantityChange >
          0
      )
    ) {
      inventoryExpectedDebit +=
        amount;

      offsetExpectedCredit +=
        amount;

      expectedOffsetAccounts.add(
        transaction.transaction_type ===
          "opening_balance"
          ? openingEquityGl
          : adjustmentGainGl,
      );
    } else {
      inventoryExpectedCredit +=
        amount;

      offsetExpectedDebit +=
        amount;

      expectedOffsetAccounts.add(
        adjustmentLossGl,
      );
    }
  }


  const inventoryDebit =
    lines
      .filter(
        (
          line,
        ) =>
          line.gl_account_id ===
          inventoryGl,
      )
      .reduce(
        (
          total,
          line,
        ) =>
          total +
          line.debit,
        0,
      );


  const inventoryCredit =
    lines
      .filter(
        (
          line,
        ) =>
          line.gl_account_id ===
          inventoryGl,
      )
      .reduce(
        (
          total,
          line,
        ) =>
          total +
          line.credit,
        0,
      );


  const inventorySideCorrect =
    moneyEqual(
      inventoryDebit,
      inventoryExpectedDebit,
    ) &&
    moneyEqual(
      inventoryCredit,
      inventoryExpectedCredit,
    );


  const offsetDebit =
    lines
      .filter(
        (
          line,
        ) =>
          expectedOffsetAccounts.has(
            line.gl_account_id,
          ),
      )
      .reduce(
        (
          total,
          line,
        ) =>
          total +
          line.debit,
        0,
      );


  const offsetCredit =
    lines
      .filter(
        (
          line,
        ) =>
          expectedOffsetAccounts.has(
            line.gl_account_id,
          ),
      )
      .reduce(
        (
          total,
          line,
        ) =>
          total +
          line.credit,
        0,
      );


  const offsetSideCorrect =
    moneyEqual(
      offsetDebit,
      offsetExpectedDebit,
    ) &&
    moneyEqual(
      offsetCredit,
      offsetExpectedCredit,
    );


  const itemIds =
    new Set(
      accountingItems.map(
        (
          item,
        ) =>
          item.id,
      ),
    );


  const productIds =
    new Set(
      accountingItems.map(
        (
          item,
        ) =>
          item.product_id,
      ),
    );


  const warehouseIds =
    new Set(
      accountingItems.map(
        (
          item,
        ) =>
          item.warehouse_id,
      ),
    );


  const productLinkage =
    lines.every(
      (
        line,
      ) =>
        Boolean(
          line.product_id,
        ) &&
        productIds.has(
          line.product_id!,
        ),
    );


  const warehouseLinkage =
    lines.every(
      (
        line,
      ) =>
        Boolean(
          line.warehouse_id,
        ) &&
        warehouseIds.has(
          line.warehouse_id!,
        ),
    );


  const sourceLineLinkage =
    lines.every(
      (
        line,
      ) =>
        line.source_line_type ===
          "inventory_transaction_item" &&
        Boolean(
          line.source_line_id,
        ) &&
        itemIds.has(
          line.source_line_id!,
        ) &&
        line.source_line_number !==
          null,
    );


  const allowedAccounts =
    new Set([
      inventoryGl,
      openingEquityGl,
      adjustmentGainGl,
      adjustmentLossGl,
    ]);


  const onlyExpectedAccounts =
    lines.every(
      (
        line,
      ) =>
        allowedAccounts.has(
          line.gl_account_id,
        ),
    );


  const allPassed =
    postedTransaction &&
    supportedType &&
    sourceLinkage &&
    balanced &&
    correctLineCount &&
    inventorySideCorrect &&
    offsetSideCorrect &&
    productLinkage &&
    warehouseLinkage &&
    sourceLineLinkage &&
    onlyExpectedAccounts &&
    idempotent;


  return {
    transaction: {
      id:
        transaction.id,

      transaction_number:
        transaction.transaction_number,

      transaction_date:
        transaction.transaction_date,

      transaction_type:
        transaction.transaction_type,

      status:
        transaction.status,

      warehouse_id:
        transaction.warehouse_id,
    },

    expected: {
      accountingItemCount:
        accountingItems.length,

      expectedLineCount,

      totalValue,

      caseType,
    },

    journal: {
      id:
        journal.id,

      journal_number:
        journal.journal_number,

      source_type:
        journal.source_type,

      source_id:
        journal.source_id,

      source_number:
        journal.source_number,

      status:
        journal.status,
    },

    balance: {
      journal_entry_id:
        balance.journal_entry_id ??
        firstJournalId,

      line_count:
        numberValue(
          balance.line_count,
        ),

      total_base_debit:
        numberValue(
          balance.total_base_debit,
        ),

      total_base_credit:
        numberValue(
          balance.total_base_credit,
        ),

      base_difference:
        numberValue(
          balance.base_difference,
        ),

      is_balanced:
        balance.is_balanced ??
        false,
    },

    lines,

    checks: {
      postedTransaction,
      supportedType,
      sourceLinkage,
      balanced,
      correctLineCount,
      inventorySideCorrect,
      offsetSideCorrect,
      productLinkage,
      warehouseLinkage,
      sourceLineLinkage,
      onlyExpectedAccounts,
      idempotent,

      allPassed,
    },
  };
}