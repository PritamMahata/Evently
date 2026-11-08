import { route, type IdCtx } from "@/lib/http";
import { registrationIcs } from "@/server/services/registrations.service";
import { getSessionUser } from "@/lib/auth/session";

export const GET = route<IdCtx>(async (_req, { params }) => {
  const { filename, body } = await registrationIcs(
    await getSessionUser(),
    (await params).id,
  );
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
