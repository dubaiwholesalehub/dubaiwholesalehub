import Link from "next/link";

import type {
  SupplierPaymentListRow,
} from "@/lib/repositories/supplier-payment.repository";


interface SupplierPaymentTableProps {
  payments:
    SupplierPaymentListRow[];
}


function money(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-AE",
    {
      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2,
    },
  ).format(
    value,
  );
}


function methodLabel(
  method:
    string,
) {
  switch (
    method
  ) {
    case "bank":
      return "Bank Transfer";

    case "card":
      return "Card";

    case "cheque":
      return "Cheque";

    case "other":
      return "Other";

    case "cash":
    default:
      return "Cash";
  }
}


export default function SupplierPaymentTable({
  payments,
}: SupplierPaymentTableProps) {
  if (
    payments.length === 0
  ) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="font-medium">
          No supplier payments found.
        </p>

        <p className="mt-1 text-sm text-muted-foreground">
          Supplier payments will appear here once posted.
        </p>
      </div>
    );
  }


  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">
              Payment
            </th>

            <th className="px-4 py-3">
              Date
            </th>

            <th className="px-4 py-3">
              Supplier
            </th>

            <th className="px-4 py-3">
              Method
            </th>

            <th className="px-4 py-3 text-right">
              Amount
            </th>

            <th className="px-4 py-3 text-right">
              Allocated
            </th>

            <th className="px-4 py-3 text-right">
              Advance
            </th>

            <th className="px-4 py-3">
              Status
            </th>
          </tr>
        </thead>

        <tbody className="divide-y">
          {payments.map(
            (
              payment,
            ) => (
              <tr
                key={
                  payment.id
                }
                className="hover:bg-muted/30"
              >
                <td className="px-4 py-4">
                  <Link
                    href={`/admin/purchasing/supplier-payments/${payment.id}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    {
                      payment.paymentNumber
                    }
                  </Link>

                  {payment.referenceNumber ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Ref:{" "}
                      {
                        payment.referenceNumber
                      }
                    </p>
                  ) : null}
                </td>

                <td className="px-4 py-4 text-muted-foreground">
                  {
                    payment.paymentDate
                  }
                </td>

                <td className="px-4 py-4 font-medium">
                  {
                    payment.supplierName
                  }
                </td>

                <td className="px-4 py-4">
                  {methodLabel(
                    payment.paymentMethod,
                  )}
                </td>

                <td className="px-4 py-4 text-right font-medium">
                  {
                    payment.currencyCode
                  }{" "}
                  {money(
                    payment.amount,
                  )}
                </td>

                <td className="px-4 py-4 text-right">
                  {
                    payment.currencyCode
                  }{" "}
                  {money(
                    payment.allocatedAmount,
                  )}
                </td>

                <td className="px-4 py-4 text-right">
                  {
                    payment.currencyCode
                  }{" "}
                  {money(
                    payment.unallocatedAmount,
                  )}
                </td>

                <td className="px-4 py-4">
                  <span
                    className={[
                      "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",

                      payment.status ===
                      "posted"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700",
                    ].join(
                      " ",
                    )}
                  >
                    {payment.status ===
                    "posted"
                      ? "Posted"
                      : "Cancelled"}
                  </span>
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}