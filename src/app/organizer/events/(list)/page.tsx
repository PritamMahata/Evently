import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, Plus } from "lucide-react";
import { requirePageUser } from "@/lib/auth/guards";
import { listOrganizerEvents } from "@/server/services/events.service";
import { OrganizerEventsList } from "@/components/organizer/organizer-events-list";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "My events" };
export const dynamic = "force-dynamic";

export default async function OrganizerEventsPage() {
  const user = await requirePageUser("ORGANIZER");
  const events = await listOrganizerEvents(user);
  return (
    <>
      <PageHeader
        title="My events"
        description="Events you’ve created. Only you can see and manage them."
        actions={
          <Button asChild>
            <Link href="/organizer/events/new">
              <Plus /> New event
            </Link>
          </Button>
        }
      />
      {events.length === 0 ? (
        <EmptyState
          icon={CalendarPlus}
          title="You haven't created any events yet."
          description="Create an event and share it so people can register."
          action={
            <Button asChild>
              <Link href="/organizer/events/new">Create an event</Link>
            </Button>
          }
        />
      ) : (
        <OrganizerEventsList events={events} />
      )}
    </>
  );
}
