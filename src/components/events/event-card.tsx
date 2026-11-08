import Link from "next/link";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate, formatTime } from "@/lib/utils";
import type { EventRecord } from "@/types";
import { SeatMeter } from "./seat-meter";
import { EventStatusBadge } from "./status-badge";

export function EventCard({ event }: { event: EventRecord }) {
  return (
    <Card className="group relative flex h-full flex-col justify-between transition-all duration-200 hover:shadow-lg hover:ring-foreground/10 focus-within:ring-[3px] focus-within:ring-ring/40">
      <CardHeader>
        <CardTitle className="text-lg font-semibold tracking-tight">
          <Link
            href={`/events/${event.id}`}
            className="outline-none after:absolute after:inset-0 after:content-['']"
          >
            {event.title}
          </Link>
        </CardTitle>
        <CardAction>
          <EventStatusBadge event={event} />
        </CardAction>
        <CardDescription className="line-clamp-2 text-sm">
          {event.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <CalendarDays
              className="size-4 shrink-0 text-foreground/70"
              aria-hidden
            />
            <span>{formatDate(event.event_date)}</span>
          </li>
          <li className="flex items-center gap-2">
            <Clock className="size-4 shrink-0 text-foreground/70" aria-hidden />
            <span>{formatTime(event.event_time)}</span>
          </li>
          <li className="flex items-center gap-2">
            <MapPin
              className="size-4 shrink-0 text-foreground/70"
              aria-hidden
            />
            <span className="truncate">{event.venue}</span>
          </li>
        </ul>
      </CardContent>
      <CardFooter className="mt-auto block ">
        <SeatMeter event={event} />
      </CardFooter>
    </Card>
  );
}
