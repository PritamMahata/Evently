export type Role = "ORGANIZER" | "ATTENDEE";
export type EventStatus = "ACTIVE" | "CANCELLED";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface EventRecord {
  id: string;
  organizer_id: string;
  organizer_name: string;
  title: string;
  description: string;
  event_date: string; // YYYY-MM-DD
  event_time: string; // HH:MM
  venue: string;
  seat_limit: number;
  status: EventStatus;
  registered_count: number;
  is_past: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface RegistrationRecord {
  registration_id: string;
  registered_at: Date;
  event: EventRecord;
}

export interface AttendeeRecord {
  registration_id: string;
  attendee_id: string;
  name: string;
  email: string;
  registered_at: Date;
}
