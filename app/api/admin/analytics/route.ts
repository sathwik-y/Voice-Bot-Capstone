import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';

// GET: System analytics (admin only)
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Total users by role
    const usersByRole = query(`
      SELECT role, COUNT(*) as count FROM users GROUP BY role
    `);

    // Total conversations
    const totalConversations = query(`
      SELECT COUNT(*) as count FROM conversations
    `) as { count: number }[];

    // Queries by intent
    const queriesByIntent = query(`
      SELECT intent, COUNT(*) as count FROM conversations GROUP BY intent ORDER BY count DESC
    `);

    // Queries per day (last 7 days)
    const queriesPerDay = query(`
      SELECT DATE(createdAt) as date, COUNT(*) as count
      FROM conversations
      WHERE createdAt >= datetime('now', '-7 days')
      GROUP BY DATE(createdAt)
      ORDER BY date DESC
    `);

    // Most active users
    const activeUsers = query(`
      SELECT u.rollNumber, u.name, u.role, COUNT(c.id) as queryCount
      FROM users u
      LEFT JOIN conversations c ON u.id = c.userId
      GROUP BY u.id
      ORDER BY queryCount DESC
      LIMIT 10
    `);

    // Average confidence score
    const avgConfidence = query(`
      SELECT AVG(confidence) as avg FROM conversations WHERE confidence > 0
    `) as { avg: number }[];

    return NextResponse.json({
      usersByRole,
      totalConversations: totalConversations[0]?.count || 0,
      queriesByIntent,
      queriesPerDay,
      activeUsers,
      avgConfidence: avgConfidence[0]?.avg || 0,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
