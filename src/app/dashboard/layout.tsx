import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { requirePageUser } from "@/lib/auth/guards";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if ((await getSessionUser())?.role === "ORGANIZER") redirect("/organizer");
  await requirePageUser("ATTENDEE");
  return children;
}
