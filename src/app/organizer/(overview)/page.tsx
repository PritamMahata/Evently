import type { Metadata } from "next";
import Link from "next/link";
import {
  Ban,
  CalendarClock,
  CalendarDays,
  Gauge,
  Plus,
  Users,
} from "lucide-react";
import { requirePageUser } from "@/lib/auth/guards";
import { getOrganizerStats } from "@/server/services/events.service";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { SeatMeter } from "@/components/events/seat-meter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Organizer dashboard" };
export const dynamic = "force-dynamic";

export default async function OrganizerDashboard() {
  const user = await requirePageUser("ORGANIZER");
  const stats = await getOrganizerStats(user);
  const upcoming = stats.events
    .filter((e) => e.status === "ACTIVE" && !e.is_past)
    .sort((a, b) =>
      (a.event_date + a.event_time).localeCompare(b.event_date + b.event_time),
    );
  const cards = [
    { label: "Total events", value: stats.totalEvents, icon: CalendarDays },
    {
      label: "Registrations",
      value: stats.totalRegistrations,
      icon: Users,
    },
    {
      label: "Upcoming events",
      value: stats.upcomingEvents,
      icon: CalendarClock,
    },
    { label: "Cancelled events", value: stats.cancelledEvents, icon: Ban },
    { label: "Seat utilization", value: `${stats.utilization}%`, icon: Gauge },
  ];
  return (
    <>
      <PageHeader
        title="Organizer dashboard"
        description="How your events are doing."
        actions={
          <>
            <Button asChild>
              <Link href="/organizer/events/new">
                <Plus /> New event
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/organizer/events">All my events</Link>
            </Button>
          </>
        }
      />
      <div className="mb-10 grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="gap-2">
            <CardHeader>
              <CardDescription className="flex items-center gap-2">
                <Icon className="size-4" aria-hidden />
                {label}
              </CardDescription>
              <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <h2 className="mb-4 text-xl font-semibold">
        Capacity of upcoming events
      </h2>
      {upcoming.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No upcoming events yet."
          description="Create your first event to start collecting registrations."
          action={
            <Button asChild>
              <Link href="/organizer/events/new">Create an event</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {upcoming.map((e) => (
            <li key={e.id}>
              <Card className="gap-3">
                <CardContent className="space-y-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <Link
                      href={`/organizer/events/${e.id}`}
                      className="font-semibold hover:underline"
                    >
                      {e.title}
                    </Link>
                    <span className="shrink-0 text-sm text-muted-foreground">
                      {formatDate(e.event_date, {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                  <SeatMeter event={e} />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
