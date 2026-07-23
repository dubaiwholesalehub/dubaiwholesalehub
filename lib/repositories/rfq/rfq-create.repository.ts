import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Json =
  Database["public"]["Functions"]["create_rfq_transaction"]["Args"]["p_rfq"];

export interface CreateRfqPayload {
  rfq: Json;
  items: Json;
  suppliers: Json;
}

export interface CreateRfqResult {
  rfqId: string;
  rfqNumber: string;
}

export async function createRfq(
  payload: CreateRfqPayload,
): Promise<CreateRfqResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "create_rfq_transaction",
    {
      p_rfq: payload.rfq,
      p_items: payload.items,
      p_suppliers: payload.suppliers,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  const result = data?.[0];

  if (!result) {
    throw new Error(
      "RFQ creation did not return a result.",
    );
  }

  return {
    rfqId: result.rfq_id,
    rfqNumber: result.rfq_number,
  };
}