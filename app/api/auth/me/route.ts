import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { get, run } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Fetch fresh phone number from DB
    const user = get(
      'SELECT phoneNumber FROM users WHERE id = ?',
      [payload.userId]
    ) as { phoneNumber: string | null } | undefined;

    return NextResponse.json({
      user: {
        rollNumber: payload.rollNumber,
        name: payload.name || '',
        role: payload.role || 'student',
        phoneNumber: user?.phoneNumber || null,
      },
    });
  } catch (error) {
    console.error('Auth verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH: Update user profile (phone number)
export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { phoneNumber } = await request.json();

    // Normalize phone number (keep only digits, last 10)
    let normalized = phoneNumber ? phoneNumber.replace(/\D/g, '').slice(-10) : null;
    if (normalized && normalized.length < 10) {
      return NextResponse.json({ error: 'Phone number must be 10 digits' }, { status: 400 });
    }

    run('UPDATE users SET phoneNumber = ? WHERE id = ?', [normalized, payload.userId]);

    return NextResponse.json({ message: 'Profile updated', phoneNumber: normalized });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
