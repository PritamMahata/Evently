import { requirePageUser } from "@/lib/auth/guards";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageUser("ATTENDEE");
  return children;
}
