# Family accounts with Google sign-in — design

**Date:** 2026-07-25
**Status:** Approved in conversation, pending written review
**Supersedes:** the 2026-07-18 decision that Cloudflare Access would serve as the login

---

## The problem

Trip Builder has one hardcoded user. The username and password live in environment
variables, and the signed-in user's id is the literal string `"1"`. There is no
users table and no signup path, so Eyal cannot give family members their own
accounts — which is the goal.

Cloudflare Access, the previously planned login, authenticates people *at the door*
without telling the app who they are in a way trips can be attached to. It is the
wrong tool for per-person accounts. This design replaces it.

## What we are building

Google sign-in, restricted to an invite list that Eyal manages inside the app.
Each family member gets their own account and sees only their own trips.

**Not in this build:** sharing trips between family members. Ownership must be
correct and enforced first; sharing is a clean follow-up on top of it.

---

## Decisions taken

| Question | Decision |
|---|---|
| How do accounts get created? | Google sign-in — no passwords to manage or reset |
| Who may sign in? | Only emails on an allow-list Eyal manages in the app |
| Can members see each other's trips? | No. Private by default; sharing is a later feature |
| Existing trips? | Nothing to migrate — the database is empty (verified) |
| Keep the username/password login? | No. Remove it once Google sign-in is proven working |

### Why Google rather than the alternatives

Family members are non-technical. Google sign-in means no password for them to
choose, forget, or reset, and no password-reset flow for us to build. It also
deletes the hand-rolled credentials code that has already cost real debugging
time: the bcrypt `$`-escaping trap, the `UntrustedHost` failure, and the
misleading "Configuration" errors (all recorded in CLAUDE.md Gotchas).

Neon Auth was considered and rejected for now: it is a second auth system to
learn and operate, and NextAuth — already installed and wired up — covers five
people without it.

---

## Data model

One new table, `users`:

| Column | Notes |
|---|---|
| `id` | Primary key, a generated UUID; becomes the value stored in every existing `user_id` column |
| `email` | Unique. The allow-list key — matched against the Google account's email |
| `name` | Filled in from Google on first sign-in |
| `image` | Profile photo URL from Google; optional |
| `google_sub` | Google's own stable id for the account; set on first sign-in |
| `role` | `admin` or `member`. Eyal is the only admin |
| `status` | `invited` until first successful sign-in, then `active` |
| `created_at`, `last_login_at` | Timestamps |

Email is the allow-list key because Eyal knows relatives' email addresses in
advance but cannot know their Google internal ids. `google_sub` is recorded on
first sign-in as the durable identity, so a later email change does not silently
create a second account.

No other schema changes. Every table already carries a `user_id` text column
(`trips`, `user_profiles`, `user_preferences`, `trip_reflections`,
`trip_confirmations`); those columns simply start holding real user ids instead
of `"1"`. Because the database holds no user data, this needs no migration.

**Verified 2026-07-25 against the live Neon database:** `trips`, `user_profiles`,
`user_preferences`, `trip_reflections`, and `trip_confirmations` all contain zero
rows. `destination_sources` holds the 55 seeded rows and is not user-owned.

### Sessions

Keep the current JWT session strategy. No database adapter, and none of the four
extra tables an adapter would bring. The app owns the `users` table outright and
checks it at sign-in, which is both simpler and exactly the control we want.

The signed-in user's id and role are carried in the session token so that
ownership checks and the admin gate need no extra database lookup per request.

---

## Sign-in flow

The login page loses the username and password fields and gains a single
"Continue with Google" button.

1. The member clicks it and picks their Google account.
2. Google returns them to the app.
3. **Before granting access**, the app looks up their email in `users`.
   - **Found** → allowed in. Name, photo, and `google_sub` are saved; `status`
     becomes `active`; `last_login_at` is set.
   - **Not found** → refused, sent to an "invite-only" page. **No user row is
     created.**

Signing in never creates an account. That single rule is what keeps strangers
out, and it is the opposite of most Google sign-in defaults — so it must be
explicit in the code and covered by a test.

### What Eyal must do outside the code

Create a Google Cloud project with OAuth credentials, producing a client id and
secret to store as environment variables (`AUTH_GOOGLE_ID`,
`AUTH_GOOGLE_SECRET`) locally and in Vercel. Free.

Both redirect URIs must be registered or sign-in fails:
- `https://trip-planner-omega-three.vercel.app/api/auth/callback/google`
- `http://localhost:3000/api/auth/callback/google`

This is Eyal's step — it involves his Google account, and credentials must not
pass through the assistant.

---

## Privacy enforcement

