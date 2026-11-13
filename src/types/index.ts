export type Role = "ORGANIZER" | "ATTENDEE";
export type EventStatus = "ACTIVE" | "CANCELLED";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  email_confirmed_at?: string | Date | null;
}

export interface EmailConfirmationRecord {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
}

export interface EventRecord {
  id: string;
  organizer_id: string;
  organizer_name: string;
  title: string;
  description: string;
  event_date: string; // YYYY-MM-DD
  event_time: string; // HH:MM
  event_deadline: string; // ISO string / timestamp
  venue: string;
  seat_limit: number;
  status: EventStatus;
  banner_url?: string | null;
  registered_count: number;
  is_past: boolean;
  is_past_deadline?: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface RegistrationRecord {
  registration_id: string;
  registered_at: Date;
  event: EventRecord;
  can_cancel?: boolean;
}

export interface AttendeeRecord {
  registration_id: string;
  attendee_id: string;
  name: string;
  email: string;
  registered_at: Date;
}
