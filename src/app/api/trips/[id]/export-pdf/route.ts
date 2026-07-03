/**
 * Export Trip as PDF API Route
 * POST: Return HTML string pre-rendered for print/PDF
 */

import { auth } from '@/app/api/auth/config';
import { supabaseServer as supabase } from '@/lib/supabase';


/**
 * POST /api/trips/[id]/export-pdf
 * Returns HTML string formatted for A4 PDF printing
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

    // Verify trip belongs to user
    const { data: trip, error: tripError } = await supabase
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

    // Generate HTML for PDF
    const html = generatePrintHTML(trip);

    return Response.json({ html });
  } catch (error) {
    console.error(`POST /api/trips/[id]/export-pdf error:`, error);
    return Response.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

/**
 * Generate HTML content formatted for A4 printing
 */
function generatePrintHTML(trip: any): string {
  const startDate = new Date(trip.startDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const endDate = new Date(trip.endDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const daysHTML = (trip.days || [])
    .sort((a: any, b: any) => a.dayNumber - b.dayNumber)
    .map((day: any) => {
      const dayDate = new Date(day.date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });

      const activitiesHTML = (day.activities || [])
        .sort((a: any, b: any) => a.order - b.order)
        .map((activity: any) => `
          <div style="margin-bottom: 12px; padding: 10px; background-color: #f9f9f9; border-left: 3px solid #007bff;">
            <p style="margin: 0; font-weight: 600; color: #333;">
              ${activity.startTime ? `${activity.startTime} - ` : ''}${activity.title}
            </p>
            <p style="margin: 4px 0; font-size: 14px; color: #666;">
              ${activity.type} ${activity.location?.name ? `• ${activity.location.name}` : ''}
            </p>
            ${activity.description ? `<p style="margin: 4px 0; font-size: 13px; color: #555;">${activity.description}</p>` : ''}
            ${activity.estimatedCost ? `<p style="margin: 4px 0; font-size: 13px; color: #007bff;">Cost: $${activity.estimatedCost}</p>` : ''}
          </div>
        `).join('');

      const mealsHTML = (day.meals || [])
        .sort((a: any, b: any) => a.order - b.order)
        .map((meal: any) => `
          <div style="margin-bottom: 8px; padding: 8px; background-color: #fff8f0; border-left: 3px solid #ff6b35;">
            <p style="margin: 0; font-weight: 600; color: #333;">
              ${meal.type.charAt(0).toUpperCase() + meal.type.slice(1)}: ${meal.restaurant?.name}
            </p>
            <p style="margin: 2px 0; font-size: 12px; color: #666;">
              ${meal.restaurant?.cuisine?.join(', ') || ''} ${meal.restaurant?.rating ? `• ⭐ ${meal.restaurant.rating}` : ''}
            </p>
          </div>
        `).join('');

      return `
        <div style="page-break-inside: avoid; margin-bottom: 24px; padding: 20px; background-color: #f5f5f5; border-radius: 8px;">
          <h2 style="margin: 0 0 16px 0; color: #222; font-size: 20px;">
            Day ${day.dayNumber} • ${dayDate}
          </h2>

          ${day.weather ? `
            <p style="margin: 0 0 12px 0; font-size: 13px; color: #666;">
              🌤 ${day.weather.condition} • High: ${day.weather.highTemp}°C, Low: ${day.weather.lowTemp}°C
            </p>
          ` : ''}

          <h3 style="margin: 12px 0 8px 0; color: #444; font-size: 15px;">Activities</h3>
          ${activitiesHTML}

          ${mealsHTML ? `
            <h3 style="margin: 12px 0 8px 0; color: #444; font-size: 15px;">Meals</h3>
            ${mealsHTML}
          ` : ''}

          ${day.notes ? `<p style="margin: 12px 0 0 0; font-size: 13px; color: #666; font-style: italic;">${day.notes}</p>` : ''}
        </div>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${trip.title}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        @page {
          size: A4;
          margin: 20mm;
        }
        @media print {
          body {
            background: white;
          }
          a {
            color: #007bff;
            text-decoration: underline;
          }
        }
        .header {
          text-align: center;
          margin-bottom: 32px;
          border-bottom: 3px solid #007bff;
          padding-bottom: 20px;
        }
        .header h1 {
          font-size: 32px;
          color: #222;
          margin-bottom: 8px;
        }
        .trip-info {
          display: flex;
          justify-content: center;
          gap: 24px;
          font-size: 14px;
          color: #666;
        }
        .trip-info span {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .content {
          max-width: 800px;
          margin: 0 auto;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${trip.title}</h1>
        <div class="trip-info">
          <span>📍 ${trip.destination}</span>
          <span>📅 ${startDate} - ${endDate}</span>
          <span>👥 ${trip.travelers} traveler${trip.travelers !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div class="content">
        ${daysHTML}
      </div>
    </body>
    </html>
  `;
}
