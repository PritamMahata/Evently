import { NextResponse, type NextRequest } from "next/server";
import { AppError } from "@/lib/errors";
import { getEnv } from "@/lib/env";

/** CSRF defence: cookies are SameSite=Lax; additionally require same-origin for state-changing requests. */
export function assertSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin) {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    let originHost = "";
    try {
      originHost = new URL(origin).host;
    } catch {
      /* invalid origin falls through to rejection */
    }
    const allowed = new Set([host, getEnv().appUrl ? new URL(getEnv().appUrl).host : null]);
    if (!originHost || !allowed.has(originHost)) throw new AppError("FORBIDDEN", "Cross-site request blocked.");
    return;
  }
  if (req.headers.get("sec-fetch-site") === "cross-site") throw new AppError("FORBIDDEN", "Cross-site request blocked.");
}

export { parseWith } from "@/lib/validation/parse";

export async function readJson(req: NextRequest): Promise<unknown> {
  if (!req.headers.get("content-type")?.includes("application/json"))
    throw new AppError("BAD_REQUEST", "Content-Type must be application/json.");
  try {
    return await req.json();
  } catch {
    throw new AppError("BAD_REQUEST", "Request body must be valid JSON.");
  }
}

export function errorResponse(err: unknown) {
  if (err instanceof AppError)
    return NextResponse.json({ error: { code: err.code, message: err.message, fields: err.fields } }, { status: err.status });
  console.error("[api] unexpected error:", err);
  return NextResponse.json({ error: { code: "INTERNAL", message: "Something went wrong. Please try again." } }, { status: 500 });
}

/** Wraps a handler: CSRF check for mutations, uniform JSON error responses. */
export function route<C = unknown>(handler: (req: NextRequest, ctx: C) => Promise<Response>, opts: { mutation?: boolean } = {}) {
  return async (req: NextRequest, ctx: C) => {
    try {
      if (opts.mutation) assertSameOrigin(req);
      return await handler(req, ctx);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export type IdCtx = { params: Promise<{ id: string }> };
