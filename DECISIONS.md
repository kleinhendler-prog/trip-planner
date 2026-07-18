# Decision log

Choices made and why. So we don't relitigate them.

---

## How to maintain this file

- One entry per decision. Format: **What** — *why* (one line each).
- If a decision is reversed, **replace** the original entry — don't stack contradictions.
- Don't add entries for trivial or routine choices. Only decisions that future-Claude or future-me might second-guess.
- Trade-off details and full backstory belong in code comments next to the relevant code, not here.

---

## Architecture & stack

> *Foundational choices about how the project is built. Examples:*
> *- **Hosting on [provider]** — chose over [alternative] because [reason in plain language].*
> *- **[Framework] for the frontend** — already familiar; community support is strong.*

*(Entries below were reconstructed from the Cowork build's git history on 2026-07-03; where the original reasoning wasn't recorded, it says so.)*

- **One-shot generation instead of the original 7-step pipeline** — Vercel functions were killed at 60s, so generation was collapsed to a single Claude call (Apr 14) and later re-enriched with QA validation, JSON-repair, and a 120s limit. The 7-step `pipeline.ts` is retired dead code. (This reverses the original multi-step design.)
- **claude-haiku-4-5 as the generation model** — chosen for speed so full itineraries fit inside Vercel's function timeout (Apr 14). If generation quality disappoints, revisit with a bigger model + longer maxDuration rather than silently swapping.
- **Cloudflare Access for login, not Neon Auth** — decided 2026-07-18, *replacing* the 2026-07-04 decision to adopt Neon Auth. The app is for Eyal and family, not the public, so a real signup system is unnecessary: Cloudflare Access gates the whole site with an email code (the same mechanism already guarding MedStreak's `/admin`), costs nothing, and needs no login code to write or maintain. Neon Auth only becomes right if strangers ever need to self-register. Until the NAS move, the env-var login stays.
- **Self-host on the Synology NAS at `trip.klein-labs.com`, copying the MedPulse pattern** (2026-07-18) — Docker + Cloudflare Tunnel + GitHub Actions/GHCR + Watchtower, with Neon kept as the external database (the MedPulse variant, not MedStreak's co-located Postgres). Reasons: no hosting cost, one ops pattern across all three apps, and — the real driver — Vercel's 120-second function limit disappears, which is the only reason generation runs on claude-haiku-4-5 as a single truncation-prone call. Feasibility was measured, not assumed: the app uses ~140 MB RAM and **0.1% of one CPU core during a 69-second generation** (generation is network waiting, not computation — it has no image or PDF processing, unlike its two NAS neighbours), against a NAS with 8 GB RAM at 20% use and CPU at 3%. Accepted trade-off: a travel app now depends on home internet/power being up while abroad; PWA + PDF export soften it.
- **Custom component library instead of an external UI kit** — keeps bundle small and design fully controlled by the Stitch design system; documented in COMPONENT_LIBRARY_SUMMARY.md (on branch `local-cowork-snapshot`).
- **Neon replaces Supabase as the database platform** — decided and **implemented** 2026-07-04 (Drizzle ORM + Neon serverless driver). The Supabase free tier auto-paused the project after inactivity and required a manual restore (production died silently); Neon's free tier scales to zero but wakes automatically on connection, and bundles Neon Auth. Started fresh: the April trips were test data. The schema was reconstructed **from actual code usage, not from the old migrations** — the migrations folder had drifted badly from what the code read and wrote.
- **Schema is snake_case; API maps to camelCase at the edge where the UI expects it** — the old code mixed both randomly and several routes/pages were broken by mismatches. Convention: DB rows snake_case, `toApiShape()` mappers in sources/preferences routes.
- **No row-level security on Neon** — the old Supabase RLS policies were dead weight (the app always connected with the RLS-bypassing service key, and policies used Supabase-only functions). Access control lives in the app's auth layer; revisit at Phase 2 if multi-user changes the picture.
- **Routes built for the retired relational model are explicit 501 stubs, not silent failures** — regenerate-day, apply-weather-swaps, trip weather-refresh, export-pdf, cron/weather-refresh were broken since April's JSONB rewrite; stubbing was honest and cheap. Rebuild on the JSONB model only if the features are actually wanted.
- **Leaflet + OpenStreetMap for maps** — no Google Maps JS dependency; reasoning not recorded (likely cost/simplicity).
- **GitHub remote is the source of truth, not the OneDrive folder** — decided 2026-07-03 after finding the local folder 3 weeks stale; local snapshot preserved on branch `local-cowork-snapshot`.
- **package-lock.json is untracked** — Cowork-era choice (in .gitignore); kept for now to match how Vercel has been building, worth revisiting for reproducible builds.

---

## Product & UX

- **Playful, colorful design language** — gradient indigo-purple primary, warm off-white background, per-day color coding; spec in `stitch-prompt.md`, implemented app-wide as CSS tokens (Apr 21). New UI must follow it.
- **Booking-urgency labels are fixed** — red "Must Book", amber "Book Ahead", green "Walk-in OK"; colors are consistent app-wide.
- **Trip creation is a 5-step wizard** (not a single form) — matches the guided "friendly travel companion" feel.
- **Anti-hallucination prompt rules** — generation prompt requires verified venues only (4.5+ star equivalent), exact official names, and locally-accurate booking customs (Apr 22, after real-trip QA found made-up places).
- **Google Maps links use place-name search, not lat/lng** — so users land on the place card with reviews/photos (Apr 22).

---

## Other

> *Anything that doesn't fit above. Often empty.*

- *(No other decisions logged yet.)*
