import { NextResponse, type NextRequest } from "next/server";

/** Forwards the request path so server-side guards can redirect to /login?next=<path>. No auth decisions are made here. */
export function middleware(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"] };
