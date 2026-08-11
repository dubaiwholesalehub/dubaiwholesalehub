import {
  Skeleton,
} from "@/components/ui/skeleton";

export default function DeliveryOrderDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {Array.from({
          length: 3,
        }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-56 rounded-xl"
          />
        ))}
      </div>

      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-96 rounded-xl" />

      <div className="grid gap-6 xl:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}