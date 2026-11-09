import type { Metadata } from "next";
import Link from "next/link";
import {
  Ban,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Info,
  MapPin,
  User,
  Users,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { getEvent } from "@/server/services/events.service";
import { loadEvent } from "@/server/page-data";
import { isRegistered } from "@/server/services/registrations.service";
import { formatDate, formatTime, seatsRemaining } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterButton } from "@/components/events/register-button";
import { SeatMeter } from "@/components/events/seat-meter";
import { EventStatusBadge } from "@/components/events/status-badge";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  try {
    return { title: (await getEvent((await params).id)).title };
  } catch {
    return { title: "Event not found" };
  }
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await loadEvent(id);
  const user = await getSessionUser();
  const registered =
    user?.role === "ATTENDEE" ? await isRegistered(user.id, id) : false;
  const left = seatsRemaining(event);
  const isOwner = user?.role === "ORGANIZER" && user.id === event.organizer_id;

  let action: React.ReactNode;
  if (registered) {
    action = (
      <div className="space-y-3">
        <Alert>
          <CheckCircle2 className="text-success" />
          <AlertTitle>You’re registered</AlertTitle>
          <AlertDescription>
            Your seat is reserved for this event.
          </AlertDescription>
        </Alert>
        <Button variant="outline" className="w-full" asChild>
          <a href={`/api/events/${event.id}/calendar`}>
            <CalendarPlus /> Add to calendar (.ics)
          </a>
        </Button>
      </div>
    );
  } else if (event.status === "CANCELLED") {
    action = (
      <Alert variant="destructive">
        <Ban />
        <AlertTitle>This event was cancelled</AlertTitle>
        <AlertDescription>Registration is closed.</AlertDescription>
      </Alert>
    );
  } else if (event.is_past) {
    action = (
      <Alert>
        <Clock />
        <AlertTitle>This event has already taken place</AlertTitle>
        <AlertDescription>Registration is closed.</AlertDescription>
      </Alert>
    );
  } else if (left === 0) {
    action = (
      <Alert variant="warning">
        <Users />
        <AlertTitle>This event is full</AlertTitle>
        <AlertDescription>
          All {event.seat_limit} seats are taken.
        </AlertDescription>
      </Alert>
    );
  } else if (!user) {
    action = (
      <Button size="lg" className="w-full" asChild>
        <Link href={`/login?next=${encodeURIComponent(`/events/${event.id}`)}`}>
          Log in to register
        </Link>
      </Button>
    );
  } else if (user.role === "ORGANIZER") {
    action = (
      <Alert>
        <Info />
        <AlertTitle>
          {isOwner ? "This is your event" : "Organizer account"}
        </AlertTitle>
        <AlertDescription>
          {isOwner ? (
            <Link
              className="font-medium underline"
              href={`/organizer/events/${event.id}`}
            >
              Manage event and guest list
            </Link>
          ) : (
            "Only attendee accounts can register for events."
          )}
        </AlertDescription>
      </Alert>
    );
  } else {
    action = <RegisterButton eventId={event.id} />;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <article className="min-w-0 space-y-6">
        {event.banner_url && (
          <div className="relative overflow-hidden rounded-2xl border bg-muted shadow-sm aspect-[21/9]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.banner_url}
              alt={event.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <div className="space-y-3">
          <EventStatusBadge event={event} />
          <h1 className="text-balance text-3xl font-semibold sm:text-4xl">
            {event.title}
          </h1>
          <p className="flex items-center gap-2 text-muted-foreground">
            <User className="size-4" aria-hidden />
            Hosted by {event.organizer_name}
          </p>
        </div>
        <ul className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-3">
          <li className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 size-5 text-primary" aria-hidden />
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="font-medium">
                {formatDate(event.event_date, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <Clock className="mt-0.5 size-5 text-primary" aria-hidden />
            <div>
              <p className="text-xs text-muted-foreground">Time</p>
              <p className="font-medium">{formatTime(event.event_time)}</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <MapPin
              className="mt-0.5 size-5 shrink-0 text-primary"
              aria-hidden
            />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Venue</p>
              <p className="break-words font-medium">{event.venue}</p>
            </div>
          </li>
        </ul>
        <section aria-labelledby="about" className="space-y-2">
          <h2 id="about" className="text-xl font-semibold">
            About this event
          </h2>
          <p className="whitespace-pre-line break-words leading-relaxed text-foreground/90">
            {event.description}
          </p>
        </section>
      </article>
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle>Reserve your seat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <SeatMeter event={event} />
            {action}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
