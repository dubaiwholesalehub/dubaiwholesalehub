"use server";

import {
  requireAdmin,
} from "@/lib/auth/require-admin";

import {
  createClient,
} from "@/lib/supabase/server";


export type SupplierPaymentGlTestResult = {
  payment: {
    id: string;
    payment_number: string;
    payment_date: string;
    supplier_id: string;
    financial_account_id: string;
    currency_code: string;
    exchange_rate: number;
    amount: number;
    allocated_amount: number;
    unallocated_amount: number;
    status: string;
  };

  caseType:
    | "fully_allocated"
    | "fully_unallocated"
    | "mixed";

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
    postedPayment: boolean;
    sourceLinkage: boolean;
    balanced: boolean;
    correctLineCount: boolean;
    financialAccountCredit: boolean;
    accountsPayableDebit: boolean;
    supplierAdvanceDebit: boolean;
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
    ) <=
    0.01
  );
}


export async function testSupplierPaymentGlPostingAction(
  supplierPaymentId: string,
): Promise<SupplierPaymentGlTestResult> {
  await requireAdmin();

  const paymentId =
    supplierPaymentId.trim();

  if (!paymentId) {
    throw new Error(
      "Supplier Payment ID is required.",
    );
  }

  const supabase =
    await createClient();


  const {
    data: payment,
    error: paymentError,
  } =
    await supabase
      .from(
        "supplier_payments",
      )
      .select(`
        id,
        payment_number,
        payment_date,
        supplier_id,
        financial_account_id,
        account_transaction_id,
        currency_code,
        exchange_rate,
        amount,
        allocated_amount,
        unallocated_amount,
        status
      `)
      .eq(
        "id",
        paymentId,
      )
      .single();


  if (
    paymentError ||
    !payment
  ) {
    throw new Error(
      `Unable to load Supplier Payment: ${
        paymentError?.message ??
        "Payment was not found."
      }`,
    );
  }


  if (
    payment.status !==
    "posted"
  ) {
    throw new Error(
      `Supplier Payment ${payment.payment_number} is not posted.`,
    );
  }


  if (
    !payment.financial_account_id
  ) {
    throw new Error(
      `Supplier Payment ${payment.payment_number} does not have a financial account.`,
    );
  }


  if (
    !payment.account_transaction_id
  ) {
    throw new Error(
      `Supplier Payment ${payment.payment_number} does not have an account transaction.`,
    );
  }


  const amount =
    numberValue(
      payment.amount,
    );

  const allocatedAmount =
    numberValue(
      payment.allocated_amount,
    );

  const unallocatedAmount =
    numberValue(
      payment.unallocated_amount,
    );


  let caseType:
    SupplierPaymentGlTestResult["caseType"];


  if (
    allocatedAmount > 0 &&
    unallocatedAmount === 0
  ) {
    caseType =
      "fully_allocated";
  } else if (
    allocatedAmount === 0 &&
    unallocatedAmount > 0
  ) {
    caseType =
      "fully_unallocated";
  } else {
    caseType =
      "mixed";
  }


  const {
    data: financialAccount,
    error: financialAccountError,
  } =
    await supabase
      .from(
        "financial_accounts",
      )
      .select(`
        id,
        account_name,
        gl_account_id
      `)
      .eq(
        "id",
        payment.financial_account_id,
      )
      .single();


  if (
    financialAccountError ||
    !financialAccount
  ) {
    throw new Error(
      `Unable to load Supplier Payment financial account: ${
        financialAccountError?.message ??
        "Financial account was not found."
      }`,
    );
  }


  if (
    !financialAccount.gl_account_id
  ) {
    throw new Error(
      `Financial account "${financialAccount.account_name}" does not have a GL mapping.`,
    );
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
          "accounts_payable",
          "supplier_advances",
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
    ) ??
    null;

  const supplierAdvanceGl =
    mappings.get(
      "supplier_advances",
    ) ??
    null;


  if (
    allocatedAmount > 0 &&
    !accountsPayableGl
  ) {
    throw new Error(
      "Accounts Payable GL mapping is missing.",
    );
  }


  if (
    unallocatedAmount > 0 &&
    !supplierAdvanceGl
  ) {
    throw new Error(
      "Supplier Advances GL mapping is missing.",
    );
  }


  const first =
    await supabase.rpc(
      "post_supplier_payment_gl",
      {
        p_supplier_payment_id:
          payment.id,
      },
    );


  if (first.error) {
    throw new Error(
      `Supplier Payment GL posting failed: ${first.error.message}`,
    );
  }


  const firstJournalId =
    typeof first.data ===
      "string"
      ? first.data
      : null;


  if (!firstJournalId) {
    throw new Error(
      "Supplier Payment GL posting did not return a journal ID.",
    );
  }


  const second =
    await supabase.rpc(
      "post_supplier_payment_gl",
      {
        p_supplier_payment_id:
          payment.id,
      },
    );


  if (second.error) {
    throw new Error(
      `Supplier Payment idempotency test failed: ${second.error.message}`,
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
      `Unable to verify Supplier Payment GL journal: ${loadError.message}`,
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
      "Supplier Payment GL verification data is incomplete.",
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


  const financialAccountCredit =
    lines.some(
      (
        line,
      ) =>
        line.gl_account_id ===
          financialAccount.gl_account_id &&
        moneyEqual(
          line.credit,
          amount,
        ) &&
        moneyEqual(
          line.debit,
          0,
        ),
    );


  const accountsPayableDebit =
    allocatedAmount > 0
      ? lines.some(
        (
          line,
        ) =>
          line.gl_account_id ===
            accountsPayableGl &&
          moneyEqual(
            line.debit,
            allocatedAmount,
          ) &&
          moneyEqual(
            line.credit,
            0,
          ),
      )
      : !lines.some(
        (
          line,
        ) =>
          line.gl_account_id ===
          accountsPayableGl,
      );


  const supplierAdvanceDebit =
    unallocatedAmount > 0
      ? lines.some(
        (
          line,
        ) =>
          line.gl_account_id ===
            supplierAdvanceGl &&
          moneyEqual(
            line.debit,
            unallocatedAmount,
          ) &&
          moneyEqual(
            line.credit,
            0,
          ),
      )
      : !lines.some(
        (
          line,
        ) =>
          line.gl_account_id ===
          supplierAdvanceGl,
      );


  const expectedLineCount =
    1 +
    (
      allocatedAmount > 0
        ? 1
        : 0
    ) +
    (
      unallocatedAmount > 0
        ? 1
        : 0
    );


  const correctLineCount =
    lines.length ===
    expectedLineCount;


  const supplierLinkage =
    lines.every(
      (
        line,
      ) =>
        line.supplier_id ===
        payment.supplier_id,
    );


  const sourceLinkage =
    journal.source_type ===
      "supplier_payment" &&
    journal.source_id ===
      payment.id &&
    journal.source_number ===
      payment.payment_number;


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


  const postedPayment =
    payment.status ===
    "posted";


  const allPassed =
    postedPayment &&
    sourceLinkage &&
    balanced &&
    correctLineCount &&
    financialAccountCredit &&
    accountsPayableDebit &&
    supplierAdvanceDebit &&
    supplierLinkage &&
    idempotent;


  return {
    payment: {
      id:
        payment.id,

      payment_number:
        payment.payment_number,

      payment_date:
        payment.payment_date,

      supplier_id:
        payment.supplier_id,

      financial_account_id:
        payment.financial_account_id,

      currency_code:
        payment.currency_code,

      exchange_rate:
        numberValue(
          payment.exchange_rate,
        ),

      amount,

      allocated_amount:
        allocatedAmount,

      unallocated_amount:
        unallocatedAmount,

      status:
        payment.status,
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
      postedPayment,
      sourceLinkage,
      balanced,
      correctLineCount,
      financialAccountCredit,
      accountsPayableDebit,
      supplierAdvanceDebit,
      supplierLinkage,
      idempotent,

      allPassed,
    },
  };
}