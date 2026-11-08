import type { Metadata } from "next";
import Link from "next/link";
import { Download, Pencil, Users } from "lucide-react";
import { requirePageUser } from "@/lib/auth/guards";
import { getOrganizerEventWithAttendees } from "@/server/services/events.service";
import { CancelEventButton } from "@/components/organizer/cancel-event-button";
import { EmptyState } from "@/components/layout/empty-state";
import { EventStatusBadge } from "@/components/events/status-badge";
import { SeatMeter } from "@/components/events/seat-meter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatDate,
  formatDateTimeStamp,
  formatTime,
  seatsRemaining,
} from "@/lib/utils";

export const metadata: Metadata = { title: "Manage event" };
export const dynamic = "force-dynamic";

export default async function OrganizerEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePageUser("ORGANIZER");
  const { event, attendees } = await getOrganizerEventWithAttendees(user, id); // layout already enforced 404/403
  const manageable = event.status === "ACTIVE" && !event.is_past;
  return (
    <>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <EventStatusBadge event={event} />
          <h1 className="text-balance text-2xl font-semibold sm:text-3xl">
            {event.title}
          </h1>
          <p className="text-muted-foreground">
            {formatDate(event.event_date, {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            at {formatTime(event.event_time)} — {event.venue}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={`/events/${event.id}`}>Public page</Link>
          </Button>
          {manageable && (
            <Button variant="outline" asChild>
              <Link href={`/organizer/events/${event.id}/edit`}>
                <Pencil /> Edit
              </Link>
            </Button>
          )}
          {manageable && (
            <CancelEventButton
              eventId={event.id}
              title={event.title}
              registrations={event.registered_count}
            />
          )}
        </div>
      </div>
      {event.status === "CANCELLED" && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>This event is cancelled</AlertTitle>
          <AlertDescription>
            New registrations are blocked. The attendee list below is preserved.
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card className="min-w-0 order-2 lg:order-1">
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Attendees</CardTitle>
              <CardDescription>{attendees.length} registered</CardDescription>
            </div>
            {attendees.length > 0 && (
              <Button size="sm" variant="outline" asChild>
                <a href={`/api/organizer/events/${event.id}/attendees/export`}>
                  <Download /> Export CSV
                </a>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {attendees.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No attendees registered yet."
                description="Share the public page so people can register."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Registered on</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendees.map((a) => (
                    <TableRow key={a.registration_id}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell>{a.email}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTimeStamp(a.registered_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card className="order-1 h-fit lg:order-2">
          <CardHeader>
            <CardTitle>Registrations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-4xl font-semibold tabular-nums">
              {event.registered_count}
              <span className="text-lg font-normal text-muted-foreground">
                {" "}
                / {event.seat_limit}
              </span>
            </p>
            <SeatMeter event={event} showText={false} />
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted-foreground">Seats taken</dt>
              <dd className="text-right font-medium">
                {event.registered_count}
              </dd>
              <dt className="text-muted-foreground">Seats remaining</dt>
              <dd className="text-right font-medium">
                {seatsRemaining(event)}
              </dd>
            </dl>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
