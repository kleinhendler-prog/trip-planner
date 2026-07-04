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
- **External services:** Supabase (Postgres DB — **being replaced by Neon**, see DECISIONS), NextAuth v5 beta single-user env login (**to be replaced by Neon Auth** in Phase 2), Anthropic API (itinerary generation), Google Places API, OpenWeatherMap. **Hosted on Vercel — pushing to `main` auto-deploys production.** GitHub: `kleinhendler-prog/trip-planner` (public repo). Email provider + Booking.com/GetYourGuide affiliate IDs are stubbed in `.env.example`.

---

## Current status

Built and iterated in Claude Cowork April 12–22, 2026. Moved to Claude Code on 2026-07-03: git reconnected (remote won over the stale local folder; old state on branch `local-cowork-snapshot`), build crash fixed, middleware → proxy done, local login verified. Pushed 2026-07-04; **Vercel production deploy of those fixes succeeded**. **The app's data layer is dead everywhere**: the old Supabase DB is paused and we decided to ditch it for **Neon + Neon Auth** (fresh start, no data export). The site serves pages but can't load or create trips until the Neon migration lands. Next concrete step: user provisions Neon, then the phased migration in Planned.

---

## Where we left off

- **Last worked on:** (2026-07-04) Pushed all fixes (production deploy succeeded), deleted the duplicate `trip-planner/` folder, and decided the database future: ditch Supabase for **Neon + Neon Auth**, start fresh (April trips were test data). Verified Neon Auth is free at our scale (60k MAU on free plan).
- **Next up:** User provisions Neon (recommended: Vercel dashboard → Storage → Create Database → Neon, so env vars auto-connect). Then Phase 1 of the migration (swap data layer to Neon, keep current login), then Phase 2 (Neon Auth multi-user login).
- **Open question:** Make the public GitHub repo private? Remove dead `generation/pipeline.ts` (could fold into Phase 1)?

---

## Features

For the full list of completed features, see `FEATURES.md`.

### In progress
- *Nothing actively in progress.*

### Planned
**Neon migration (decided 2026-07-04, phased so every push stays deployable):**
- **Phase 0 (user):** provision Neon via Vercel Marketplace (Vercel dashboard → Storage → Neon) so DATABASE_URL lands in Vercel env automatically; pull it into `.env.local` too.
- **Phase 1 (code):** swap the data layer from supabase-js to Neon Postgres (Drizzle ORM + schema recreated from `supabase/migrations/` incl. the 2 production-only trips columns; re-run source seeds; delete dead 7-step pipeline while touching the area). Keep the current single-user login. Verify e2e locally, then deploy.
- **Phase 2 (code):** replace the env-var login with Neon Auth (real multi-user signup/login); tie trips to real user IDs. Verify, deploy.
- **Cleanup after Phase 1:** remove supabase-js dependency, `src/lib/supabase.ts`, and Supabase env vars from Vercel; the old Supabase project can then be deleted.

**Other:**
- End-to-end verification pass (login → wizard → generate → itinerary) — becomes part of Phase 1 acceptance.
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
- Running schema changes against the live database (Supabase today, Neon after the migration).
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
- **`.env.local` was 100% placeholders until 2026-07-03** — real keys only ever lived in Vercel env and the `API/` folder. Now wired: Anthropic + Google keys (copied from `API/`), generated NEXTAUTH_SECRET, local login creds. Still placeholders: OpenWeather + email/affiliate stubs; the DB entries will collapse to one Neon DATABASE_URL in Phase 1.
- **bcrypt hashes in `.env.local` must have `$` escaped as `\$`** — Next's env loader (dotenv-expand) treats `$2b$10$...` as variable references and silently mangles the hash into garbage → "Invalid credentials" with no other clue. (Vercel's env UI doesn't have this problem.)
- Supabase free tier **auto-pauses projects after ~1 week of inactivity** and needs a manual restore — this silently killed production and prompted the move to Neon (2026-07-04). Neon also scales to zero when idle, but wakes automatically on the next connection (expect a couple of slow first requests, not an outage).
- A NextAuth "Configuration" error on the login page usually just means the `authorize()` function threw (e.g., wrong password) — not necessarily a real config problem.
