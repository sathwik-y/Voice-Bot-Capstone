import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { query, run } from '@/lib/db';

// GET: List all users (admin only)
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

    const users = query(
      'SELECT id, rollNumber, name, role, createdAt FROM users ORDER BY createdAt DESC'
    );

    // Get conversation counts per user
    const stats = query(`
      SELECT userId, COUNT(*) as queryCount, MAX(createdAt) as lastActive
      FROM conversations GROUP BY userId
    `);

    const statsMap = new Map(stats.map((s: any) => [s.userId, s]));

    const enrichedUsers = users.map((u: any) => ({
      ...u,
      queryCount: (statsMap.get(u.id) as any)?.queryCount || 0,
      lastActive: (statsMap.get(u.id) as any)?.lastActive || null,
    }));

    return NextResponse.json({ users: enrichedUsers });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Remove a user (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userId } = await request.json();

    if (userId === payload.userId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Delete user's conversations first
    run('DELETE FROM conversations WHERE userId = ?', [userId]);
    run('DELETE FROM query_analytics WHERE userId = ?', [userId]);
    run('DELETE FROM users WHERE id = ?', [userId]);

    return NextResponse.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Admin delete user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
