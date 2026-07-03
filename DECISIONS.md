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

*(Entries below were reconstructed from the Cowork build on 2026-07-02; where the original reasoning wasn't recorded, it says so.)*

- **Custom component library instead of an external UI kit** — keeps bundle small and design fully controlled by the Stitch design system; documented in COMPONENT_LIBRARY_SUMMARY.md.
- **Supabase (Postgres) for the database** — schema managed via SQL migrations in `supabase/migrations/`.
- **NextAuth v5 credentials login, no social login** — social OAuth left as commented-out option in `.env.example`; reasoning not recorded.
- **Multi-step Claude pipeline instead of one-shot generation** — 7 discrete steps with a QA review pass, so each part of the itinerary gets focused context. Don't collapse to one call as an "optimization."
- **Leaflet + OpenStreetMap for maps** — no Google Maps JS dependency; reasoning not recorded (likely cost/simplicity).

---

## Product & UX

- **Playful, colorful design language** — gradient blue-purple primary, warm off-white background, per-day color coding; full spec in `stitch-prompt.md` (Google Stitch). New UI must follow it.
- **Booking-urgency labels are fixed** — red "Must Book", amber "Book Ahead", green "Walk-in OK"; colors are consistent app-wide.
- **Trip creation is a 5-step wizard** (not a single form) — matches the guided "friendly travel companion" feel.

---

## Other

> *Anything that doesn't fit above. Often empty.*

- *(No other decisions logged yet.)*
