import { supabase } from './supabase';
import type { PlaceSearchResult } from '@/types/index';

const GOOGLE_PLACES_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
const CACHE_TTL_DAYS = 30;

interface GooglePlacesResponse {
  results: GooglePlace[];
  status: string;
  next_page_token?: string;
}

interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
  types: string[];
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  opening_hours?: {
    weekday_text: string[];
  };
  price_level?: number;
  website?: string;
  formatted_phone_number?: string;
}

interface AutocompleteResponse {
  predictions: AutocompletePrediction[];
  status: string;
}

interface AutocompletePrediction {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text?: string;
}

interface PlaceDetailsResponse {
  result: GooglePlace;
  status: string;
}

/**
 * Search for places using Google Places API with caching
 */
export async function searchPlaces(
  query: string,
  type: 'restaurant' | 'hotel' | 'attraction' | 'activity' = 'attraction',
  location?: { lat: number; lng: number },
  radius?: number
): Promise<PlaceSearchResult[]> {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error('Google Places API key not configured');
  }

  // Generate cache key
  const cacheKey = `places_${type}_${query}_${location ? `${location.lat}_${location.lng}` : 'global'}`;

  // Check cache first
  const cachedData = await getCachedPlace(cacheKey);
  if (cachedData) {
    return [cachedData];
  }

  // Build API URL
  let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?key=${GOOGLE_PLACES_API_KEY}&query=${encodeURIComponent(query)}`;

  // Map type to Google Places type
  const typeMap: Record<string, string> = {
    restaurant: 'restaurant',
    hotel: 'lodging',
    attraction: 'tourist_attraction|point_of_interest|park|museum|art_gallery|landmark',
    activity: 'amusement_park|aquarium|bowling_alley|golf_course|gym|stadium',
  };

  const searchTypes = typeMap[type];
  if (searchTypes) {
    url += `&type=${searchTypes}`;
  }

  if (location && radius) {
    url += `&location=${location.lat},${location.lng}&radius=${radius}`;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.statusText}`);
    }

    const data: GooglePlacesResponse = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Places API returned status: ${data.status}`);
    }

    // Transform results
    const results: PlaceSearchResult[] = data.results.slice(0, 10).map((place) => ({
      name: place.name,
      address: place.formatted_address,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      rating: place.rating,
      reviewCount: place.user_ratings_total,
      priceLevel: place.price_level,
      photoUrl: place.photos?.[0]
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${GOOGLE_PLACES_API_KEY}`
        : undefined,
    }));

    // Cache first result
    if (results.length > 0) {
      await cachePlace(cacheKey, results[0]);
    }

    return results;
  } catch (error) {
    throw new Error(
      `Failed to search places: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Autocomplete city/destination names
 */
export async function autocompleteCity(
  input: string
): Promise<{ name: string; placeId: string }[]> {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error('Google Places API key not configured');
  }

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?key=${GOOGLE_PLACES_API_KEY}&input=${encodeURIComponent(input)}&types=(cities)`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Autocomplete API error: ${response.statusText}`);
    }

    const data: AutocompleteResponse = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Autocomplete API returned status: ${data.status}`);
    }

    return data.predictions.slice(0, 5).map((pred) => ({
      name: pred.description,
      placeId: pred.place_id,
    }));
  } catch (error) {
    throw new Error(
      `Failed to autocomplete cities: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get place details including photos
 */
export async function getPlaceDetails(
  placeId: string
): Promise<PlaceSearchResult> {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error('Google Places API key not configured');
  }

  // Check cache
  const cachedData = await getCachedPlace(`place_${placeId}`);
  if (cachedData) {
    return cachedData;
  }

  const url = `https://maps.googleapis.com/maps/api/place/details/json?key=${GOOGLE_PLACES_API_KEY}&place_id=${placeId}&fields=name,formatted_address,geometry,rating,user_ratings_total,website,formatted_phone_number,price_level,photos,types`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Place details API error: ${response.statusText}`);
    }

    const data: PlaceDetailsResponse = await response.json();

    if (data.status !== 'OK') {
      throw new Error(`Place details API returned status: ${data.status}`);
    }

    const place = data.result;
    const result: PlaceSearchResult = {
      name: place.name,
      address: place.formatted_address,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      rating: place.rating,
      reviewCount: place.user_ratings_total,
      priceLevel: place.price_level,
      photoUrl: place.photos?.[0]
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${GOOGLE_PLACES_API_KEY}`
        : undefined,
    };

    // Cache it
    await cachePlace(`place_${placeId}`, result);

    return result;
  } catch (error) {
    throw new Error(
      `Failed to get place details: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Cache helper: get from database
 */
async function getCachedPlace(
  key: string
): Promise<PlaceSearchResult | null> {
  try {
    const { data, error } = await (supabase as any)
      .from('places_cache')
      .select('*')
      .eq('googlePlacesId', key)
      .gt('cached_at', new Date(Date.now() - CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString())
      .maybeSingle();

    if (error) {
      console.warn('Cache read error:', error);
      return null;
    }

    if (data) {
      return {
        name: data.name,
        address: data.address,
        lat: data.lat,
        lng: data.lng,
        rating: data.rating,
        reviewCount: data.reviewCount,
        priceLevel: data.priceLevel,
        photoUrl: data.photos?.[0] || undefined,
      };
    }

    return null;
  } catch (error) {
    console.warn('Cache read failed:', error);
    return null;
  }
}

/**
 * Cache helper: write to database
 */
async function cachePlace(
  googlePlacesId: string,
  data: PlaceSearchResult
): Promise<void> {
  try {
    await (supabase as any)
      .from('places_cache')
      .insert({
        googlePlacesId,
        name: data.name,
        address: data.address,
        lat: data.lat,
        lng: data.lng,
        placeType: 'attraction',
        rating: data.rating,
        reviewCount: data.reviewCount,
        priceLevel: data.priceLevel,
        photos: data.photoUrl ? [data.photoUrl] : undefined,
      });
  } catch (error) {
    console.warn('Cache write failed:', error);
    // Don't fail the request if caching fails
  }
}
