import { createClient } from "@/lib/supabase/server";

export type AccountingPeriodStatus =
  | "open"
  | "soft_closed"
  | "closed";

export interface AccountingPeriod {
  id: string;
  periodCode: string;
  fiscalYear: number;
  periodNumber: number;
  dateFrom: string;
  dateTo: string;
  status: AccountingPeriodStatus;

  notes: string | null;

  softClosedAt: string | null;
  softClosedBy: string | null;

  closedAt: string | null;
  closedBy: string | null;

  reopenedAt: string | null;
  reopenedBy: string | null;
}

export async function getAccountingPeriods(): Promise<
  AccountingPeriod[]
> {
  const supabase =
    await createClient();

  const {
    data,
    error,
  } = await supabase
    .from("accounting_periods")
    .select(
      `
        id,
        period_code,
        fiscal_year,
        period_number,
        date_from,
        date_to,
        status,
        notes,
        soft_closed_at,
        soft_closed_by,
        closed_at,
        closed_by,
        reopened_at,
        reopened_by
      `,
    )
    .order("fiscal_year", {
      ascending: false,
    })
    .order("period_number", {
      ascending: true,
    });

  if (error) {
    throw new Error(
      `Unable to load accounting periods: ${error.message}`,
    );
  }

  return (data ?? []).map(
    (period) => ({
      id:
        period.id,

      periodCode:
        period.period_code,

      fiscalYear:
        period.fiscal_year,

      periodNumber:
        period.period_number,

      dateFrom:
        period.date_from,

      dateTo:
        period.date_to,

      status:
        period.status as AccountingPeriodStatus,

      notes:
        period.notes,

      softClosedAt:
        period.soft_closed_at,

      softClosedBy:
        period.soft_closed_by,

      closedAt:
        period.closed_at,

      closedBy:
        period.closed_by,

      reopenedAt:
        period.reopened_at,

      reopenedBy:
        period.reopened_by,
    }),
  );
}