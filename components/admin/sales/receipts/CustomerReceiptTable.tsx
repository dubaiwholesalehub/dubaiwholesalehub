import Link from "next/link";

import type {
  CustomerReceiptListRow,
} from "@/lib/repositories/customer-receipt.repository";

interface CustomerReceiptTableProps {
  receipts:
    CustomerReceiptListRow[];
}

function money(
  value: number,
) {
  return new Intl.NumberFormat(
    "en-AE",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(value);
}

function methodLabel(
  method: string,
) {
  switch (method) {
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

export default function CustomerReceiptTable({
  receipts,
}: CustomerReceiptTableProps) {
  if (
    receipts.length === 0
  ) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="font-medium">
          No customer receipts found.
        </p>

        <p className="mt-1 text-sm text-muted-foreground">
          Customer payments will appear here once receipts are posted.
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
              Receipt
            </th>

            <th className="px-4 py-3">
              Date
            </th>

            <th className="px-4 py-3">
              Customer
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
              Unallocated
            </th>

            <th className="px-4 py-3">
              Status
            </th>
          </tr>
        </thead>

        <tbody className="divide-y">
          {receipts.map(
            (receipt) => (
              <tr
                key={
                  receipt.id
                }
                className="hover:bg-muted/30"
              >
                <td className="px-4 py-4">
                  <Link
                    href={`/admin/sales/receipts/${receipt.id}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    {
                      receipt.receiptNumber
                    }
                  </Link>

                  {receipt.referenceNumber ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Ref:{" "}
                      {
                        receipt.referenceNumber
                      }
                    </p>
                  ) : null}
                </td>

                <td className="px-4 py-4 text-muted-foreground">
                  {
                    receipt.receiptDate
                  }
                </td>

                <td className="px-4 py-4">
                  <p className="font-medium">
                    {
                      receipt.customerName
                    }
                  </p>

                  {receipt.customerNumber ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {
                        receipt.customerNumber
                      }
                    </p>
                  ) : null}
                </td>

                <td className="px-4 py-4">
                  {methodLabel(
                    receipt.paymentMethod,
                  )}
                </td>

                <td className="px-4 py-4 text-right font-medium">
                  {
                    receipt.currencyCode
                  }{" "}
                  {money(
                    receipt.amount,
                  )}
                </td>

                <td className="px-4 py-4 text-right">
                  {
                    receipt.currencyCode
                  }{" "}
                  {money(
                    receipt.allocatedAmount,
                  )}
                </td>

                <td className="px-4 py-4 text-right">
                  {
                    receipt.currencyCode
                  }{" "}
                  {money(
                    receipt.unallocatedAmount,
                  )}
                </td>

                <td className="px-4 py-4">
                  <span
                    className={[
                      "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                      receipt.status ===
                      "posted"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700",
                    ].join(
                      " ",
                    )}
                  >
                    {
                      receipt.status ===
                      "posted"
                        ? "Posted"
                        : "Cancelled"
                    }
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