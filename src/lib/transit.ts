import { db, transit_cache } from './db';
import { and, eq, gt } from 'drizzle-orm';

interface OSRMResponse {
  routes: Array<{
    distance: number;
    duration: number;
  }>;
  code: string;
}

const TRANSIT_CACHE_HOURS = 24;

/**
 * Get transit time between two locations using OSRM
 * Returns duration in minutes
 */
export async function getTransitTime(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  mode: 'driving' | 'walking' | 'cycling' = 'driving'
): Promise<{
  durationMinutes: number;
  distanceKm: number;
}> {
  // Check cache first
  const cacheKey = `transit_${mode}_${fromLat}_${fromLng}_${toLat}_${toLng}`;
  const cached = await getTransitCache(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    // Use OSRM free service
    const profile = mode === 'walking' ? 'foot' : mode === 'cycling' ? 'bike' : 'car';
    const url = `https://router.project-osrm.org/${profile}/route/v1/${profile}/${fromLng},${fromLat};${toLng},${toLat}?overview=false`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.statusText}`);
    }

    const data: OSRMResponse = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error(`OSRM returned code: ${data.code}`);
    }

    const route = data.routes[0];
    const result = {
      durationMinutes: Math.round(route.duration / 60),
      distanceKm: Math.round((route.distance / 1000) * 10) / 10,
    };

    // Cache the result
    await setTransitCache(cacheKey, result);

    return result;
  } catch (error) {
    console.error('Failed to get transit time:', error);
    // Return estimate based on distance
    const distance = calculateGreatCircleDistance(fromLat, fromLng, toLat, toLng);

    const estimatedMinutes = mode === 'walking'
      ? Math.ceil((distance / 5) * 60) // ~5 km/h walking
      : mode === 'cycling'
        ? Math.ceil((distance / 20) * 60) // ~20 km/h cycling
        : Math.ceil((distance / 60) * 60); // ~60 km/h driving

    return {
      durationMinutes: estimatedMinutes,
      distanceKm: Math.round(distance * 10) / 10,
    };
  }
}

/**
 * Get multi-location transit routing
 */
export async function getMultiLocationRoute(
  locations: Array<{ lat: number; lng: number }>,
  mode: 'driving' | 'walking' | 'cycling' = 'driving'
): Promise<Array<{ from: number; to: number; durationMinutes: number; distanceKm: number }>> {
  const routes: Array<{ from: number; to: number; durationMinutes: number; distanceKm: number }> = [];

  for (let i = 0; i < locations.length - 1; i++) {
    const transit = await getTransitTime(
      locations[i].lat,
      locations[i].lng,
      locations[i + 1].lat,
      locations[i + 1].lng,
      mode
    );

    routes.push({
      from: i,
      to: i + 1,
      durationMinutes: transit.durationMinutes,
      distanceKm: transit.distanceKm,
    });
  }

  return routes;
}

/**
 * Calculate great circle distance between two points (in km)
 */
function calculateGreatCircleDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Cache helper: get transit data
 */
async function getTransitCache(
  key: string
): Promise<{ durationMinutes: number; distanceKm: number } | null> {
  try {
    const cutoff = new Date(Date.now() - TRANSIT_CACHE_HOURS * 60 * 60 * 1000);
    const rows = await db
      .select({
        duration_minutes: transit_cache.duration_minutes,
        distance_km: transit_cache.distance_km,
      })
      .from(transit_cache)
      .where(and(eq(transit_cache.cache_key, key), gt(transit_cache.cached_at, cutoff)))
      .limit(1);

    const data = rows[0];
    if (!data) {
      return null;
    }

    return {
      durationMinutes: data.duration_minutes as number,
      distanceKm: data.distance_km as number,
    };
  } catch {
    return null;
  }
}

/**
 * Cache helper: set transit data
 */
async function setTransitCache(
  key: string,
  data: { durationMinutes: number; distanceKm: number }
): Promise<void> {
  try {
    const row = {
      cache_key: key,
      duration_minutes: data.durationMinutes,
      distance_km: data.distanceKm,
      cached_at: new Date(),
    };
    await db
      .insert(transit_cache)
      .values(row)
      .onConflictDoUpdate({ target: transit_cache.cache_key, set: row });
  } catch (error) {
    console.warn('Failed to cache transit data:', error);
  }
}
