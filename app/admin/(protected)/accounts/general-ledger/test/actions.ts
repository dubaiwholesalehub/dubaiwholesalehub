"use server";

import {
  randomUUID,
} from "node:crypto";

import {
  requireAdmin,
} from "@/lib/auth/require-admin";

import {
  createClient,
} from "@/lib/supabase/server";


/* =========================================================
 * Types
 * ========================================================= */

export type GlValidationStatus =
  | "passed"
  | "failed";


export type GlValidationResult = {
  key: string;

  title: string;

  status:
  GlValidationStatus;

  message: string;

  details?:
  string;
};


export type GlValidationSuiteResult = {
  success: boolean;

  completedAt:
  string;

  passed:
  number;

  failed:
  number;

  results:
  GlValidationResult[];
};


/* =========================================================
 * Helpers
 * ========================================================= */

function todayIso() {
  return new Date()
    .toISOString()
    .slice(
      0,
      10,
    );
}


function errorMessage(
  error: unknown,
) {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  if (
    error &&
    typeof error ===
    "object" &&
    "message" in error &&
    typeof (
      error as {
        message?: unknown;
      }
    ).message ===
    "string"
  ) {
    return (
      error as {
        message: string;
      }
    ).message;
  }

  return String(
    error ??
    "Unknown error",
  );
}


function pass(
  key: string,
  title: string,
  message: string,
  details?: string,
): GlValidationResult {
  return {
    key,
    title,
    status:
      "passed",
    message,
    details,
  };
}


function fail(
  key: string,
  title: string,
  message: string,
  details?: string,
): GlValidationResult {
  return {
    key,
    title,
    status:
      "failed",
    message,
    details,
  };
}


/* =========================================================
 * Main Validation Suite
 * ========================================================= */

