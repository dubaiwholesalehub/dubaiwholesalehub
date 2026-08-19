"use server";

import {
  requireAdmin,
} from "@/lib/auth/require-admin";

import {
  createClient,
} from "@/lib/supabase/server";


export type QuickPurchaseGlTestResult = {
  purchase: {
    id: string;
    purchase_number: string;
    purchase_date: string;
    supplier_id: string;
    currency_code: string;
    exchange_rate: number;
    grand_total: number;
    recoverable_tax_amount: number;
    pending_tax_amount: number;
    status: string;
  };

  caseType:
    | "no_vat"
    | "recoverable_vat"
    | "vat_pending"
    | "mixed_vat";

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
    supplier_id: string | null;

    gl_account: {
      account_code: string;
      account_name: string;
    } | null;
  }>;

  checks: {
    postedPurchase: boolean;
    sourceLinkage: boolean;
    balanced: boolean;
    correctLineCount: boolean;
    inventoryDebit: boolean;
    recoverableVatDebit: boolean;
    pendingVatDebit: boolean;
    accountsPayableCredit: boolean;
    supplierLinkage: boolean;
    idempotent: boolean;
    allPassed: boolean;
  };
};


function numberValue(
  value: unknown,
): number {
  const parsed =
    Number(value ?? 0);

  return Number.isFinite(parsed)
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


export async function testQuickPurchaseGlPostingAction(
  quickPurchaseId: string,
): Promise<QuickPurchaseGlTestResult> {
  await requireAdmin();

  const purchaseId =
    quickPurchaseId.trim();

  if (!purchaseId) {
    throw new Error(
      "Quick Purchase ID is required.",
    );
  }

  const supabase =
    await createClient();


  const {
    data: purchase,
    error: purchaseError,
  } =
    await supabase
      .from("quick_purchases")
      .select(`
        id,
        purchase_number,
        purchase_date,
        supplier_id,
        currency_code,
        exchange_rate,
        grand_total,
        recoverable_tax_amount,
        pending_tax_amount,
        status
      `)
      .eq("id", purchaseId)
      .single();


  if (
    purchaseError ||
    !purchase
  ) {
    throw new Error(
      `Unable to load Quick Purchase: ${
        purchaseError?.message ??
        "Purchase was not found."
      }`,
    );
  }


  if (
    purchase.status !==
    "posted"
  ) {
    throw new Error(
      `Quick Purchase ${purchase.purchase_number} is not posted.`,
    );
  }


  if (
    !purchase.supplier_id
  ) {
    throw new Error(
      `Quick Purchase ${purchase.purchase_number} does not have a registered supplier.`,
    );
  }


  const grandTotal =
    numberValue(
      purchase.grand_total,
    );

  const recoverableVat =
    numberValue(
      purchase.recoverable_tax_amount,
    );

  const pendingVat =
    numberValue(
      purchase.pending_tax_amount,
    );

  const inventoryAmount =
    Number(
      (
        grandTotal -
        recoverableVat -
        pendingVat
      ).toFixed(2),
    );


  let caseType:
    QuickPurchaseGlTestResult["caseType"];


  if (
    recoverableVat === 0 &&
    pendingVat === 0
  ) {
    caseType =
      "no_vat";
  } else if (
    recoverableVat > 0 &&
    pendingVat === 0
  ) {
    caseType =
      "recoverable_vat";
  } else if (
    recoverableVat === 0 &&
    pendingVat > 0
  ) {
    caseType =
      "vat_pending";
  } else {
    caseType =
      "mixed_vat";
  }


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
          "inventory",
          "vat_recoverable",
          "vat_pending",
          "accounts_payable",
        ],
      )
      .eq(
        "is_active",
        true,
      );


  if (mappingError) {
    throw new Error(
      `Unable to load GL mappings: ${mappingError.message}`,
    );
  }


  const mappings =
    new Map(
      (
        mappingRows ??
        []
      ).map(
        (mapping) => [
          mapping.mapping_key,
          mapping.gl_account_id,
        ],
      ),
    );


  const inventoryGl =
    mappings.get("inventory");

  const recoverableVatGl =
    mappings.get("vat_recoverable");

  const pendingVatGl =
    mappings.get("vat_pending");

  const accountsPayableGl =
    mappings.get("accounts_payable");


  if (!inventoryGl) {
    throw new Error(
      "Inventory GL mapping is missing.",
    );
  }


  if (!accountsPayableGl) {
    throw new Error(
      "Accounts Payable GL mapping is missing.",
    );
  }


  if (
    recoverableVat > 0 &&
    !recoverableVatGl
  ) {
    throw new Error(
      "VAT Recoverable GL mapping is missing.",
    );
  }


  if (
    pendingVat > 0 &&
    !pendingVatGl
  ) {
    throw new Error(
      "VAT Pending GL mapping is missing.",
    );
  }


  const first =
    await supabase.rpc(
      "post_quick_purchase_gl",
      {
        p_quick_purchase_id:
          purchase.id,
      },
    );


  if (first.error) {
    throw new Error(
      `Quick Purchase GL posting failed: ${first.error.message}`,
    );
  }


  const firstJournalId =
    typeof first.data ===
      "string"
      ? first.data
      : null;


  if (!firstJournalId) {
    throw new Error(
      "Quick Purchase GL posting did not return a journal ID.",
    );
  }


  const second =
    await supabase.rpc(
      "post_quick_purchase_gl",
      {
        p_quick_purchase_id:
          purchase.id,
      },
    );


  if (second.error) {
    throw new Error(
      `Quick Purchase idempotency test failed: ${second.error.message}`,
    );
  }


  const secondJournalId =
    typeof second.data ===
      "string"
      ? second.data
      : null;


  const idempotent =
    secondJournalId ===
    firstJournalId;


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
          supplier_id,

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
            ascending: true,
          },
        ),
    ]);


  const loadError =
    journalResult.error ??
    balanceResult.error ??
    linesResult.error;


  if (loadError) {
    throw new Error(
      `Unable to verify Quick Purchase GL journal: ${loadError.message}`,
    );
  }


  const journal =
    journalResult.data;

  const balance =
    balanceResult.data;

  const rawLines =
    linesResult.data ?? [];


  if (
    !journal ||
    !balance
  ) {
    throw new Error(
      "Quick Purchase GL verification data is incomplete.",
    );
  }


  const lines =
    rawLines.map(
      (line) => {
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

          supplier_id:
            line.supplier_id,

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


  const inventoryDebit =
    lines.some(
      (line) =>
        line.gl_account_id ===
          inventoryGl &&
        moneyEqual(
          line.debit,
          inventoryAmount,
        ) &&
        moneyEqual(
          line.credit,
          0,
        ),
    );


  const recoverableVatDebit =
    recoverableVat > 0
      ? lines.some(
        (line) =>
          line.gl_account_id ===
            recoverableVatGl &&
          moneyEqual(
            line.debit,
            recoverableVat,
          ) &&
          moneyEqual(
            line.credit,
            0,
          ),
      )
      : !lines.some(
        (line) =>
          line.gl_account_id ===
          recoverableVatGl,
      );


  const pendingVatDebit =
    pendingVat > 0
      ? lines.some(
        (line) =>
          line.gl_account_id ===
            pendingVatGl &&
          moneyEqual(
            line.debit,
            pendingVat,
          ) &&
          moneyEqual(
            line.credit,
            0,
          ),
      )
      : !lines.some(
        (line) =>
          line.gl_account_id ===
          pendingVatGl,
      );


  const accountsPayableCredit =
    lines.some(
      (line) =>
        line.gl_account_id ===
          accountsPayableGl &&
        moneyEqual(
          line.credit,
          grandTotal,
        ) &&
        moneyEqual(
          line.debit,
          0,
        ),
    );


  const expectedLineCount =
    2 +
    (
      recoverableVat > 0
        ? 1
        : 0
    ) +
    (
      pendingVat > 0
        ? 1
        : 0
    );


  const correctLineCount =
    lines.length ===
    expectedLineCount;


  const supplierLinkage =
    lines.every(
      (line) =>
        line.supplier_id ===
        purchase.supplier_id,
    );


  const sourceLinkage =
    journal.source_type ===
      "quick_purchase" &&
    journal.source_id ===
      purchase.id &&
    journal.source_number ===
      purchase.purchase_number;


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


  const postedPurchase =
    purchase.status ===
    "posted";


  const allPassed =
    postedPurchase &&
    sourceLinkage &&
    balanced &&
    correctLineCount &&
    inventoryDebit &&
    recoverableVatDebit &&
    pendingVatDebit &&
    accountsPayableCredit &&
    supplierLinkage &&
    idempotent;


  return {
    purchase: {
      id:
        purchase.id,

      purchase_number:
        purchase.purchase_number,

      purchase_date:
        purchase.purchase_date,

      supplier_id:
        purchase.supplier_id,

      currency_code:
        purchase.currency_code,

      exchange_rate:
        numberValue(
          purchase.exchange_rate,
        ),

      grand_total:
        grandTotal,

      recoverable_tax_amount:
        recoverableVat,

      pending_tax_amount:
        pendingVat,

      status:
        purchase.status,
    },

    caseType,

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
      postedPurchase,
      sourceLinkage,
      balanced,
      correctLineCount,
      inventoryDebit,
      recoverableVatDebit,
      pendingVatDebit,
      accountsPayableCredit,
      supplierLinkage,
      idempotent,

      allPassed,
    },
  };
}