import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/auth/guards";
import { loadOwnedEvent } from "@/server/page-data";
import { EventForm } from "@/components/organizer/event-form";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Edit event" };
export const dynamic = "force-dynamic";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePageUser("ORGANIZER");
  const event = await loadOwnedEvent(id, user);
  const locked = event.status === "CANCELLED" || event.is_past;
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Edit event" description={event.title} />
      {locked ? (
        <Alert variant="warning">
          <AlertTitle>
            {event.status === "CANCELLED"
              ? "Cancelled events can’t be edited"
              : "Past events can’t be edited"}
          </AlertTitle>
          <AlertDescription>
            <Link className="underline" href={`/organizer/events/${event.id}`}>
              Back to event
            </Link>
          </AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardContent>
            <EventForm
              mode="edit"
              eventId={event.id}
              minSeats={Math.max(1, event.registered_count)}
              defaults={{
                title: event.title,
                description: event.description,
                eventDate: event.event_date,
                eventTime: event.event_time,
                venue: event.venue,
                seatLimit: event.seat_limit,
                bannerUrl: event.banner_url || "",
              }}
            />
          </CardContent>
        </Card>
      )}
      <div className="mt-4">
        <Button variant="ghost" asChild>
          <Link href={`/organizer/events/${event.id}`}>Back to event</Link>
        </Button>
      </div>
    </div>
  );
}
