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

Built in Claude Cowork April 12–22, 2026 and **live in production on Vercel** since then. The core flow (login → wizard → generate → itinerary) was used and debugged against real trips; edge features haven't all been individually re-verified.

- **Component library** — 13 custom UI components + AppShell/Header layout, pure Tailwind, demo page at `/demo`, documented in COMPONENTS.md.
- **Stitch design system** — full visual overhaul (45 files): CSS design tokens, indigo-purple gradient palette, Plus Jakarta Sans/Be Vietnam Pro/Space Grotesk fonts, Material Symbols icons.
- **Auth** — NextAuth v5 single-user login from env vars (AUTH_USERNAME + bcrypt AUTH_PASSWORD_HASH), JWT sessions, route-protection proxy.
- **Trip creation wizard** — 5 steps with Google Places autocomplete, trip-type selector (single city / area / road trip / multi-segment), profile-aware interests step with trip-specific notes.
- **Multi-segment trips** — chain city + area + road-trip segments in one trip; per-segment generation stitched into one itinerary with segment labels.
- **AI itinerary generation** — one-shot Claude call (claude-haiku-4-5, 16k tokens) with JSON-repair for truncated responses, 13-check QA validation, stale-generation auto-fail, and a live status log panel during generation.
- **Trip detail view** — collapsible day cards, activity cards (times, costs, booking-urgency chips, priority stars, opening-hours info, tips, rainy-day alternatives), hotel cards, transit indicators, budget panel, climate banner, Leaflet map with per-day color filters and matching marker numbers.
- **Guide narration** — "Read Guide" slide-over with narrated text for top attractions.
- **Local finds** — day-scoped tastings/shops/markets/workshops shown as "While You're in the Area".
- **Suggest alternative** — per-activity replacement suggestions with approve/deny/re-suggest (up to 3 attempts).
- **What's Nearby** — per-activity nearby POI suggestions with distance, cost, and relevance.
- **Day reordering** — up/down arrows re-number days and dates, warns on venue-closure conflicts.
- **Parking suggestions** — per-day parking tip for driving days.
- **Trip actions** — duplicate trip, regenerate a single day, swap an activity, mark-as-booked toggle, trip status changes, PDF export (print stylesheet).
- **Weather awareness** — climate notes and rainy-day alternatives come from the generation prompt (trips within 14 days get a specific forecast). *The separate weather-refresh/apply-swaps/cron routes were built for the old data model and are stubbed 501s since 2026-07-04.*
- **Booking dashboard** — Must-Book-Now banner with booking links (GetYourGuide/Viator), confirmations per trip.
- **Sources** — community "destination sources" page with voting; DB seeded with universal + Italy sources.
- **Trip reflection** — post-trip feedback page and API (trip_reflections).
- **Profile & preferences** — profile-setup questionnaire + preferences API (interests, dislikes, hotel/budget/pace).
- **Neon data layer (2026-07-04)** — 9-table Drizzle schema (`src/lib/db/schema.ts`) on Neon serverless Postgres; seed script for the 55 starter sources; verified end-to-end (login → create → generate → render → delete).
- **Inbound email endpoint** — API route exists for receiving booking-confirmation emails (integration stubbed, no provider wired).
