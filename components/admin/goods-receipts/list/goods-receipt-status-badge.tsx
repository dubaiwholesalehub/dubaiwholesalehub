import { Badge } from "@/components/ui/badge";

import type { GoodsReceiptStatus } from "@/lib/repositories/goods-receipts";

interface Props {
  status: GoodsReceiptStatus;
}

const styles: Record<GoodsReceiptStatus, string> = {
  draft:
    "bg-gray-100 text-gray-700 border-gray-200",

  receiving:
    "bg-blue-100 text-blue-700 border-blue-200",

  partially_received:
    "bg-amber-100 text-amber-700 border-amber-200",

  received:
    "bg-indigo-100 text-indigo-700 border-indigo-200",

  inspected:
    "bg-purple-100 text-purple-700 border-purple-200",

  completed:
    "bg-green-100 text-green-700 border-green-200",

  cancelled:
    "bg-red-100 text-red-700 border-red-200",
};

export function GoodsReceiptStatusBadge({
  status,
}: Props) {
  return (
    <Badge
      variant="outline"
      className={styles[status]}
    >
      {status.replaceAll("_", " ")}
    </Badge>
  );
}