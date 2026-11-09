import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Search } from "lucide-react";
import type { EventRecord } from "@/types";
import { formatDate, formatTime, seatsRemaining, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function EventDiscovery({ events }: { events: EventRecord[] }) {
  return (
    <section aria-labelledby="discover-heading" className="space-y-7">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div className="space-y-1.5">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-primary">
            Event Discovery
          </span>
          <h2
            id="discover-heading"
            className="text-3xl font-extrabold tracking-tight sm:text-4xl"
          >
            Find your next event
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground">
            Browse upcoming events and reserve your seat before they&apos;re gone.
          </p>
        </div>

        <Link
          href="/events"
          className="group inline-flex items-center gap-2 text-base font-semibold text-primary hover:underline"
        >
          <span>View all events</span>
          <ArrowRight className="size-4.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Search & Quick Filters */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/60 p-3 sm:flex-row sm:items-center sm:justify-between">
        <form
          method="get"
          action="/events"
          role="search"
          className="relative flex-1"
        >
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            placeholder="Search by event title, venue, or keyword…"
            className="h-11 pl-10 pr-24 text-base shadow-none"
          />
          <Button
            type="submit"
            size="sm"
            className="absolute right-1.5 top-1.5 h-8 px-4 shadow-none text-sm font-semibold"
          >
            Search
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-9 text-sm font-medium px-3.5 shadow-2xs"
          >
            <Link href="/events?when=week">This week</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-9 text-sm font-medium px-3.5 shadow-2xs"
          >
            <Link href="/events?when=month">This month</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-9 text-sm font-medium px-3.5 shadow-2xs"
          >
            <Link href="/events?availability=available">Seats open</Link>
          </Button>
        </div>
      </div>

      {/* Event Cards Grid */}
      {events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center">
          <CalendarDays className="mx-auto size-12 text-muted-foreground/60" />
          <h3 className="mt-3.5 text-lg font-bold text-foreground">
            No upcoming events yet
          </h3>
          <p className="mt-1 text-base text-muted-foreground">
            Check back later or browse our past event archives.
          </p>
          <Button variant="outline" asChild className="mt-5 shadow-xs">
            <Link href="/events">Explore events directory</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => {
            const left = seatsRemaining(event);
            const isFull = left === 0;
            const pct = Math.min(
              100,
              Math.round((event.registered_count / event.seat_limit) * 100)
            );

            const month = formatDate(event.event_date, {
              month: "short",
            }).toUpperCase();
            const day = formatDate(event.event_date, { day: "numeric" });
            const time = formatTime(event.event_time);

            return (
              <div
                key={event.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border/80 bg-card shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
              >
                {event.banner_url && (
                  <div className="relative aspect-[16/9] w-full overflow-hidden border-b bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={event.banner_url}
                      alt={event.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="flex flex-1 flex-col justify-between p-5.5">
                  <div>
                    {/* Card Header: Date pill and status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center justify-center rounded-lg border border-border/80 bg-muted/50 px-3 py-1.5 text-center font-mono">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary">
                          {month}
                        </span>
                        <span className="text-lg font-black leading-none text-foreground mt-0.5">
                          {day}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-foreground block">{time}</span>
                        {event.venue && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground truncate max-w-[150px] mt-0.5">
                            <MapPin className="size-3.5 shrink-0 opacity-60" />
                            <span className="truncate">{event.venue}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-semibold",
                        isFull
                          ? "border-destructive/20 bg-destructive/10 text-destructive"
                          : left <= 5
                          ? "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                          : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      )}
                    >
                      {isFull ? "Full" : `${left} seats left`}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="mt-4.5">
                    <h3 className="line-clamp-2 text-lg sm:text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                      <Link href={`/events/${event.id}`} className="focus:outline-none">
                        {event.title}
                      </Link>
                    </h3>
                    {event.description && (
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer: Capacity Bar and CTA button */}
                <div className="mt-6 space-y-3 pt-3.5 border-t border-border/50">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs sm:text-sm text-muted-foreground font-medium">
                      <span>Capacity</span>
                      <span className="font-semibold text-foreground">
                        {event.registered_count} / {event.seat_limit}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          isFull
                            ? "bg-destructive"
                            : pct >= 80
                            ? "bg-amber-500"
                            : "bg-primary"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {isFull ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      className="w-full h-10 text-sm font-semibold opacity-60"
                    >
                      Event is full
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      asChild
                      className="w-full h-10 text-sm font-semibold shadow-2xs group-hover:bg-primary/95"
                    >
                      <Link href={`/events/${event.id}`}>
                        <span>View event</span>
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
          })}
        </div>
      )}
    </section>
  );
}
