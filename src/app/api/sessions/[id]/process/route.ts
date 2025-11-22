import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateSummary, extractActionItems } from '@/server/services/transcription';

/**
 * POST /api/sessions/[id]/process - Process session and generate summary
 * This endpoint is called after recording stops to generate the final summary
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Get session with transcripts
    const session = await prisma.recordingSession.findUnique({
      where: { id: params.id },
      include: {
        transcripts: {
          orderBy: { startTime: 'asc' },
        },
        audioChunks: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Update status to processing
    await prisma.recordingSession.update({
      where: { id: params.id },
      data: { status: 'processing' },
    });

    // Generate summary
    const summary = await generateSummary(session.transcripts);

    // Extract action items (optional)
    const actionItems = await extractActionItems(session.transcripts);

    // Calculate total duration
    const totalDuration = session.audioChunks.reduce((sum, chunk) => sum + chunk.duration, 0);

    // Update session with results
    const updatedSession = await prisma.recordingSession.update({
      where: { id: params.id },
      data: {
        status: 'completed',
        summary,
        duration: Math.floor(totalDuration / 1000),
        completedAt: new Date(),
      },
      include: {
        transcripts: {
          orderBy: { startTime: 'asc' },
        },
      },
    });

    return NextResponse.json({
      session: updatedSession,
      actionItems,
    });
  } catch (error) {
    console.error('Error processing session:', error);

    // Mark session as failed
    await prisma.recordingSession.update({
      where: { id: params.id },
      data: { status: 'failed' },
    });

    return NextResponse.json({ error: 'Failed to process session' }, { status: 500 });
  }
}
