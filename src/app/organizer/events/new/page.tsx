import type { Metadata } from "next";
import { requirePageUser } from "@/lib/auth/guards";
import { EventForm } from "@/components/organizer/event-form";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "New event" };
export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  await requirePageUser("ORGANIZER");
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Create an event"
        description="Fill in the details. You can edit them later."
      />
      <Card>
        <CardContent>
          <EventForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
