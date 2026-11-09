import Link from "next/link";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import type { EventRecord } from "@/types";
import { formatDate, formatTime, seatsRemaining, cn } from "@/lib/utils";

const DEMO_PREVIEW_EVENTS: EventRecord[] = [
  {
    id: "demo-1",
    organizer_id: "org-1",
    organizer_name: "Evently Community",
    title: "Startup Networking Night",
    description: "Connect with founders, investors, and operators.",
    event_date: "2026-11-13",
    event_time: "19:00",
    venue: "The Foundry Café",
    seat_limit: 80,
    status: "ACTIVE",
    registered_count: 3,
    is_past: false,
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: "demo-2",
    organizer_id: "org-1",
    organizer_name: "Evently Community",
    title: "React & Next.js Developer Meetup",
    description: "Deep dive into App Router, Server Actions, and React 19.",
    event_date: "2026-11-15",
    event_time: "18:30",
    venue: "Lantern Hall, Riverside",
    seat_limit: 60,
    status: "ACTIVE",
    registered_count: 6,
    is_past: false,
    created_at: new Date(),
    updated_at: new Date(),
  },
  {
    id: "demo-3",
    organizer_id: "org-1",
    organizer_name: "Evently Community",
    title: "Design Systems Roundtable",
    description: "Scaling components, tokens, and multi-brand theming.",
    event_date: "2026-11-17",
    event_time: "17:30",
    venue: "Studio Nine",
    seat_limit: 5,
    status: "ACTIVE",
    registered_count: 5,
    is_past: false,
    created_at: new Date(),
    updated_at: new Date(),
  },
];

export function HeroCapacityCard({ events }: { events: EventRecord[] }) {
  const baseEvents = events && events.length > 0 ? events : DEMO_PREVIEW_EVENTS;

  // Build a seamless infinite loop track with at least 8 items
  let track = baseEvents;
  while (track.length < 8) {
    track = [...track, ...baseEvents];
  }
  const marqueeItems = [...track, ...track];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-6 shadow-md backdrop-blur-sm sm:p-7">
      {/* Top Header Label */}
      <div className="flex items-center justify-between pb-4 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
            Live Capacity
          </span>
        </div>
        <span className="text-xs sm:text-sm font-medium text-muted-foreground">
          Real-time database sync
        </span>
      </div>

      {/* Infinite Scrolling Marquee Track with Left and Right Shadows */}
      <div className="relative my-5 -mx-6 sm:-mx-7 overflow-hidden py-1">
        {/* Left Shadow / Gradient Fade */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 bottom-0 z-20 w-12 sm:w-20 bg-gradient-to-r from-card via-card/90 to-transparent"
        />

        {/* Right Shadow / Gradient Fade */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 bottom-0 z-20 w-12 sm:w-20 bg-gradient-to-l from-card via-card/90 to-transparent"
        />

        {/* Marquee Row */}
        <div className="flex animate-marquee gap-4 px-6 sm:px-7">
          {marqueeItems.map((event, index) => {
            const left = seatsRemaining(event);
            const isFull = left === 0;
            const pct = Math.min(
              100,
              Math.round((event.registered_count / event.seat_limit) * 100),
            );

            let statusText = "Available";
            let badgeClass =
              "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
            let barClass = "bg-primary";

            if (isFull) {
              statusText = "Full";
              badgeClass =
                "border-destructive/20 bg-destructive/10 text-destructive";
              barClass = "bg-destructive";
            } else if (left <= 5 || pct >= 80) {
              statusText = "Almost full";
              badgeClass =
                "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300";
              barClass = "bg-amber-500 dark:bg-amber-400";
            }

            return (
              <Link
                key={`${event.id}-${index}`}
                href={
                  event.id.startsWith("demo-") ? "/events" : `/events/${event.id}`
                }
                className="group block w-[280px] sm:w-[320px] shrink-0 rounded-xl border border-border/80 bg-background/60 p-4.5 transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:bg-card hover:shadow-md"
              >
                {/* Event Title & Status Badge */}
                <div className="flex items-start justify-between gap-2.5">
                  <h3 className="truncate text-base font-bold text-foreground transition-colors group-hover:text-primary">
                    {event.title}
                  </h3>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-none",
                      badgeClass,
                    )}
                  >
                    {statusText}
                  </span>
                </div>

                {/* Event Time & Venue Details */}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 font-medium">
                    <CalendarDays className="size-3.5 opacity-70" />
                    {formatDate(event.event_date, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <Clock className="size-3.5 opacity-70" />
                    {formatTime(event.event_time)}
                  </span>
                  {event.venue && (
                    <span className="flex items-center gap-1 truncate max-w-[120px]">
                      <MapPin className="size-3.5 opacity-70 shrink-0" />
                      <span className="truncate">{event.venue}</span>
                    </span>
                  )}
                </div>

                {/* Capacity Progress Bar & Numbers */}
                <div className="mt-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-bold text-foreground">
                      {event.registered_count}{" "}
                      <span className="text-muted-foreground font-normal">
                        / {event.seat_limit} seats
                      </span>
                    </span>
                    <span
                      className={cn(
                        "font-semibold",
                        isFull
                          ? "text-destructive font-bold"
                          : left <= 5
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-muted-foreground",
                      )}
                    >
                      {isFull ? "No seats left" : `${left} remaining`}
                    </span>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500 ease-out",
                        barClass,
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3.5 border-t border-border/50 flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
        <span>Updated on every reservation</span>
        <Link
          href="/events"
          className="font-semibold text-primary hover:underline inline-flex items-center gap-1"
        >
          View all events →
        </Link>
      </div>
    </div>
  );
}
