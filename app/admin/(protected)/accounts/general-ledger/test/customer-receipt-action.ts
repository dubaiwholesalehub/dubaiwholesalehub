"use server";

import {
    requireAdmin,
} from "@/lib/auth/require-admin";

import {
    createClient,
} from "@/lib/supabase/server";


/* =========================================================
 * Types
 * ========================================================= */

export type CustomerReceiptGlTestResult = {
    receipt: {
        id: string;

        receipt_number: string;
        receipt_date: string;

        customer_id: string;

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

        currency_code: string;
        exchange_rate: number;
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

        customer_id: string | null;

        gl_account: {
            account_code: string;
            account_name: string;
        } | null;
    }>;

    checks: {
        postedReceipt:
        boolean;

        sourceLinkage:
        boolean;

        balanced:
        boolean;

        correctLineCount:
        boolean;

        financialAccountDebit:
        boolean;

        accountsReceivableCredit:
        boolean;

        customerAdvanceCredit:
        boolean;

        idempotent:
        boolean;

        allPassed:
        boolean;
    };

    expected: {
        financialGlAccountId:
        string;

        accountsReceivableGlAccountId:
        string | null;

        customerAdvanceGlAccountId:
        string | null;
    };
};


/* =========================================================
 * Helpers
 * ========================================================= */

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
            numberValue(
                left,
            )
            -
            numberValue(
                right,
            ),
        ) <=
        0.01
    );
}


/* =========================================================
 * Customer Receipt -> GL Test
 * ========================================================= */

