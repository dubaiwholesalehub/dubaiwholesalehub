import { createClient } from "@/lib/supabase/server";

import {
  getProfitabilityDashboard,
} from "@/lib/repositories/profitability.repository";

export type SalespersonPerformanceRow = {
  salespersonId: string;
  salespersonName: string;
  designation: string | null;
  orderCount: number;
  sales: number;
  returns: number;
  netSales: number;
  grossProfit: number;
  grossMarginPercentage: number;
};

export type SalespersonPerformanceData = {
  dateFrom: string;
  dateTo: string;
  rows: SalespersonPerformanceRow[];
  totals: {
    orderCount: number;
    sales: number;
    returns: number;
    netSales: number;
    grossProfit: number;
    grossMarginPercentage: number;
  };
};

type SalesOrderOwnershipRow = {
  id: string;
  salesperson_id: string;
};

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function getSalespersonPerformance(
  dateFrom: string,
  dateTo: string,
): Promise<SalespersonPerformanceData> {
  const supabase = await createClient();

  const profitability =
    await getProfitabilityDashboard(
      dateFrom,
      dateTo,
    );

  const { data: returnsData, error: returnsError } =
    await supabase
      .from("sales_returns")
      .select(
        `
          id,
          sales_order_id,
          grand_total,
          credit_journal_entry_id
        `,
      )
      .gte("return_date", dateFrom)
      .lte("return_date", dateTo)
      .not(
        "credit_journal_entry_id",
        "is",
        null,
      );

  if (returnsError) {
    throw new Error(
      `Unable to load salesperson sales returns: ${returnsError.message}`,
    );
  }

  const profitabilityOrderIds =
    profitability.orders
      .map((order) => order.salesOrderId)
      .filter(Boolean);

  const returnOrderIds =
    (returnsData ?? [])
      .map((row) => row.sales_order_id)
      .filter(
        (value): value is string =>
          Boolean(value),
      );

  const allOrderIds = Array.from(
    new Set([
      ...profitabilityOrderIds,
      ...returnOrderIds,
    ]),
  );

  let ownershipRows:
    SalesOrderOwnershipRow[] = [];

  if (allOrderIds.length > 0) {
    const { data, error } =
      await supabase
        .from("sales_orders")
        .select(
          `
            id,
            salesperson_id
          `,
        )
        .in("id", allOrderIds);

    if (error) {
      throw new Error(
        `Unable to load salesperson ownership: ${error.message}`,
      );
    }

    ownershipRows =
      (data ?? []) as SalesOrderOwnershipRow[];
  }

  const ownershipMap =
    new Map(
      ownershipRows.map((row) => [
        row.id,
        row.salesperson_id,
      ]),
    );

  const salespersonIds =
    Array.from(
      new Set(
        ownershipRows.map(
          (row) => row.salesperson_id,
        ),
      ),
    );

  const profileMap =
    new Map<
      string,
      {
        fullName: string | null;
        email: string;
        designation: string | null;
      }
    >();

  if (salespersonIds.length > 0) {
    const { data, error } =
      await supabase
        .from("profiles")
        .select(
          `
            id,
            full_name,
            email,
            designation
          `,
        )
        .in("id", salespersonIds);

    if (error) {
      throw new Error(
        `Unable to load salesperson profiles: ${error.message}`,
      );
    }

    for (const profile of data ?? []) {
      profileMap.set(
        profile.id,
        {
          fullName:
            profile.full_name,
          email:
            profile.email,
          designation:
            profile.designation,
        },
      );
    }
  }

  const performanceMap =
    new Map<
      string,
      {
        orderIds: Set<string>;
        sales: number;
        returns: number;
        grossProfit: number;
      }
    >();

  function ensureSalesperson(
    salespersonId: string,
  ) {
    let record =
      performanceMap.get(
        salespersonId,
      );

    if (!record) {
      record = {
        orderIds: new Set<string>(),
        sales: 0,
        returns: 0,
        grossProfit: 0,
      };

      performanceMap.set(
        salespersonId,
        record,
      );
    }

    return record;
  }

  for (const order of profitability.orders) {
    const salespersonId =
      ownershipMap.get(
        order.salesOrderId,
      );

    if (!salespersonId) {
      continue;
    }

    const record =
      ensureSalesperson(
        salespersonId,
      );

    record.orderIds.add(
      order.salesOrderId,
    );

    record.sales +=
      Number(order.revenue ?? 0);

    record.grossProfit +=
      Number(order.grossProfit ?? 0);
  }

  for (const salesReturn of returnsData ?? []) {
    if (!salesReturn.sales_order_id) {
      continue;
    }

    const salespersonId =
      ownershipMap.get(
        salesReturn.sales_order_id,
      );

    if (!salespersonId) {
      continue;
    }

    const record =
      ensureSalesperson(
        salespersonId,
      );

    record.returns +=
      Number(
        salesReturn.grand_total ??
          0,
      );
  }

  const rows =
    Array.from(
      performanceMap.entries(),
    )
      .map(
        ([
          salespersonId,
          record,
        ]): SalespersonPerformanceRow => {
          const profile =
            profileMap.get(
              salespersonId,
            );

          const sales =
            roundMoney(
              record.sales,
            );

          const returns =
            roundMoney(
              record.returns,
            );

          const netSales =
            roundMoney(
              sales - returns,
            );

          const grossProfit =
            roundMoney(
              record.grossProfit,
            );

          const grossMarginPercentage =
            sales !== 0
              ? roundMoney(
                  (grossProfit /
                    sales) *
                    100,
                )
              : 0;

          return {
            salespersonId,
            salespersonName:
              profile?.fullName?.trim() ||
              profile?.email ||
              "Unknown Salesperson",
            designation:
              profile?.designation ??
              null,
            orderCount:
              record.orderIds.size,
            sales,
            returns,
            netSales,
            grossProfit,
            grossMarginPercentage,
          };
        },
      )
      .sort(
        (a, b) =>
          b.netSales - a.netSales,
      );

  const totals =
    rows.reduce(
      (accumulator, row) => {
        accumulator.orderCount +=
          row.orderCount;

        accumulator.sales +=
          row.sales;

        accumulator.returns +=
          row.returns;

        accumulator.netSales +=
          row.netSales;

        accumulator.grossProfit +=
          row.grossProfit;

        return accumulator;
      },
      {
        orderCount: 0,
        sales: 0,
        returns: 0,
        netSales: 0,
        grossProfit: 0,
        grossMarginPercentage: 0,
      },
    );

  totals.sales =
    roundMoney(totals.sales);

  totals.returns =
    roundMoney(totals.returns);

  totals.netSales =
    roundMoney(totals.netSales);

  totals.grossProfit =
    roundMoney(
      totals.grossProfit,
    );

  totals.grossMarginPercentage =
    totals.sales !== 0
      ? roundMoney(
          (totals.grossProfit /
            totals.sales) *
            100,
        )
      : 0;

  return {
    dateFrom,
    dateTo,
    rows,
    totals,
  };
}