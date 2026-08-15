import {
  createClient,
} from "@/lib/supabase/server";


/* =========================================================
 * Types
 * ========================================================= */

export interface PayablesSupplierRow {
  supplierId: string;

  supplierName: string;

  outstandingPurchases: number;

  supplierAdvance: number;

  netPayable: number;

  overdueAmount: number;

  pendingVatAmount: number;

  lastPurchaseDate:
    | string
    | null;
}


export interface PayablesAging {
  current: number;

  days1To30: number;

  days31To60: number;

  days61To90: number;

  days90Plus: number;
}


export interface PayablesDashboard {
  totalOutstanding: number;

  totalSupplierAdvances: number;

  netPayable: number;

  purchasesThisMonth: number;

  paymentsThisMonth: number;

  pendingVatDocumentation: number;

  suppliersWithBalance: number;

  suppliersWithAdvance: number;

  aging:
    PayablesAging;

  suppliers:
    PayablesSupplierRow[];
}


/* =========================================================
 * Helpers
 * ========================================================= */

function toNumber(
  value: unknown,
): number {
  const number =
    Number(
      value ?? 0,
    );

  return Number.isFinite(
    number,
  )
    ? number
    : 0;
}


function roundMoney(
  value: number,
): number {
  return Math.round(
    (
      value +
      Number.EPSILON
    ) *
      100,
  ) / 100;
}


function startOfMonth(
  date: Date,
): string {
  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      "0",
    ),
    "01",
  ].join("-");
}


function differenceInDays(
  laterDate: string,
  earlierDate: string,
): number {
  const later =
    new Date(
      `${laterDate}T00:00:00Z`,
    );

  const earlier =
    new Date(
      `${earlierDate}T00:00:00Z`,
    );

  return Math.max(
    0,
    Math.floor(
      (
        later.getTime() -
        earlier.getTime()
      ) /
        86_400_000,
    ),
  );
}


function supplierName(
  supplier:
    | {
        company_name:
          string;
      }
    | {
        company_name:
          string;
      }[]
    | null,
): string {
  if (!supplier) {
    return "Unknown supplier";
  }

  if (
    Array.isArray(
      supplier,
    )
  ) {
    return (
      supplier[0]
        ?.company_name ??
      "Unknown supplier"
    );
  }

  return (
    supplier.company_name ??
    "Unknown supplier"
  );
}


/* =========================================================
 * Dashboard
 * ========================================================= */

