import { Skeleton } from "@/components/ui/skeleton";

export function DiscoverSkeleton() {
  return (
    <div className="container-page pt-8 sm:pt-12" aria-busy="true" aria-label="Loading experiences">
      <Skeleton className="mb-3 h-4 w-28" />
      <Skeleton className="mb-10 h-12 w-72" />
      <div className="grid gap-10 lg:grid-cols-[17rem_1fr]">
        <div className="hidden space-y-4 lg:block">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-[4/3] rounded-2xl" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
