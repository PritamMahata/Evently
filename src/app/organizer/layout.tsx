import { requirePageUser } from "@/lib/auth/guards";

export default async function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageUser("ORGANIZER");
  return children;
}
