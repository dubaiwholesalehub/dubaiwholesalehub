import Link from "next/link";

import { PackageCheck, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { GoodsReceiptTable } from "@/components/admin/goods-receipts/list";

import { getGoodsReceiptHeaders } from "@/lib/repositories/goods-receipts";

<Link
  href="/admin/goods-receipts/new"
  className="inline-flex h-10 items-center justify-center rounded-md bg-orange-600 px-4 text-sm font-semibold text-white transition hover:bg-orange-700"
>
  New Goods Receipt
</Link>

export default async function GoodsReceiptsPage() {
  const goodsReceipts = await getGoodsReceiptHeaders();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg border bg-muted">
              <PackageCheck className="size-5" />
            </div>

            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Goods Receipts
              </h1>

              <p className="text-sm text-muted-foreground">
                Receive, inspect, and complete incoming purchase orders.
              </p>
            </div>
          </div>
        </div>

        <Link href="/admin/goods-receipts/new">
          <Button>
            <Plus className="size-4" />
            New Goods Receipt
          </Button>
        </Link>
      </div>

      {goodsReceipts.length > 0 ? (
        <GoodsReceiptTable goodsReceipts={goodsReceipts} />
      ) : (
        <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <PackageCheck className="size-6 text-muted-foreground" />
          </div>

          <h2 className="mt-4 text-lg font-semibold">
            No goods receipts yet
          </h2>

          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Create a goods receipt when products arrive against an approved
            purchase order.
          </p>

          <Link
            href="/admin/goods-receipts/new"
            className="mt-5"
          >
            <Button>
              <Plus className="size-4" />
              Create Goods Receipt
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}