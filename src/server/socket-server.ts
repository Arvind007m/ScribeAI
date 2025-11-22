import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { prisma } from '@/lib/prisma';
import { processAudioChunk, generateSummary } from './services/transcription';

/**
 * WebSocket server for real-time audio streaming and transcription
 * Handles audio chunks, transcription updates, and session state management
 *
 * Architecture:
 * 1. Client captures audio with MediaRecorder (30s chunks)
 * 2. Audio chunks sent via Socket.io to server
 * 3. Server sends chunks to Gemini for transcription
 * 4. Real-time transcripts streamed back to client
 * 5. On stop, generate AI summary of full session
 */
export class SocketServer {
  private io: SocketIOServer;
  private activeSessions: Map<
    string,
    {
      sessionId: string;
      startTime: Date;
      audioSource: string;
    }
  > = new Map();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      path: '/api/socket.io',
      cors: {
        origin: '*', // Update for production
        methods: ['GET', 'POST'],
      },
      maxHttpBufferSize: 1e8, // 100MB for large audio chunks
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupEventHandlers();
    console.log('✅ Socket.io server initialized');
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log(`✅ Client connected: ${socket.id}`);

      // Start recording session
      socket.on(
        'start-recording',
        async (data: { sessionId: string; audioSource: string; startTime: string }) => {
          try {
            console.log(`🎙️ Starting recording session: ${data.sessionId}`);

            this.activeSessions.set(data.sessionId, {
              sessionId: data.sessionId,
              startTime: new Date(data.startTime),
              audioSource: data.audioSource,
            });

            socket.join(data.sessionId); // Join room for this session

            socket.emit('recording-started', {
              sessionId: data.sessionId,
              status: 'recording',
            });

            console.log(`✅ Session started: ${data.sessionId}`);
          } catch (error) {
            console.error('❌ Error starting session:', error);
            socket.emit('error', 'Failed to start session');
          }
        }
      );

      // Receive audio chunk
      socket.on(
        'audio-chunk',
        async (data: {
          sessionId: string;
          chunk: Buffer;
          chunkIndex: number;
          timestamp: string;
        }) => {
          const sessionInfo = this.activeSessions.get(data.sessionId);
          if (!sessionInfo) {
            socket.emit('error', 'No active session');
            return;
          }

          try {
            console.log(
              `📦 Received audio chunk ${data.chunkIndex} for session ${data.sessionId}, size: ${data.chunk.length} bytes`
            );

            // Process chunk for transcription with Gemini
            const transcriptSegment = await processAudioChunk(
              data.chunk,
              data.sessionId,
              data.chunkIndex
            );

            if (transcriptSegment) {
              console.log(
                `✅ Transcription generated for chunk ${data.chunkIndex}:`,
                transcriptSegment.text.substring(0, 50) + '...'
              );

              // Emit transcription to all clients in this session room
              this.io.to(data.sessionId).emit('transcript-segment', transcriptSegment);
            }
          } catch (error) {
            console.error(`❌ Error processing audio chunk ${data.chunkIndex}:`, error);
            socket.emit('error', 'Failed to process audio chunk');
          }
        }
      );

      // Pause recording
      socket.on('pause-recording', async (data: { sessionId: string }) => {
        console.log(`⏸️ Pausing session: ${data.sessionId}`);
        this.io.to(data.sessionId).emit('recording-paused', { sessionId: data.sessionId });
      });

      // Resume recording
      socket.on('resume-recording', async (data: { sessionId: string }) => {
        console.log(`▶️ Resuming session: ${data.sessionId}`);
        this.io.to(data.sessionId).emit('recording-resumed', { sessionId: data.sessionId });
      });

      // Stop recording and generate summary
      socket.on('stop-recording', async (data: { sessionId: string; endTime: string }) => {
        const sessionInfo = this.activeSessions.get(data.sessionId);
        if (!sessionInfo) return;

        try {
          console.log(`⏹️ Stopping session: ${data.sessionId}`);

          this.io.to(data.sessionId).emit('processing-complete', {
            sessionId: data.sessionId,
          });

          // Clean up active session
          this.activeSessions.delete(data.sessionId);

          console.log(`✅ Session stopped: ${data.sessionId}`);
        } catch (error) {
          console.error('❌ Error stopping session:', error);
          socket.emit('error', 'Failed to stop session');
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
        // Sessions remain in activeSessions for potential reconnection
      });
    });
  }

  public getIO(): SocketIOServer {
    return this.io;
  }
}