### Correction to what was said during the design conversation

I stated that all nine trip routes were missing ownership checks and needed them
added. **That was wrong.** An audit of the routes found that every *live* trip
route already loads the trip, compares `trip.user_id` against the session user,
and rejects mismatches. The only routes without a check are the four dead 501
stubs (`apply-weather-swaps`, `export-pdf`, `regenerate-day`, `weather-refresh`),
which return "not implemented" before touching data.

The privacy work is therefore smaller than described — but not zero, because the
existing checks have never been *exercised*: with one hardcoded user, every trip
belonged to `"1"` and every comparison trivially passed. They are structurally
right and completely unproven.

### What actually changes

1. **Centralise the check.** The same load-trip-then-compare block is repeated in
   nine routes. Extract one helper — "load this trip, but only if it belongs to
   the signed-in user" — so the rule lives in one place instead of drifting
   across nine copies. This is the change that keeps privacy correct as routes
   are added later.

2. **Return 404, not 401, for someone else's trip.** Routes currently answer 401
   when a trip exists but belongs to another user, and 404 when it does not
   exist. That difference tells an outsider which trip ids are real. Both cases
   should answer 404 — the app should never confirm that another person's trip
   exists.

3. **Never trust a user id from the browser.** The id always comes from the
   server-side session, never from a request body or query string.

---

## The Family screen

A page at `/family`, visible only to the admin.

- Lists everyone: name, email, role, and whether they are `invited` or `active`.
- "Add family member" — enter an email address, which creates an `invited` row.
- Remove a member.

Guardrails:

- **Removing someone blocks future sign-ins and hides their trips; it does not
  delete their trips.** Reversible, not destructive. Re-adding the same email
  restores their access and their data.
- **The admin cannot remove or demote themselves** — this is what prevents
  locking yourself out of your own admin page.
- Non-admins who open `/family` directly are turned away, not shown a hidden-but-
  present page.

---

## Error handling

| Situation | What the person sees |
|---|---|
| Email not on the allow-list | "Trip Builder is invite-only — ask Eyal to add you." No account created. |
| Google credentials missing or misconfigured | "Sign-in is temporarily unavailable" — not a stack trace |
| Opening a trip belonging to someone else | "Not found" — identical to a trip that does not exist |
| Signed in, but their row was removed mid-session | Next action bounces them to the invite-only page |

---

## How this gets verified

Because the privacy boundary is the point of the feature, it gets exercised
against the running app — not just type-checked.

1. Eyal signs in with Google and sees only his own trips.
2. A second test account requests one of Eyal's trips by its id → **404**, and
   the response body reveals nothing about the trip.
3. An email that is not on the allow-list attempts sign-in → refused, **and the
   `users` table gains no row.**
4. Adding a member from the Family screen lets that email sign in; removing them
   blocks it, and their trips remain in the database.
5. A non-admin opening `/family` is refused.

Check 3 is the one that most needs to fail loudly if broken — it is the boundary
between "family app" and "anyone on the internet generating trips on Eyal's
Anthropic key."

---

## Rollout order

The switch has a window where the old login is gone and Google is unproven. To
avoid a lockout:

1. Build the `users` table, the Google provider, and the allow-list check.
2. Verify sign-in works **locally**, against the real Google credentials.
3. Deploy to Vercel and verify sign-in works **there**.
4. Only then delete the credentials provider, `AUTH_USERNAME`, and
   `AUTH_PASSWORD_HASH`.

Eyal's own email must be seeded into `users` as the admin **before** step 2,
otherwise the first sign-in is refused by the very check we are adding and nobody
can get in. Concretely: a small seed script (alongside the existing
`scripts/db-seed.mjs`) inserts one `admin` row for Eyal's Google email, run once
against the live Neon database. His email address is needed as an input — it is
not hardcoded in the repo, which is public.

---

## Known risks

- **Lockout during rollout.** Mitigated by the ordering above and by seeding the
  admin row first. Eyal chose not to keep a password back door, so ordering is
  the only protection.
- **Cost exposure.** Generation now runs on claude-opus-4-8, roughly 5× the
  previous per-trip cost. The allow-list is what keeps that bounded. There are no
  per-user generation limits; if the family uses this heavily, that becomes worth
  revisiting.
- **Google as a single point of failure.** If a family member loses access to
  their Google account, they lose access to Trip Builder. Acceptable for five
  people; it is the trade for having no passwords to manage.

---

## Follow-up work, deliberately excluded

- Sharing a trip with specific family members (the natural next feature)
- Per-user generation limits
- Deleting a removed member's trips (currently they are only hidden)
