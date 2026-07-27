import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { Attachment } from "./attachment-types";

interface AttachmentCardProps {
  attachment: Attachment;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;

  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function AttachmentCard({ attachment }: AttachmentCardProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="space-y-1">
        <p className="font-medium">{attachment.file_name}</p>

        <p className="text-xs text-muted-foreground">
          {formatFileSize(attachment.file_size)}
        </p>
      </div>

      <a
        href={attachment.download_url}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
      </a>
    </div>
  );
}
