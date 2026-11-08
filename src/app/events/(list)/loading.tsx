import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading events">
      <Skeleton className="mb-3 h-9 w-64" />
      <Skeleton className="mb-8 h-5 w-80 max-w-full" />
      <Skeleton className="mb-8 h-24 w-full" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    </div>
  );
}
