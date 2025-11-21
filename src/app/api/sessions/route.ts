import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
    if (transcript && Array.isArray(transcript) && transcript.length > 0) {
      // transcript is an array of { id, speaker, text, timestamp, startTime }
      console.log('💾 Saving transcripts to database:', transcript.length);
      
      for (const t of transcript) {
        await prisma.transcript.create({
          data: {
            recordingSessionId: session.id,
            speaker: t.speaker || 'Speaker',
            text: t.text,
            timestamp: t.timestamp,
            startTime: t.startTime || 0,
            endTime: (t.startTime || 0) + 30000, // 30 second chunks
            confidence: 0.95,
          },
        });
      }
      
      console.log('✅ Saved', transcript.length, 'transcripts to database');
    } else if (transcript && typeof transcript === 'string') {
      // Fallback: if transcript is a string, split it
      const sentences = transcript.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
      
      for (let i = 0; i < sentences.length; i++) {
        await prisma.transcript.create({
          data: {
            recordingSessionId: session.id,
            speaker: 'Speaker',
            text: sentences[i].trim(),
            timestamp: `00:${String(i).padStart(2, '0')}:00`,
            startTime: i * 5000,
            endTime: (i + 1) * 5000,
            confidence: 0.9,
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