export async function testCustomerReceiptGlPostingAction(
    customerReceiptId: string,
): Promise<CustomerReceiptGlTestResult> {
    await requireAdmin();

    const receiptId =
        customerReceiptId.trim();


    if (!receiptId) {
        throw new Error(
            "Customer Receipt ID is required.",
        );
    }


    const supabase =
        await createClient();


    /* =======================================================
     * 1. Load Receipt
     * ======================================================= */

    const {
        data:
        receipt,
        error:
        receiptError,
    } =
        await supabase
            .from(
                "customer_receipts",
            )
            .select(
                `
        id,
        receipt_number,
        receipt_date,
        customer_id,
        financial_account_id,
        currency_code,
        exchange_rate,
        amount,
        allocated_amount,
        unallocated_amount,
        status
        `,
            )
            .eq(
                "id",
                receiptId,
            )
            .single();


    if (
        receiptError ||
        !receipt
    ) {
        throw new Error(
            `Unable to load Customer Receipt: ${receiptError?.message ??
            "Receipt was not found."
            }`,
        );
    }


    if (
        receipt.status !==
        "posted"
    ) {
        throw new Error(
            `Customer Receipt ${receipt.receipt_number} is not posted.`,
        );
    }


    if (
        !receipt.financial_account_id
    ) {
        throw new Error(
            `Customer Receipt ${receipt.receipt_number} does not have a financial account.`,
        );
    }


    const receiptAmount =
        numberValue(
            receipt.amount,
        );

    const allocatedAmount =
        numberValue(
            receipt.allocated_amount,
        );

    const unallocatedAmount =
        numberValue(
            receipt.unallocated_amount,
        );

    const exchangeRate =
        numberValue(
            receipt.exchange_rate,
        );


    let caseType:
        CustomerReceiptGlTestResult["caseType"];


    if (
        allocatedAmount >
        0 &&
        unallocatedAmount ===
        0
    ) {
        caseType =
            "fully_allocated";
    } else if (
        allocatedAmount ===
        0 &&
        unallocatedAmount >
        0
    ) {
        caseType =
            "fully_unallocated";
    } else {
        caseType =
            "mixed";
    }


    /* =======================================================
     * 2. Resolve Expected Financial Account GL
     * ======================================================= */

    const {
        data:
        financialAccount,
        error:
        financialAccountError,
    } =
        await supabase
            .from(
                "financial_accounts",
            )
            .select(
                `
        id,
        account_name,
        gl_account_id
        `,
            )
            .eq(
                "id",
                receipt.financial_account_id,
            )
            .single();


    if (
        financialAccountError ||
        !financialAccount
    ) {
        throw new Error(
            `Unable to load the receipt financial account: ${financialAccountError?.message ??
            "Financial account was not found."
            }`,
        );
    }


    if (
        !financialAccount.gl_account_id
    ) {
        throw new Error(
            `Financial account "${financialAccount.account_name}" does not have a GL account mapping.`,
        );
    }


    /* =======================================================
     * 3. Resolve AR + Customer Advance Mappings
     * ======================================================= */

    const {
        data:
        mappingRows,
        error:
        mappingError,
    } =
        await supabase
            .from(
                "gl_account_mappings",
            )
            .select(
                `
        mapping_key,
        gl_account_id,
        is_active
        `,
            )
            .in(
                "mapping_key",
                [
                    "accounts_receivable",
                    "customer_advances",
                ],
            )
            .eq(
                "is_active",
                true,
            );


    if (mappingError) {
        throw new Error(
            `Unable to load GL account mappings: ${mappingError.message}`,
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


    const receivableGlAccountId =
        mappings.get(
            "accounts_receivable",
        ) ??
        null;

    const customerAdvanceGlAccountId =
        mappings.get(
            "customer_advances",
        ) ??
        null;


    if (
        allocatedAmount >
        0 &&
        !receivableGlAccountId
    ) {
        throw new Error(
            "Accounts Receivable GL mapping is missing.",
        );
    }


    if (
        unallocatedAmount >
        0 &&
        !customerAdvanceGlAccountId
    ) {
        throw new Error(
            "Customer Advances GL mapping is missing.",
        );
    }


    /* =======================================================
     * 4. First GL Posting
     * ======================================================= */

    const first =
        await supabase.rpc(
            "post_customer_receipt_gl",
            {
                p_customer_receipt_id:
                    receipt.id,
            },
        );


    if (first.error) {
        throw new Error(
            `Customer Receipt GL posting failed: ${first.error.message}`,
        );
    }


    const firstJournalId =
        typeof first.data ===
            "string"
            ? first.data
            : null;


    if (!firstJournalId) {
        throw new Error(
            "Customer Receipt GL posting did not return a journal ID.",
        );
    }


    /* =======================================================
     * 5. Second Posting — Idempotency
     * ======================================================= */

    const second =
        await supabase.rpc(
            "post_customer_receipt_gl",
            {
                p_customer_receipt_id:
                    receipt.id,
            },
        );


    if (second.error) {
        throw new Error(
            `Customer Receipt idempotency test failed: ${second.error.message}`,
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


    /* =======================================================
     * 6. Load Journal + Balance + Lines
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
                .select(
                    `
          id,
          journal_number,
          source_type,
          source_id,
          source_number,
          status,
          currency_code,
          exchange_rate
          `,
                )
                .eq(
                    "id",
                    firstJournalId,
                )
                .single(),

            supabase
                .from(
                    "gl_journal_balance",
                )
                .select(
                    `
          journal_entry_id,
          line_count,
          total_base_debit,
          total_base_credit,
          base_difference,
          is_balanced
          `,
                )
                .eq(
                    "journal_entry_id",
                    firstJournalId,
                )
                .single(),

            supabase
                .from(
                    "gl_journal_lines",
                )
                .select(
                    `
          id,
          line_number,
          gl_account_id,
          description,
          debit,
          credit,
          base_debit,
          base_credit,
          customer_id,

          gl_account:gl_accounts (
            account_code,
            account_name
          )
          `,
                )
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
            `Unable to verify Customer Receipt GL journal: ${loadError.message}`,
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
            "Customer Receipt GL journal verification data is incomplete.",
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

                    customer_id:
                        line.customer_id,

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
     * 7. Validate Debit
     * ======================================================= */

    const financialDebitLine =
        lines.find(
            (
                line,
            ) =>
                line.gl_account_id ===
                financialAccount.gl_account_id &&
                moneyEqual(
                    line.debit,
                    receiptAmount,
                ) &&
                moneyEqual(
                    line.credit,
                    0,
                ),
        );


    const financialAccountDebit =
        Boolean(
            financialDebitLine,
        );


    /* =======================================================
     * 8. Validate Accounts Receivable Credit
     * ======================================================= */

    let accountsReceivableCredit =
        true;


    if (
        allocatedAmount >
        0
    ) {
        accountsReceivableCredit =
            lines.some(
                (
                    line,
                ) =>
                    line.gl_account_id ===
                    receivableGlAccountId &&
                    moneyEqual(
                        line.credit,
                        allocatedAmount,
                    ) &&
                    moneyEqual(
                        line.debit,
                        0,
                    ),
            );
    } else {
        accountsReceivableCredit =
            !lines.some(
                (
                    line,
                ) =>
                    line.gl_account_id ===
                    receivableGlAccountId,
            );
    }


    /* =======================================================
     * 9. Validate Customer Advance Credit
     * ======================================================= */

    let customerAdvanceCredit =
        true;


    if (
        unallocatedAmount >
        0
    ) {
        customerAdvanceCredit =
            lines.some(
                (
                    line,
                ) =>
                    line.gl_account_id ===
                    customerAdvanceGlAccountId &&
                    moneyEqual(
                        line.credit,
                        unallocatedAmount,
                    ) &&
                    moneyEqual(
                        line.debit,
                        0,
                    ),
            );
    } else {
        customerAdvanceCredit =
            !lines.some(
                (
                    line,
                ) =>
                    line.gl_account_id ===
                    customerAdvanceGlAccountId,
            );
    }


    /* =======================================================
     * 10. Expected Line Count
     * ======================================================= */

    const expectedLineCount =
        1 +
        (
            allocatedAmount >
                0
                ? 1
                : 0
        ) +
        (
            unallocatedAmount >
                0
                ? 1
                : 0
        );


    const correctLineCount =
        lines.length ===
        expectedLineCount;


    /* =======================================================
     * 11. Other Controls
     * ======================================================= */

    const sourceLinkage =
        journal.source_type ===
        "customer_receipt" &&
        journal.source_id ===
        receipt.id &&
        journal.source_number ===
        receipt.receipt_number;


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


    const postedReceipt =
        receipt.status ===
        "posted";


    const allPassed =
        postedReceipt &&
        sourceLinkage &&
        balanced &&
        correctLineCount &&
        financialAccountDebit &&
        accountsReceivableCredit &&
        customerAdvanceCredit &&
        idempotent;


    /* =======================================================
     * 12. Return
     * ======================================================= */

    return {
        receipt: {
            id:
                receipt.id,

            receipt_number:
                receipt.receipt_number,

            receipt_date:
                receipt.receipt_date,

            customer_id:
                receipt.customer_id,

            financial_account_id:
                receipt.financial_account_id,

            currency_code:
                receipt.currency_code,

            exchange_rate:
                exchangeRate,

            amount:
                receiptAmount,

            allocated_amount:
                allocatedAmount,

            unallocated_amount:
                unallocatedAmount,

            status:
                receipt.status,
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

            currency_code:
                journal.currency_code,

            exchange_rate:
                numberValue(
                    journal.exchange_rate,
                ),
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
            postedReceipt,
            sourceLinkage,
            balanced,
            correctLineCount,
            financialAccountDebit,
            accountsReceivableCredit,
            customerAdvanceCredit,
            idempotent,

            allPassed,
        },

        expected: {
            financialGlAccountId:
                financialAccount.gl_account_id,

            accountsReceivableGlAccountId:
                receivableGlAccountId,

            customerAdvanceGlAccountId:
                customerAdvanceGlAccountId,
        },
    };
}