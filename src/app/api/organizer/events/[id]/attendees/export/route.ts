import { route, type IdCtx } from "@/lib/http";
import { attendeesCsv } from "@/server/services/events.service";
import { getSessionUser } from "@/lib/auth/session";

export const GET = route<IdCtx>(async (_req, { params }) => {
  const { filename, csv } = await attendeesCsv(
    await getSessionUser(),
    (await params).id,
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
