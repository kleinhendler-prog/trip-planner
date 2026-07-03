# Feature inventory

Complete list of done features. Reference for "is this already built?" questions. CLAUDE.md links here so the main file stays trim.

---

## How to maintain this file

- When a feature moves from "In progress" in CLAUDE.md to "Done," **move** the bullet here — don't duplicate.
- One line per feature. Name + a short parenthetical of what's included.
- If a feature is removed or replaced, delete the old entry — don't leave dead bullets.
- Don't paste implementation details. The code is the source of truth for *how*; this file is just *what exists*.

---

## Done

**Caveat:** everything below was built in Claude Cowork (April 2026) and exists in code, but the app has never been verified end-to-end (last build failed). Treat as "built, unverified" until a verification pass moves it to truly done.

- **Component library** — 13 custom UI components + AppShell/Header layout, pure Tailwind, demo page at `/demo`, documented in COMPONENTS.md.
- **Auth** — NextAuth v5 credentials login (email + password, bcrypt, JWT sessions), login page, route-protection middleware.
- **Trip creation wizard** — 5 steps (destination, travelers, interests, preferences, review) with Google Places autocomplete.
- **AI itinerary generation** — 7-step Claude pipeline (destination analysis → activities → restaurants → hotels → transit → finalize → QA simulator) with progress tracking via generation_jobs.
- **Trip detail view** — collapsible day cards, activity cards (times, costs, booking-urgency chips, rainy-day alternatives), hotel/restaurant cards, transit indicators, budget panel, weather banner, Leaflet map with per-day color filters.
- **Trip actions** — duplicate trip, regenerate a single day, swap an activity, mark-as-booked toggle, trip status changes, PDF export.
- **Weather integration** — OpenWeatherMap forecasts, weather refresh (manual + cron route), suggested weather-based activity swaps.
- **Booking dashboard** — overview of must-book items and confirmations per trip.
- **Sources** — community "destination sources" page with voting; DB seeded with universal + Italy sources.
- **Trip reflection** — post-trip feedback page and API (trip_reflections).
- **Profile & preferences** — user preferences page + API (interests, dislikes, hotel/budget/pace).
- **Database schema** — 7 Supabase tables with migrations (trips, places_cache, generation_jobs, trip_confirmations, trip_reflections, user_preferences, destination_sources).
- **Inbound email endpoint** — API route exists for receiving booking-confirmation emails (integration stubbed, no provider wired).
