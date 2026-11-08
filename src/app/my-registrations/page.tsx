import type { Metadata } from "next";
import Link from "next/link";
import { Ticket } from "lucide-react";
import { requirePageUser } from "@/lib/auth/guards";
import { listMyRegistrations } from "@/server/services/registrations.service";
import { RegistrationTable } from "@/components/dashboard/registration-list";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "My registrations" };
export const dynamic = "force-dynamic";

export default async function MyRegistrationsPage() {
  const user = await requirePageUser("ATTENDEE");
  const registrations = await listMyRegistrations(user);
  return (
    <>
      <PageHeader
        title="My registrations"
        description="Every event you’ve reserved a seat for."
      />
      {registrations.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="You haven't registered for any events yet."
          description="Find an event you like and reserve your seat."
          action={
            <Button>
              <Link href="/events">Browse events</Link>
            </Button>
          }
        />
      ) : (
        <RegistrationTable registrations={registrations} />
      )}
    </>
  );
}
