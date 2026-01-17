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

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        rollNumber: payload.rollNumber,
        userId: payload.userId,
      }),
    });

    if (!n8nResponse.ok) {
      throw new Error('n8n workflow failed');
    }

    const aiData = await n8nResponse.json();

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

  } catch (error) {
    console.error('Voice query error:', error);
    return NextResponse.json(
      { error: 'Failed to process voice query' },
      { status: 500 }
    );
  }
}
