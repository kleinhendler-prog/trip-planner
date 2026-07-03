@AGENTS.md

# Project memory

This file is the project's persistent memory. It lives in the **project root** at `./CLAUDE.md`. Claude reads it at the start of every session, on top of the global config at `~/.claude/CLAUDE.md` — those are two different files. All memory maintenance described below edits the files in **this** project root only; it must never edit the global `~/.claude/CLAUDE.md`. Keep this file accurate, concise, and current.

---

## Reference files (DO NOT load speculatively)

This project uses a split memory system. The following files exist in the project root and should be read **only when the current task actually needs that information**:

- `FEATURES.md` — read when checking whether a feature is already built.
- `DECISIONS.md` — read when revisiting a past design choice ("why did we do it this way?").
- `GLOSSARY.md` — read when a project-specific term is unclear.

Do not load these at session start. Load the specific one when its trigger condition is met.

---

## Project memory maintenance

### When to update
- After completing a feature or meaningful change.
- After we make a decision worth remembering.
- When I say "wrap up" or before I run `/clear`.
- When you discover something non-obvious about the code or tools.

### Which file to update

All four targets below are in the **project root**. Never edit the global `~/.claude/CLAUDE.md` as part of memory maintenance.

- **Current status / Where we left off / In progress / Planned / Engineering rules / Gotchas / project-specific safety rules** → update this file (`./CLAUDE.md`).
- **Feature moved from in-progress to done** → move the bullet to `./FEATURES.md`.
- **New design decision (or reversal)** → add to `./DECISIONS.md`. Replace reversed entries; don't stack contradictions.
- **New project-specific term** → add to `./GLOSSARY.md`.

### Anti-bloat rules
- **Move, don't duplicate.** When something moves between files, *move* the bullet.
- **Replace, don't append** reversed entries.
- **No code in any memory file.** Tiny config snippet OK; functions and components are not.
- **3-month relevance test.** Before adding any entry, ask: *"Will this still matter in 3 months? Could Claude figure it out from reading the code?"* If no to either, don't add it.

---

## Project overview

- **What this is:** "Trip Builder" — an AI-powered trip planner web app. A user fills a 5-step wizard (destination, travelers, interests, preferences, review) and Claude generates a full day-by-day itinerary with activities, restaurants, hotels, transit, weather awareness, and booking urgency labels.
- **Tech stack:** Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind CSS 4. Custom in-house component library (no external UI kit). Leaflet/react-leaflet for maps.
- **How to run:** `npm run dev` (needs `.env.local` with Supabase + Anthropic keys). `npm run build` for production build.
- **How to test:** No tests yet. `npm run lint` for ESLint; `npx tsc --noEmit` for type checking.
- **Where the code lives:**
  - `src/app/` — pages (login, trips, trips/new wizard, trips/[id], sources, profile, demo) and all API routes under `src/app/api/`.
  - `src/components/` — `ui/` (13-component library), `layout/`, `trip/` (day/activity/hotel cards, map, budget, weather), `wizard/` (5 steps).
  - `src/lib/` — `claude.ts` (Anthropic client), `generation/` (7-step itinerary pipeline + QA simulator), `google-places.ts`, `weather.ts`, `transit.ts`, `supabase.ts`, `auth.ts`.
  - `supabase/migrations/` — database schema (7 tables) + seed data for universal and Italy travel sources.
  - `stitch-design/` + `stitch-prompt.md` — Google Stitch UI kit and the design-system prompt that produced it.
  - `API/` — plaintext API key files (Anthropic, Google). **Sensitive — never commit.**
  - `trip-planner/` — byte-identical duplicate of the whole project (Cowork leftover). Candidate for deletion; ignore it when searching code.
- **External services:** Supabase (Postgres DB), NextAuth v5 beta (credentials login, bcrypt, JWT sessions), Anthropic API (itinerary generation), Google Places API (autocomplete/places), OpenWeatherMap (forecasts). Intended hosting: Vercel (not deployed yet). Email provider + Booking.com/GetYourGuide affiliate IDs are stubbed in `.env.example`.

---

