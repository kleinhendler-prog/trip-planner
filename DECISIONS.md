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
- **Single-user auth from env vars** — DB user lookup was replaced with AUTH_USERNAME + bcrypt AUTH_PASSWORD_HASH env vars (Apr 13): one known user, no password storage in the DB, simplest thing that works for a personal app.
- **Custom component library instead of an external UI kit** — keeps bundle small and design fully controlled by the Stitch design system; documented in COMPONENT_LIBRARY_SUMMARY.md (on branch `local-cowork-snapshot`).
- **Supabase (Postgres) for the database** — schema managed via SQL migrations in `supabase/migrations/`.
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
