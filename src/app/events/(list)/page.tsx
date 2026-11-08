import type { Metadata } from "next";
import Link from "next/link";
import { CalendarX, Search } from "lucide-react";
import { eventFiltersSchema } from "@/lib/validation/schemas";
import { listUpcomingEvents } from "@/server/services/events.service";
import { EventCard } from "@/components/events/event-card";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = { title: "Upcoming events" };
export const dynamic = "force-dynamic";

const selectClass =
  "h-10 w-full rounded-md border border-input bg-card px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const raw = await searchParams;
  const parsed = eventFiltersSchema.safeParse(raw);
  const filters = parsed.success ? parsed.data : eventFiltersSchema.parse({});
  const { events, total, page, pageSize } = await listUpcomingEvents(filters);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const filtered =
    !!filters.q || filters.when !== "any" || filters.availability !== "any";
  const link = (p: number) => {
    const sp = new URLSearchParams();
    if (filters.q) sp.set("q", filters.q);
    if (filters.when !== "any") sp.set("when", filters.when);
    if (filters.availability !== "any")
      sp.set("availability", filters.availability);
    if (p > 1) sp.set("page", String(p));
    return `/events${sp.size ? `?${sp}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Upcoming events"
        description="Find something to attend. Seat counts update live."
      />
      <form
        method="get"
        action="/events"
        role="search"
        className="mb-8 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[1fr_12rem_12rem_auto] lg:items-end"
      >
        <div className="grid gap-1.5 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="q">Search</Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="q"
              name="q"
              defaultValue={filters.q}
              placeholder="Title, venue or keyword"
              className="pl-9"
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="when">When</Label>
          <select
            id="when"
            name="when"
            defaultValue={filters.when}
            className={selectClass}
          >
            <option value="any">Any date</option>
            <option value="today">Today</option>
            <option value="week">Next 7 days</option>
            <option value="month">Next 30 days</option>
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="availability">Availability</Label>
          <select
            id="availability"
            name="availability"
            defaultValue={filters.availability}
            className={selectClass}
          >
            <option value="any">All events</option>
            <option value="available">Seats available</option>
          </select>
        </div>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
          <Button type="submit" className="flex-1 lg:flex-none">
            Apply
          </Button>
          {filtered && (
            <Button variant="ghost" asChild>
              <Link href="/events">Reset</Link>
            </Button>
          )}
        </div>
      </form>

      {events.length === 0 ? (
        <EmptyState
          icon={CalendarX}
          title={
            filtered ? "No events match your search" : "No upcoming events yet."
          }
          description={
            filtered
              ? "Try a different keyword or clear the filters."
              : "Check back soon — new events appear here as soon as organizers publish them."
          }
          action={
            filtered ? (
              <Button variant="outline" asChild>
                <Link href="/events">Clear filters</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
            {total} {total === 1 ? "event" : "events"}
          </p>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => (
              <li key={e.id}>
                <EventCard event={e} />
              </li>
            ))}
          </ul>
          {pages > 1 && (
            <nav
              aria-label="Pagination"
              className="mt-8 flex items-center justify-between"
            >
              <Button variant="outline" asChild={page > 1} disabled={page <= 1}>
                {page > 1 ? (
                  <Link href={link(page - 1)}>Previous</Link>
                ) : (
                  <span>Previous</span>
                )}
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {pages}
              </span>
              <Button
                variant="outline"
                asChild={page < pages}
                disabled={page >= pages}
              >
                {page < pages ? (
                  <Link href={link(page + 1)}>Next</Link>
                ) : (
                  <span>Next</span>
                )}
              </Button>
            </nav>
          )}
        </>
      )}
    </>
  );
}