export async function runGlValidationSuiteAction():
  Promise<GlValidationSuiteResult> {
  await requireAdmin();

  const supabase =
    await createClient();

  const results:
    GlValidationResult[] =
    [];

  const today =
    todayIso();

  let validJournalId:
    string | null =
    null;

  let erpJournalId:
    string | null =
    null;

  let closedPeriodId:
    string | null =
    null;

  let closedPeriodOriginalStatus:
    string | null =
    null;


  /* =======================================================
   * 1. Load Validation Accounts
   * ======================================================= */

  const {
    data:
    accountRows,
    error:
    accountError,
  } =
    await supabase
      .from(
        "gl_accounts",
      )
      .select(
        `
        id,
        account_code,
        account_name,
        is_posting_account,
        allow_manual_posting,
        is_active
      `,
      )
      .in(
        "account_code",
        [
          "3100",
          "6190",
          "6000",
          "FA-CASH-AED",
          "1200",
          "4100",
        ],
      );


  if (accountError) {
    throw new Error(
      `Unable to load GL validation accounts: ${accountError.message}`,
    );
  }


  const accounts =
    new Map(
      (
        accountRows ??
        []
      ).map(
        (
          account,
        ) => [
            account.account_code,
            account,
          ],
      ),
    );


  const capitalAccount =
    accounts.get(
      "3100",
    );

  const expenseAccount =
    accounts.get(
      "6190",
    );

  const headingAccount =
    accounts.get(
      "6000",
    );

  const cashAccount =
    accounts.get(
      "FA-CASH-AED",
    );

  const receivableAccount =
    accounts.get(
      "1200",
    );

  const revenueAccount =
    accounts.get(
      "4100",
    );


  if (
    !capitalAccount ||
    !expenseAccount ||
    !headingAccount ||
    !cashAccount ||
    !receivableAccount ||
    !revenueAccount
  ) {
    throw new Error(
      "Required GL validation accounts are missing.",
    );
  }


  results.push(
    pass(
      "accounts-loaded",
      "Validation accounts",
      "Required GL validation accounts were loaded successfully.",
      [
        `3100 ${capitalAccount.account_name}`,
        `6190 ${expenseAccount.account_name}`,
        `6000 ${headingAccount.account_name}`,
        `FA-CASH-AED ${cashAccount.account_name}`,
        `1200 ${receivableAccount.account_name}`,
        `4100 ${revenueAccount.account_name}`,
      ].join(
        " | ",
      ),
    ),
  );


  /* =======================================================
   * 2. Valid Balanced Manual Journal
   * ======================================================= */

  try {
    const {
      data,
      error,
    } =
      await supabase.rpc(
        "create_manual_gl_journal",
        {
          p_journal_date:
            today,

          p_posting_date:
            today,

          p_description:
            "GL engine authenticated validation test",

          p_lines:
            [
              {
                glAccountId:
                  expenseAccount.id,

                debit:
                  1,

                credit:
                  0,

                baseDebit:
                  1,

                baseCredit:
                  0,

                description:
                  "Validation expense debit",
              },

              {
                glAccountId:
                  capitalAccount.id,

                debit:
                  0,

                credit:
                  1,

                baseDebit:
                  0,

                baseCredit:
                  1,

                description:
                  "Validation capital credit",
              },
            ],

          p_currency_code:
            "AED",

          p_exchange_rate:
            1,

          p_reference:
            `GL-VALID-${randomUUID()}`,
        },
      );


    if (error) {
      throw error;
    }


    validJournalId =
      typeof data ===
        "string"
        ? data
        : null;


    if (!validJournalId) {
      throw new Error(
        "Manual journal RPC did not return a journal ID.",
      );
    }


    results.push(
      pass(
        "balanced-posting",
        "Balanced journal posting",
        "A balanced authenticated manual journal posted successfully.",
        `Journal ID: ${validJournalId}`,
      ),
    );
  } catch (error) {
    results.push(
      fail(
        "balanced-posting",
        "Balanced journal posting",
        "Balanced journal posting failed.",
        errorMessage(
          error,
        ),
      ),
    );
  }


  /* =======================================================
   * 3. Verify Posted Journal + Balance
   * ======================================================= */

  if (validJournalId) {
    const [
      journalResult,
      balanceResult,
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
            status,
            source_type,
            posting_date,
            posted_at
          `,
          )
          .eq(
            "id",
            validJournalId,
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
            validJournalId,
          )
          .single(),
      ]);


    if (
      journalResult.error ||
      balanceResult.error
    ) {
      results.push(
        fail(
          "balance-verification",
          "Posted journal balance",
          "Unable to verify the posted journal.",
          journalResult.error?.message ??
          balanceResult.error?.message,
        ),
      );
    } else {
      const journal =
        journalResult.data;

      const balance =
        balanceResult.data;

      const valid =
        journal.status ===
        "posted" &&
        balance.line_count ===
        2 &&
        Number(
          balance.total_base_debit,
        ) ===
        1 &&
        Number(
          balance.total_base_credit,
        ) ===
        1 &&
        Number(
          balance.base_difference,
        ) ===
        0 &&
        balance.is_balanced ===
        true;


      results.push(
        valid
          ? pass(
            "balance-verification",
            "Posted journal balance",
            "Posted journal is balanced and contains exactly two lines.",
            `${journal.journal_number}: Debit AED 1.00 = Credit AED 1.00`,
          )
          : fail(
            "balance-verification",
            "Posted journal balance",
            "Posted journal did not satisfy expected balance checks.",
            JSON.stringify(
              {
                journal,
                balance,
              },
            ),
          ),
      );
    }
  }


  /* =======================================================
   * 4. Reject Unbalanced Journal
   * ======================================================= */

  try {
    const {
      error,
    } =
      await supabase.rpc(
        "create_manual_gl_journal",
        {
          p_journal_date:
            today,

          p_posting_date:
            today,

          p_description:
            "GL validation unbalanced journal",

          p_lines:
            [
              {
                glAccountId:
                  expenseAccount.id,

                debit:
                  1,

                credit:
                  0,

                baseDebit:
                  1,

                baseCredit:
                  0,
              },

              {
                glAccountId:
                  capitalAccount.id,

                debit:
                  0,

                credit:
                  0.9,

                baseDebit:
                  0,

                baseCredit:
                  0.9,
              },
            ],

          p_currency_code:
            "AED",

          p_exchange_rate:
            1,

          p_reference:
            `GL-UNBAL-${randomUUID()}`,
        },
      );


    if (!error) {
      results.push(
        fail(
          "unbalanced-rejection",
          "Unbalanced journal rejection",
          "The engine incorrectly accepted an unbalanced journal.",
        ),
      );
    } else {
      results.push(
        pass(
          "unbalanced-rejection",
          "Unbalanced journal rejection",
          "The engine correctly rejected an unbalanced journal.",
          error.message,
        ),
      );
    }
  } catch (error) {
    results.push(
      pass(
        "unbalanced-rejection",
        "Unbalanced journal rejection",
        "The engine correctly rejected an unbalanced journal.",
        errorMessage(
          error,
        ),
      ),
    );
  }


  /* =======================================================
   * 5. Reject Heading / Non-Posting Account
   * ======================================================= */

  try {
    const {
      error,
    } =
      await supabase.rpc(
        "create_manual_gl_journal",
        {
          p_journal_date:
            today,

          p_posting_date:
            today,

          p_description:
            "GL validation heading account",

          p_lines:
            [
              {
                glAccountId:
                  headingAccount.id,

                debit:
                  1,

                credit:
                  0,

                baseDebit:
                  1,

                baseCredit:
                  0,
              },

              {
                glAccountId:
                  capitalAccount.id,

                debit:
                  0,

                credit:
                  1,

                baseDebit:
                  0,

                baseCredit:
                  1,
              },
            ],

          p_currency_code:
            "AED",

          p_exchange_rate:
            1,

          p_reference:
            `GL-HEAD-${randomUUID()}`,
        },
      );


    results.push(
      error
        ? pass(
          "heading-rejection",
          "Non-posting account rejection",
          "The engine correctly rejected a heading account.",
          error.message,
        )
        : fail(
          "heading-rejection",
          "Non-posting account rejection",
          "The engine incorrectly allowed posting to a heading account.",
        ),
    );
  } catch (error) {
    results.push(
      pass(
        "heading-rejection",
        "Non-posting account rejection",
        "The engine correctly rejected a heading account.",
        errorMessage(
          error,
        ),
      ),
    );
  }


  /* =======================================================
   * 6. Reject Manual Posting to Protected Treasury Account
   * ======================================================= */

  try {
    const {
      error,
    } =
      await supabase.rpc(
        "create_manual_gl_journal",
        {
          p_journal_date:
            today,

          p_posting_date:
            today,

          p_description:
            "GL protected treasury manual posting test",

          p_lines:
            [
              {
                glAccountId:
                  cashAccount.id,

                debit:
                  1,

                credit:
                  0,

                baseDebit:
                  1,

                baseCredit:
                  0,
              },

              {
                glAccountId:
                  capitalAccount.id,

                debit:
                  0,

                credit:
                  1,

                baseDebit:
                  0,

                baseCredit:
                  1,
              },
            ],

          p_currency_code:
            "AED",

          p_exchange_rate:
            1,

          p_reference:
            `GL-CASH-${randomUUID()}`,
        },
      );


    results.push(
      error
        ? pass(
          "manual-protection",
          "Protected-account manual posting",
          "Manual posting to the treasury GL account was correctly rejected.",
          error.message,
        )
        : fail(
          "manual-protection",
          "Protected-account manual posting",
          "The engine incorrectly allowed manual posting to a protected treasury account.",
        ),
    );
  } catch (error) {
    results.push(
      pass(
        "manual-protection",
        "Protected-account manual posting",
        "Manual posting to the treasury GL account was correctly rejected.",
        errorMessage(
          error,
        ),
      ),
    );
  }


  /* =======================================================
   * 7. ERP Posting + Idempotency
   * ======================================================= */

  const erpSourceId =
    randomUUID();


  try {
    const lines = [
      {
        glAccountId:
          receivableAccount.id,

        debit:
          1,

        credit:
          0,

        baseDebit:
          1,

        baseCredit:
          0,

        description:
          "Validation receivable",
      },

      {
        glAccountId:
          revenueAccount.id,

        debit:
          0,

        credit:
          1,

        baseDebit:
          0,

        baseCredit:
          1,

        description:
          "Validation revenue",
      },
    ];


    const first =
      await supabase.rpc(
        "post_erp_gl_journal",
        {
          p_source_type:
            "gl_validation",

          p_source_id:
            erpSourceId,

          p_source_number:
            "GL-VALIDATION",

          p_journal_date:
            today,

          p_posting_date:
            today,

          p_description:
            "ERP GL idempotency validation",

          p_currency_code:
            "AED",

          p_exchange_rate:
            1,

          p_lines:
            lines,
        },
      );


    if (first.error) {
      throw first.error;
    }


    erpJournalId =
      typeof first.data ===
        "string"
        ? first.data
        : null;


    if (!erpJournalId) {
      throw new Error(
        "First ERP posting did not return a journal ID.",
      );
    }


    const second =
      await supabase.rpc(
        "post_erp_gl_journal",
        {
          p_source_type:
            "gl_validation",

          p_source_id:
            erpSourceId,

          p_source_number:
            "GL-VALIDATION",

          p_journal_date:
            today,

          p_posting_date:
            today,

          p_description:
            "ERP GL idempotency validation",

          p_currency_code:
            "AED",

          p_exchange_rate:
            1,

          p_lines:
            lines,
        },
      );


    if (second.error) {
      throw second.error;
    }


    const secondId =
      typeof second.data ===
        "string"
        ? second.data
        : null;


    results.push(
      secondId ===
        erpJournalId
        ? pass(
          "erp-idempotency",
          "ERP posting idempotency",
          "Repeated posting of the same ERP source returned the same journal.",
          `Journal ID: ${erpJournalId}`,
        )
        : fail(
          "erp-idempotency",
          "ERP posting idempotency",
          "Repeated ERP posting produced a different journal.",
          `First: ${erpJournalId}, second: ${secondId ?? "none"}`,
        ),
    );
  } catch (error) {
    results.push(
      fail(
        "erp-idempotency",
        "ERP posting idempotency",
        "ERP posting/idempotency validation failed.",
        errorMessage(
          error,
        ),
      ),
    );
  }


  /* =======================================================
   * 8. Closed Period Rejection
   *
   * Uses the previous accounting period when possible.
   * Original status is ALWAYS restored in finally.
   * ======================================================= */

  try {
    const {
      data:
      periodRows,
      error:
      periodError,
    } =
      await supabase
        .from(
          "accounting_periods",
        )
        .select(
          `
          id,
          period_code,
          date_from,
          status
        `,
        )
        .lt(
          "date_from",
          today,
        )
        .order(
          "date_from",
          {
            ascending:
              false,
          },
        )
        .limit(
          1,
        );


    if (periodError) {
      throw periodError;
    }


    const period =
      periodRows?.[0];


    if (!period) {
      throw new Error(
        "No prior accounting period exists for the closed-period test.",
      );
    }


    closedPeriodId =
      period.id;

    closedPeriodOriginalStatus =
      period.status;


    const closeResult =
      await supabase
        .from(
          "accounting_periods",
        )
        .update({
          status:
            "closed",
        })
        .eq(
          "id",
          period.id,
        );


    if (closeResult.error) {
      throw closeResult.error;
    }


    const test =
      await supabase.rpc(
        "create_manual_gl_journal",
        {
          p_journal_date:
            period.date_from,

          p_posting_date:
            period.date_from,

          p_description:
            "Closed accounting period validation",

          p_lines:
            [
              {
                glAccountId:
                  expenseAccount.id,

                debit:
                  1,

                credit:
                  0,

                baseDebit:
                  1,

                baseCredit:
                  0,
              },

              {
                glAccountId:
                  capitalAccount.id,

                debit:
                  0,

                credit:
                  1,

                baseDebit:
                  0,

                baseCredit:
                  1,
              },
            ],

          p_currency_code:
            "AED",

          p_exchange_rate:
            1,

          p_reference:
            `GL-CLOSED-${randomUUID()}`,
        },
      );


    results.push(
      test.error
        ? pass(
          "closed-period",
          "Closed-period protection",
          `Posting to accounting period ${period.period_code} was correctly rejected.`,
          test.error.message,
        )
        : fail(
          "closed-period",
          "Closed-period protection",
          `The engine incorrectly allowed posting to closed period ${period.period_code}.`,
        ),
    );
  } catch (error) {
    results.push(
      fail(
        "closed-period",
        "Closed-period protection",
        "Closed-period validation could not be completed.",
        errorMessage(
          error,
        ),
      ),
    );
  } finally {
    if (
      closedPeriodId &&
      closedPeriodOriginalStatus
    ) {
      const restore =
        await supabase
          .from(
            "accounting_periods",
          )
          .update({
            status:
              closedPeriodOriginalStatus,
          })
          .eq(
            "id",
            closedPeriodId,
          );


      if (restore.error) {
        results.push(
          fail(
            "period-restore",
            "Accounting period restoration",
            "The validation suite could not restore the accounting period status.",
            restore.error.message,
          ),
        );
      } else {
        results.push(
          pass(
            "period-restore",
            "Accounting period restoration",
            "The temporary accounting-period change was restored successfully.",
          ),
        );
      }
    }
  }


  /* =======================================================
   * 9. Posted Header Write Protection
   *
   * authenticated role has no direct UPDATE privilege and
   * the database also has the posted-journal protection
   * trigger.
   * ======================================================= */

  if (validJournalId) {
    const updateResult =
      await supabase
        .from(
          "gl_journal_entries",
        )
        .update({
          description:
            "THIS CHANGE MUST NOT SUCCEED",
        })
        .eq(
          "id",
          validJournalId,
        );


    results.push(
      updateResult.error
        ? pass(
          "header-protection",
          "Posted journal header protection",
          "Direct modification of a posted journal was rejected.",
          updateResult.error.message,
        )
        : fail(
          "header-protection",
          "Posted journal header protection",
          "A posted journal header was unexpectedly editable.",
        ),
    );
  }


  /* =======================================================
   * 10. Posted Line Write Protection
   * ======================================================= */

  if (validJournalId) {
    const {
      data:
      lineRows,
      error:
      lineLoadError,
    } =
      await supabase
        .from(
          "gl_journal_lines",
        )
        .select(
          "id",
        )
        .eq(
          "journal_entry_id",
          validJournalId,
        )
        .limit(
          1,
        );


    if (lineLoadError) {
      results.push(
        fail(
          "line-protection",
          "Posted journal line protection",
          "Unable to load a journal line for protection testing.",
          lineLoadError.message,
        ),
      );
    } else {
      const lineId =
        lineRows?.[0]?.id;


      if (!lineId) {
        results.push(
          fail(
            "line-protection",
            "Posted journal line protection",
            "No journal line was found for protection testing.",
          ),
        );
      } else {
        const updateResult =
          await supabase
            .from(
              "gl_journal_lines",
            )
            .update({
              description:
                "THIS CHANGE MUST NOT SUCCEED",
            })
            .eq(
              "id",
              lineId,
            );


        results.push(
          updateResult.error
            ? pass(
              "line-protection",
              "Posted journal line protection",
              "Direct modification of a posted journal line was rejected.",
              updateResult.error.message,
            )
            : fail(
              "line-protection",
              "Posted journal line protection",
              "A posted journal line was unexpectedly editable.",
            ),
        );
      }
    }
  }


  /* =======================================================
   * 11. Reverse Valid Manual Journal
   * ======================================================= */

  if (validJournalId) {
    try {
      const reversal =
        await supabase.rpc(
          "reverse_gl_journal",
          {
            p_journal_entry_id:
              validJournalId,

            p_reversal_date:
              today,

            p_reason:
              "Automated GL engine validation cleanup",
          },
        );


      if (reversal.error) {
        throw reversal.error;
      }


      const reversalId =
        typeof reversal.data ===
          "string"
          ? reversal.data
          : null;


      if (!reversalId) {
        throw new Error(
          "Reversal did not return a journal ID.",
        );
      }


      const [
        originalResult,
        reversalResult,
        originalLinesResult,
        reversalLinesResult,
      ] =
        await Promise.all([
          supabase
            .from(
              "gl_journal_entries",
            )
            .select(
              `
              id,
              status,
              reversal_entry_id,
              reversed_at
            `,
            )
            .eq(
              "id",
              validJournalId,
            )
            .single(),

          supabase
            .from(
              "gl_journal_entries",
            )
            .select(
              `
              id,
              status,
              original_entry_id,
              source_type
            `,
            )
            .eq(
              "id",
              reversalId,
            )
            .single(),

          supabase
            .from(
              "gl_journal_lines",
            )
            .select(
              `
              line_number,
              debit,
              credit,
              base_debit,
              base_credit
            `,
            )
            .eq(
              "journal_entry_id",
              validJournalId,
            )
            .order(
              "line_number",
            ),

          supabase
            .from(
              "gl_journal_lines",
            )
            .select(
              `
              line_number,
              debit,
              credit,
              base_debit,
              base_credit
            `,
            )
            .eq(
              "journal_entry_id",
              reversalId,
            )
            .order(
              "line_number",
            ),
        ]);


      const verificationError =
        originalResult.error ??
        reversalResult.error ??
        originalLinesResult.error ??
        reversalLinesResult.error;


      if (verificationError) {
        throw verificationError;
      }


      const original =
        originalResult.data;

      const reversalJournal =
        reversalResult.data;

      const originalLines =
        originalLinesResult.data ??
        [];

      const reversalLines =
        reversalLinesResult.data ??
        [];


      if (
        !original ||
        !reversalJournal
      ) {
        throw new Error(
          "Unable to load the original or reversal journal for verification.",
        );
      }


      const linesReversed =
        originalLines.length ===
        reversalLines.length &&
        originalLines.every(
          (
            line,
            index,
          ) => {
            const reversed =
              reversalLines[
              index
              ];

            return (
              Number(
                line.debit,
              ) ===
              Number(
                reversed.credit,
              ) &&
              Number(
                line.credit,
              ) ===
              Number(
                reversed.debit,
              ) &&
              Number(
                line.base_debit,
              ) ===
              Number(
                reversed.base_credit,
              ) &&
              Number(
                line.base_credit,
              ) ===
              Number(
                reversed.base_debit,
              )
            );
          },
        );


      const correct =
        original.status ===
        "reversed" &&
        original.reversal_entry_id ===
        reversalId &&
        reversalJournal.status ===
        "posted" &&
        reversalJournal.original_entry_id ===
        validJournalId &&
        reversalJournal.source_type ===
        "journal_reversal" &&
        linesReversed;


      results.push(
        correct
          ? pass(
            "reversal",
            "Formal journal reversal",
            "The original journal was reversed and the reversal contains exact opposite entries.",
            `Original ${validJournalId} → reversal ${reversalId}`,
          )
          : fail(
            "reversal",
            "Formal journal reversal",
            "The reversal journal did not satisfy all audit/linkage checks.",
          ),
      );


      /*
       * Second reversal request should be idempotent and
       * return the existing reversal ID.
       */

      const second =
        await supabase.rpc(
          "reverse_gl_journal",
          {
            p_journal_entry_id:
              validJournalId,

            p_reversal_date:
              today,

            p_reason:
              "Second validation reversal request",
          },
        );


      results.push(
        !second.error &&
          second.data ===
          reversalId
          ? pass(
            "second-reversal",
            "Duplicate reversal protection",
            "A repeated reversal request returned the existing reversal journal.",
          )
          : fail(
            "second-reversal",
            "Duplicate reversal protection",
            second.error?.message ??
            "Repeated reversal did not return the original reversal ID.",
          ),
      );
    } catch (error) {
      results.push(
        fail(
          "reversal",
          "Formal journal reversal",
          "Journal reversal validation failed.",
          errorMessage(
            error,
          ),
        ),
      );
    }
  }


  /* =======================================================
   * 12. Reverse ERP Validation Journal
   *
   * Keeps the accounting impact of the test suite at zero.
   * ======================================================= */

  if (erpJournalId) {
    const reversal =
      await supabase.rpc(
        "reverse_gl_journal",
        {
          p_journal_entry_id:
            erpJournalId,

          p_reversal_date:
            today,

          p_reason:
            "Automated ERP GL validation cleanup",
        },
      );


    results.push(
      reversal.error
        ? fail(
          "erp-cleanup",
          "ERP validation cleanup",
          "The ERP validation journal could not be reversed.",
          reversal.error.message,
        )
        : pass(
          "erp-cleanup",
          "ERP validation cleanup",
          "The ERP validation journal was reversed, leaving zero net accounting effect.",
        ),
    );
  }


  /* =======================================================
   * Final Result
   * ======================================================= */

  const passed =
    results.filter(
      (
        result,
      ) =>
        result.status ===
        "passed",
    ).length;

  const failed =
    results.length -
    passed;


  return {
    success:
      failed === 0,

    completedAt:
      new Date()
        .toISOString(),

    passed,

    failed,

    results,
  };
}