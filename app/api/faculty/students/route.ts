import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';

// GET: Faculty can view student query patterns and statistics
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || (payload.role !== 'faculty' && payload.role !== 'admin')) {
      return NextResponse.json({ error: 'Faculty or admin access required' }, { status: 403 });
    }

    // Get students list with their query stats
    const students = query(`
      SELECT
        u.id, u.rollNumber, u.name, u.createdAt,
        COUNT(c.id) as totalQueries,
        MAX(c.createdAt) as lastQueryAt
      FROM users u
      LEFT JOIN conversations c ON u.id = c.userId
      WHERE u.role = 'student'
      GROUP BY u.id
      ORDER BY u.rollNumber
    `);

    // Get popular intents among students
    const popularIntents = query(`
      SELECT c.intent, COUNT(*) as count
      FROM conversations c
      JOIN users u ON c.userId = u.id
      WHERE u.role = 'student'
      GROUP BY c.intent
      ORDER BY count DESC
    `);

    // Recent student queries (anonymized)
    const recentQueries = query(`
      SELECT c.query, c.intent, c.confidence, c.createdAt
      FROM conversations c
      JOIN users u ON c.userId = u.id
      WHERE u.role = 'student'
      ORDER BY c.createdAt DESC
      LIMIT 20
    `);

    return NextResponse.json({
      students,
      popularIntents,
      recentQueries,
    });
  } catch (error) {
    console.error('Faculty students error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
