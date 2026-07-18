import SupplierCardSkeleton from "./SupplierCardSkeleton";

type SupplierListSkeletonProps = {
  count?: number;
};

export default function SupplierListSkeleton({
  count = 3,
}: SupplierListSkeletonProps) {
  return (
    <section
      aria-label="Loading product suppliers"
      aria-busy="true"
      className="space-y-5"
    >
      {Array.from({ length: count }).map((_, index) => (
        <SupplierCardSkeleton key={index} />
      ))}

      <span className="sr-only">
        Loading supplier information
      </span>
    </section>
  );
}