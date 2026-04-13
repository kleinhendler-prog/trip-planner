/**
 * Destination Sources API Routes
 * GET: List destination sources with filters
 * POST: Add new source
 */

import { auth } from '@/app/api/auth/config';
import { supabaseServer as supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

interface GetParams {
  destination_key?: string;
  audience_type?: string;
  trust_rating?: number;
  active?: boolean;
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
    const trustRating = searchParams.get('trust_rating');
    const active = searchParams.get('active');

    let query = supabase.from('destination_sources').select('*');

    if (destinationKey) {
      query = query.eq('destination_key', destinationKey);
    }

    if (audienceType) {
      query = query.eq('audience_type', audienceType);
    }

    if (trustRating) {
      query = query.gte('trust_rating', parseInt(trustRating, 10));
    }

    if (active !== null) {
      query = query.eq('active', active === 'true');
    }

    const { data: sources, error } = await query.order('trust_rating', { ascending: false });

    if (error) {
      throw error;
    }

    return Response.json(sources || []);
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

    if (!body.destination_key || !body.content) {
      return Response.json(
        { error: 'Missing required fields: destination_key, content' },
        { status: 400 }
      );
    }

    const sourceData = {
      id: uuidv4(),
      destination_key: body.destination_key,
      audience_type: body.audience_type || 'general',
      content: body.content,
      source_url: body.source_url,
      trust_rating: body.trust_rating || 5, // Default to 5 stars
      upvotes: 0,
      downvotes: 0,
      active: true,
      createdBy: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const { data, error } = await (supabase as any)
      .from('destination_sources')
      .insert([sourceData as any])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return Response.json(data, { status: 201 });
  } catch (error) {
    console.error('POST /api/sources error:', error);
    return Response.json(
      { error: 'Failed to create source' },
      { status: 500 }
    );
  }
}
