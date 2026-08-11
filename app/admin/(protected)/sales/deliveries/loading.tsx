import {
  Skeleton,
} from "@/components/ui/skeleton";

export default function DeliveryOrdersLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-[32rem] max-w-full" />
        </div>

        <Skeleton className="h-10 w-40" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({
          length: 5,
        }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-32 rounded-xl"
          />
        ))}
      </div>

      <Skeleton className="h-24 rounded-xl" />

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="border-b p-4">
          <Skeleton className="h-4 w-48" />
        </div>

        <div className="space-y-3 p-4">
          {Array.from({
            length: 8,
          }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-14 w-full"
            />
          ))}
        </div>
      </div>
    </div>
  );
}