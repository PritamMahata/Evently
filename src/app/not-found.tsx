import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/layout/empty-state";

export default function NotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="We couldn’t find that page"
      description="The event or page you’re looking for doesn’t exist or has been removed."
      action={
        <Button asChild>
          <Link href="/events">Browse events</Link>
        </Button>
      }
    />
  );
}
