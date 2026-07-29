import type { WarehouseStockListItem } from "@/lib/inventory/inventory.repository";

import { WarehouseStockStatusBadge } from "./WarehouseStockStatusBadge";

interface WarehouseStockTableProps {
  items: WarehouseStockListItem[];
}

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "AED",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function WarehouseStockTable({
  items,
}: WarehouseStockTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
        <h3 className="text-base font-semibold text-slate-900">
          No warehouse stock found
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Try changing the search term or stock filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-[1250px] w-full text-left">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <TableHeading>SKU</TableHeading>
              <TableHeading>Product</TableHeading>
              <TableHeading>Warehouse</TableHeading>
              <TableHeading>Category</TableHeading>
              <TableHeading>Brand</TableHeading>
              <TableHeading align="right">On Hand</TableHeading>
              <TableHeading align="right">Reserved</TableHeading>
              <TableHeading align="right">Available</TableHeading>
              <TableHeading align="right">Avg. Cost</TableHeading>
              <TableHeading align="right">Stock Value</TableHeading>
              <TableHeading>Status</TableHeading>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr
                key={item.id}
                className="transition hover:bg-slate-50"
              >
                <TableCell>
                  <span className="font-medium text-slate-900">
                    {item.sku}
                  </span>

                  {item.barcode && (
                    <span className="mt-1 block text-xs text-slate-500">
                      {item.barcode}
                    </span>
                  )}
                </TableCell>

                <TableCell>
                  <span className="font-medium text-slate-900">
                    {item.product_name}
                  </span>
                </TableCell>

                <TableCell>
                  <span className="font-medium text-slate-800">
                    {item.warehouse_name}
                  </span>

                  <span className="mt-1 block text-xs text-slate-500">
                    {item.warehouse_code}
                  </span>
                </TableCell>

                <TableCell>
                  {item.category_name ?? "—"}
                </TableCell>

                <TableCell>
                  {item.brand_name ?? "—"}
                </TableCell>

                <TableCell align="right">
                  {numberFormatter.format(item.quantity_on_hand)}
                </TableCell>

                <TableCell align="right">
                  {numberFormatter.format(item.quantity_reserved)}
                </TableCell>

                <TableCell align="right">
                  <span className="font-semibold text-slate-900">
                    {numberFormatter.format(
                      item.quantity_available,
                    )}
                  </span>
                </TableCell>

                <TableCell align="right">
                  {currencyFormatter.format(
                    item.average_unit_cost,
                  )}
                </TableCell>

                <TableCell align="right">
                  <span className="font-semibold text-slate-900">
                    {currencyFormatter.format(item.stock_value)}
                  </span>
                </TableCell>

                <TableCell>
                  <WarehouseStockStatusBadge
                    status={item.stock_status}
                  />
                </TableCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface TableHeadingProps {
  children: React.ReactNode;
  align?: "left" | "right";
}

function TableHeading({
  children,
  align = "left",
}: TableHeadingProps) {
  return (
    <th
      className={[
        "whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500",
        align === "right" ? "text-right" : "text-left",
      ].join(" ")}
    >
      {children}
    </th>
  );
}

interface TableCellProps {
  children: React.ReactNode;
  align?: "left" | "right";
}

function TableCell({
  children,
  align = "left",
}: TableCellProps) {
  return (
    <td
      className={[
        "whitespace-nowrap px-4 py-4 text-sm text-slate-600",
        align === "right" ? "text-right" : "text-left",
      ].join(" ")}
    >
      {children}
    </td>
  );
}