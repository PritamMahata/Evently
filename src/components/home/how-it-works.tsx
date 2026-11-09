import { Calendar, Share2, UserCheck } from "lucide-react";
import { FloatingHeading } from "@/components/ui/scroll-float";
import { InteractiveCard, ViewportFadeIn } from "@/components/motion/motion-components";

export function HowItWorks() {
  const steps = [
    {
      step: "01",
      action: "Create",
      icon: Calendar,
      text: "Publish your event with a date, venue, and seat limit.",
    },
    {
      step: "02",
      action: "Share",
      icon: Share2,
      text: "Let attendees discover your event and view available capacity.",
    },
    {
      step: "03",
      action: "Reserve",
      icon: UserCheck,
      text: "Attendees register and instantly receive their place.",
    },
  ];

  return (
    <section aria-labelledby="how-it-works-heading" className="space-y-8">
      <ViewportFadeIn className="text-center max-w-2xl mx-auto space-y-2.5">
        <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-primary">
          Simple Workflow
        </span>
        <h2 id="how-it-works-heading">
          <FloatingHeading className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
            How it works
          </FloatingHeading>
        </h2>
        <p className="text-base sm:text-lg text-muted-foreground">
          Three straightforward steps from initial announcement to a full room.
        </p>
      </ViewportFadeIn>

      <div className="grid gap-6 md:grid-cols-3">
        {steps.map((item, idx) => {
          const Icon = item.icon;
          return (
            <InteractiveCard
              key={item.step}
              delay={idx * 0.12}
              className="relative rounded-2xl border border-border/70 bg-gradient-to-b from-card to-card/60 p-7 shadow-2xs transition-all duration-200 hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-center justify-between mb-4.5">
                <span className="flex items-center gap-2 font-mono text-base sm:text-lg font-bold text-primary">
                  <span>{item.step}</span>
                  <span className="text-muted-foreground/60">—</span>
                  <span className="text-foreground font-bold">{item.action}</span>
                </span>
                <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Icon className="size-4.5" aria-hidden />
                </div>
              </div>
              <p className="text-base leading-relaxed text-muted-foreground">
                {item.text}
              </p>
              {idx < steps.length - 1 && (
                <div className="hidden lg:block absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 text-muted-foreground/40 font-bold text-lg">
                  →
                </div>
              )}
            </InteractiveCard>
          );
        })}
      </div>
    </section>
  );
}
