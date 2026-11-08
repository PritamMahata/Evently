# API

JSON over HTTPS. Errors: `{ "error": { "code": "...", "message": "...", "fields": { "field": "msg" } } }`.
Mutating requests need `Content-Type: application/json` (when they have a body) and a same-origin `Origin` header (browsers send it automatically). Auth = HTTP-only cookie `evently_session`.

| Method & path | Auth | Role | Request | Success | Errors |
|---|---|---|---|---|---|
| `POST /api/auth/signup` | – | – | `{name,email,password,confirmPassword,role}` | 201 `{user}` + cookie | 400 validation, 409 `EMAIL_TAKEN` |
| `POST /api/auth/login` | – | – | `{email,password}` | 200 `{user}` + cookie | 400, 401 `INVALID_CREDENTIALS`, 429 `RATE_LIMITED` |
| `POST /api/auth/logout` | – | – | – | 200 `{ok}`; session deleted | 403 cross-origin |
| `GET /api/auth/me` | optional | – | – | 200 `{user\|null}` | – |
| `GET /api/events` | – | – | query `q, when(any\|today\|week\|month), availability(any\|available), page` | 200 `{events,total,page,pageSize}` (upcoming, active only) | 400 bad query |
| `GET /api/events/:id` | – | – | – | 200 `{event}` | 404 |
| `POST /api/events` | yes | ORGANIZER | `{title,description,eventDate,eventTime,venue,seatLimit}` (organizer = session) | 201 `{event}` | 400 `VALIDATION_ERROR` / `EVENT_DATE_IN_PAST`, 401, 403 |
| `PATCH /api/events/:id` | yes | ORGANIZER (owner) | same as create | 200 `{event}` | 400, 403, 404, 409 `SEAT_LIMIT_BELOW_REGISTRATIONS` / `EVENT_CANCELLED` / `EVENT_PAST` |
| `POST /api/events/:id/cancel` | yes | ORGANIZER (owner) | – | 200 `{event}` (registrations kept) | 403, 404, 409 already cancelled / past |
| `POST /api/events/:id/register` | yes | ATTENDEE | – | 201 `{registrationId,event}` | 401, 403, 404, 409 `ALREADY_REGISTERED` / `EVENT_FULL` / `EVENT_CANCELLED` / `EVENT_PAST` |
| `GET /api/events/:id/calendar` | yes | ATTENDEE (registered) | – | 200 `text/calendar` | 401, 403, 404 |
| `GET /api/my-registrations` | yes | ATTENDEE | – | 200 `{registrations:[{registration_id,registered_at,status,event}]}` | 401, 403 |
| `GET /api/organizer/events` | yes | ORGANIZER | – | 200 `{events}` (own only) | 401, 403 |
| `GET /api/organizer/events/:id/attendees` | yes | ORGANIZER (owner) | – | 200 `{event,attendees:[{name,email,registered_at}]}` | 401, 403, 404 |
| `GET /api/organizer/events/:id/attendees/export` | yes | ORGANIZER (owner) | – | 200 `text/csv` | 401, 403, 404 |

Status mapping: `401` not logged in · `403` wrong role/not owner/cross-origin · `404` unknown or malformed id · `409` business-rule conflict · `429` rate limit.
