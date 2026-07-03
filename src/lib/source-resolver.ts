import { supabase } from './supabase';
import type { DestinationSourceInfo } from '@/types/index';

/**
 * Get trusted sources for a destination
 */
export async function getDestinationSources(
  destinationKey: string,
  audienceType: string = 'general'
): Promise<DestinationSourceInfo[]> {
  try {
    const { data, error } = await (supabase as any)
      .from('destination_sources')
      .select(
        'id,destination_key,audience_type,domain,source_name,focus,trust_rating,active'
      )
      .eq('destination_key', destinationKey)
      .eq('audience_type', audienceType)
      .eq('active', true)
      .order('trust_rating', { ascending: false })
      .order('upvotes', { ascending: false });

    if (error) {
      console.warn('Failed to fetch destination sources:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      destinationKey: row.destination_key,
      audienceType: row.audience_type,
      domain: row.domain,
      sourceName: row.source_name,
      focus: row.focus,
      trustRating: row.trust_rating as 'high' | 'medium' | 'low',
      active: row.active,
    }));
  } catch (error) {
    console.error('Error resolving destination sources:', error);
    return [];
  }
}

/**
 * Get high-trust sources only
 */
export async function getTrustedDestinationSources(
  destinationKey: string,
  audienceType: string = 'general'
): Promise<DestinationSourceInfo[]> {
  const sources = await getDestinationSources(destinationKey, audienceType);
  return sources.filter((s) => s.trustRating === 'high');
}

/**
 * Get sources by focus area (e.g., 'restaurants', 'museums', 'hotels')
 */
export async function getSourcesByFocus(
  destinationKey: string,
  focus: string,
  audienceType: string = 'general'
): Promise<DestinationSourceInfo[]> {
  const sources = await getDestinationSources(destinationKey, audienceType);
  return sources.filter((s) => s.focus && s.focus.toLowerCase().includes(focus.toLowerCase()));
}

/**
 * Vote on a source (upvote/downvote)
 */
export async function voteOnSource(
  sourceId: string,
  vote: 'up' | 'down'
): Promise<void> {
  try {
    if (vote === 'up') {
      await (supabase as any).rpc('increment_source_upvotes', { source_id: sourceId });
    } else {
      await (supabase as any).rpc('increment_source_downvotes', { source_id: sourceId });
    }
  } catch (error) {
    console.error('Failed to vote on source:', error);
  }
}

/**
 * Add a new destination source
 */
export async function addDestinationSource(
  source: Omit<DestinationSourceInfo, 'id'>
): Promise<DestinationSourceInfo | null> {
  try {
    const { data, error } = await (supabase as any)
      .from('destination_sources')
      .insert({
        destination_key: source.destinationKey,
        audience_type: source.audienceType,
        domain: source.domain,
        source_name: source.sourceName,
        focus: source.focus,
        trust_rating: source.trustRating,
        active: source.active,
        added_by: 'user_approved',
      })
      .select()
      .single();

    if (error) {
      console.warn('Failed to add destination source:', error);
      return null;
    }

    return {
      id: data.id,
      destinationKey: data.destination_key,
      audienceType: data.audience_type,
      domain: data.domain,
      sourceName: data.source_name,
      focus: data.focus,
      trustRating: data.trust_rating as 'high' | 'medium' | 'low',
      active: data.active,
    };
  } catch (error) {
    console.error('Error adding destination source:', error);
    return null;
  }
}

/**
 * Get default sources for common destinations
 */
export function getDefaultSources(destination: string): DestinationSourceInfo[] {
  const destinationLower = destination.toLowerCase();

  const defaultSources: Record<string, DestinationSourceInfo[]> = {
    paris: [
      {
        id: 'paris-1',
        destinationKey: 'paris',
        audienceType: 'general',
        domain: 'michelin-guide.com',
        sourceName: 'Michelin Guide',
        focus: 'restaurants',
        trustRating: 'high',
        active: true,
      },
      {
        id: 'paris-2',
        destinationKey: 'paris',
        audienceType: 'general',
        domain: 'louvre.fr',
        sourceName: 'Louvre Museum',
        focus: 'museums',
        trustRating: 'high',
        active: true,
      },
      {
        id: 'paris-3',
        destinationKey: 'paris',
        audienceType: 'general',
        domain: 'paris-tourism.com',
        sourceName: 'Paris Tourism Board',
        focus: 'attractions',
        trustRating: 'high',
        active: true,
      },
    ],
    tokyo: [
      {
        id: 'tokyo-1',
        destinationKey: 'tokyo',
        audienceType: 'general',
        domain: 'gotokyo.org',
        sourceName: 'Tokyo Tourism',
        focus: 'attractions',
        trustRating: 'high',
        active: true,
      },
      {
        id: 'tokyo-2',
        destinationKey: 'tokyo',
        audienceType: 'general',
        domain: 'michelin-guide.com',
        sourceName: 'Michelin Guide',
        focus: 'restaurants',
        trustRating: 'high',
        active: true,
      },
    ],
    newyork: [
      {
        id: 'ny-1',
        destinationKey: 'newyork',
        audienceType: 'general',
        domain: 'nycgo.com',
        sourceName: 'NYC Tourism',
        focus: 'attractions',
        trustRating: 'high',
        active: true,
      },
      {
        id: 'ny-2',
        destinationKey: 'newyork',
        audienceType: 'general',
        domain: 'michelin-guide.com',
        sourceName: 'Michelin Guide',
        focus: 'restaurants',
        trustRating: 'high',
        active: true,
      },
    ],
  };

  // Return default sources for destination, or empty array
  for (const key in defaultSources) {
    if (destinationLower.includes(key) || key.includes(destinationLower)) {
      return defaultSources[key];
    }
  }

  return [];
}
