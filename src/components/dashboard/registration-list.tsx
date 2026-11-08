import Link from "next/link";
import { CalendarDays, CalendarPlus, Clock, MapPin } from "lucide-react";
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
import { RegistrationStatusBadge } from "@/components/events/status-badge";
import { formatDate, formatDateTimeStamp, formatTime } from "@/lib/utils";
import { registrationStatus } from "@/server/services/registrations.service";
import type { RegistrationRecord } from "@/types";

export function RegistrationTable({
  registrations,
}: {
  registrations: RegistrationRecord[];
}) {
  return (
    <>
      <Card className="hidden py-0 md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Venue</TableHead>
              <TableHead>Registered on</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrations.map((r) => (
              <TableRow key={r.registration_id}>
                <TableCell className="max-w-56 font-medium">
                  <Link
                    className="hover:underline"
                    href={`/events/${r.event.id}`}
                  >
                    {r.event.title}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatDate(r.event.event_date)}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatTime(r.event.event_time)}
                </TableCell>
                <TableCell className="max-w-48 truncate">
                  {r.event.venue}
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatDateTimeStamp(r.registered_at)}
                </TableCell>
                <TableCell>
                  <RegistrationStatusBadge
                    status={registrationStatus(r.event)}
                  />
                </TableCell>
                <TableCell className="text-right">
                  {registrationStatus(r.event) === "CONFIRMED" && (
                    <Button size="sm" variant="ghost" asChild>
                      <a
                        href={`/api/events/${r.event.id}/calendar`}
                        aria-label={`Add ${r.event.title} to calendar`}
                      >
                        <CalendarPlus /> .ics
                      </a>
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <ul className="space-y-3 md:hidden">
        {registrations.map((r) => (
          <li key={r.registration_id}>
            <Card size="sm" className="gap-3">
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/events/${r.event.id}`}
                  className="font-semibold leading-snug hover:underline"
                >
                  {r.event.title}
                </Link>
                <RegistrationStatusBadge status={registrationStatus(r.event)} />
              </div>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CalendarDays className="size-4" aria-hidden />
                  {formatDate(r.event.event_date)}
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="size-4" aria-hidden />
                  {formatTime(r.event.event_time)}
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">{r.event.venue}</span>
                </li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Registered {formatDateTimeStamp(r.registered_at)}
              </p>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
