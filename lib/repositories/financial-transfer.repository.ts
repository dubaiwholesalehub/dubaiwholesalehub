import {
  createClient,
} from "@/lib/supabase/server";


export type FinancialTransferStatus =
  | "posted"
  | "cancelled";


export interface FinancialTransferListRow {
  id: string;

  transferNumber: string;

  transferDate: string;

  fromAccountId: string;

  fromAccountName: string;

  toAccountId: string;

  toAccountName: string;

  fromAmount: number;

  toAmount: number;

  fromCurrencyCode: string;

  toCurrencyCode: string;

  exchangeRate: number;

  status:
    FinancialTransferStatus;

  referenceNumber:
    | string
    | null;

  notes:
    | string
    | null;

  createdAt: string;
}


export interface FinancialTransferDetails
  extends FinancialTransferListRow {
  transferGroupId: string;

  outTransactionId:
    | string
    | null;

  inTransactionId:
    | string
    | null;

  postedAt:
    | string
    | null;

  cancelledAt:
    | string
    | null;

  cancellationReason:
    | string
    | null;
}


export interface PostFinancialTransferInput {
  transferDate: string;

  fromAccountId: string;

  toAccountId: string;

  fromAmount: number;

  toAmount: number;

  exchangeRate?: number;

  referenceNumber?: string;

  notes?: string;
}


function numberValue(
  value: unknown,
): number {
  const parsed =
    Number(
      value ?? 0,
    );

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : 0;
}


export async function getFinancialTransfers():
  Promise<
    FinancialTransferListRow[]
  > {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "financial_account_transfers",
      )
      .select(`
        id,
        transfer_number,
        transfer_date,
        from_account_id,
        to_account_id,
        from_amount,
        to_amount,
        exchange_rate,
        from_currency_code,
        to_currency_code,
        status,
        reference_number,
        notes,
        created_at,

        from_account:financial_accounts!financial_account_transfers_from_account_id_fkey (
          account_name
        ),

        to_account:financial_accounts!financial_account_transfers_to_account_id_fkey (
          account_name
        )
      `)
      .order(
        "transfer_date",
        {
          ascending: false,
        },
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      );


  if (error) {
    throw new Error(
      `Unable to load financial transfers: ${error.message}`,
    );
  }


  return (
    data ?? []
  ).map(
    (
      row,
    ) => {
      const fromAccount =
        Array.isArray(
          row.from_account,
        )
          ? row.from_account[0]
          : row.from_account;

      const toAccount =
        Array.isArray(
          row.to_account,
        )
          ? row.to_account[0]
          : row.to_account;


      return {
        id:
          row.id,

        transferNumber:
          row.transfer_number,

        transferDate:
          row.transfer_date,

        fromAccountId:
          row.from_account_id,

        fromAccountName:
          fromAccount
            ?.account_name ??
          "Unknown Account",

        toAccountId:
          row.to_account_id,

        toAccountName:
          toAccount
            ?.account_name ??
          "Unknown Account",

        fromAmount:
          numberValue(
            row.from_amount,
          ),

        toAmount:
          numberValue(
            row.to_amount,
          ),

        fromCurrencyCode:
          row.from_currency_code,

        toCurrencyCode:
          row.to_currency_code,

        exchangeRate:
          numberValue(
            row.exchange_rate,
          ),

        status:
          row.status as
            FinancialTransferStatus,

        referenceNumber:
          row.reference_number,

        notes:
          row.notes,

        createdAt:
          row.created_at,
      };
    },
  );
}


export async function getFinancialTransferById(
  transferId: string,
): Promise<
  FinancialTransferDetails |
  null
> {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "financial_account_transfers",
      )
      .select(`
        *,
        from_account:financial_accounts!financial_account_transfers_from_account_id_fkey (
          account_name
        ),
        to_account:financial_accounts!financial_account_transfers_to_account_id_fkey (
          account_name
        )
      `)
      .eq(
        "id",
        transferId,
      )
      .maybeSingle();


  if (error) {
    throw new Error(
      `Unable to load financial transfer: ${error.message}`,
    );
  }


  if (!data) {
    return null;
  }


  const fromAccount =
    Array.isArray(
      data.from_account,
    )
      ? data.from_account[0]
      : data.from_account;

  const toAccount =
    Array.isArray(
      data.to_account,
    )
      ? data.to_account[0]
      : data.to_account;


  return {
    id:
      data.id,

    transferNumber:
      data.transfer_number,

    transferDate:
      data.transfer_date,

    fromAccountId:
      data.from_account_id,

    fromAccountName:
      fromAccount
        ?.account_name ??
      "Unknown Account",

    toAccountId:
      data.to_account_id,

    toAccountName:
      toAccount
        ?.account_name ??
      "Unknown Account",

    fromAmount:
      numberValue(
        data.from_amount,
      ),

    toAmount:
      numberValue(
        data.to_amount,
      ),

    fromCurrencyCode:
      data.from_currency_code,

    toCurrencyCode:
      data.to_currency_code,

    exchangeRate:
      numberValue(
        data.exchange_rate,
      ),

    status:
      data.status as
        FinancialTransferStatus,

    referenceNumber:
      data.reference_number,

    notes:
      data.notes,

    transferGroupId:
      data.transfer_group_id,

    outTransactionId:
      data.out_transaction_id,

    inTransactionId:
      data.in_transaction_id,

    postedAt:
      data.posted_at,

    cancelledAt:
      data.cancelled_at,

    cancellationReason:
      data.cancellation_reason,

    createdAt:
      data.created_at,
  };
}


export async function postFinancialTransfer(
  input:
    PostFinancialTransferInput,
): Promise<string> {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "post_financial_account_transfer",
      {
        p_transfer_date:
          input.transferDate,

        p_from_account_id:
          input.fromAccountId,

        p_to_account_id:
          input.toAccountId,

        p_from_amount:
          input.fromAmount,

        p_to_amount:
          input.toAmount,

        p_exchange_rate:
          input.exchangeRate ??
          1,

        p_reference_number:
          input.referenceNumber?.trim() ||
          undefined,

        p_notes:
          input.notes?.trim() ||
          undefined,
      },
    );


  if (error) {
    throw new Error(
      `Unable to post financial transfer: ${error.message}`,
    );
  }


  if (
    typeof data !==
      "string" ||
    !data
  ) {
    throw new Error(
      "Financial transfer was posted but no transfer ID was returned.",
    );
  }


  return data;
}


export async function cancelFinancialTransfer(
  transferId: string,
  reason: string,
): Promise<string> {
  const supabase =
    await createClient();

  const cleanedReason =
    reason.trim();


  if (!cleanedReason) {
    throw new Error(
      "Cancellation reason is required.",
    );
  }


  const {
    data,
    error,
  } =
    await supabase.rpc(
      "cancel_financial_account_transfer_with_gl",
      {
        p_transfer_id:
          transferId,

        p_reason:
          cleanedReason,
      },
    );


  if (error) {
    throw new Error(
      `Unable to cancel financial transfer: ${error.message}`,
    );
  }


  if (
    typeof data !==
      "string" ||
    !data
  ) {
    throw new Error(
      "Financial transfer was cancelled but no transfer ID was returned.",
    );
  }


  return data;
}