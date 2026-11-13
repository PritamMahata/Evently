-- Evently initial schema.  PostgreSQL 13+ (uses built-in gen_random_uuid()).

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  email         text        NOT NULL,
  password_hash text        NOT NULL,
  role          text        NOT NULL CHECK (role IN ('ORGANIZER', 'ATTENDEE')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
-- Emails are unique case-insensitively.
CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email));

CREATE TABLE sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash text        NOT NULL UNIQUE,      -- sha256 of the cookie token; raw token is never stored
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_id_idx ON sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

CREATE TABLE login_attempts (
  id         bigserial PRIMARY KEY,
  key_hash   text        NOT NULL,             -- hmac of "email|ip"
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX login_attempts_key_idx ON login_attempts (key_hash, created_at);

CREATE TABLE events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id    uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  title           text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  description     text NOT NULL CHECK (char_length(description) BETWEEN 10 AND 5000),
  event_date      date NOT NULL,
  event_time      time NOT NULL,
  event_deadline  timestamptz NOT NULL,
  venue           text NOT NULL CHECK (char_length(venue) BETWEEN 2 AND 200),
  seat_limit      integer NOT NULL CHECK (seat_limit > 0 AND seat_limit <= 100000),
  status          text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CANCELLED')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX events_organizer_id_idx ON events (organizer_id);
CREATE INDEX events_date_idx ON events (event_date, event_time);
CREATE INDEX events_status_idx ON events (status);

CREATE TABLE registrations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      uuid        NOT NULL REFERENCES events (id) ON DELETE RESTRICT,
  attendee_id   uuid        NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  registered_at timestamptz NOT NULL DEFAULT now(),
  -- Rule 2: one registration per attendee per event, enforced by the database.
  CONSTRAINT registrations_event_attendee_key UNIQUE (event_id, attendee_id)
);
CREATE INDEX registrations_attendee_id_idx ON registrations (attendee_id);
CREATE INDEX registrations_event_id_idx ON registrations (event_id);

-- ---------------------------------------------------------------------------
-- Rule 1 (defence in depth): a registration can never exceed the seat limit,
-- even if application code is bypassed.  The event row is locked with
-- FOR UPDATE so concurrent inserts for the same event are serialised.
-- ---------------------------------------------------------------------------
CREATE FUNCTION enforce_registration_rules() RETURNS trigger AS $$
DECLARE
  ev_limit  integer;
  ev_status text;
  taken     integer;
BEGIN
  SELECT seat_limit, status INTO ev_limit, ev_status
    FROM events WHERE id = NEW.event_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'EVENT_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF ev_status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'EVENT_CANCELLED' USING ERRCODE = 'P0003';
  END IF;
  SELECT count(*) INTO taken FROM registrations WHERE event_id = NEW.event_id;
  IF taken >= ev_limit THEN
    RAISE EXCEPTION 'EVENT_FULL' USING ERRCODE = 'P0004';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER registrations_enforce_rules
  BEFORE INSERT ON registrations
  FOR EACH ROW EXECUTE FUNCTION enforce_registration_rules();

-- Rule 5 (defence in depth): seat_limit can never drop below current registrations.
CREATE FUNCTION enforce_seat_limit_change() RETURNS trigger AS $$
DECLARE
  taken integer;
BEGIN
  IF NEW.seat_limit < OLD.seat_limit THEN
    SELECT count(*) INTO taken FROM registrations WHERE event_id = NEW.id;
    IF NEW.seat_limit < taken THEN
      RAISE EXCEPTION 'SEAT_LIMIT_BELOW_REGISTRATIONS' USING ERRCODE = 'P0005';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_enforce_seat_limit
  BEFORE UPDATE OF seat_limit ON events
  FOR EACH ROW EXECUTE FUNCTION enforce_seat_limit_change();
