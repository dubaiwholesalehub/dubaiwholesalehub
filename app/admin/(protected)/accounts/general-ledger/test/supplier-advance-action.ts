"use server";

import {
  requireAdmin,
} from "@/lib/auth/require-admin";

import {
  createClient,
} from "@/lib/supabase/server";


export type SupplierAdvanceGlTestResult = {
  allocation: {
    id: string;
    supplier_payment_id: string;
    quick_purchase_id: string;
    amount: number;
    allocation_source: string;
    created_at: string;
  };

  payment: {
    payment_number: string;
    supplier_id: string;
    currency_code: string;
    exchange_rate: number;
  };

  purchase: {
    purchase_number: string;
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
    supplier_id: string | null;

    gl_account: {
      account_code: string;
      account_name: string;
    } | null;
  }>;

  checks: {
    correctSourceType: boolean;
    sourceLinkage: boolean;
    balanced: boolean;
    correctLineCount: boolean;
    accountsPayableDebit: boolean;
    supplierAdvanceCredit: boolean;
    noTreasuryLine: boolean;
    supplierLinkage: boolean;
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


export async function testSupplierAdvanceGlPostingAction(
  allocationId: string,
): Promise<SupplierAdvanceGlTestResult> {
  await requireAdmin();

  const id =
    allocationId.trim();

  if (!id) {
    throw new Error(
      "Supplier Payment Allocation ID is required.",
    );
  }


  const supabase =
    await createClient();


  /* =======================================================
   * Load Allocation
   * ======================================================= */

  const {
    data: allocation,
    error: allocationError,
  } =
    await supabase
      .from(
        "supplier_payment_allocations",
      )
      .select(`
        id,
        supplier_payment_id,
        quick_purchase_id,
        amount,
        allocation_source,
        created_at
      `)
      .eq(
        "id",
        id,
      )
      .single();


  if (
    allocationError ||
    !allocation
  ) {
    throw new Error(
      `Unable to load Supplier Advance allocation: ${
        allocationError?.message ??
        "Allocation was not found."
      }`,
    );
  }


  if (
    allocation.allocation_source !==
    "supplier_advance_application"
  ) {
    throw new Error(
      "The selected allocation is not classified as a Supplier Advance application.",
    );
  }


  const [
    paymentResult,
    purchaseResult,
    mappingResult,
    financialAccountsResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "supplier_payments",
        )
        .select(`
          id,
          payment_number,
          supplier_id,
          currency_code,
          exchange_rate
        `)
        .eq(
          "id",
          allocation.supplier_payment_id,
        )
        .single(),

      supabase
        .from(
          "quick_purchases",
        )
        .select(`
          id,
          purchase_number
        `)
        .eq(
          "id",
          allocation.quick_purchase_id,
        )
        .single(),

      supabase
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
            "accounts_payable",
            "supplier_advances",
          ],
        )
        .eq(
          "is_active",
          true,
        ),

      supabase
        .from(
          "financial_accounts",
        )
        .select(
          "gl_account_id",
        )
        .not(
          "gl_account_id",
          "is",
          null,
        ),
    ]);


  const loadError =
    paymentResult.error ??
    purchaseResult.error ??
    mappingResult.error ??
    financialAccountsResult.error;


  if (loadError) {
    throw new Error(
      `Unable to load Supplier Advance GL dependencies: ${loadError.message}`,
    );
  }


  const payment =
    paymentResult.data;

  const purchase =
    purchaseResult.data;


  if (
    !payment ||
    !purchase
  ) {
    throw new Error(
      "Supplier Advance GL test dependencies are incomplete.",
    );
  }


  const mappings =
    new Map(
      (
        mappingResult.data ??
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


  const accountsPayableGl =
    mappings.get(
      "accounts_payable",
    );

  const supplierAdvanceGl =
    mappings.get(
      "supplier_advances",
    );


  if (
    !accountsPayableGl ||
    !supplierAdvanceGl
  ) {
    throw new Error(
      "Required Accounts Payable / Supplier Advance GL mappings are missing.",
    );
  }


  const treasuryGlIds =
    new Set(
      (
        financialAccountsResult.data ??
        []
      )
        .map(
          (
            row,
          ) =>
            row.gl_account_id,
        )
        .filter(
          (
            value,
          ): value is string =>
            Boolean(
              value,
            ),
        ),
    );


  /* =======================================================
   * First Posting
   * ======================================================= */

  const first =
    await supabase.rpc(
      "post_supplier_advance_application_gl",
      {
        p_supplier_payment_allocation_id:
          allocation.id,
      },
    );


  if (first.error) {
    throw new Error(
      `Supplier Advance GL posting failed: ${first.error.message}`,
    );
  }


  const firstJournalId =
    typeof first.data ===
      "string"
      ? first.data
      : null;


  if (!firstJournalId) {
    throw new Error(
      "Supplier Advance GL posting did not return a journal ID.",
    );
  }


  /* =======================================================
   * Idempotency
   * ======================================================= */

  const second =
    await supabase.rpc(
      "post_supplier_advance_application_gl",
      {
        p_supplier_payment_allocation_id:
          allocation.id,
      },
    );


  if (second.error) {
    throw new Error(
      `Supplier Advance idempotency test failed: ${second.error.message}`,
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
   * Load GL Result
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
            ascending:
              true,
          },
        ),
    ]);


  const journalLoadError =
    journalResult.error ??
    balanceResult.error ??
    linesResult.error;


  if (journalLoadError) {
    throw new Error(
      `Unable to verify Supplier Advance GL journal: ${journalLoadError.message}`,
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
      "Supplier Advance GL verification data is incomplete.",
    );
  }


  const amount =
    numberValue(
      allocation.amount,
    );


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


  const accountsPayableDebit =
    lines.some(
      (
        line,
      ) =>
        line.gl_account_id ===
          accountsPayableGl &&
        moneyEqual(
          line.debit,
          amount,
        ) &&
        moneyEqual(
          line.credit,
          0,
        ),
    );


  const supplierAdvanceCredit =
    lines.some(
      (
        line,
      ) =>
        line.gl_account_id ===
          supplierAdvanceGl &&
        moneyEqual(
          line.credit,
          amount,
        ) &&
        moneyEqual(
          line.debit,
          0,
        ),
    );


  const noTreasuryLine =
    !lines.some(
      (
        line,
      ) =>
        treasuryGlIds.has(
          line.gl_account_id,
        ),
    );


  const correctLineCount =
    lines.length ===
    2;


  const supplierLinkage =
    lines.every(
      (
        line,
      ) =>
        line.supplier_id ===
        payment.supplier_id,
    );


  const correctSourceType =
    journal.source_type ===
    "supplier_advance_application";


  const sourceLinkage =
    journal.source_id ===
      allocation.id;


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


  const allPassed =
    correctSourceType &&
    sourceLinkage &&
    balanced &&
    correctLineCount &&
    accountsPayableDebit &&
    supplierAdvanceCredit &&
    noTreasuryLine &&
    supplierLinkage &&
    idempotent;


  return {
    allocation: {
      id:
        allocation.id,

      supplier_payment_id:
        allocation.supplier_payment_id,

      quick_purchase_id:
        allocation.quick_purchase_id,

      amount,

      allocation_source:
        allocation.allocation_source,

      created_at:
        allocation.created_at,
    },

    payment: {
      payment_number:
        payment.payment_number,

      supplier_id:
        payment.supplier_id,

      currency_code:
        payment.currency_code,

      exchange_rate:
        numberValue(
          payment.exchange_rate,
        ),
    },

    purchase: {
      purchase_number:
        purchase.purchase_number,
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
      correctSourceType,
      sourceLinkage,
      balanced,
      correctLineCount,
      accountsPayableDebit,
      supplierAdvanceCredit,
      noTreasuryLine,
      supplierLinkage,
      idempotent,

      allPassed,
    },
  };
}