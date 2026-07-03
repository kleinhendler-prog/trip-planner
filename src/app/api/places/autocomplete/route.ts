/**
 * Places Autocomplete API Route
 * POST: Server-side proxy for Google Places Autocomplete
 */

import { searchPlaces } from '@/lib/google-places';

interface AutocompleteRequest {
  input: string;
}

/**
 * POST /api/places/autocomplete
 * Get place predictions from Google Places API
 */
export async function POST(request: Request) {
  try {
    const { input } = await request.json() as AutocompleteRequest;

    if (!input || input.trim().length === 0) {
      return Response.json(
        { error: 'Input is required' },
        { status: 400 }
      );
    }

    // Call Google Places Autocomplete
    const predictions = await searchPlaces(input);

    return Response.json({
      predictions: predictions || [],
    });
  } catch (error) {
    console.error('POST /api/places/autocomplete error:', error);
    return Response.json(
      { error: 'Failed to fetch predictions' },
      { status: 500 }
    );
  }
}
