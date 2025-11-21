import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { prisma } from '@/lib/prisma';
import { processAudioChunk, generateSummary } from './services/transcription';

/**
 * WebSocket server for real-time audio streaming and transcription
 * Handles audio chunks, transcription updates, and session state management
 */
export class SocketServer {
  private io: SocketIOServer;
  private activeSessions: Map<string, { sessionId: string; userId: string }> = new Map();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002',
        methods: ['GET', 'POST'],
      },
      maxHttpBufferSize: 1e7, // 10MB for audio chunks
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Start recording session
      socket.on('start-session', async (data: { userId: string; audioSource: string; title: string }) => {
        try {
          const session = await prisma.recordingSession.create({
            data: {
              userId: data.userId,
              title: data.title || `Session ${new Date().toLocaleString()}`,
              audioSource: data.audioSource,
              status: 'recording',
            },
          });

          this.activeSessions.set(socket.id, {
            sessionId: session.id,
            userId: data.userId,
          });

          socket.emit('session-started', {
            sessionId: session.id,
            status: 'recording',
          });

          console.log(`Session started: ${session.id}`);
        } catch (error) {
          console.error('Error starting session:', error);
          socket.emit('error', { message: 'Failed to start session' });
        }
      });

      // Receive audio chunk
      socket.on('audio-chunk', async (data: { audioData: Buffer; chunkIndex: number; duration: number }) => {
        const sessionInfo = this.activeSessions.get(socket.id);
        if (!sessionInfo) {
          socket.emit('error', { message: 'No active session' });
          return;
        }

        try {
          // Store audio chunk
          const audioChunk = await prisma.audioChunk.create({
            data: {
              recordingSessionId: sessionInfo.sessionId,
              chunkIndex: data.chunkIndex,
              audioData: data.audioData,
              duration: data.duration,
              processed: false,
            },
          });

          // Process chunk for transcription
          const transcriptSegment = await processAudioChunk(
            data.audioData,
            sessionInfo.sessionId,
            data.chunkIndex
          );

          if (transcriptSegment) {
            // Mark chunk as processed
            await prisma.audioChunk.update({
              where: { id: audioChunk.id },
              data: { processed: true },
            });

            // Emit transcription to client
            socket.emit('transcription-update', transcriptSegment);
          }
        } catch (error) {
          console.error('Error processing audio chunk:', error);
          socket.emit('error', { message: 'Failed to process audio chunk' });
        }
      });

      // Pause session
      socket.on('pause-session', async () => {
        const sessionInfo = this.activeSessions.get(socket.id);
        if (!sessionInfo) return;

        try {
          await prisma.recordingSession.update({
            where: { id: sessionInfo.sessionId },
            data: { status: 'paused' },
          });

          socket.emit('session-paused', { sessionId: sessionInfo.sessionId });
        } catch (error) {
          console.error('Error pausing session:', error);
          socket.emit('error', { message: 'Failed to pause session' });
        }
      });

      // Resume session
      socket.on('resume-session', async () => {
        const sessionInfo = this.activeSessions.get(socket.id);
        if (!sessionInfo) return;

        try {
          await prisma.recordingSession.update({
            where: { id: sessionInfo.sessionId },
            data: { status: 'recording' },
          });

          socket.emit('session-resumed', { sessionId: sessionInfo.sessionId });
        } catch (error) {
          console.error('Error resuming session:', error);
          socket.emit('error', { message: 'Failed to resume session' });
        }
      });

      // Stop session and generate summary
      socket.on('stop-session', async () => {
        const sessionInfo = this.activeSessions.get(socket.id);
        if (!sessionInfo) return;

        try {
          // Update session status to processing
          await prisma.recordingSession.update({
            where: { id: sessionInfo.sessionId },
            data: { status: 'processing' },
          });

          socket.emit('session-processing', { sessionId: sessionInfo.sessionId });

          // Get all transcripts for the session
          const transcripts = await prisma.transcript.findMany({
            where: { recordingSessionId: sessionInfo.sessionId },
            orderBy: { startTime: 'asc' },
          });

          // Generate summary
          const summary = await generateSummary(transcripts);

          // Calculate total duration
          const audioChunks = await prisma.audioChunk.findMany({
            where: { recordingSessionId: sessionInfo.sessionId },
          });
          const totalDuration = audioChunks.reduce((sum, chunk) => sum + chunk.duration, 0);

          // Update session with summary and mark as completed
          const completedSession = await prisma.recordingSession.update({
            where: { id: sessionInfo.sessionId },
            data: {
              status: 'completed',
              summary: summary,
              duration: Math.floor(totalDuration / 1000), // Convert to seconds
              completedAt: new Date(),
            },
            include: {
              transcripts: {
                orderBy: { startTime: 'asc' },
              },
            },
          });

          socket.emit('session-completed', {
            sessionId: completedSession.id,
            summary: completedSession.summary,
            transcripts: completedSession.transcripts,
          });

          // Clean up active session
          this.activeSessions.delete(socket.id);
        } catch (error) {
          console.error('Error stopping session:', error);
          socket.emit('error', { message: 'Failed to stop session' });
          
          // Mark session as failed
          if (sessionInfo) {
            await prisma.recordingSession.update({
              where: { id: sessionInfo.sessionId },
              data: { status: 'failed' },
            });
          }
        }
      });

      // Handle disconnection
      socket.on('disconnect', async () => {
        console.log(`Client disconnected: ${socket.id}`);
        const sessionInfo = this.activeSessions.get(socket.id);
        
        if (sessionInfo) {
          // Auto-pause session on disconnect
          try {
            await prisma.recordingSession.update({
              where: { id: sessionInfo.sessionId },
              data: { status: 'paused' },
            });
          } catch (error) {
            console.error('Error auto-pausing session:', error);
          }
          
          this.activeSessions.delete(socket.id);
        }
      });

      // Reconnection handling
      socket.on('reconnect-session', async (data: { sessionId: string; userId: string }) => {
        try {
          const session = await prisma.recordingSession.findUnique({
            where: { id: data.sessionId },
          });

          if (session && session.userId === data.userId && session.status === 'paused') {
            this.activeSessions.set(socket.id, {
              sessionId: session.id,
              userId: data.userId,
            });

            socket.emit('session-reconnected', {
              sessionId: session.id,
              status: session.status,
            });
          } else {
            socket.emit('error', { message: 'Cannot reconnect to session' });
          }
        } catch (error) {
          console.error('Error reconnecting session:', error);
          socket.emit('error', { message: 'Failed to reconnect' });
        }
      });
    });
  }

  public getIO(): SocketIOServer {
    return this.io;
  }
}

