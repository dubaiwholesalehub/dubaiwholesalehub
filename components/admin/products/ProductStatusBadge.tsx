type ProductStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "archived";

interface ProductStatusBadgeProps {
  status: ProductStatus;
}

const statusStyles: Record<ProductStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  pending_review: "bg-amber-100 text-amber-800",
  published: "bg-green-100 text-green-700",
  archived: "bg-red-100 text-red-700",
};

const statusLabels: Record<ProductStatus, string> = {
  draft: "Draft",
  pending_review: "Pending Review",
  published: "Published",
  archived: "Archived",
};

export default function ProductStatusBadge({
  status,
}: ProductStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}