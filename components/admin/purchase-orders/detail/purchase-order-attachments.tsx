import {
  AttachmentList,
  type Attachment,
} from "@/components/admin/shared/attachments";

import { DetailSection } from "./detail-section";

interface PurchaseOrderAttachmentsProps {
  attachments?: Attachment[];
}

export function PurchaseOrderAttachments({
  attachments = [],
}: PurchaseOrderAttachmentsProps) {
  return (
    <DetailSection title="Attachments">
      <AttachmentList attachments={attachments} />
    </DetailSection>
  );
}