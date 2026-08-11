import {
  Skeleton,
} from "@/components/ui/skeleton";

export default function NewDeliveryOrderLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-[36rem] max-w-full" />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b p-5">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="mt-2 h-4 w-96 max-w-full" />
        </div>

        <div className="space-y-4 p-5">
          {Array.from({
            length: 4,
          }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-44 rounded-xl"
            />
          ))}
        </div>
      </div>
    </div>
  );
}