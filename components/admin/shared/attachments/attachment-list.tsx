import { AttachmentCard } from "./attachment-card";
import { AttachmentEmpty } from "./attachment-empty";
import type { Attachment } from "./attachment-types";

interface AttachmentListProps {
  attachments: Attachment[];
}

export function AttachmentList({
  attachments,
}: AttachmentListProps) {
  if (attachments.length === 0) {
    return <AttachmentEmpty />;
  }

  return (
    <div className="space-y-3">
      {attachments.map((attachment) => (
        <AttachmentCard
          key={attachment.id}
          attachment={attachment}
        />
      ))}
    </div>
  );
}