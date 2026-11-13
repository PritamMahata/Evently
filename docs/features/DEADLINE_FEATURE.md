# Event Registration Deadline Feature

## Overview
The **Registration Deadline** feature empowers organizers to configure a strict cutoff timestamp (`event_deadline`) for attendee sign-ups. Once this deadline is reached, attendees can no longer register, even if the event date is still in the future and seats remain open.

This document details the architectural design, database modeling, concurrency considerations, validation rules, and user-facing workflows built specifically to showcase during technical interviews.

---

## Technical Architecture & Design Decisions

### 1. Database Schema & Indexing
- **Column**: `events.event_deadline TIMESTAMPTZ NOT NULL`
- **Timezone Awareness**: Timestamps are stored with UTC timezone offsets in PostgreSQL (`timestamptz`), avoiding daylight-savings or client-side clock drift.
- **Query Optimization**: Calculated dynamically inside `EVENT_SELECT`:
  ```sql
  to_json(e.event_deadline) AS event_deadline,
  (e.event_deadline <= (now() AT TIME ZONE $1)) AS is_past_deadline
  ```
  Using `to_json(...)` ensures consistent RFC-3339 / ISO-8601 formatting (`YYYY-MM-DDTHH:MM:SS.sssZ`) for client-side and server-side JavaScript `Date` parsing.

### 2. Multi-Layer Validation Strategy
To prevent invalid deadlines:
1. **Frontend HTML5 Constraints**: The `<Input type="datetime-local" max={maxDeadline} />` limits the browser's date/time picker to disable times on or after event commencement.
2. **Zod Schema Invariants**:
   ```typescript
   .refine(
     (data) => {
       if (!data.eventDate || !data.eventTime || !data.eventDeadline) return true;
       const eventStart = new Date(`${data.eventDate}T${data.eventTime}`).getTime();
       const deadline = new Date(data.eventDeadline).getTime();
       return deadline < eventStart;
     },
     {
       message: "Deadline must be before the event date and start time.",
       path: ["eventDeadline"],
     }
   )
   ```
3. **Database & Service Validation**:
   - Both `createEvent` and `updateEvent` verify `deadline < (event_date + event_time)` using PostgreSQL interval comparisons.

### 3. Concurrency & Race-Condition Protection
When an attendee registers (`registerForEvent`), the operation runs inside a serializable PostgreSQL transaction with explicit row-level locking:
```sql
SELECT status, seat_limit,
       ((event_date + event_time) <= (now() AT TIME ZONE $2)) AS is_past,
       (event_deadline <= (now() AT TIME ZONE $2)) AS is_past_deadline
  FROM events WHERE id = $1 FOR UPDATE
```
- If `is_past_deadline` evaluates to `true`, the transaction immediately aborts and throws `REGISTRATION_CLOSED` (HTTP 409).
- Because `FOR UPDATE` is held, concurrent registrations submitted at the exact microsecond of deadline expiration cannot slip through.

---

## Visual Walkthrough & Implementation Evidence

### 1. Event Discovery & Public Feed
Attendees can see registration deadlines directly from event cards on `/events`, helping them register in advance:

![Events Directory with Deadlines](./Screenshot%202026-11-13%20234249.png)

*Key Highlights:*
- Every card shows a dedicated `Deadline: <formatted date & time>` row next to venue and seat capacity.
- Real-time badges indicate whether registration is `Open`, `Full`, or `Registration Closed`.

---

### 2. Event Details Page (Open for Registration)
When an event has an active deadline in the future:

![Event Details Before Deadline](./Screenshot%202026-11-13%20232804.png)

*Key Highlights:*
- Displays the deadline in the meta grid: `Registration Deadline: Tue, 17 Nov 2026, 4:57 pm`.
- The CTA button `Register for this event` remains accessible.

---

### 3. Post-Registration Confirmation
When an eligible attendee completes registration before the deadline:

![Registered State](./Screenshot%202026-11-13%20232831.png)

*Key Highlights:*
- Status changes to `You're registered`.
- Options to download an `.ics` calendar invite or cancel the reservation prior to the 24h cancellation cutoff.

---

### 4. Enforced Deadline State (Registration Restricted)
When current time passes the configured `event_deadline`:

![Registration Closed State](./Screenshot%202026-11-13%20232456.png)

*Key Highlights:*
- The status badge switches to `Registration Closed`.
- The registration CTA is completely replaced by a prominent alert:
  > **Registration deadline passed**  
  > *Registration closed on Fri, 13 Nov 2026, 17:41.*
- Submissions via direct API calls are rejected with `409 Conflict: REGISTRATION_CLOSED`.

---

