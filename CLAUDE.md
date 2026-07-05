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
  - `src/lib/` — `claude.ts` (Anthropic client, claude-haiku-4-5), `generation/simple-pipeline.ts` (**the** active one-shot generation + QA path), `db/` (Drizzle schema + lazy Neon client), `google-places.ts`, `weather.ts`, `transit.ts`, `auth.ts`.
  - `supabase/migrations/` — **historical**: old Supabase schema + the seed SQL that `scripts/db-seed.mjs` still replays. The live schema source of truth is `src/lib/db/schema.ts`.
  - `stitch-design/` + `stitch-prompt.md` — Google Stitch UI kit and the design-system prompt that produced it.
  - `API/` — plaintext API key files (Anthropic, Google). **Sensitive — gitignored, never commit.**
  - `trip-planner/` — stale duplicate of the project (Cowork leftover, gitignored). Candidate for deletion; ignore it when searching code.
- **External services:** Neon Postgres (via Vercel Marketplace, DATABASE_URL; Drizzle ORM + neon serverless driver), NextAuth v5 beta single-user env login (**to be replaced by Neon Auth** in Phase 2), Anthropic API (itinerary generation), Google Places API, OpenWeatherMap. **Hosted on Vercel — pushing to `main` auto-deploys production.** GitHub: `kleinhendler-prog/trip-planner` (public repo). Email provider + Booking.com/GetYourGuide affiliate IDs are stubbed in `.env.example`.

---

## Current status

**The app runs on Neon.** Phase 1 of the migration landed 2026-07-04: the data layer is Drizzle + Neon serverless (schema in `src/lib/db/schema.ts`, applied via `npx drizzle-kit push`, seeded via `node scripts/db-seed.mjs` — 55 sources). Verified end-to-end locally against the live Neon DB: login → create trip → AI generation (2-day Rome test, QA passed) → itinerary render → delete with cascade. The port also fixed a pile of long-broken column/path mismatches (see the 978f124 commit message) and stubbed 5 routes built for the retired relational model as explicit 501s. Supabase is fully out of the code; the old Supabase project can be deleted. Next: Phase 2 (Neon Auth multi-user login).

---

## Where we left off

- **Last worked on:** (2026-07-04, same session as the Neon decision) Completed Phase 1: user provisioned Neon via Vercel Marketplace ("Trip-Planner-DB", DATABASE_URL prefix, all environments); ported all data access to Drizzle; applied schema + seeds; verified the full flow locally against Neon; pushed (auto-deploys production).
- **Next up:** Verify the production deploy generated a trip successfully (quick prod smoke test), then Phase 2: Neon Auth multi-user login. User cleanup: remove the 6 old Supabase env vars from Vercel and delete the old Supabase project.
- **Open question:** Make the public GitHub repo private? Rebuild any of the 5 stubbed features (weather refresh, regenerate day, export-pdf route, cron) on the JSONB model, or drop them?

---

## Features

For the full list of completed features, see `FEATURES.md`.

### In progress
- *Nothing actively in progress.*

### Planned
- **Phase 2 (code):** replace the env-var login with Neon Auth (real multi-user signup/login); tie trips to real user IDs. Verify, deploy.
- **Cleanup (user):** remove the old Supabase env vars from Vercel project settings; delete the paused Supabase project (`flrksrouxghnninsywhx`) — nothing references it anymore.
- Production smoke test after the Phase 1 deploy (login on the live site, generate a trip).
- Decide fate of the 5 stubbed dead-model routes (rebuild on JSONB or delete): trip weather-refresh, apply-weather-swaps, regenerate-day, export-pdf, cron/weather-refresh.
- Pay down ESLint debt (~470 errors incl. pre-existing `no-explicit-any` style kept during the port).
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
- Running schema changes against the live Neon database (`npx drizzle-kit push` applies immediately — production and local share one DB).
- DATABASE_URL grants full DB access — server-side only, never expose it to the browser (no NEXT_PUBLIC_ prefix).
- Never force-push `main` — the remote is the source of truth and production history.

---

## Engineering rules

- **Next.js 16 has breaking changes** vs. training data — read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code (see AGENTS.md, imported at the top of this file).
- UI comes from the internal component library — import from `@/components`; don't add an external UI kit. Patterns and props are documented in `COMPONENTS.md` / `QUICK_START.md`.
- Database schema source of truth: `src/lib/db/schema.ts` (9 tables, snake_case columns). Apply changes with `npx drizzle-kit push`; seed with `node scripts/db-seed.mjs`. DB rows are snake_case; where the UI expects camelCase (sources, preferences), the API route maps at the edge — keep that boundary.
- All DB access goes through the lazy `db` handle in `src/lib/db` (Drizzle). Don't reintroduce a client that reads env vars at module load — that's what used to break builds.
- Itinerary generation is the **one-shot** `generateTripItinerary` in `src/lib/generation/simple-pipeline.ts` (single Claude call, 16k max tokens, JSON-repair for truncation, then a 13-check QA validation). See DECISIONS.md for why the 7-step pipeline was retired.
- Generation must respect Vercel function limits — `generate` route has `maxDuration = 120`; keep Claude calls inside that budget (this is why the model is claude-haiku-4-5).
- Design system (colors, badges, day-color palette, component look) is specified in `stitch-prompt.md` and implemented as CSS custom properties in `globals.css` — follow it for any new UI.

---

## Gotchas

- The project lives in a OneDrive-synced folder; file timestamps/sync can be quirky. The git repo (since 2026-07-03) is the reliable history — trust `git log` over file dates.
- **The local folder was 3 weeks staler than GitHub** (Cowork pushed through Apr 22 but the folder held an Apr ~13–17 snapshot). Resolved 2026-07-03 by checking out remote `main`; the stale state lives on branch `local-cowork-snapshot`. Lesson: check the remote before trusting local files.
- **OneDrive resurrects deleted files.** Files that git removes from the working tree (branch checkout, git rm) can silently reappear after a sync — deploy.sh and CLAUDE.md.old both came back from the dead on 2026-07-04 and nearly got committed. After any big git operation in this folder, check `git status` for zombie files.
- `trip-planner/` is a stale duplicate of the root project. Greps/ESLint scan it too and double-count; scope searches to `src/`.
- ESLint has ~427 pre-existing errors (mostly `no-explicit-any`); a red `npm run lint` does not mean your change broke something — lint only the files you touched.
- `local-cowork-snapshot` branch also preserves Cowork leftovers removed from `main`'s tree (deploy.sh force-push script, old 7-step-era docs).
- **`.env.local` was 100% placeholders until 2026-07-03** — real keys only ever lived in Vercel env and the `API/` folder. Now wired: DATABASE_URL (Neon), Anthropic + Google keys (from `API/`), generated NEXTAUTH_SECRET, local login creds. Still placeholders: OpenWeather + email/affiliate stubs. Old Supabase entries are dead weight and can be deleted. The full Neon snippet lives in `API/NEON DATABASE URL.txt`.
- **bcrypt hashes in `.env.local` must have `$` escaped as `\$`** — Next's env loader (dotenv-expand) treats `$2b$10$...` as variable references and silently mangles the hash into garbage → "Invalid credentials" with no other clue. (Vercel's env UI doesn't have this problem.)
- Supabase free tier **auto-pauses projects after ~1 week of inactivity** and needs a manual restore — this silently killed production and prompted the move to Neon (2026-07-04). Neon also scales to zero when idle, but wakes automatically on the next connection (expect a couple of slow first requests, not an outage).
- A NextAuth "Configuration" error on the login page usually just means the `authorize()` function threw (e.g., wrong password) — not necessarily a real config problem.
