import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";
import { listUpcomingEvents } from "@/server/services/events.service";
import { HeroCapacityCard } from "@/components/home/hero-capacity-card";
import { ValueStrip } from "@/components/home/value-strip";
import { EventDiscovery } from "@/components/home/event-discovery";
import { FeaturesSection } from "@/components/home/features-section";
import { HowItWorks } from "@/components/home/how-it-works";
import { FinalCta } from "@/components/home/final-cta";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getSessionUser();
  const { events } = await listUpcomingEvents({
    when: "any",
    availability: "any",
    page: 1,
  }).catch(() => ({ events: [] }));

  const heroEvents = events.slice(0, 3);
  const discoveryEvents = events.slice(0, 6);

  const secondaryCtaHref =
    user?.role === "ORGANIZER"
      ? "/organizer/events/new"
      : user?.role === "ATTENDEE"
        ? "/my-registrations"
        : "/signup";

  const secondaryCtaLabel =
    user?.role === "ATTENDEE" ? "My registrations" : "Create an event";

  return (
    <div className="space-y-16 sm:space-y-24 pb-8">
      {/* 2. HERO SECTION */}
      <section className="grid items-center gap-10 py-6 sm:py-12 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <div className="space-y-6">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-accent/50 px-3.5 py-1.5 text-xs sm:text-sm font-semibold uppercase tracking-wider text-primary shadow-2xs">
            <Sparkles className="size-4" aria-hidden />
            <span>Events, without the spreadsheets</span>
          </div>

          {/* Large Headline */}
          <h1 className="text-balance text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.06]">
            Every seat accounted for.{" "}
            <span className="block text-primary">Every guest on the list.</span>
          </h1>

          {/* Supporting Text */}
          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl lg:text-2xl">
            Evently makes it simple to publish events, manage capacity, and let
            attendees reserve their place without overbooking.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              size="lg"
              asChild
              className="h-12 px-6 text-base font-semibold gap-2 shadow-sm transition-all duration-150 hover:shadow-md"
            >
              <Link href="/events">
                <span>Browse events</span>
                <ArrowRight className="size-4.5" />
              </Link>
            </Button>

            <Button
              size="lg"
              variant="outline"
              asChild
              className="h-12 px-6 text-base font-medium shadow-2xs"
            >
              <Link href={secondaryCtaHref}>{secondaryCtaLabel}</Link>
            </Button>
          </div>
        </div>

        {/* Live event capacity dashboard card */}
        <div className="w-full">
          <HeroCapacityCard events={heroEvents} />
        </div>
      </section>

      {/* 3. TRUST / VALUE STRIP */}
      <ValueStrip />

      {/* 4. UPCOMING EVENTS SECTION */}
      <EventDiscovery events={discoveryEvents} />

      {/* 5. FEATURE SECTION */}
      <FeaturesSection />

      {/* 6. HOW IT WORKS */}
      <HowItWorks />

      {/* 7. FINAL CTA */}
      <FinalCta user={user} />
    </div>
  );
}
