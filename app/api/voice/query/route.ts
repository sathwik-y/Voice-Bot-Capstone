import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { run } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Forward to n8n webhook with user context
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/capstone-voice';

    console.log('Sending to n8n:', n8nWebhookUrl, {
      query,
      rollNumber: payload.rollNumber,
      userId: payload.userId,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    let n8nResponse;
    let retries = 0;
    const maxRetries = 2;

    while (retries <= maxRetries) {
      try {
        n8nResponse = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: query,
            rollNumber: payload.rollNumber,
            userId: payload.userId,
          }),
          signal: controller.signal,
        });

        console.log('n8n response status:', n8nResponse.status);

        if (n8nResponse.ok) {
          break; // Success, exit retry loop
        }

        // If 503, retry (dyno might be waking up)
        if (n8nResponse.status === 503 && retries < maxRetries) {
          console.log(`n8n returned 503, retrying (${retries + 1}/${maxRetries})...`);
          retries++;
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
          continue;
        }

        // Other errors, don't retry
        const errorText = await n8nResponse.text();
        console.error('n8n error response:', errorText);
        throw new Error(`n8n workflow failed: ${n8nResponse.status}`);

      } catch (fetchError: any) {
        if (fetchError.name === 'AbortError') {
          throw fetchError; // Timeout, don't retry
        }
        throw fetchError;
      }
    }

    clearTimeout(timeoutId);

    if (!n8nResponse || !n8nResponse.ok) {
      throw new Error('n8n workflow failed after retries');
    }

    const aiData = await n8nResponse.json();
    console.log('n8n response data:', aiData);

    // Extract response from n8n output
    // n8n AI Agent typically returns { output: "response text" }
    const aiResponse = aiData.output || aiData.response || aiData.text || 'I could not process that request.';

    // Save conversation to database
    try {
      run(
        'INSERT INTO conversations (userId, query, response) VALUES (?, ?, ?)',
        [payload.userId, query, aiResponse]
      );
    } catch (dbError) {
      console.error('Failed to save conversation:', dbError);
      // Don't fail the request if saving fails
    }

    return NextResponse.json({
      response: aiResponse,
      query: query,
    });

  } catch (error: any) {
    console.error('Voice query error:', error);

    if (error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timed out - n8n took too long to respond' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to process voice query: ' + (error.message || 'Unknown error') },
      { status: 500 }
    );
  }
}
