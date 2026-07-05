/**
 * Inbound Email Webhook API Route
 * POST: Webhook for inbound email - validates token and parses content
 * NO session check - validates by token in recipient address
 */

import { callClaudeJSON } from '@/lib/claude';
import { db, trips, trip_confirmations } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

interface InboundEmailRequest {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * POST /api/inbound-email
 * Process inbound email webhook
 * Expected token in To address like: confirm-{trip_id}-{token}@app.domain
 */
export async function POST(request: Request) {
  try {
    const body = await request.json() as InboundEmailRequest;

    // Validate required fields
    if (!body.from || !body.to || !body.text) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Extract trip_id and token from recipient email
    // Expected format: confirm-{trip_id}-{token}@domain
    const toMatch = body.to.match(/confirm-([^-]+)-([^@]+)@/);
    if (!toMatch || toMatch.length < 3) {
      return Response.json(
        { error: 'Invalid recipient address format' },
        { status: 400 }
      );
    }

    const tripId = toMatch[1];
    const providedToken = toMatch[2];

    // Verify token matches trip's email token
    const tripRows = await db
      .select({
        id: trips.id,
        email_confirmation_token: trips.email_confirmation_token,
        email_confirmed_at: trips.email_confirmed_at,
      })
      .from(trips)
      .where(eq(trips.id, tripId));
    const trip = tripRows[0];

    if (!trip) {
      return Response.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }

    // Validate token
    if (trip.email_confirmation_token !== providedToken) {
      return Response.json(
        { error: 'Invalid confirmation token' },
        { status: 401 }
      );
    }

    // Parse email content using Claude
    const parsedEmail = await parseEmailContent(
      body.from,
      body.subject,
      body.text,
      body.html
    );

    // Create trip confirmation record
    await db.insert(trip_confirmations).values({
      id: uuidv4(),
      trip_id: tripId,
      confirmed_by: body.from,
      confirmation_type: parsedEmail.type || 'email_response',
      content: {
        subject: body.subject,
        from: body.from,
        originalText: body.text,
        parsedContent: parsedEmail,
      },
      confirmed: true,
      confirmed_at: new Date(),
    });

    // Update trip with confirmation status
    await db
      .update(trips)
      .set({
        email_confirmed_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(trips.id, tripId));

    return Response.json({
      success: true,
      tripId: tripId,
      confirmedBy: body.from,
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/inbound-email error:', error);
    return Response.json(
      { error: 'Failed to process email' },
      { status: 500 }
    );
  }
}

/**
 * Parse email content to extract confirmation/changes using Claude
 */
async function parseEmailContent(
  from: string,
  subject: string,
  text: string,
  html?: string
): Promise<any> {
  try {
    const prompt = `Parse this email response for a trip confirmation.

From: ${from}
Subject: ${subject}

Content:
${text}

Return a JSON object with type, summary, confirmsTrip, changesRequested, questions, and sentiment fields.`;

    const parsed = await callClaudeJSON(prompt);
    return parsed;
  } catch (error) {
    console.error('Error parsing email:', error);
    return {
      type: 'email_response',
      summary: 'Email received',
      confirmsTrip: true,
    };
  }
}
