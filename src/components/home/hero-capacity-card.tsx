import Link from "next/link";
import { ArrowUpRight, CalendarDays, Clock, MapPin } from "lucide-react";
import type { EventRecord } from "@/types";
import { formatDate, formatTime, seatsRemaining, cn } from "@/lib/utils";

export function HeroCapacityCard({ events }: { events: EventRecord[] }) {
  return (
    <div className="relative rounded-2xl border border-border/80 bg-card/80 p-6 shadow-sm backdrop-blur-sm sm:p-7">
      {/* Top Header Label */}
      <div className="flex items-center justify-between pb-4 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
          </span>
          <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Live Capacity
          </span>
        </div>
        <span className="text-sm font-medium text-muted-foreground">
          Real-time database sync
        </span>
      </div>

      {/* Events List */}
      <div className="mt-5 space-y-3.5">
        {events.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 p-8 text-center text-muted-foreground">
            <p className="text-base font-semibold text-foreground">
              No events scheduled yet
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Events created by organizers will automatically show here with
              live seat tracking.
            </p>
          </div>
        ) : (
          events.map((event) => {
            const left = seatsRemaining(event);
            const pct = Math.min(
              100,
              Math.round((event.registered_count / event.seat_limit) * 100),
            );

            let statusText = "Available";
            let badgeClass =
              "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-500/20";
            let barClass = "bg-primary";

            if (left === 0) {
              statusText = "Full";
              badgeClass =
                "bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive border-destructive/20";
              barClass = "bg-destructive";
            } else if (left <= 5 || pct >= 80) {
              statusText = "Almost full";
              badgeClass =
                "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-amber-500/20";
              barClass = "bg-amber-500 dark:bg-amber-400";
            }

            return (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="group block rounded-xl border border-border/70 bg-background/50 p-4.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                      {event.title}
                    </h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5 font-medium">
                        <CalendarDays className="size-4 opacity-75" />
                        {formatDate(event.event_date, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="flex items-center gap-1.5 font-medium">
                        <Clock className="size-4 opacity-75" />
                        {formatTime(event.event_time)}
                      </span>
                      {event.venue && (
                        <span className="flex items-center gap-1.5 truncate">
                          <MapPin className="size-4 opacity-75" />
                          <span className="truncate max-w-[140px]">
                            {event.venue}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs sm:text-sm font-semibold leading-none",
                        badgeClass,
                      )}
                    >
                      {statusText}
                    </span>
                    <ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </div>

                {/* Capacity Progress Bar & Numbers */}
                <div className="mt-3.5 space-y-2">
                  <div className="flex items-center justify-between text-sm sm:text-base">
                    <span className="font-bold text-foreground">
                      {event.registered_count}{" "}
                      <span className="text-muted-foreground font-normal">
                        / {event.seat_limit} seats
                      </span>
                    </span>
                    <span
                      className={cn(
                        "font-semibold",
                        left === 0
                          ? "text-destructive"
                          : left <= 5
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-muted-foreground",
                      )}
                    >
                      {left === 0 ? "No seats left" : `${left} remaining`}
                    </span>
                  </div>

                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
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
          })
        )}
      </div>

      <div className="mt-5 pt-3.5 border-t border-border/50 flex items-center justify-between text-sm text-muted-foreground">
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
