import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Demo signup endpoint - creates user without Better Auth complexity
 * POST /api/auth/demo-signup
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Create user (in production, hash the password!)
    const user = await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        emailVerified: true,
      },
    });

    // Create a simple session
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        sessionToken: `session_${Date.now()}_${Math.random().toString(36)}`,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      session: {
        token: session.sessionToken,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}

