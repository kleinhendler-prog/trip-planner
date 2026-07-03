/**
 * Duplicate Trip API Route
 * POST: Duplicate trip as new draft
 */

import { auth } from '@/app/api/auth/config';
import { supabaseServer as supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';


/**
 * POST /api/trips/[id]/duplicate
 * Create a copy of the trip as a new draft
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

    // Verify trip belongs to user and get full details
    const { data: trip, error: tripError } = await (supabase as any)
      .from('trips')
      .select(`
        *,
        days (
          *,
          activities (*),
          meals (*)
        )
      `)
      .eq('id', id)
      .eq('userId', session.user.id)
      .single();

    if (tripError || !trip) {
      return Response.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }

    const newTripId = uuidv4();
    const now = new Date();

    // Create new trip with copied data
    const newTripData = {
      id: newTripId,
      userId: session.user.id,
      title: `${trip.title} (Copy)`,
      destination: trip.destination,
      destinationCoordinates: trip.destinationCoordinates,
      startDate: trip.startDate,
      endDate: trip.endDate,
      travelers: trip.travelers,
      tripType: trip.tripType,
      preferences: trip.preferences,
      status: 'planning', // Draft status
      notes: trip.notes,
      createdAt: now,
      updatedAt: now,
    };

    const { error: insertTripError } = await (supabase as any)
      .from('trips')
      .insert([newTripData as any]);

    if (insertTripError) {
      throw insertTripError;
    }

    // Copy days and their activities/meals
    if (trip.days && trip.days.length > 0) {
      for (const day of trip.days) {
        const newDayId = uuidv4();

        const newDayData = {
          id: newDayId,
          tripId: newTripId,
          date: day.date,
          dayNumber: day.dayNumber,
          theme: day.theme,
          notes: day.notes,
          weather: day.weather,
          colorHex: day.colorHex,
        };

        const { error: insertDayError } = await (supabase as any)
          .from('days')
          .insert([newDayData as any]);

        if (insertDayError) {
          throw insertDayError;
        }

        // Copy activities
        if (day.activities && day.activities.length > 0) {
          const activitiesToInsert = day.activities.map((activity: any) => ({
            id: uuidv4(),
            dayId: newDayId,
            title: activity.title,
            description: activity.description,
            type: activity.type,
            location: activity.location,
            googlePlacesId: activity.googlePlacesId,
            startTime: activity.startTime,
            endTime: activity.endTime,
            duration: activity.duration,
            estimatedCost: activity.estimatedCost,
            notes: activity.notes,
            bookingUrl: activity.bookingUrl,
            externalLinks: activity.externalLinks,
            order: activity.order,
          }));

          const { error: insertActivitiesError } = await (supabase as any)
            .from('activities')
            .insert(activitiesToInsert as any);

          if (insertActivitiesError) {
            throw insertActivitiesError;
          }
        }

        // Copy meals
        if (day.meals && day.meals.length > 0) {
          const mealsToInsert = day.meals.map((meal: any) => ({
            id: uuidv4(),
            dayId: newDayId,
            type: meal.type,
            restaurant: meal.restaurant,
            startTime: meal.startTime,
            estimatedCost: meal.estimatedCost,
            notes: meal.notes,
            order: meal.order,
          }));

          const { error: insertMealsError } = await (supabase as any)
            .from('meals')
            .insert(mealsToInsert as any);

          if (insertMealsError) {
            throw insertMealsError;
          }
        }
      }
    }

    return Response.json({
      success: true,
      trip_id: newTripId,
    }, { status: 201 });
  } catch (error) {
    console.error(`POST /api/trips/[id]/duplicate error:`, error);
    return Response.json(
      { error: 'Failed to duplicate trip' },
      { status: 500 }
    );
  }
}
