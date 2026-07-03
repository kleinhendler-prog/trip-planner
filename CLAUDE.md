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

- **What this is:** "Trip Builder" — an AI-powered trip planner web app. A user fills a 5-step wizard (destination — single city, area, road trip, or multi-segment; travelers; interests; preferences; review) and Claude generates a full day-by-day itinerary with activities, restaurants, hotels, transit, weather awareness, booking urgency labels, and local finds.
- **Tech stack:** Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind CSS 4. Custom in-house component library styled by the Stitch design system (no external UI kit). Leaflet/react-leaflet for maps.
- **How to run:** `npm run dev` (needs `.env.local` with Supabase + Anthropic keys, plus AUTH_USERNAME/AUTH_PASSWORD_HASH for login). `npm run build` for production build.
- **How to test:** No tests yet. `npx tsc --noEmit` for type checking (clean). `npm run lint` has large pre-existing debt — see Gotchas.
- **Where the code lives:**
  - `src/app/` — pages (login, trips, trips/new wizard, trips/[id], sources, profile, profile-setup, demo) and all API routes under `src/app/api/`.
  - `src/components/` — `ui/` (13-component library), `layout/`, `trip/` (day/activity/hotel cards, map, budget, weather), `wizard/` (5 steps incl. multi-segment builder).
  - `src/lib/` — `claude.ts` (Anthropic client, claude-haiku-4-5), `generation/simple-pipeline.ts` (**the** active one-shot generation + QA path), `google-places.ts`, `weather.ts`, `transit.ts`, `supabase.ts`, `auth.ts`. (`generation/pipeline.ts` is the retired 7-step pipeline — dead code, see Planned.)
  - `supabase/migrations/` — database schema (7 tables) + seed data. **Incomplete vs. the live DB** — see Gotchas.
  - `stitch-design/` + `stitch-prompt.md` — Google Stitch UI kit and the design-system prompt that produced it.
  - `API/` — plaintext API key files (Anthropic, Google). **Sensitive — gitignored, never commit.**
  - `trip-planner/` — stale duplicate of the project (Cowork leftover, gitignored). Candidate for deletion; ignore it when searching code.
- **External services:** Supabase (Postgres DB), NextAuth v5 beta (single-user login via AUTH_USERNAME + bcrypt AUTH_PASSWORD_HASH env vars, JWT sessions), Anthropic API (itinerary generation), Google Places API, OpenWeatherMap. **Hosted on Vercel — pushing to `main` auto-deploys production.** GitHub: `kleinhendler-prog/trip-planner` (public repo). Email provider + Booking.com/GetYourGuide affiliate IDs are stubbed in `.env.example`.

---

## Current status

Built and iterated in Claude Cowork April 12–22, 2026 (deployed to Vercel with real-usage fixes), **but production is currently DOWN: the Supabase project (`flrksrouxghnninsywhx`, "Trip Planner", eu-central-1) was auto-paused by the free tier after inactivity.** Restoring it (Supabase dashboard or MCP with permission) is the first step to bringing the app back. On 2026-07-03 the project moved to Claude Code: git connected to the GitHub remote, local/remote divergence resolved (remote won; stale local state on branch `local-cowork-snapshot`), Supabase build crash fixed, middleware → proxy migration done, local dev environment configured, and local login verified working. Local trips/generation still need the Supabase anon + service-role keys (dashboard → Settings → API, after restore).

---

## Where we left off

- **Last worked on:** (2026-07-03) First Claude Code session: memory files set up; discovered GitHub remote was 3 weeks ahead of the local folder and reconciled onto remote `main`; hardened .gitignore; fixed Supabase build crash; middleware → proxy; configured `.env.local` (was all placeholders) and verified local login; discovered the production Supabase DB is paused. 4 commits ready locally, **not yet pushed** (push = production deploy, needs user OK).
- **Next up:** User decisions: (1) OK the push to main, (2) restore the paused Supabase project, (3) paste Supabase anon + service-role keys into `.env.local`, (4) OK deleting `trip-planner/` duplicate. Then a full e2e test: login → wizard → generate → itinerary.
- **Open question:** Make the public GitHub repo private? Remove dead `generation/pipeline.ts`?

---

## Features

For the full list of completed features, see `FEATURES.md`.

### In progress
- *Nothing actively in progress.*

