import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/sessions/[id] - Get a specific session with full transcripts
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await prisma.recordingSession.findUnique({
      where: {
        id: params.id,
      },
      include: {
        transcripts: {
          orderBy: { startTime: 'asc' },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}

/**
 * PATCH /api/sessions/[id] - Update a session
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status, summary, duration } = body;

    const session = await prisma.recordingSession.update({
      where: {
        id: params.id,
      },
      data: {
        ...(status && { status }),
        ...(summary && { summary }),
        ...(duration !== undefined && { duration }),
        ...(status === 'completed' && { completedAt: new Date() }),
      },
    });

    return NextResponse.json({ session });
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}

/**
 * DELETE /api/sessions/[id] - Delete a session
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.recordingSession.delete({
      where: {
        id: params.id,
      },
    });

    return NextResponse.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}

