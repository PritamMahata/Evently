import { loadEvent } from "@/server/page-data";

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  await loadEvent((await params).id); // real 404 status for unknown ids
  return children;
}
