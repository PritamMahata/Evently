import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarSearch, Ticket } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { requirePageUser } from "@/lib/auth/guards";
import {
  listMyRegistrations,
  registrationStatus,
} from "@/server/services/registrations.service";
import { RegistrationTable } from "@/components/dashboard/registration-list";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const current = await getSessionUser();
  if (current?.role === "ORGANIZER") redirect("/organizer");
  const user = await requirePageUser("ATTENDEE");
  const all = await listMyRegistrations(user);
  const upcoming = all.filter(
    (r) => registrationStatus(r.event) === "CONFIRMED",
  );
  return (
    <>
      <PageHeader
        title={`Hi, ${user.name.split(" ")[0]}`}
        description="Here’s what’s coming up for you."
        actions={
          <>
            <Button asChild>
              <Link href="/events">
                <CalendarSearch /> Browse events
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/my-registrations">All registrations</Link>
            </Button>
          </>
        }
      />
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Upcoming registrations</CardDescription>
            <CardTitle className="text-3xl">{upcoming.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total registrations</CardDescription>
            <CardTitle className="text-3xl">{all.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>
      <h2 className="mb-4 text-xl font-semibold">Upcoming events</h2>
      {upcoming.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="You haven't registered for any events yet."
          description="Browse upcoming events and reserve a seat."
          action={
            <Button asChild>
              <Link href="/events">Browse events</Link>
            </Button>
          }
        />
      ) : (
        <RegistrationTable registrations={upcoming} />
      )}
      <Card className="mt-8">
        <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Quick links</span>
          <span>
            <Link className="text-primary hover:underline" href="/events">
              Browse all events
            </Link>{" "}
            ·{" "}
            <Link
              className="text-primary hover:underline"
              href="/my-registrations"
            >
              My registrations
            </Link>
          </span>
        </CardContent>
      </Card>
    </>
  );
}
