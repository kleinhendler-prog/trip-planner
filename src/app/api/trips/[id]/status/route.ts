/**
 * Trip Generation Status API Route
 * GET: Server-Sent Events stream for generation progress
 */

import { auth } from '@/app/api/auth/config';
import { supabaseServer as supabase } from '@/lib/supabase';


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
    const { data: trip, error: tripError } = await (supabase as any)
      .from('trips')
      .select('userId')
      .eq('id', id)
      .single();

    if (tripError || !trip) {
      return Response.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }

    if (trip.userId !== session.user.id) {
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
          let lastEventId = 0;

          while (!isComplete) {
            const { data: jobs, error: jobsError } = await (supabase as any)
              .from('generation_jobs')
              .select('*')
              .eq('tripId', id)
              .order('createdAt', { ascending: false })
              .limit(1);

            if (jobsError) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Failed to fetch job status' })}\n\n`));
              break;
            }

            if (jobs && jobs.length > 0) {
              const job = jobs[0];

              // Send job status update
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({
                  step: job.currentStep,
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
