import {
  createClient,
} from "@/lib/supabase/server";


/* =========================================================
 * Types
 * ========================================================= */

export type FinancialAccountType =
  | "cash"
  | "bank"
  | "card"
  | "payment_gateway"
  | "clearing"
  | "other";


export type AccountTransactionDirection =
  | "in"
  | "out";


export type AccountTransactionStatus =
  | "posted"
  | "cancelled";


export interface FinancialAccountListRow {
  id: string;

  accountCode: string;

  accountName: string;

  accountType:
  FinancialAccountType;

  currencyCode: string;

  openingBalance: number;

  currentBalance: number;

  allowNegativeBalance: boolean;

  isDefault: boolean;

  isActive: boolean;

  bankName:
  | string
  | null;

  iban:
  | string
  | null;
}


export interface AccountTransactionListRow {
  id: string;

  transactionNumber: string;

  transactionDate: string;

  accountId: string;

  accountName: string;

  direction:
  AccountTransactionDirection;

  transactionType: string;

  status:
  AccountTransactionStatus;

  amount: number;

  currencyCode: string;

  referenceType:
  | string
  | null;

  referenceId:
  | string
  | null;

  referenceNumber:
  | string
  | null;

  description:
  | string
  | null;

  createdAt: string;
}


export interface FinancialAccountSummary {
  totalBalance: number;

  cashBalance: number;

  bankBalance: number;

  cardBalance: number;

  otherBalance: number;

  postedTransactionCount: number;

  moneyIn: number;

  moneyOut: number;
}


export interface FinancialAccountDetails
  extends FinancialAccountListRow {
  bankAccountName:
  | string
  | null;

  bankAccountNumber:
  | string
  | null;

  swiftCode:
  | string
  | null;

  branchName:
  | string
  | null;

  notes:
  | string
  | null;

  createdAt: string;

  updatedAt: string;
}


/* =========================================================
 * Helpers
 * ========================================================= */

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


/* =========================================================
 * Financial Accounts
 * ========================================================= */

export async function getFinancialAccounts():
  Promise<
    FinancialAccountListRow[]
  > {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "financial_accounts",
      )
      .select(`
        id,
        account_code,
        account_name,
        account_type,
        currency_code,
        opening_balance,
        current_balance,
        allow_negative_balance,
        is_default,
        is_active,
        bank_name,
        iban
      `)
      .order(
        "is_default",
        {
          ascending: false,
        },
      )
      .order(
        "account_name",
        {
          ascending: true,
        },
      );


  if (error) {
    throw new Error(
      `Unable to load financial accounts: ${error.message}`,
    );
  }


  return (
    data ?? []
  ).map(
    (
      row,
    ) => ({
      id:
        row.id,

      accountCode:
        row.account_code,

      accountName:
        row.account_name,

      accountType:
        row.account_type as
        FinancialAccountType,

      currencyCode:
        row.currency_code,

      openingBalance:
        numberValue(
          row.opening_balance,
        ),

      currentBalance:
        numberValue(
          row.current_balance,
        ),

      allowNegativeBalance:
        row.allow_negative_balance,

      isDefault:
        row.is_default,

      isActive:
        row.is_active,

      bankName:
        row.bank_name,

      iban:
        row.iban,
    }),
  );
}


/* =========================================================
 * Summary
 * ========================================================= */

export async function getFinancialAccountSummary():
  Promise<
    FinancialAccountSummary
  > {
  const supabase =
    await createClient();

  const [
    accountsResult,
    transactionsResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "financial_accounts",
        )
        .select(`
          account_type,
          current_balance,
          is_active
        `),

      supabase
        .from(
          "account_transactions",
        )
        .select(`
          direction,
          amount,
          status
        `)
        .eq(
          "status",
          "posted",
        ),
    ]);


  if (
    accountsResult.error
  ) {
    throw new Error(
      `Unable to load financial account summary: ${accountsResult.error.message}`,
    );
  }


  if (
    transactionsResult.error
  ) {
    throw new Error(
      `Unable to load account transaction summary: ${transactionsResult.error.message}`,
    );
  }


  let totalBalance =
    0;

  let cashBalance =
    0;

  let bankBalance =
    0;

  let cardBalance =
    0;

  let otherBalance =
    0;


  for (
    const account of
    accountsResult.data ??
    []
  ) {
    if (
      !account.is_active
    ) {
      continue;
    }

    const balance =
      numberValue(
        account.current_balance,
      );

    totalBalance +=
      balance;

    if (
      account.account_type ===
      "cash"
    ) {
      cashBalance +=
        balance;
    } else if (
      account.account_type ===
      "bank"
    ) {
      bankBalance +=
        balance;
    } else if (
      account.account_type ===
      "card"
    ) {
      cardBalance +=
        balance;
    } else {
      otherBalance +=
        balance;
    }
  }


  let moneyIn =
    0;

  let moneyOut =
    0;

  const transactions =
    transactionsResult.data ??
    [];


  for (
    const transaction of
    transactions
  ) {
    const amount =
      numberValue(
        transaction.amount,
      );

    if (
      transaction.direction ===
      "in"
    ) {
      moneyIn +=
        amount;
    }

    if (
      transaction.direction ===
      "out"
    ) {
      moneyOut +=
        amount;
    }
  }


  return {
    totalBalance,
    cashBalance,
    bankBalance,
    cardBalance,
    otherBalance,

    postedTransactionCount:
      transactions.length,

    moneyIn,

    moneyOut,
  };
}


