import { NextRequest, NextResponse } from 'next/server';
import { comparePassword, signToken } from '@/lib/auth';
import { query } from '@/lib/db';

interface User {
  id: number;
  password: string;
  rollNumber: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rollNumber, password } = body;

    // Validation
    if (!rollNumber || !password) {
      return NextResponse.json(
        { error: 'Roll number and password are required' },
        { status: 400 }
      );
    }

    // Query user by rollNumber
    const users = query<User>(
      'SELECT id, password, rollNumber FROM users WHERE rollNumber = ?',
      [rollNumber]
    );

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const user = users[0];

    // Compare password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Sign JWT token
    const token = signToken({
      userId: user.id,
      rollNumber: user.rollNumber,
    });

    // Create response with cookie
    const response = NextResponse.json(
      {
        message: 'Logged in',
        user: {
          rollNumber: user.rollNumber,
        },
      },
      { status: 200 }
    );

    // Set HTTP-only cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      path: '/',
      maxAge: 604800, // 7 days in seconds
      sameSite: 'lax',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
