import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, UserRole } from '@/lib/auth';
import { query, run } from '@/lib/db';

interface User {
  id: number;
  rollNumber: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rollNumber, password, name, role, phoneNumber } = body;

    // Validation
    if (!rollNumber || !password) {
      return NextResponse.json(
        { error: 'Roll number and password are required' },
        { status: 400 }
      );
    }

    // Roll number validation (alphanumeric)
    const rollNumberRegex = /^[a-zA-Z0-9]+$/;
    if (!rollNumberRegex.test(rollNumber)) {
      return NextResponse.json(
        { error: 'Roll number must be alphanumeric' },
        { status: 400 }
      );
    }

    // Password length validation
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Role validation
    const validRoles: UserRole[] = ['student', 'faculty', 'admin'];
    const userRole: UserRole = validRoles.includes(role) ? role : 'student';

    // Check if user already exists
    const existingUsers = query<User>(
      'SELECT id, rollNumber FROM users WHERE rollNumber = ?',
      [rollNumber]
    );

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'Roll number already registered' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Insert user with role, name, and phone number
    run(
      'INSERT INTO users (rollNumber, password, name, role, phoneNumber) VALUES (?, ?, ?, ?, ?)',
      [rollNumber, hashedPassword, name || '', userRole, phoneNumber || null]
    );

    return NextResponse.json(
      { message: 'User created', role: userRole },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
