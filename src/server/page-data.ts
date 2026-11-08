import { cache } from "react";
import { forbidden, notFound } from "next/navigation";
import { AppError } from "@/lib/errors";
import { assertOwner } from "@/lib/permissions";
import { getEvent } from "@/server/services/events.service";
import type { EventRecord, SessionUser } from "@/types";

/** Per-request cached event load for pages/layouts. Maps domain errors to Next's 404/403. */
export const loadEvent = cache(async (id: string): Promise<EventRecord> => {
  try {
    return await getEvent(id);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
});

export async function loadOwnedEvent(id: string, user: SessionUser): Promise<EventRecord> {
  const event = await loadEvent(id);
  try {
    assertOwner(event.organizer_id, user);
  } catch {
    forbidden();
  }
  return event;
}
