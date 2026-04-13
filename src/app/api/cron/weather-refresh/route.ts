/**
 * Weather Refresh Cron Job API Route
 * GET: Vercel Cron handler - refreshes weather for in-progress trips
 * NO session check - validates by CRON_SECRET header
 */

import { supabaseServer as supabase } from '@/lib/supabase';
import { getDailyForecast } from '@/lib/weather';

/**
 * GET /api/cron/weather-refresh
 * Vercel Cron job handler
 * Validates CRON_SECRET header and refreshes forecasts
 */
export async function GET(request: Request) {
  try {
    // Validate cron secret
    const cronSecret = request.headers.get('x-vercel-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret || cronSecret !== expectedSecret) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find all in-progress trips
    const { data: trips, error: tripsError } = await (supabase as any)
      .from('trips')
      .select(`
        id,
        destination,
        destinationLat,
        destinationLng,
        days (id, date)
      `)
      .in('status', ['generating', 'generated', 'planning'])
      .lte('start_date', new Date().toISOString())
      .gte('end_date', new Date().toISOString());

    if (tripsError) {
      throw tripsError;
    }

    if (!trips || trips.length === 0) {
      return Response.json({
        success: true,
        refreshed: 0,
        message: 'No active trips to refresh',
      });
    }

    let refreshedCount = 0;

    // Refresh weather for each trip
    for (const trip of trips) {
      try {
        const days = trip.days || [];
        const weatherData: any[] = [];

        for (const day of days) {
          try {
            // Only fetch weather if we have coordinates
            if (!trip.destinationLat || !trip.destinationLng) {
              continue;
            }

            const dayDate = new Date(day.date);
            const nextDate = new Date(dayDate);
            nextDate.setDate(nextDate.getDate() + 1);

            const startDateStr = dayDate.toISOString().split('T')[0];
            const endDateStr = nextDate.toISOString().split('T')[0];

            const forecast = await getDailyForecast(
              trip.destinationLat,
              trip.destinationLng,
              startDateStr,
              endDateStr
            );

            if (forecast && forecast.length > 0) {
              weatherData.push({
                ...forecast[0],
                date: day.date,
              });
            }

            // Update individual day
            if (day.id) {
              await (supabase as any)
                .from('days')
                .update({ weather: forecast })
                .eq('id', day.id);
            }
          } catch (dayError) {
            console.error(
              `Failed to fetch weather for trip ${trip.id} on ${day.date}:`,
              dayError
            );
          }
        }

        // Update trip
        if (weatherData.length > 0) {
          await (supabase as any)
            .from('trips')
            .update({
              weather_data: weatherData,
              updatedAt: new Date(),
            })
            .eq('id', trip.id);

          refreshedCount++;
        }
      } catch (tripError) {
        console.error(`Failed to refresh weather for trip ${trip.id}:`, tripError);
      }
    }

    return Response.json({
      success: true,
      refreshed: refreshedCount,
      total: trips.length,
      message: `Refreshed weather for ${refreshedCount} trips`,
    });
  } catch (error) {
    console.error('GET /api/cron/weather-refresh error:', error);
    return Response.json(
      { error: 'Cron job failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
