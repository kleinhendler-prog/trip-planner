/**
 * Destination Sources API Routes
 * GET: List destination sources with filters
 * POST: Add new source
 *
 * DB rows are snake_case; responses are mapped to the camelCase
 * DestinationSourceInfo shape the sources page renders.
 */

import { auth } from '@/app/api/auth/config';
import { db, destination_sources } from '@/lib/db';
import { and, desc, eq, type SQL } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

function toApiShape(row: any) {
  return {
    id: row.id,
    destinationKey: row.destination_key,
    audienceType: row.audience_type,
    domain: row.domain,
    sourceName: row.source_name,
    focus: row.focus,
    content: row.content,
    sourceUrl: row.source_url,
    trustRating: row.trust_rating,
    addedBy: row.added_by,
    createdBy: row.created_by,
    upvotes: row.upvotes,
    downvotes: row.downvotes,
    active: row.active,
  };
}

/**
 * GET /api/sources
 * List destination sources with optional filters
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { error: 'unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const destinationKey = searchParams.get('destination_key');
    const audienceType = searchParams.get('audience_type');
    const active = searchParams.get('active');

    const conditions: SQL[] = [];
    if (destinationKey) conditions.push(eq(destination_sources.destination_key, destinationKey));
    if (audienceType) conditions.push(eq(destination_sources.audience_type, audienceType));
    if (active !== null) conditions.push(eq(destination_sources.active, active === 'true'));

    const rows = await db
      .select()
      .from(destination_sources)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(destination_sources.trust_rating), desc(destination_sources.upvotes));

    return Response.json(rows.map(toApiShape));
  } catch (error) {
    console.error('GET /api/sources error:', error);
    return Response.json(
      { error: 'Failed to fetch sources' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sources
 * Add a new destination source
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { error: 'unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json() as any;
    const destinationKey = body.destination_key || body.destinationKey;

    if (!destinationKey) {
      return Response.json(
        { error: 'Missing required field: destination_key' },
        { status: 400 }
      );
    }

    const inserted = await db
      .insert(destination_sources)
      .values({
        id: uuidv4(),
        destination_key: destinationKey,
        audience_type: body.audience_type || body.audienceType || 'general',
        domain: body.domain,
        source_name: body.source_name || body.sourceName,
        focus: body.focus,
        content: body.content,
        source_url: body.source_url || body.sourceUrl,
        trust_rating: body.trust_rating || body.trustRating || 'medium',
        added_by: 'user_approved',
        created_by: session.user.id,
        upvotes: 0,
        downvotes: 0,
        active: true,
      })
      .returning();

    return Response.json(toApiShape(inserted[0]), { status: 201 });
  } catch (error) {
    console.error('POST /api/sources error:', error);
    return Response.json(
      { error: 'Failed to create source' },
      { status: 500 }
    );
  }
}