## Current status

Full v1 codebase built in Claude Cowork (April 2026): wizard → AI generation pipeline → itinerary view with maps, budget, booking dashboard, PDF export, day regeneration, activity swaps, weather refresh, community "sources" with voting, and trip reflection. **However: the last production build failed** (missing `NEXT_PUBLIC_SUPABASE_URL` at build time in the inbound-email route), the app has never been verified end-to-end, there is no git repository, and it is not deployed. Treat every feature in FEATURES.md as "built in code, not yet verified working."

---

## Where we left off

- **Last worked on:** (2026-07-02) Reviewed the Cowork build in Claude Code for the first time and set up the split memory files (CLAUDE/FEATURES/DECISIONS/GLOSSARY).
- **Next up:** Get to a healthy baseline: initialize git + GitHub remote (deploy.sh points at `kleinhendler-prog/trip-planner`), fix the build failure, decide what to do with the duplicate `trip-planner/` folder, then verify the app runs end-to-end.
- **Open question:** Delete the duplicate `trip-planner/` folder? Keep or remove the Cowork docs (COMPLETION_CHECKLIST, COMPONENT_LIBRARY_SUMMARY) and `finish-the-job-improvement.md` (a skill-improvement note, not project code)?

---

## Features

For the full list of completed features, see `FEATURES.md`.

### In progress
- *Nothing actively in progress.*

### Planned
- Fix production build — Supabase client is created at module load, so `next build` dies without env vars; make env access lazy or build-safe.
- Initialize git + GitHub remote and make the first commit (required by the global checkpoint policy).
- Migrate `src/middleware.ts` to the Next.js 16 `proxy` convention (build warns middleware is deprecated).
- Update the Claude model — `src/lib/claude.ts` uses `claude-3-5-sonnet-20241022` (old); move to a current model.
- End-to-end verification pass of the wizard → generation → itinerary flow.
- Deploy to Vercel.

### Parked / maybe later
- Multi-segment trips (city + road-trip legs in one trip) — designed in `stitch-prompt.md` but not implemented in code.
- Email/booking integrations (inbound email route and affiliate IDs exist as stubs).

---

## Project-specific safety rules

**IMPORTANT:** Confirm with me before:

- **YOU MUST** never commit `.env.local` or the `API/` folder — both contain real API keys. Before the first `git init`/commit, verify `.gitignore` covers `API/` (as of 2026-07-02 it does NOT).
- Deleting the duplicate `trip-planner/` folder (pending my confirmation it holds nothing unique).
- Running Supabase migrations against a live project.
- The Supabase service-role key bypasses row-level security — server-side code only, never expose it to the browser.

---

## Engineering rules

- **Next.js 16 has breaking changes** vs. training data — read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code (see AGENTS.md, imported at the top of this file).
- UI comes from the internal component library — import from `@/components`; don't add an external UI kit. Patterns and props are documented in `COMPONENTS.md` / `QUICK_START.md`.
- Database schema source of truth: `supabase/migrations/` (7 tables: trips, places_cache, generation_jobs, trip_confirmations, trip_reflections, user_preferences, destination_sources).
- Itinerary generation is a fixed 7-step pipeline in `src/lib/generation/pipeline.ts` (destination analysis → daily activities → restaurants → hotels → transit → finalize → QA). Don't collapse it into a one-shot call; see DECISIONS.md.
- Design system (colors, badges, day-color palette, component look) is specified in `stitch-prompt.md` — follow it for any new UI.

---

## Gotchas

- The whole project lives in a OneDrive-synced folder — no git history to lean on (yet), and file timestamps/sync can be quirky.
- `trip-planner/` is a byte-identical copy of the root project. Greps and searches return every hit twice; scope searches to `src/` or exclude `trip-planner/`.
- `src/lib/supabase.ts` throws at import time when env vars are missing — this is what breaks `next build` (see `build.log`). Any route importing it makes the build env-dependent.
- `src/lib/auth.ts` has a dev shortcut: passwords may be compared in plaintext ("in production, passwords should be stored as bcrypt hashes" note in code). Fix before real users.
