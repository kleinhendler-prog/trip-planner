/**
 * NOT IMPLEMENTED — this route was built for the original relational data
 * model (days/activities/meals tables) that was replaced by the JSONB
 * itinerary in April 2026, and it has been non-functional since. It was
 * stubbed during the Neon migration (2026-07-04) instead of being ported.
 * (The trip page's Export PDF button uses the browser print dialog, not
 * this route.)
 */

export async function POST() {
  return Response.json(
    { error: 'This feature is not available — it needs rebuilding for the current data model.' },
    { status: 501 }
  );
}
