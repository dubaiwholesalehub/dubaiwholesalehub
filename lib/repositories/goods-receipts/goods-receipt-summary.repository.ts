import { createClient } from "@/lib/supabase/server";

export interface GoodsReceiptDetailSummary {
  total_lines: number;

  ordered_quantity: number;
  previously_received_quantity: number;
  receiving_quantity: number;

  accepted_quantity: number;
  rejected_quantity: number;
  damaged_quantity: number;

  remaining_quantity: number;

  completion_percentage: number;

  receiving_value: number;
  accepted_value: number;
}

interface GoodsReceiptSummaryRow {
  ordered_quantity: number;
  previously_received_quantity: number;
  receiving_quantity: number;

  accepted_quantity: number;
  rejected_quantity: number;
  damaged_quantity: number;

  unit_cost: number;
}

export async function getGoodsReceiptDetailSummary(
  goodsReceiptId: string,
): Promise<GoodsReceiptDetailSummary> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("goods_receipt_items")
    .select(`
      ordered_quantity,
      previously_received_quantity,
      receiving_quantity,
      accepted_quantity,
      rejected_quantity,
      damaged_quantity,
      unit_cost
    `)
    .eq("goods_receipt_id", goodsReceiptId);

  if (error) {
    throw new Error(
      `Failed to load goods receipt summary: ${error.message}`,
    );
  }

  const rows = (data ?? []) as GoodsReceiptSummaryRow[];

  const summary = rows.reduce(
    (result, item) => {
      result.total_lines += 1;

      result.ordered_quantity +=
        Number(item.ordered_quantity) || 0;

      result.previously_received_quantity +=
        Number(item.previously_received_quantity) || 0;

      result.receiving_quantity +=
        Number(item.receiving_quantity) || 0;

      result.accepted_quantity +=
        Number(item.accepted_quantity) || 0;

      result.rejected_quantity +=
        Number(item.rejected_quantity) || 0;

      result.damaged_quantity +=
        Number(item.damaged_quantity) || 0;

      result.receiving_value +=
        (Number(item.receiving_quantity) || 0) *
        (Number(item.unit_cost) || 0);

      result.accepted_value +=
        (Number(item.accepted_quantity) || 0) *
        (Number(item.unit_cost) || 0);

      return result;
    },
    {
      total_lines: 0,

      ordered_quantity: 0,
      previously_received_quantity: 0,
      receiving_quantity: 0,

      accepted_quantity: 0,
      rejected_quantity: 0,
      damaged_quantity: 0,

      remaining_quantity: 0,

      completion_percentage: 0,

      receiving_value: 0,
      accepted_value: 0,
    } satisfies GoodsReceiptDetailSummary,
  );

  const totalReceivedQuantity =
    summary.previously_received_quantity +
    summary.receiving_quantity;

  summary.remaining_quantity = Math.max(
    summary.ordered_quantity - totalReceivedQuantity,
    0,
  );

  summary.completion_percentage =
    summary.ordered_quantity > 0
      ? Math.min(
          (totalReceivedQuantity /
            summary.ordered_quantity) *
            100,
          100,
        )
      : 0;

  return summary;
}