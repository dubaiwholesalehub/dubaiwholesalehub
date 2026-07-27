interface AttachmentEmptyProps {
  title?: string;
}

export function AttachmentEmpty({
  title = "No attachments available.",
}: AttachmentEmptyProps) {
  return (
    <div className="rounded-lg border border-dashed p-10 text-center">
      <p className="text-sm text-muted-foreground">
        {title}
      </p>
    </div>
  );
}