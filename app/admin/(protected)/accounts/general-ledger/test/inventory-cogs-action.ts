"use server";

import {
  requireAdmin,
} from "@/lib/auth/require-admin";

import {
  createClient,
} from "@/lib/supabase/server";


export type InventoryCogsGlTestResult = {
  transaction: {
    id: string;
    transaction_number: string;
    transaction_date: string;
    transaction_type: string;
    status: string;
    reference_type: string | null;
    reference_id: string | null;
    warehouse_id: string;
  };

  expected: {
    itemCount: number;
    accountingItemCount: number;
    expectedLineCount: number;
    totalCost: number;
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
    postedSalesIssue: boolean;
    deliveryOrderSource: boolean;
    sourceLinkage: boolean;
    balanced: boolean;
    correctLineCount: boolean;
    correctTotalCogs: boolean;
    correctInventoryCredit: boolean;
    productLinkage: boolean;
    warehouseLinkage: boolean;
    sourceLineLinkage: boolean;
    noUnrelatedAccounts: boolean;
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


export async function testInventoryCogsGlPostingAction(
  inventoryTransactionId: string,
): Promise<InventoryCogsGlTestResult> {
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


  /* =======================================================
   * Load Inventory Transaction
   * ======================================================= */

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
        reference_type,
        reference_id,
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


  /* =======================================================
   * Load Inventory Items
   * ======================================================= */

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
      `Unable to load Inventory Transaction items: ${itemsError.message}`,
    );
  }


  const items =
    itemRows ??
    [];


  if (
    items.length ===
    0
  ) {
    throw new Error(
      "Inventory Transaction does not contain any items.",
    );
  }


  const accountingItems =
    items.filter(
      (
        item,
      ) =>
        numberValue(
          item.total_cost,
        ) >
        0,
    );


  const totalCost =
    Number(
      accountingItems
        .reduce(
          (
            total,
            item,
          ) =>
            total +
            numberValue(
              item.total_cost,
            ),
          0,
        )
        .toFixed(
          2,
        ),
    );


  if (
    totalCost <=
    0
  ) {
    throw new Error(
      "Inventory Transaction has zero COGS value.",
    );
  }


  /* =======================================================
   * Resolve COGS + Inventory GL
   * ======================================================= */

  const {
    data: mappingRows,
    error: mappingError,
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
          "cogs",
          "inventory",
        ],
      )
      .eq(
        "is_active",
        true,
      );


  if (mappingError) {
    throw new Error(
      `Unable to load COGS GL mappings: ${mappingError.message}`,
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


  const cogsGl =
    mappings.get(
      "cogs",
    );

  const inventoryGl =
    mappings.get(
      "inventory",
    );


  if (
    !cogsGl ||
    !inventoryGl
  ) {
    throw new Error(
      "COGS / Inventory GL mappings are missing.",
    );
  }


  /* =======================================================
   * First Posting
   * ======================================================= */

  const first =
    await supabase.rpc(
      "post_inventory_cogs_gl",
      {
        p_inventory_transaction_id:
          transaction.id,
      },
    );


  if (first.error) {
    throw new Error(
      `Inventory COGS GL posting failed: ${first.error.message}`,
    );
  }


  const firstJournalId =
    typeof first.data ===
      "string"
      ? first.data
      : null;


  if (!firstJournalId) {
    throw new Error(
      "Inventory COGS GL posting did not return a journal ID.",
    );
  }


  /* =======================================================
   * Idempotency
   * ======================================================= */

  const second =
    await supabase.rpc(
      "post_inventory_cogs_gl",
      {
        p_inventory_transaction_id:
          transaction.id,
      },
    );


  if (second.error) {
    throw new Error(
      `Inventory COGS idempotency test failed: ${second.error.message}`,
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


  /* =======================================================
   * Load Journal
   * ======================================================= */

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
      `Unable to verify Inventory COGS journal: ${loadError.message}`,
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
      "Inventory COGS GL verification data is incomplete.",
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


  /* =======================================================
   * Validation
   * ======================================================= */

  const postedSalesIssue =
    transaction.status ===
      "posted" &&
    transaction.transaction_type ===
      "sales_issue";


  const deliveryOrderSource =
    transaction.reference_type ===
      "delivery_order" &&
    Boolean(
      transaction.reference_id,
    );


  const sourceLinkage =
    journal.source_type ===
      "inventory_cogs" &&
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


  const expectedLineCount =
    accountingItems.length *
    2;


  const correctLineCount =
    lines.length ===
    expectedLineCount;


  const cogsDebitTotal =
    lines
      .filter(
        (
          line,
        ) =>
          line.gl_account_id ===
          cogsGl,
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


  const inventoryCreditTotal =
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


  const correctTotalCogs =
    moneyEqual(
      cogsDebitTotal,
      totalCost,
    );


  const correctInventoryCredit =
    moneyEqual(
      inventoryCreditTotal,
      totalCost,
    );


  const accountingItemIds =
    new Set(
      accountingItems.map(
        (
          item,
        ) =>
          item.id,
      ),
    );


  const accountingProductIds =
    new Set(
      accountingItems.map(
        (
          item,
        ) =>
          item.product_id,
      ),
    );


  const accountingWarehouseIds =
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
        accountingProductIds.has(
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
        accountingWarehouseIds.has(
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
        accountingItemIds.has(
          line.source_line_id!,
        ) &&
        line.source_line_number !==
          null,
    );


  const allowedAccountIds =
    new Set(
      [
        cogsGl,
        inventoryGl,
      ],
    );


  const noUnrelatedAccounts =
    lines.every(
      (
        line,
      ) =>
        allowedAccountIds.has(
          line.gl_account_id,
        ),
    );


  const allPassed =
    postedSalesIssue &&
    deliveryOrderSource &&
    sourceLinkage &&
    balanced &&
    correctLineCount &&
    correctTotalCogs &&
    correctInventoryCredit &&
    productLinkage &&
    warehouseLinkage &&
    sourceLineLinkage &&
    noUnrelatedAccounts &&
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

      reference_type:
        transaction.reference_type,

      reference_id:
        transaction.reference_id,

      warehouse_id:
        transaction.warehouse_id,
    },

    expected: {
      itemCount:
        items.length,

      accountingItemCount:
        accountingItems.length,

      expectedLineCount,

      totalCost,
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
      postedSalesIssue,
      deliveryOrderSource,
      sourceLinkage,
      balanced,
      correctLineCount,
      correctTotalCogs,
      correctInventoryCredit,
      productLinkage,
      warehouseLinkage,
      sourceLineLinkage,
      noUnrelatedAccounts,
      idempotent,

      allPassed,
    },
  };
}