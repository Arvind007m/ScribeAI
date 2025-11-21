import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/sessions - Get all sessions for a user
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const sessions = await prisma.recordingSession.findMany({
      where: {
        userId,
      },
      orderBy: {
        startedAt: 'desc',
      },
      include: {
        transcripts: {
          take: 3, // Preview only
          orderBy: { startTime: 'asc' },
        },
      },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

/**
 * POST /api/sessions - Create a new session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, title, audioSource, transcript, summary, duration } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Create session
    const session = await prisma.recordingSession.create({
      data: {
        userId,
        title: title || `Session ${new Date().toLocaleString()}`,
        audioSource: audioSource || 'microphone',
        status: 'completed',
        summary: summary || null,
        duration: duration || 0,
        completedAt: new Date(),
      },
    });

    // Save transcript if provided
    if (transcript && transcript.length > 0) {
      // Split transcript into sentences for better storage
      const sentences = transcript.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
      
      for (let i = 0; i < sentences.length; i++) {
        await prisma.transcript.create({
          data: {
            recordingSessionId: session.id,
            speaker: 'Speaker',
            text: sentences[i].trim(),
            timestamp: `00:${String(i).padStart(2, '0')}:00`,
            startTime: i * 5000, // Approximate 5 seconds per sentence
          },
        });
      }
    }

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

