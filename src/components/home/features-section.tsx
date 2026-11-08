import { CalendarCheck2, ShieldCheck, TicketCheck } from "lucide-react";

export function FeaturesSection() {
  const features = [
    {
      icon: CalendarCheck2,
      badge: "For Organizers",
      title: "Publish in minutes",
      description:
        "Create, edit, and manage your events from one place. Update event venues, edit dates, or cancel with automatic attendee preservation.",
    },
    {
      icon: TicketCheck,
      badge: "For Attendees",
      title: "Reserve with confidence",
      description:
        "Attendees can register once and always see their current registrations, calendar exports, and instant booking confirmations.",
    },
    {
      icon: ShieldCheck,
      badge: "Rock-Solid Capacity",
      title: "Capacity stays accurate",
      description:
        "Database-enforced seat limits prevent overbooking, even when multiple users register at the same exact millisecond.",
    },
  ];

  return (
    <section aria-labelledby="features-heading" className="space-y-8">
      <div className="text-center max-w-2xl mx-auto space-y-2.5">
        <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-primary">
          Core Capabilities
        </span>
        <h2
          id="features-heading"
          className="text-3xl font-extrabold tracking-tight sm:text-4xl"
        >
          Everything you need to run a simple event.
        </h2>
        <p className="text-base sm:text-lg text-muted-foreground">
          Built from the ground up to eliminate spreadsheets, manual headcounts, and registration chaos.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-7 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
            >
              <div className="space-y-4.5">
                <div className="flex items-center justify-between">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground dark:bg-primary/20">
                    <Icon className="size-6" aria-hidden />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-md">
                    {feature.badge}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm sm:text-base leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
