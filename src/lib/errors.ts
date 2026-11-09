export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "EMAIL_TAKEN"
  | "INVALID_CREDENTIALS"
  | "RATE_LIMITED"
  | "ALREADY_REGISTERED"
  | "EVENT_FULL"
  | "EVENT_CANCELLED"
  | "EVENT_PAST"
  | "EVENT_DATE_IN_PAST"
  | "SEAT_LIMIT_BELOW_REGISTRATIONS"
  | "INVALID_TOKEN"
  | "TOKEN_EXPIRED"
  | "NOT_REGISTERED"
  | "CANCELLATION_DEADLINE_PASSED"
  | "BAD_REQUEST"
  | "INTERNAL";

const STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  EMAIL_TAKEN: 409,
  INVALID_CREDENTIALS: 401,
  RATE_LIMITED: 429,
  ALREADY_REGISTERED: 409,
  EVENT_FULL: 409,
  EVENT_CANCELLED: 409,
  EVENT_PAST: 409,
  EVENT_DATE_IN_PAST: 400,
  SEAT_LIMIT_BELOW_REGISTRATIONS: 409,
  INVALID_TOKEN: 400,
  TOKEN_EXPIRED: 400,
  NOT_REGISTERED: 400,
  CANCELLATION_DEADLINE_PASSED: 400,
  BAD_REQUEST: 400,
  INTERNAL: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fields?: Record<string, string>;

  constructor(code: ErrorCode, message: string, fields?: Record<string, string>) {
    super(message);
    this.code = code;
    this.status = STATUS[code];
    this.fields = fields;
  }
}

/** Translates PostgreSQL errors raised by constraints/triggers into friendly AppErrors. */
export function mapDbError(err: unknown): never {
  if (err instanceof AppError) throw err;
  const e = err as { code?: string; constraint?: string; message?: string };
  if (e.code === "23505" && e.constraint === "registrations_event_attendee_key")
    throw new AppError("ALREADY_REGISTERED", "You are already registered for this event.");
  if (e.code === "23505" && e.constraint === "users_email_lower_key")
    throw new AppError("EMAIL_TAKEN", "An account with this email already exists.", { email: "This email is already in use." });
  if (e.code === "P0004") throw new AppError("EVENT_FULL", "This event is full. No seats are left.");
  if (e.code === "P0003") throw new AppError("EVENT_CANCELLED", "This event has been cancelled.");
  if (e.code === "P0002") throw new AppError("NOT_FOUND", "Event not found.");
  if (e.code === "P0005")
    throw new AppError("SEAT_LIMIT_BELOW_REGISTRATIONS", "The seat limit can't be lower than the number of existing registrations.");
  throw err;
}
