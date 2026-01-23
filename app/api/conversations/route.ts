import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';

interface Conversation {
  id: number;
  query: string;
  response: string;
  createdAt: string;
}

export async function GET(request: NextRequest) {
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

    // Get conversations for this user, most recent first
    const conversations = query<Conversation>(
      'SELECT id, query, response, createdAt FROM conversations WHERE userId = ? ORDER BY createdAt DESC LIMIT 50',
      [payload.userId]
    );

    return NextResponse.json({ conversations });
  } catch (error: any) {
    console.error('Conversations fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
