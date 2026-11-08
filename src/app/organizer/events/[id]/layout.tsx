import { requirePageUser } from "@/lib/auth/guards";
import { loadOwnedEvent } from "@/server/page-data";

export default async function OwnedEventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const user = await requirePageUser("ORGANIZER");
  await loadOwnedEvent((await params).id, user); // 404 if missing, 403 if it belongs to someone else
  return children;
}
