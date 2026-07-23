interface RfqTableProps {
  rfqs: {
    id: string;
    rfq_number: string;
    title: string;
    status: string;
    created_at: string;
  }[];
}
import { RfqStatusBadge } from "./rfq-status-badge";
import { RfqRowActions } from "./rfq-row-actions";

export function RfqTable({ rfqs }: RfqTableProps) {
  if (rfqs.length === 0) {
    return (
      <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
        No RFQs found.
      </div>
    );
  }

  return (
    <table className="w-full">
      <thead className="border-b bg-muted/40">
        <tr>
          <th className="px-4 py-3 text-left text-sm font-medium">
            RFQ Number
          </th>

          <th className="px-4 py-3 text-left text-sm font-medium">
            Title
          </th>

          <th className="px-4 py-3 text-left text-sm font-medium">
            Status
          </th>

          <th className="px-4 py-3 text-left text-sm font-medium">
            Created
          </th>

          <th className="px-4 py-3 text-left text-sm font-medium">
            Actions
          </th>
        </tr>
      </thead>

      <tbody>
        {rfqs.map((rfq) => (
          <tr
            key={rfq.id}
            className="border-b hover:bg-muted/30"
          >
            <td className="px-4 py-3">
              {rfq.rfq_number}
            </td>

            <td className="px-4 py-3">
              {rfq.title}
            </td>

            <td className="px-4 py-3">
                <RfqStatusBadge status={rfq.status} />
            </td>

            <td className="px-4 py-3">
              {new Date(rfq.created_at).toLocaleDateString()}
            </td>

            <td className="px-4 py-3">
              <RfqRowActions rfqId={rfq.id} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}