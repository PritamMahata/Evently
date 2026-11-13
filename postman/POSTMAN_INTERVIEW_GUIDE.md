# Evently API — Postman Testing & Interview Showcase Guide

This directory contains the complete, production-grade Postman test suite for the **Evently — Event Booking & RSVP Platform**.

It is configured so you can demonstrate to interviewers and evaluators that **every endpoint is thoroughly tested, automated, and verified against core business and security rules**.

---

## 🚀 1. Quick Setup (10 Seconds)

### Option A: Postman Desktop / Web App (Recommended for Interview Demos)
1. Open **Postman**.
2. Click **Import** (top left).
3. Drag & drop or select these two files from the `postman/` directory:
   - `postman/Evently_API.postman_collection.json` *(The complete collection with 28 automated tests)*
   - `postman/Evently_Local.postman_environment.json` *(Local development environment variables)*
   - *(Optional)* `postman/Evently_Production.postman_environment.json` *(For deployed Vercel demo)*
4. In the top-right environment dropdown, select: **`Evently (Local Development)`**.
5. Ensure your local server is running (`npm run dev` on `http://localhost:3000`).

### Option B: VS Code Postman Extension
- The `postman/collections/evently-api/` directory and `postman/globals/workspace.globals.yaml` are already pre-configured with default credentials and active event IDs.
- You can open the Postman tab in VS Code and test requests directly without external tools.

---

## 🏆 2. The "One-Click Automated Suite" Demo (Best for Interviewers)

To show the interviewer that all endpoints pass automated assertions:

1. In Postman, click on the collection root: **`Evently API - Production & Interview Suite`**.
2. Click **Run Collection** (top right).
3. Ensure all folders are checked and click **Run Evently API**.
4. **Result**: Postman executes every request in sequence, validating response codes, schemas, session cookies, dynamic variable handoffs, and error codes with **100% Green Passing Tests**.

---

## 📋 3. Endpoint Coverage & Test Matrix

| # | Endpoint | Method | Role / Auth | Test Assertions & Validations |
|---|---|---|---|---|
| **1.1** | `/api/auth/signup` | `POST` | Public | Validates email, password complexity, role selection. Returns `201 Created`. |
| **1.2** | `/api/auth/resend-confirmation` | `POST` | Public | Generates confirmation token; test script dynamically captures `token` into environment. |
| **1.3** | `/api/auth/confirm-email` | `POST` | Public | Consumes token, activates user (`email_confirmed_at != null`), issues session. |
| **1.4** | `/api/auth/login` (Organizer) | `POST` | Public | Validates organizer credentials, checks `role === 'ORGANIZER'`, verifies `evently_session` cookie. |
| **1.5** | `/api/auth/me` | `GET` | Authenticated | Verifies HTTP-only cookie session resolution to active user profile. |
| **1.6** | `/api/auth/login` (Attendee) | `POST` | Public | Switches session context to demo attendee (`role === 'ATTENDEE'`). |
| **1.7** | `/api/auth/logout` | `POST` | Authenticated | Invalidates session on database and clears client cookie (`200 OK`). |
| **2.1** | `/api/events` | `GET` | Public | Lists upcoming events with dynamic `registered_count` and `seat_limit`. Auto-saves `active_event_id`. |
| **2.2** | `/api/events?when=month&availability=available` | `GET` | Public | Verifies database filter logic (`registered_count < seat_limit`). |
| **2.3** | `/api/events?q=React` | `GET` | Public | Full-text / keyword search verification across titles and descriptions. |
| **2.4** | `/api/events/:id` | `GET` | Public | Fetches complete event details (date, time, venue, description, organizer). |
| **3.1** | `/api/auth/login` (Attendee) | `POST` | Public | Authenticates attendee context for RSVP actions. |
| **3.2** | `/api/events/:id/register` | `POST` | Attendee | Reserves seat via row-level locking transaction. Returns `201 Created` (`CONFIRMED`). |
| **3.3** | `/api/events/:id/register` (Duplicate Test) | `POST` | Attendee | Proves database unique constraint: returns **`409 Conflict`** (`ALREADY_REGISTERED`). |
| **3.4** | `/api/my-registrations` | `GET` | Attendee | Lists attendee's reservations with status tags (`CONFIRMED`, `CANCELLED`, `ENDED`). |
| **3.5** | `/api/events/:id/calendar` | `GET` | Attendee | Exports RFC 5545 `.ics` file (`Content-Type: text/calendar`, `BEGIN:VCALENDAR`). |
| **3.6** | `/api/events/:id/register/cancel` | `POST` | Attendee | Cancels reservation and reclaims capacity (enforcing the 1-day advance cutoff policy). |
| **4.1** | `/api/auth/login` (Organizer) | `POST` | Public | Authenticates organizer context for management operations. |
| **4.2** | `/api/organizer/events` | `GET` | Organizer | Lists all events owned by this organizer with registration tallies. |
| **4.3** | `/api/events` | `POST` | Organizer | Creates new event with Zod schema validation. Captures `created_event_id`. |
| **4.4** | `/api/events/:id` | `PATCH` | Organizer | Updates event capacity and details with seat-reduction protection. |
| **4.5** | `/api/organizer/events/:id/attendees` | `GET` | Organizer | Returns complete attendee roster (names, emails, booking timestamps). |
| **4.6** | `/api/organizer/events/:id/attendees/export` | `GET` | Organizer | Streams sanitized `.csv` spreadsheet with formula-injection guard. |
| **4.7** | `/api/events/:id/cancel` | `POST` | Organizer | Marks event as `CANCELLED`, freezing further registrations. |
| **5.1** | `/api/organizer/events` (Unauthenticated) | `GET` | Public | Tests route guard without cookie: verifies **`401 Unauthorized`**. |
| **5.2** | `/api/events` (Attendee Escalation) | `POST` | Attendee | Attendee attempting to create event: verifies **`403 Forbidden`**. |
| **5.3** | `/api/events/:id` (Cross-Tenant Tamper) | `PATCH` | Organizer 2 | Secondary organizer attempting to edit Organizer 1's event: verifies **`403/404`**. |
| **6.1** | `/api/upload` | `POST` | Organizer | Tests multipart banner image upload with MIME validation & 5MB cap. |

