import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { getSessionUser } from "./session";
import type { Role, SessionUser } from "@/types";

export const homeFor = (role: Role) =>
  role === "ORGANIZER" ? "/organizer" : "/dashboard";

/**
 * Server Component / layout guard: anonymous -> redirect to /login?next=<path>,
 * wrong role -> real HTTP 403 page. Used in layouts so the status is sent before streaming starts.
 */
export async function requirePageUser(role?: Role): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    const path = (await headers()).get("x-pathname");
    redirect(`/login${path ? `?next=${encodeURIComponent(path)}` : ""}`);
  }
  if (role && user.role !== role) forbidden();
  return user;
}
