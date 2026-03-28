import { NextRequest, NextResponse } from 'next/server';
import { understandQuery, enhanceQueryForN8N } from '@/lib/gemini';
import { run, get } from '@/lib/db';

/**
 * Ringg AI Webhook - receives phone call queries
 *
 * Authentication flow:
 * 1. Caller's phone number is matched against users.phoneNumber
 * 2. If matched → automatically authenticated, queries processed
 * 3. If not matched → ask for roll number as fallback
 * 4. If roll number provided → lookup and process
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Phone webhook received:', JSON.stringify(body).substring(0, 500));

    // Ringg AI sends different event types
    const eventType = body.event_type;

    // For call_completed / all_processing_completed events, log the call
    if (eventType === 'call_completed' || eventType === 'all_processing_completed') {
      console.log('Call completed event:', {
        callId: body.call_id,
        duration: body.call_duration,
        status: body.status,
      });

      // Extract transcript and process it
      const transcript = body.transcript || '';
      if (transcript && body.phone_number) {
        // Try to find user by phone number and log the conversation
        const user = get(
          'SELECT id FROM users WHERE phoneNumber = ?',
          [normalizePhone(body.phone_number)]
        ) as { id: number } | undefined;

        if (user) {
          try {
            run(
              'INSERT INTO conversations (userId, query, response, intent, confidence) VALUES (?, ?, ?, ?, ?)',
              [user.id, `[Phone Call] ${transcript}`, body.summary || 'Phone call completed', 'phone_call', 1.0]
            );
          } catch (e) { /* ignore */ }
        }
      }

      return NextResponse.json({ status: 'logged' });
    }

    // For real-time query processing (if Ringg supports tool calls)
    const userQuery = body.transcript || body.text || body.query || body.message || '';
    const callerPhone = body.phone_number || body.from || body.caller_id || '';
    const rollNumber = body.rollNumber || body.roll_number || body.metadata?.rollNumber || '';

    if (!userQuery) {
      return NextResponse.json({
        response: "I didn't catch that. Could you please repeat your question?",
      });
    }

    // Phone-number-based authentication (strict)
    // The caller's phone number MUST match a registered user's phoneNumber in the DB.
    // If no match → reject the call. No fallback to roll number for phone calls.
    let userId: number | null = null;
    let userRollNumber: string = '';

    if (callerPhone) {
      const normalized = normalizePhone(callerPhone);
      console.log(`Phone auth: looking up normalized number ${normalized}`);

      const phoneUser = get(
        'SELECT id, rollNumber, name FROM users WHERE phoneNumber = ?',
        [normalized]
      ) as { id: number; rollNumber: string; name: string } | undefined;

      if (phoneUser) {
        userId = phoneUser.id;
        userRollNumber = phoneUser.rollNumber;
        console.log(`Phone auth: matched ${callerPhone} → ${userRollNumber} (${phoneUser.name})`);
      }
    }

    // If no match by phone number → not authenticated, reject
    if (!userId) {
      console.log(`Phone auth REJECTED: ${callerPhone || 'no caller ID'} not found in database`);
      return NextResponse.json({
        response: "I'm sorry, your phone number is not registered in our system. Please register on the web app first and add your phone number to your profile, then try calling again.",
        authenticated: false,
      });
    }

    // Process the query through Gemini + n8n
    const understanding = await understandQuery(userQuery);
    const enhancedQuery = enhanceQueryForN8N(understanding, userQuery);

    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/capstone-voice';

    try {
      const n8nResponse = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: enhancedQuery,
          originalQuery: userQuery,
          intent: understanding.intent,
          rollNumber: userRollNumber,
          userId: userId || 0,
          userRole: 'student',
          source: 'phone',
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (n8nResponse.ok) {
        const aiData = await n8nResponse.json();
        const aiResponse = aiData.output || aiData.response || 'I could not find that information.';

        // Log the conversation
        if (userId) {
          try {
            run(
              'INSERT INTO conversations (userId, query, response, intent, confidence) VALUES (?, ?, ?, ?, ?)',
              [userId, userQuery, aiResponse, understanding.intent, understanding.confidence]
            );
            run(
              'INSERT INTO query_analytics (userId, intent, confidence, responseTimeMs, source) VALUES (?, ?, ?, ?, ?)',
              [userId, understanding.intent, understanding.confidence, 0, 'phone']
            );
          } catch (e) { /* ignore logging errors */ }
        }

        return NextResponse.json({ response: aiResponse });
      }

      return NextResponse.json({
        response: "I'm having trouble accessing the system right now. Please try again in a moment.",
      });
    } catch (fetchError) {
      return NextResponse.json({
        response: "The system is temporarily unavailable. Please try again later or use the web app.",
      });
    }
  } catch (error: any) {
    console.error('Phone webhook error:', error);
    return NextResponse.json({
      response: "I'm sorry, I encountered an error. Please try again.",
    });
  }
}

/**
 * Normalize phone number for comparison
 * Strips spaces, dashes, country codes etc.
 */
function normalizePhone(phone: string): string {
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');
  // Remove leading country code (91 for India, 1 for US)
  if (digits.length > 10 && digits.startsWith('91')) {
    digits = digits.substring(2);
  } else if (digits.length > 10 && digits.startsWith('1')) {
    digits = digits.substring(1);
  }
  // Return last 10 digits
  return digits.slice(-10);
}
