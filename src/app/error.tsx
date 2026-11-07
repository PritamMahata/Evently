"use client";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/layout/empty-state";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <EmptyState
      icon={TriangleAlert}
      title="Something went wrong"
      description="We hit an unexpected problem loading this page. Your data is safe. Please try again."
      action={<Button onClick={reset}>Try again</Button>}
    />
  );
}
