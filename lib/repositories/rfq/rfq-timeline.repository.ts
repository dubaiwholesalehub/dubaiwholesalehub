import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type RfqStatus = Database["public"]["Enums"]["rfq_status"];

export type TimelineEventType =
  | "created"
  | "sent"
  | "quotation_received"
  | "awarded"
  | "closed";

export interface RfqTimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  description: string | null;
  createdAt: string;
  userName: string | null;
}

export async function getRfqTimeline(
  rfqId: string
): Promise<RfqTimelineEvent[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rfq_status_history")
    .select(`
    id,
    new_status,
    notes,
    reason,
    changed_at,
    changed_by
  `)
    .eq("rfq_id", rfqId)
    .order("changed_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    type: mapStatusToTimelineType(item.new_status),
    title: formatTimelineTitle(item.new_status),
    description: item.notes ?? item.reason,
    createdAt: item.changed_at,
    userName: null,
  }));


}

function mapStatusToTimelineType(
  status: RfqStatus
): TimelineEventType {
  switch (status) {
    case "draft":
      return "created";

    case "sent":
      return "sent";

    case "awarded":
      return "awarded";

    case "closed":
      return "closed";

    default:
      return "created";
  }
}

function formatTimelineTitle(status: RfqStatus) {
  switch (status) {
    case "draft":
      return "RFQ Created";

    case "sent":
      return "RFQ Sent";

    case "awarded":
      return "Supplier Awarded";

    case "closed":
      return "RFQ Closed";

    default:
      return status;
  }
}