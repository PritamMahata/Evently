import Link from "next/link";
import { Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EventStatusBadge } from "@/components/events/status-badge";
import { SeatMeter } from "@/components/events/seat-meter";
import { CancelEventButton } from "./cancel-event-button";
import { formatDate, formatTime, seatsRemaining } from "@/lib/utils";
import type { EventRecord } from "@/types";

const canManage = (e: EventRecord) => e.status === "ACTIVE" && !e.is_past;

export function OrganizerEventsList({ events }: { events: EventRecord[] }) {
  return (
    <>
      <Card className="hidden py-0 md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Venue</TableHead>
              <TableHead className="text-right">Seat limit</TableHead>
              <TableHead className="text-right">Taken</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="max-w-56 font-medium">
                  <Link
                    href={`/organizer/events/${e.id}`}
                    className="hover:underline"
                  >
                    {e.title}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatDate(e.event_date, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  <span className="block text-xs text-muted-foreground">
                    {formatTime(e.event_time)}
                  </span>
                </TableCell>
                <TableCell className="max-w-40 truncate">{e.venue}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {e.seat_limit}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {e.registered_count}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {seatsRemaining(e)}
                </TableCell>
                <TableCell>
                  <EventStatusBadge event={e} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1.5">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/organizer/events/${e.id}`}>
                        <Eye /> View
                      </Link>
                    </Button>
                    {canManage(e) && (
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/organizer/events/${e.id}/edit`}>
                          <Pencil /> Edit
                        </Link>
                      </Button>
                    )}
                    {canManage(e) && (
                      <CancelEventButton
                        size="sm"
                        eventId={e.id}
                        title={e.title}
                        registrations={e.registered_count}
                      />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <ul className="space-y-3 md:hidden">
        {events.map((e) => (
          <li key={e.id}>
            <Card size="sm" className="gap-3 p-3">
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/organizer/events/${e.id}`}
                  className="font-semibold leading-snug hover:underline"
                >
                  {e.title}
                </Link>
                <EventStatusBadge event={e} />
              </div>
              <p className="text-sm text-muted-foreground">
                {formatDate(e.event_date)} at {formatTime(e.event_time)} —{" "}
                {e.venue}
              </p>
              <SeatMeter event={e} />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/organizer/events/${e.id}`}>
                    <Eye /> View
                  </Link>
                </Button>
                {canManage(e) && (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/organizer/events/${e.id}/edit`}>
                      <Pencil /> Edit
                    </Link>
                  </Button>
                )}
                {canManage(e) && (
                  <CancelEventButton
                    size="sm"
                    eventId={e.id}
                    title={e.title}
                    registrations={e.registered_count}
                  />
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
