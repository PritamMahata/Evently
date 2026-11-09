import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ViewportFadeIn } from "@/components/motion/motion-components";
import type { SessionUser } from "@/types";

export function FinalCta({ user }: { user: SessionUser | null }) {
  const isOrganizer = user?.role === "ORGANIZER";
  const isAttendee = user?.role === "ATTENDEE";

  const href = isOrganizer
    ? "/organizer/events/new"
    : isAttendee
    ? "/events"
    : "/signup";

  const buttonText = isOrganizer
    ? "Create an event"
    : isAttendee
    ? "Browse upcoming events"
    : "Create an event";

  const description = isOrganizer
    ? "Ready to publish your next event? Set your capacity limit and start accepting reservations in seconds."
    : isAttendee
    ? "Explore upcoming tech talks, networking mixers, and conferences with live seat availability."
    : "Create an organizer account and start accepting registrations without spreadsheet headaches.";

  return (
    <ViewportFadeIn>
      <section
        aria-label="Call to action"
        className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-8 shadow-sm sm:p-12"
      >
        <div className="relative z-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="max-w-xl space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-primary">
              <Sparkles className="size-4" />
              <span>Get Started</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Hosting something?
            </h2>
            <p className="text-base sm:text-lg leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <Button
              size="lg"
              asChild
              className="h-12 px-6 text-base font-semibold gap-2 shadow-md transition-all duration-200 hover:shadow-lg"
            >
              <Link href={href}>
                <span>{buttonText}</span>
                <ArrowRight className="size-4.5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </ViewportFadeIn>
  );
}
