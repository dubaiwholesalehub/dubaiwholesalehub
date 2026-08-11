import Link from "next/link";

import { CalendarDays, PackageCheck, Store, Warehouse } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { GoodsReceiptHeaderDetail } from "@/lib/repositories/goods-receipts";

import { GoodsReceiptStatusBadge } from "./goods-receipt-status-badge";

interface GoodsReceiptTableProps {
  goodsReceipts: GoodsReceiptHeaderDetail[];
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not received";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function GoodsReceiptTable({ goodsReceipts }: GoodsReceiptTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Receipt</TableHead>
            <TableHead>Purchase Order</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Warehouse</TableHead>
            <TableHead>Received Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {goodsReceipts.map((receipt) => (
            <TableRow key={receipt.id}>
              <TableCell>
                <Link
                  href={`/admin/goods-receipts/${receipt.id}`}
                  className="font-medium text-foreground hover:underline"
                >
                  <span className="inline-flex items-center gap-2">
                    <PackageCheck className="size-4 text-muted-foreground" />
                    {receipt.receipt_number}
                  </span>
                </Link>

                <p className="mt-1 text-xs text-muted-foreground">
                  Created {formatDate(receipt.created_at)}
                </p>
              </TableCell>

              <TableCell>
                <span className="font-medium">
                  {receipt.purchase_order.po_number}
                </span>

                <p className="mt-1 text-xs capitalize text-muted-foreground">
                  {receipt.purchase_order.status.replaceAll("_", " ")}
                </p>
              </TableCell>

              <TableCell>
                <span className="inline-flex items-center gap-2">
                  <Store className="size-4 text-muted-foreground" />
                  {receipt.supplier.company_name}
                </span>
              </TableCell>

              <TableCell>
                <span className="inline-flex items-center gap-2">
                  <Warehouse className="size-4 text-muted-foreground" />
                  {receipt.warehouse.name}
                </span>

                <p className="mt-1 text-xs text-muted-foreground">
                  {receipt.warehouse.code}
                </p>
              </TableCell>

              <TableCell>
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="size-4 text-muted-foreground" />
                  {formatDate(receipt.received_date)}
                </span>
              </TableCell>

              <TableCell>
                <GoodsReceiptStatusBadge status={receipt.status} />
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href={`/admin/goods-receipts/${receipt.id}`}
                  className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-800 transition hover:bg-neutral-50"
                >
                  {receipt.status === "completed"
                    ? "View"
                    : receipt.status === "cancelled"
                      ? "View"
                      : "Continue Receiving"}
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
