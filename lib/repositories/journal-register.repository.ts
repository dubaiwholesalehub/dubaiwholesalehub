import { createClient } from "@/lib/supabase/server";

export type JournalRegisterStatus =
    | "draft"
    | "posted"
    | "reversed";

export interface JournalRegisterRow {
    journalEntryId: string;
    journalNumber: string;

    journalDate: string;
    postingDate: string;

    accountingPeriodId: string;

    sourceType: string;
    sourceId: string | null;
    sourceNumber: string | null;

    description: string;

    currencyCode: string;
    exchangeRate: number;

    status: JournalRegisterStatus;

    originalEntryId: string | null;
    reversalEntryId: string | null;
    reversalReason: string | null;

    totalDebit: number;
    totalCredit: number;

    baseDebit: number;
    baseCredit: number;

    lineCount: number;

    postedAt: string | null;
    reversedAt: string | null;
    createdAt: string;

    totalCount: number;

    filteredBaseDebit: number;
    filteredBaseCredit: number;
}

export interface JournalRegisterFilters {
    dateFrom: string;
    dateTo: string;

    status?: string;
    sourceType?: string;
    search?: string;

    limit?: number;
    offset?: number;
}

export interface JournalRegisterResult {
    rows: JournalRegisterRow[];
    totalCount: number;
    filteredBaseDebit: number;
    filteredBaseCredit: number;
}

function nullableString(
    value: string | null,
) {
    return value ?? null;
}

export async function getJournalRegister(
    filters: JournalRegisterFilters,
): Promise<JournalRegisterResult> {
    const supabase =
        await createClient();

    const {
        data,
        error,
    } = await supabase.rpc(
        "get_formal_journal_register",
        {
            p_date_from:
                filters.dateFrom,

            p_date_to:
                filters.dateTo,

            p_status:
                filters.status ||
                undefined,

            p_source_type:
                filters.sourceType ||
                undefined,

            p_search:
                filters.search ||
                undefined,

            p_limit:
                filters.limit ??
                50,

            p_offset:
                filters.offset ??
                0,
        },
    );

    if (error) {
        throw new Error(
            `Unable to load Journal Register: ${error.message}`,
        );
    }

    const rows: JournalRegisterRow[] =
        (data ?? []).map(
            (row) => ({
                journalEntryId:
                    row.journal_entry_id,

                journalNumber:
                    row.journal_number,

                journalDate:
                    row.journal_date,

                postingDate:
                    row.posting_date,

                accountingPeriodId:
                    row.accounting_period_id,

                sourceType:
                    row.source_type,

                sourceId:
                    nullableString(
                        row.source_id,
                    ),

                sourceNumber:
                    nullableString(
                        row.source_number,
                    ),

                description:
                    row.description,

                currencyCode:
                    row.currency_code,

                exchangeRate:
                    Number(
                        row.exchange_rate,
                    ),

                status:
                    row.status as JournalRegisterStatus,

                originalEntryId:
                    nullableString(
                        row.original_entry_id,
                    ),

                reversalEntryId:
                    nullableString(
                        row.reversal_entry_id,
                    ),

                reversalReason:
                    nullableString(
                        row.reversal_reason,
                    ),

                totalDebit:
                    Number(
                        row.total_debit,
                    ),

                totalCredit:
                    Number(
                        row.total_credit,
                    ),

                baseDebit:
                    Number(
                        row.base_debit,
                    ),

                baseCredit:
                    Number(
                        row.base_credit,
                    ),

                lineCount:
                    Number(
                        row.line_count,
                    ),

                postedAt:
                    nullableString(
                        row.posted_at,
                    ),

                reversedAt:
                    nullableString(
                        row.reversed_at,
                    ),

                createdAt:
                    row.created_at,

                totalCount:
                    Number(
                        row.total_count,
                    ),

                filteredBaseDebit:
                    Number(
                        row.filtered_base_debit,
                    ),

                filteredBaseCredit:
                    Number(
                        row.filtered_base_credit,
                    ),
            }),
        );

    return {
        rows,

        totalCount:
            rows[0]?.totalCount ??
            0,

        filteredBaseDebit:
            rows[0]?.filteredBaseDebit ??
            0,

        filteredBaseCredit:
            rows[0]?.filteredBaseCredit ??
            0,
    };
}