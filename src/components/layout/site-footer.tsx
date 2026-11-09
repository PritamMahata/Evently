import Link from "next/link";
import { Logo } from "./logo";

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-border/70 bg-card/40 backdrop-blur-xs">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-start">
          <div className="space-y-3.5 md:max-w-md">
            <Logo />
            <p className="text-base leading-relaxed text-muted-foreground">
              Simple event discovery, capacity management, and instant seat
              reservations without spreadsheets or accidental overbooking.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-14 gap-y-6 text-base">
            <div className="space-y-3.5">
              <h4 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Platform
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <Link
                    href="/events"
                    className="text-sm sm:text-base text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Browse events
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard"
                    className="text-sm sm:text-base text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Attendee dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    href="/my-registrations"
                    className="text-sm sm:text-base text-muted-foreground transition-colors hover:text-foreground"
                  >
                    My registrations
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-3.5">
              <h4 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Organizers
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <Link
                    href="/organizer"
                    className="text-sm sm:text-base text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Organizer overview
                  </Link>
                </li>
                <li>
                  <Link
                    href="/organizer/events"
                    className="text-sm sm:text-base text-muted-foreground transition-colors hover:text-foreground"
                  >
                    My events
                  </Link>
                </li>
                <li>
                  <Link
                    href="/organizer/events/new"
                    className="text-sm sm:text-base text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Create event
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 text-sm text-muted-foreground sm:flex-row">
          <p>© {currentYear} Evently. Every seat accounted for.</p>
        </div>
      </div>
    </footer>
  );
}