export async function getPayablesDashboard():
  Promise<PayablesDashboard> {
  const supabase =
    await createClient();


  const now =
    new Date();

  const today =
    now
      .toISOString()
      .slice(
        0,
        10,
      );

  const monthStart =
    startOfMonth(
      now,
    );


  /* -------------------------------------------------------
   * Posted Quick Purchases
   * ------------------------------------------------------- */

  const {
    data: purchases,
    error: purchasesError,
  } =
    await supabase
      .from(
        "quick_purchases",
      )
      .select(`
        id,
        supplier_id,
        purchase_date,
        grand_total,
        balance_due,
        pending_tax_amount,
        tax_treatment,

        suppliers!quick_purchases_supplier_id_fkey (
          company_name
        )
      `)
      .eq(
        "status",
        "posted",
      )
      .not(
        "supplier_id",
        "is",
        null,
      );


  if (purchasesError) {
    throw new Error(
      `Unable to load Quick Purchase payables: ${purchasesError.message}`,
    );
  }


  /* -------------------------------------------------------
   * Posted Supplier Payments
   * ------------------------------------------------------- */

  const {
    data: payments,
    error: paymentsError,
  } =
    await supabase
      .from(
        "supplier_payments",
      )
      .select(`
        id,
        supplier_id,
        payment_date,
        amount,
        allocated_amount,
        unallocated_amount
      `)
      .eq(
        "status",
        "posted",
      );


  if (paymentsError) {
    throw new Error(
      `Unable to load supplier payments: ${paymentsError.message}`,
    );
  }


  /* =======================================================
   * Totals
   * ======================================================= */

  let totalOutstanding =
    0;

  let purchasesThisMonth =
    0;

  let paymentsThisMonth =
    0;

  let pendingVatDocumentation =
    0;


  const aging:
    PayablesAging = {
      current: 0,

      days1To30: 0,

      days31To60: 0,

      days61To90: 0,

      days90Plus: 0,
    };


  const supplierMap =
    new Map<
      string,
      PayablesSupplierRow
    >();


  /* =======================================================
   * Purchases
   * ======================================================= */

  for (
    const purchase of
    purchases ?? []
  ) {
    if (
      !purchase.supplier_id
    ) {
      continue;
    }


    const balanceDue =
      roundMoney(
        toNumber(
          purchase.balance_due,
        ),
      );


    const grandTotal =
      roundMoney(
        toNumber(
          purchase.grand_total,
        ),
      );


    const pendingTax =
      roundMoney(
        toNumber(
          purchase.pending_tax_amount,
        ),
      );


    totalOutstanding =
      roundMoney(
        totalOutstanding +
          balanceDue,
      );


    if (
      purchase.purchase_date >=
      monthStart
    ) {
      purchasesThisMonth =
        roundMoney(
          purchasesThisMonth +
            grandTotal,
        );
    }


    pendingVatDocumentation =
      roundMoney(
        pendingVatDocumentation +
          pendingTax,
      );


    const age =
      differenceInDays(
        today,
        purchase.purchase_date,
      );


    /*
     * Aging is currently based on purchase date because
     * Quick Purchase does not yet store a separate due date.
     *
     * Once supplier credit terms / due_date are introduced,
     * aging should use due_date instead.
     */

    if (
      balanceDue >
      0
    ) {
      if (
        age === 0
      ) {
        aging.current =
          roundMoney(
            aging.current +
              balanceDue,
          );
      } else if (
        age <= 30
      ) {
        aging.days1To30 =
          roundMoney(
            aging.days1To30 +
              balanceDue,
          );
      } else if (
        age <= 60
      ) {
        aging.days31To60 =
          roundMoney(
            aging.days31To60 +
              balanceDue,
          );
      } else if (
        age <= 90
      ) {
        aging.days61To90 =
          roundMoney(
            aging.days61To90 +
              balanceDue,
          );
      } else {
        aging.days90Plus =
          roundMoney(
            aging.days90Plus +
              balanceDue,
          );
      }
    }


    const existing =
      supplierMap.get(
        purchase.supplier_id,
      ) ?? {
        supplierId:
          purchase.supplier_id,

        supplierName:
          supplierName(
            purchase.suppliers,
          ),

        outstandingPurchases:
          0,

        supplierAdvance:
          0,

        netPayable:
          0,

        overdueAmount:
          0,

        pendingVatAmount:
          0,

        lastPurchaseDate:
          null,
      };


    existing.outstandingPurchases =
      roundMoney(
        existing.outstandingPurchases +
          balanceDue,
      );


    existing.pendingVatAmount =
      roundMoney(
        existing.pendingVatAmount +
          pendingTax,
      );


    /*
     * Until supplier payment terms / due dates are added,
     * balances older than 30 days are treated as overdue
     * for dashboard attention purposes.
     */

    if (
      balanceDue >
        0 &&
      age >
        30
    ) {
      existing.overdueAmount =
        roundMoney(
          existing.overdueAmount +
            balanceDue,
        );
    }


    if (
      !existing.lastPurchaseDate ||
      purchase.purchase_date >
        existing.lastPurchaseDate
    ) {
      existing.lastPurchaseDate =
        purchase.purchase_date;
    }


    supplierMap.set(
      purchase.supplier_id,
      existing,
    );
  }


  /* =======================================================
   * Payments / Advances
   * ======================================================= */

  let totalSupplierAdvances =
    0;


  for (
    const payment of
    payments ?? []
  ) {
    const amount =
      roundMoney(
        toNumber(
          payment.amount,
        ),
      );


    const unallocated =
      roundMoney(
        toNumber(
          payment.unallocated_amount,
        ),
      );


    if (
      payment.payment_date >=
      monthStart
    ) {
      paymentsThisMonth =
        roundMoney(
          paymentsThisMonth +
            amount,
        );
    }


    totalSupplierAdvances =
      roundMoney(
        totalSupplierAdvances +
          unallocated,
      );


    const existing =
      supplierMap.get(
        payment.supplier_id,
      );


    /*
     * A supplier may have an advance but no Quick Purchase.
     * In that case we still need the supplier in the table.
     */

    if (!existing) {
      const {
        data: supplier,
      } =
        await supabase
          .from(
            "suppliers",
          )
          .select(
            "company_name",
          )
          .eq(
            "id",
            payment.supplier_id,
          )
          .maybeSingle();


      supplierMap.set(
        payment.supplier_id,
        {
          supplierId:
            payment.supplier_id,

          supplierName:
            supplier
              ?.company_name ??
            "Unknown supplier",

          outstandingPurchases:
            0,

          supplierAdvance:
            unallocated,

          netPayable:
            0,

          overdueAmount:
            0,

          pendingVatAmount:
            0,

          lastPurchaseDate:
            null,
        },
      );

      continue;
    }


    existing.supplierAdvance =
      roundMoney(
        existing.supplierAdvance +
          unallocated,
      );
  }


  /* =======================================================
   * Supplier Net Balances
   * ======================================================= */

  const suppliers =
    [
      ...supplierMap.values(),
    ]
      .map(
        (
          supplier,
        ) => {
          const netPayable =
            roundMoney(
              supplier.outstandingPurchases -
                supplier.supplierAdvance,
            );


          return {
            ...supplier,

            netPayable,
          };
        },
      )
      .filter(
        (
          supplier,
        ) =>
          supplier.outstandingPurchases >
            0 ||
          supplier.supplierAdvance >
            0 ||
          supplier.pendingVatAmount >
            0,
      )
      .sort(
        (
          left,
          right,
        ) =>
          right.netPayable -
          left.netPayable,
      );


  const suppliersWithBalance =
    suppliers.filter(
      (
        supplier,
      ) =>
        supplier.netPayable >
        0,
    ).length;


  const suppliersWithAdvance =
    suppliers.filter(
      (
        supplier,
      ) =>
        supplier.supplierAdvance >
        0,
    ).length;


  const netPayable =
    roundMoney(
      totalOutstanding -
        totalSupplierAdvances,
    );


  return {
    totalOutstanding:
      roundMoney(
        totalOutstanding,
      ),

    totalSupplierAdvances:
      roundMoney(
        totalSupplierAdvances,
      ),

    netPayable,

    purchasesThisMonth:
      roundMoney(
        purchasesThisMonth,
      ),

    paymentsThisMonth:
      roundMoney(
        paymentsThisMonth,
      ),

    pendingVatDocumentation:
      roundMoney(
        pendingVatDocumentation,
      ),

    suppliersWithBalance,

    suppliersWithAdvance,

    aging,

    suppliers,
  };
}