### Planned
- Restore the paused Supabase project, then put its anon + service-role keys into `.env.local` (dashboard → Settings → API).
- Push the 4 local commits (triggers production deploy) once the user OKs it.
- End-to-end verification pass of the live app after the 2026-07-03 changes (login → wizard → generation → itinerary).
- Remove dead code: `src/lib/generation/pipeline.ts` + `prompts.ts` (retired 7-step pipeline; only `generation/index.ts` still re-exports it).
- Write a migration file for the `trips` columns added directly in production (`generation_started_at`, `generation_log`) so `supabase/migrations/` matches the live DB again.
- Pay down ESLint debt (~427 pre-existing errors, mostly `no-explicit-any` and unused vars).
- Decide: make the public GitHub repo private?

### Parked / maybe later
- Email/booking integrations (inbound email route and affiliate IDs exist as stubs).
- Multi-user support — auth is deliberately single-user (env-var credentials) for now.

---

## Project-specific safety rules

**IMPORTANT:** Confirm with me before:

- **YOU MUST** never commit `.env.local` or the `API/` folder — both contain real API keys. `.gitignore` covers both since 2026-07-03; keep it that way.
- **Pushing to `main` deploys to production** (Vercel auto-deploy). Only push code that builds and type-checks.
- Deleting the duplicate `trip-planner/` folder (pending my confirmation it holds nothing unique).
- Running Supabase migrations against the live project.
- The Supabase service-role key bypasses row-level security — server-side code only, never expose it to the browser.
- Never force-push `main` — the remote is the source of truth and production history.

---

## Engineering rules

- **Next.js 16 has breaking changes** vs. training data — read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code (see AGENTS.md, imported at the top of this file).
- UI comes from the internal component library — import from `@/components`; don't add an external UI kit. Patterns and props are documented in `COMPONENTS.md` / `QUICK_START.md`.
- Database schema baseline: `supabase/migrations/` (7 tables: trips, places_cache, generation_jobs, trip_confirmations, trip_reflections, user_preferences, destination_sources) — but the live DB has extra `trips` columns not in migrations (see Gotchas).
- Itinerary generation is the **one-shot** `generateTripItinerary` in `src/lib/generation/simple-pipeline.ts` (single Claude call, 16k max tokens, JSON-repair for truncation, then a 13-check QA validation). See DECISIONS.md for why the 7-step pipeline was retired.
- Generation must respect Vercel function limits — `generate` route has `maxDuration = 120`; keep Claude calls inside that budget (this is why the model is claude-haiku-4-5).
- Design system (colors, badges, day-color palette, component look) is specified in `stitch-prompt.md` and implemented as CSS custom properties in `globals.css` — follow it for any new UI.

---

## Gotchas

- The project lives in a OneDrive-synced folder; file timestamps/sync can be quirky. The git repo (since 2026-07-03) is the reliable history — trust `git log` over file dates.
- **The local folder was 3 weeks staler than GitHub** (Cowork pushed through Apr 22 but the folder held an Apr ~13–17 snapshot). Resolved 2026-07-03 by checking out remote `main`; the stale state lives on branch `local-cowork-snapshot`. Lesson: check the remote before trusting local files.
- The live Supabase DB has `trips.generation_started_at` and `trips.generation_log` columns that were added directly in production (Apr 22 commit) — there is **no migration file** for them. Don't "clean up" code that references them, and don't recreate the DB from migrations alone.
- `trip-planner/` is a stale duplicate of the root project. Greps/ESLint scan it too and double-count; scope searches to `src/`.
- ESLint has ~427 pre-existing errors (mostly `no-explicit-any`); a red `npm run lint` does not mean your change broke something — lint only the files you touched.
- `local-cowork-snapshot` branch also preserves Cowork leftovers removed from `main`'s tree (deploy.sh force-push script, old 7-step-era docs).
- **`.env.local` was 100% placeholders until 2026-07-03** — real keys only ever lived in Vercel env and the `API/` folder. Now wired: Supabase URL, Anthropic + Google keys (copied from `API/`), generated NEXTAUTH_SECRET, local login creds. Still placeholders: Supabase anon + service-role keys (need dashboard after DB restore), OpenWeather, email/affiliate stubs.
- **bcrypt hashes in `.env.local` must have `$` escaped as `\$`** — Next's env loader (dotenv-expand) treats `$2b$10$...` as variable references and silently mangles the hash into garbage → "Invalid credentials" with no other clue. (Vercel's env UI doesn't have this problem.)
- Supabase free tier **auto-pauses projects after ~1 week of inactivity**. The app's DB paused sometime after April; if the app suddenly "breaks everywhere," check project status first.
- A NextAuth "Configuration" error on the login page usually just means the `authorize()` function threw (e.g., wrong password) — not necessarily a real config problem.
