# Finish The Job Skill — Improvement: The Simplification Trap

Add this as a new Critical Rule in the skill:

---

### The Simplification Trap (CRITICAL)

The #1 real-world failure mode is not laziness — it's **emergency simplification**. When
a build hits real-world problems (API timeouts, model errors, deployment issues), the natural
response is to simplify: replace a 7-step pipeline with a one-shot call, remove components
and render inline, skip API integrations and hardcode data. This is FINE as a temporary fix
to unblock progress. But the skill MUST enforce a **debt recovery phase**:

1. **DEBT.md tracking**: Every time you simplify, stub, or bypass a requirement to fix a
   real-world problem, IMMEDIATELY log it in DEBT.md with: what was simplified, why, what
   the spec originally required, and what needs to happen to restore it. This takes 30 seconds
   and prevents the "we forgot we simplified this" amnesia.

2. **Dead code detection**: After any major simplification, grep for components/functions that
   are no longer imported anywhere. These are red flags — they represent work that was built
   then disconnected. Log them in DEBT.md.

3. **Mandatory debt review**: Before declaring ANY chunk complete, re-read DEBT.md. If there
   are outstanding items that could be addressed now, address them. The debt list must be
   empty or explicitly deferred (with user approval) before the job is "done."

4. **The "file exists ≠ feature works" rule**: A component file existing in the codebase is
   NOT evidence of implementation. The feature is implemented ONLY if: (a) the component is
   imported and rendered in a live code path, (b) the data it needs is actually provided,
   and (c) a user can interact with it. During audits, verify the IMPORT CHAIN, not just
   file existence.

5. **Post-crisis reconnection**: After stabilizing from any emergency simplification, the
   NEXT action (before any new features) must be reconnecting the simplified components.
   Never move forward while debt accumulates behind you.
