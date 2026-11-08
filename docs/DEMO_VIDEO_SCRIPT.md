# Demo video script (5–10 min)

Use a private window. Don't show `.env`, dashboards with keys, or real passwords. Demo passwords are in the README.

| Time | Scene | Say / do |
|------|-------|----------|
| 0:00 | **Landing page** | Product pitch; note live "coming up" list comes from the DB. Toggle dark mode; resize to mobile width and open the menu. |
| 0:45 | **Signup** | Create a new attendee: show validation (weak password, mismatch), then success. Log out. |
| 1:45 | **Login as organizer** | `demo.organizer@example.com`. Show organizer dashboard (totals, utilization). |
| 2:30 | **Create event** | Try a past date → friendly error. Create *Demo Night* with **2 seats**, future date. |
| 3:30 | **Edit event** | Change venue; show the seat-limit hint. |
| 4:00 | **Login as attendee** | `demo.attendee@example.com`: browse `/events`, search + "seats available" filter, open *Demo Night*. |
| 4:45 | **Register** | Click Register → toast; seats 1/2. Open *My registrations*; add to calendar (.ics). |
| 5:30 | **Duplicate attempt** | Reload the event page; show "You're registered". Show the API rejecting a duplicate (DevTools → Network, or `curl`) → 409 friendly message. |
| 6:15 | **Full event** | Register a second attendee for the last seat; a third sees "This event is full". Open *Design Systems Roundtable* (seeded full). |
| 7:00 | **Organizer attendee list** | Attendee names/emails/dates; export CSV. Try lowering seat limit below registrations → rejected; set equal → allowed. |
| 7:45 | **Cancel + cancelled attempt** | Cancel with the confirmation dialog; event shows *Cancelled*, history kept; attendee can't register. |
| 8:30 | **Security rules** | As attendee open `/organizer/events/new` → 403. As second organizer open first organizer's event → 403. Mention server-side enforcement and DB triggers. |
| 9:15 | **Architecture** | Show `registerForEvent` (`FOR UPDATE`), the trigger in `001_init.sql`, and the test with 25 parallel registrations. Mention `npm run preflight`. |
| 9:45 | **Deployed app** | Show the production URL and the same flow working there. |
