/**
 * Trip Generation Status API Route
 * GET: Server-Sent Events stream for generation progress
 */

import { auth } from '@/app/api/auth/config';
import { db, trips, generation_jobs } from '@/lib/db';
import { desc, eq } from 'drizzle-orm';

/**
 * GET /api/trips/[id]/status
 * Stream generation progress as Server-Sent Events
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    const rows = await db
      .select({ user_id: trips.user_id })
      .from(trips)
      .where(eq(trips.id, id));
    const trip = rows[0];

    if (!trip) {
      return Response.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }

    if (trip.user_id !== session.user.id) {
      return Response.json(
        { error: 'unauthorized' },
        { status: 401 }
      );
    }

    // Create ReadableStream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          // Poll for generation jobs
          let isComplete = false;

          while (!isComplete) {
            let jobs;
            try {
              jobs = await db
                .select()
                .from(generation_jobs)
                .where(eq(generation_jobs.trip_id, id))
                .orderBy(desc(generation_jobs.created_at))
                .limit(1);
            } catch {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Failed to fetch job status' })}\n\n`));
              break;
            }

            if (jobs && jobs.length > 0) {
              const job = jobs[0];

              // Send job status update
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({
                  step: job.step,
                  status: job.status,
                  progress: job.progress || 0,
                  error: job.error,
                })}\n\n`
              ));

              // Check if job is complete
              if (job.status === 'completed' || job.status === 'failed') {
                isComplete = true;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ complete: true })}\n\n`));
                controller.close();
              }
            } else {
              // No job yet, send pending status
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ step: 'pending', status: 'pending', progress: 0 })}\n\n`
              ));
            }

            // Poll every 1 second
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.error('SSE error:', error);
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ error: 'Stream error' })}\n\n`
          ));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error(`GET /api/trips/[id]/status error:`, error);
    return Response.json(
      { error: 'Failed to stream status' },
      { status: 500 }
    );
  }
}
