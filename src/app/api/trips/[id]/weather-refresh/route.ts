/**
 * Weather Refresh API Route
 * POST: Re-fetch weather forecast and update trip
 */

import { auth } from '@/app/api/auth/config';
import { supabaseServer as supabase } from '@/lib/supabase';
import { getDailyForecast } from '@/lib/weather';


/**
 * POST /api/trips/[id]/weather-refresh
 * Re-fetch weather forecast for the trip dates
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json(
        { error: 'unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Verify trip belongs to user and get its details
    const { data: trip, error: tripError } = await (supabase as any)
      .from('trips')
      .select(`
        *,
        days (id, date, dayNumber)
      `)
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (tripError || !trip) {
      return Response.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }

    // Fetch weather for destination
    const weatherData: any[] = [];
    const days = trip.days || [];

    if (days.length > 0) {
      try {
        // Get start and end dates from trip
        const startDate = days[0]?.date ? new Date(days[0].date).toISOString().split('T')[0] : '';
        const endDate = days[days.length - 1]?.date ? new Date(days[days.length - 1].date).toISOString().split('T')[0] : '';

        const forecast = await getDailyForecast(
          trip.destinationCoordinates?.lat || 0,
          trip.destinationCoordinates?.lng || 0,
          startDate,
          endDate
        );

        weatherData.push(...forecast);

        // Update trip with new weather data
      } catch (error) {
        console.error(`Failed to fetch weather:`, error);
      }
    }

    // Update trip with new weather data
    const { error: updateError } = await (supabase as any)
      .from('trips')
      .update({
        weather_data: weatherData,
        updatedAt: new Date(),
      })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    return Response.json({
      success: true,
      weather_data: weatherData,
    });
  } catch (error) {
    console.error(`POST /api/trips/[id]/weather-refresh error:`, error);
    return Response.json(
      { error: 'Failed to refresh weather' },
      { status: 500 }
    );
  }
}
