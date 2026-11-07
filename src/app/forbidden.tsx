import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/layout/empty-state";

export default function Forbidden() {
  return (
    <EmptyState
      icon={ShieldAlert}
      title="403 — You don’t have access"
      description="Your account isn’t allowed to view this page. If you think this is a mistake, try logging in with a different account."
      action={
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
      }
    />
  );
}
