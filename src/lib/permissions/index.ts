import { AppError } from "@/lib/errors";
import type { Role, SessionUser } from "@/types";

/** Throws 401 when nobody is logged in, 403 when the role is wrong. */
export function requireRole(user: SessionUser | null, role: Role): SessionUser {
  if (!user) throw new AppError("UNAUTHORIZED", "Please log in to continue.");
  if (user.role !== role)
    throw new AppError(
      "FORBIDDEN",
      role === "ORGANIZER"
        ? "Only organizers can do this."
        : "Only attendees can do this.",
    );
  return user;
}

export function requireUser(user: SessionUser | null): SessionUser {
  if (!user) throw new AppError("UNAUTHORIZED", "Please log in to continue.");
  return user;
}

/** Ownership check — the organizer id always comes from the server session, never from the client. */
export function assertOwner(ownerId: string, user: SessionUser) {
  if (ownerId !== user.id)
    throw new AppError("FORBIDDEN", "You don't have access to this event.");
}
