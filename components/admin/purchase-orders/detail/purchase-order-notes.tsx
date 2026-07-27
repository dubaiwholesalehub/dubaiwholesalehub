import type {
  PurchaseOrderHeader,
} from "@/lib/repositories/purchase-orders";

import { DetailSection } from "./detail-section";

interface PurchaseOrderNotesProps {
  purchaseOrder: PurchaseOrderHeader;
}

interface NoteCardProps {
  title: string;
  value: string | null;
}

function NoteCard({
  title,
  value,
}: NoteCardProps) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-5 py-3">
        <h3 className="font-medium">
          {title}
        </h3>
      </div>

      <div className="p-5">
        {value?.trim() ? (
          <p className="whitespace-pre-wrap text-sm leading-6">
            {value}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            No notes available.
          </p>
        )}
      </div>
    </div>
  );
}

export function PurchaseOrderNotes({
  purchaseOrder,
}: PurchaseOrderNotesProps) {
  return (
    <DetailSection title="Notes">
      <div className="space-y-4">
        <NoteCard
          title="Internal Notes"
          value={purchaseOrder.internal_notes}
        />

        <NoteCard
          title="Supplier Notes"
          value={purchaseOrder.supplier_notes}
        />
      </div>
    </DetailSection>
  );
}