---

## 🎯 4. Technical Architecture Talking Points for Your Interview

When presenting this in an interview, highlight these key design decisions:

1. **Stateful HTTP-Only Cookie Sessions (No Vulnerable JWTs in LocalStorage)**:
   - "Instead of storing JWTs in `localStorage` where they are vulnerable to XSS, we issue random high-entropy 32-byte tokens saved in HTTP-only, `SameSite=Lax` cookies."
   - "On the server, tokens are hashed with SHA-256 before database lookup, meaning even a database read leak cannot compromise active sessions."

2. **Race-Condition & Overbooking Protection**:
   - "To prevent overbooking when two users register for the last seat at the exact same millisecond, we use transactional row-level locking (`SELECT ... FOR UPDATE`) in PostgreSQL."
   - "Combined with a database constraint `CHECK (registered_count <= seat_limit)` and a `UNIQUE(event_id, user_id)` constraint, overbooking and duplicate registrations are impossible."

3. **Strict Server-Side RBAC & Ownership Isolation**:
   - "Frontend navigation guards provide good UX, but all authorization is enforced on the server. The organizer ID is pulled directly from the authenticated session, never trusted from the client payload."
   - "Cross-organizer tampering is prevented by querying `WHERE id = $1 AND organizer_id = $2`."

4. **Defensive Data Handling & Standards Compliance**:
   - "Attendee CSV export sanitizes user inputs (prefixed with single quotes if starting with `=`, `+`, `-`, `@`) to block CSV formula injection attacks in Excel/Sheets."
   - "Calendar export strictly adheres to the RFC 5545 iCalendar standard."

---

## 🔑 5. Pre-Configured Demo Credentials

| Role | Email | Password | Purpose |
|---|---|---|---|
| **Organizer** | `demo.organizer@example.com` | `DemoOrganizer123` | Primary organizer account (owns seeded events) |
| **Organizer (Secondary)** | `second.organizer@example.com` | `DemoOrganizer123` | Used to verify cross-organizer ownership isolation |
| **Attendee** | `demo.attendee@example.com` | `DemoAttendee123` | Used to verify event discovery, RSVP, and calendar export |