/* =========================================================
 * Recent Transactions
 * ========================================================= */

export async function getRecentAccountTransactions(
  limit = 50,
): Promise<
  AccountTransactionListRow[]
> {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "account_transactions",
      )
      .select(`
        id,
        transaction_number,
        transaction_date,
        account_id,
        direction,
        transaction_type,
        status,
        amount,
        currency_code,
        reference_type,
        reference_id,
        reference_number,
        description,
        created_at,

        account:financial_accounts (
          account_name
        )
      `)
      .order(
        "transaction_date",
        {
          ascending: false,
        },
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      )
      .limit(
        limit,
      );


  if (error) {
    throw new Error(
      `Unable to load account transactions: ${error.message}`,
    );
  }


  return (
    data ?? []
  ).map(
    (
      row,
    ) => {
      const account =
        Array.isArray(
          row.account,
        )
          ? row.account[0]
          : row.account;

      return {
        id:
          row.id,

        transactionNumber:
          row.transaction_number,

        transactionDate:
          row.transaction_date,

        accountId:
          row.account_id,

        accountName:
          account?.account_name ??
          "Unknown Account",

        direction:
          row.direction as
          AccountTransactionDirection,

        transactionType:
          row.transaction_type,

        status:
          row.status as
          AccountTransactionStatus,

        amount:
          numberValue(
            row.amount,
          ),

        currencyCode:
          row.currency_code,

        referenceType:
          row.reference_type,

        referenceId:
          row.reference_id,

        referenceNumber:
          row.reference_number,

        description:
          row.description,

        createdAt:
          row.created_at,
      };
    },
  );
}


/* =========================================================
 * Financial Account Details
 * ========================================================= */

export async function getFinancialAccountById(
  accountId: string,
): Promise<
  FinancialAccountDetails |
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
        "financial_accounts",
      )
      .select(`
        *
      `)
      .eq(
        "id",
        accountId,
      )
      .maybeSingle();


  if (error) {
    throw new Error(
      `Unable to load financial account: ${error.message}`,
    );
  }


  if (!data) {
    return null;
  }


  return {
    id:
      data.id,

    accountCode:
      data.account_code,

    accountName:
      data.account_name,

    accountType:
      data.account_type as
      FinancialAccountType,

    currencyCode:
      data.currency_code,

    openingBalance:
      numberValue(
        data.opening_balance,
      ),

    currentBalance:
      numberValue(
        data.current_balance,
      ),

    allowNegativeBalance:
      data.allow_negative_balance,

    isDefault:
      data.is_default,

    isActive:
      data.is_active,

    bankName:
      data.bank_name,

    bankAccountName:
      data.bank_account_name,

    bankAccountNumber:
      data.bank_account_number,

    iban:
      data.iban,

    swiftCode:
      data.swift_code,

    branchName:
      data.branch_name,

    notes:
      data.notes,

    createdAt:
      data.created_at,

    updatedAt:
      data.updated_at,
  };
}


/* =========================================================
 * Account Ledger
 * ========================================================= */

export async function getAccountTransactions(
  accountId: string,
): Promise<
  AccountTransactionListRow[]
> {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "account_transactions",
      )
      .select(`
        id,
        transaction_number,
        transaction_date,
        account_id,
        direction,
        transaction_type,
        status,
        amount,
        currency_code,
        reference_type,
        reference_id,
        reference_number,
        description,
        created_at,

        account:financial_accounts (
          account_name
        )
      `)
      .eq(
        "account_id",
        accountId,
      )
      .order(
        "transaction_date",
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
      `Unable to load financial account ledger: ${error.message}`,
    );
  }


  return (
    data ?? []
  ).map(
    (
      row,
    ) => {
      const account =
        Array.isArray(
          row.account,
        )
          ? row.account[0]
          : row.account;

      return {
        id:
          row.id,

        transactionNumber:
          row.transaction_number,

        transactionDate:
          row.transaction_date,

        accountId:
          row.account_id,

        accountName:
          account?.account_name ??
          "Unknown Account",

        direction:
          row.direction as
          AccountTransactionDirection,

        transactionType:
          row.transaction_type,

        status:
          row.status as
          AccountTransactionStatus,

        amount:
          numberValue(
            row.amount,
          ),

        currencyCode:
          row.currency_code,

        referenceType:
          row.reference_type,

        referenceId:
          row.reference_id,

        referenceNumber:
          row.reference_number,

        description:
          row.description,

        createdAt:
          row.created_at,
      };
    },
  );
}

export async function postFinancialAccountOpeningBalance(
  accountId: string,
  transactionDate: string,
  amount: number,
  description?: string,
): Promise<string> {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "post_financial_account_opening_balance",
      {
        p_financial_account_id:
          accountId,

        p_transaction_date:
          transactionDate,

        p_amount:
          amount,

        p_description:
          description?.trim() ||
          undefined,
      },
    );

  if (error) {
    throw new Error(
      `Unable to post opening balance: ${error.message}`,
    );
  }

  if (
    typeof data !== "string" ||
    !data
  ) {
    throw new Error(
      "Opening balance was posted but no transaction ID was returned.",
    );
  }

  return data;
}