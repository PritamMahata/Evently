import { cn, seatsRemaining } from "@/lib/utils";

/** Visual seat bar. `registered_count` always comes from the database. */
export function SeatMeter({
  event,
  className,
  showText = true,
}: {
  event: { seat_limit: number; registered_count: number };
  className?: string;
  showText?: boolean;
}) {
  const left = seatsRemaining(event);
  const pct = Math.min(
    100,
    Math.round((event.registered_count / event.seat_limit) * 100),
  );
  const tone =
    left === 0 ? "bg-destructive" : pct >= 80 ? "bg-warning" : "bg-primary";
  return (
    <div className={cn("space-y-1.5", className)}>
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={event.seat_limit}
        aria-valuenow={event.registered_count}
        aria-label={`${event.registered_count} of ${event.seat_limit} seats taken`}
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn("h-full rounded-full", tone)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showText && (
        <p className="flex justify-between text-xs text-muted-foreground">
          <span>
            {event.registered_count} / {event.seat_limit} registered
          </span>
          <span
            className={cn(
              "font-medium",
              left === 0
                ? "text-destructive"
                : left <= 5
                  ? "text-warning-foreground"
                  : "text-foreground",
            )}
          >
            {left === 0
              ? "Full"
              : `${left} ${left === 1 ? "seat" : "seats"} left`}
          </span>
        </p>
      )}
    </div>
  );
}
