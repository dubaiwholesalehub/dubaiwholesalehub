import Link from "next/link";

interface RfqRowActionsProps {
  rfqId: string;
}

export function RfqRowActions({
  rfqId,
}: RfqRowActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/admin/rfqs/${rfqId}`}
        className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
      >
        View
      </Link>

      <Link
        href={`/admin/rfqs/${rfqId}/edit`}
        className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
      >
        Edit
      </Link>
    </div>
  );
}