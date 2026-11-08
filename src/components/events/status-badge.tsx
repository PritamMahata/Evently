import { Ban, CalendarCheck, CheckCircle2, Clock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { EventRecord } from "@/types";
import type { RegistrationStatus } from "@/server/services/registrations.service";

export function EventStatusBadge({
  event,
}: {
  event: Pick<
    EventRecord,
    "status" | "is_past" | "seat_limit" | "registered_count"
  >;
}) {
  if (event.status === "CANCELLED")
    return (
      <Badge variant="destructive">
        <Ban aria-hidden />
        Cancelled
      </Badge>
    );
  if (event.is_past)
    return (
      <Badge variant="secondary">
        <Clock aria-hidden />
        Past
      </Badge>
    );
  if (event.registered_count >= event.seat_limit)
    return (
      <Badge variant="warning">
        <Users aria-hidden />
        Full
      </Badge>
    );
  return (
    <Badge variant="success">
      <CalendarCheck aria-hidden />
      Open
    </Badge>
  );
}

export function RegistrationStatusBadge({
  status,
}: {
  status: RegistrationStatus;
}) {
  if (status === "EVENT_CANCELLED")
    return (
      <Badge variant="destructive">
        <Ban aria-hidden />
        Event cancelled
      </Badge>
    );
  if (status === "COMPLETED")
    return (
      <Badge variant="secondary">
        <Clock aria-hidden />
        Completed
      </Badge>
    );
  return (
    <Badge variant="success">
      <CheckCircle2 aria-hidden />
      Confirmed
    </Badge>
  );
}
