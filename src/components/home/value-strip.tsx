import { CalendarPlus, ShieldCheck, Ticket } from "lucide-react";

export function ValueStrip() {
  const items = [
    {
      num: "01",
      icon: CalendarPlus,
      title: "Publish quickly",
      description:
        "Create an event with title, date, venue and seat capacity in under a minute.",
    },
    {
      num: "02",
      icon: Ticket,
      title: "Register instantly",
      description:
        "Attendees can reserve a seat with a single action and track all bookings.",
    },
    {
      num: "03",
      icon: ShieldCheck,
      title: "Never overbook",
      description:
        "Seat limits are strictly enforced server-side with atomic database constraints.",
    },
  ];

  return (
    <section
      aria-label="Value highlights"
      className="rounded-2xl border border-border/80 bg-card/60 p-6 shadow-2xs backdrop-blur-xs sm:p-8"
    >
      <div className="mb-6 flex flex-col items-start justify-between gap-3 border-b border-border/60 pb-5 sm:flex-row sm:items-center">
        <div>
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-primary">
            Platform Guarantee
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground mt-0.5">
            Built for simple event management
          </h2>
        </div>
        <span className="text-sm sm:text-base text-muted-foreground font-medium">
          Zero spreadsheet reconciliation needed
        </span>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.num}
              className="relative flex flex-col justify-between rounded-xl p-4 transition-colors hover:bg-accent/40"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
                    <Icon className="size-5.5" aria-hidden />
                  </div>
                  <span className="font-mono text-sm font-bold text-muted-foreground/70">
                    {item.num}
                  </span>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-sm sm:text-base leading-relaxed text-muted-foreground">
                    {item.description}
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
