import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div
      className="grid gap-8 lg:grid-cols-[1fr_22rem]"
      aria-busy="true"
      aria-label="Loading event"
    >
      <div className="space-y-5">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
      <Skeleton className="h-56 w-full" />
    </div>
  );
}
