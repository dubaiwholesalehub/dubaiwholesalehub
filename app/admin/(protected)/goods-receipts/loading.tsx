import { Skeleton } from "@/components/ui/skeleton";

export default function GoodsReceiptsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>

        <Skeleton className="h-9 w-44" />
      </div>

      <div className="overflow-hidden rounded-xl border">
        <div className="grid grid-cols-6 gap-4 border-b p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-4 w-full"
            />
          ))}
        </div>

        <div className="space-y-0">
          {Array.from({ length: 5 }).map((_, rowIndex) => (
            <div
              key={rowIndex}
              className="grid grid-cols-6 gap-4 border-b p-4 last:border-b-0"
            >
              {Array.from({ length: 6 }).map((_, columnIndex) => (
                <Skeleton
                  key={columnIndex}
                  className="h-5 w-full"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}