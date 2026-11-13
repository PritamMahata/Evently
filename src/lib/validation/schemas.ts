import { z } from "zod";

export const ROLES = ["ATTENDEE", "ORGANIZER"] as const;

const password = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Use at most 72 characters.")
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/[0-9]/, "Include at least one number.");

export const signupSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Enter your full name.")
      .max(80, "Name is too long."),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter a valid email address.")
      .max(254),
    password,
    confirmPassword: z.string().min(1, "Confirm your password."),
    role: z.enum(ROLES, { message: "Choose how you'll use Evently." }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});
export type LoginInput = z.infer<typeof loginSchema>;

const isRealDate = (s: string) => {
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

const isRealDateTime = (value: string) => {
  const [datePart, timePart] = value.split("T");

  if (!datePart || !timePart) return false;

  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute)
  ) {
    return false;
  }

  const date = new Date(year, month - 1, day, hour, minute);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date.getHours() === hour &&
    date.getMinutes() === minute
  );
};
export const eventSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Title must be at least 3 characters.")
      .max(120, "Title is too long."),
    description: z
      .string()
      .trim()
      .min(10, "Describe the event in at least 10 characters.")
      .max(5000, "Description is too long."),
    eventDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date.")
      .refine(isRealDate, "Choose a valid date."),
    eventTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a valid time."),
    eventDeadline: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose a valid date and time.")
      .refine(isRealDateTime, "Choose a valid date and time."),
    venue: z
      .string()
      .trim()
      .min(2, "Enter the venue.")
      .max(200, "Venue is too long."),
    seatLimit: z
      .number({ message: "Enter the number of seats." })
      .int("Seats must be a whole number.")
      .min(1, "Seat limit must be at least 1.")
      .max(100000, "Seat limit is too large."),
    bannerUrl: z
      .string()
      .trim()
      .url("Invalid banner image URL.")
      .or(z.literal(""))
      .optional()
      .nullable(),
  })
  .refine(
    (data) => {
      if (!data.eventDate || !data.eventTime || !data.eventDeadline) return true;
      const [eDate, eTime] = [data.eventDate, data.eventTime];
      const eventStart = new Date(`${eDate}T${eTime}`).getTime();
      const deadline = new Date(data.eventDeadline).getTime();
      if (Number.isNaN(eventStart) || Number.isNaN(deadline)) return true;
      return deadline < eventStart;
    },
    {
      message: "Deadline must be before the event date and start time.",
      path: ["eventDeadline"],
    },
  );
export type EventInput = z.infer<typeof eventSchema>;

export const uuidSchema = z.string().uuid("Invalid id.");

export const eventFiltersSchema = z.object({
  q: z.string().trim().max(100).optional(),
  when: z.enum(["any", "today", "week", "month"]).default("any"),
  availability: z.enum(["any", "available"]).default("any"),
  page: z.coerce.number().int().min(1).max(1000).default(1),
});
export type EventFilters = z.infer<typeof eventFiltersSchema>;
