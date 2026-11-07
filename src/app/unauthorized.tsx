import Link from "next/link";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/layout/empty-state";

export default function Unauthorized() {
  return (
    <EmptyState
      icon={LogIn}
      title="Please log in"
      description="You need to log in to see this page."
      action={
        <Button asChild>
          <Link href="/login">Log in</Link>
        </Button>
      }
    />
  );
}
