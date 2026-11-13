import type { ZodError, ZodType } from "zod";
import { AppError } from "@/lib/errors";

export function fieldErrors(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Validates untrusted input, throwing an AppError with per-field messages. */
export function parseWith<T>(schema: ZodType<T>, data: unknown): T {
  const res = schema.safeParse(data);
  if (!res.success)
    throw new AppError(
      "VALIDATION_ERROR",
      "Please check the highlighted fields.",
      fieldErrors(res.error),
    );
  return res.data;
}
