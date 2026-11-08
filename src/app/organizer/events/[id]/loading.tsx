import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading event">
      <Skeleton className="mb-3 h-6 w-20" />
      <Skeleton className="mb-8 h-10 w-96 max-w-full" />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Skeleton className="h-64" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}
