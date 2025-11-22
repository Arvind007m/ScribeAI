const { Server: SocketIOServer } = require('socket.io');
const { processAudioChunk, generateSummary } = require('./services/transcription');

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
class SocketServer {
  constructor(server) {
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

    this.activeSessions = new Map();
    this.setupEventHandlers();
    console.log('✅ Socket.io server initialized');
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`✅ Client connected: ${socket.id}`);

      // Start recording session
      socket.on('start-recording', async (data) => {
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
      });

      // Receive audio chunk
      socket.on('audio-chunk', async (data) => {
        try {
          const sessionInfo = this.activeSessions.get(data.sessionId);
          if (!sessionInfo) {
            console.warn(`⚠️ No active session found for ${data.sessionId}`);
            socket.emit('error', 'No active session');
            return;
          }

          // Convert array back to Buffer
          const audioBuffer = Buffer.from(data.chunk);

          console.log(
            `📦 Received audio chunk ${data.chunkIndex} for session ${data.sessionId}, size: ${audioBuffer.length} bytes`
          );

          // Process chunk for transcription with Gemini
          const transcriptSegment = await processAudioChunk(
            audioBuffer,
            data.sessionId,
            data.chunkIndex
          );

          if (transcriptSegment) {
            // transcriptSegment is now an array of segments (one per speaker)
            const segments = Array.isArray(transcriptSegment)
              ? transcriptSegment
              : [transcriptSegment];

            console.log(
              `✅ Transcription generated for chunk ${data.chunkIndex}: ${segments.length} speaker segment(s)`
            );
            console.log(
              `📤 Emitting ${segments.length} transcript(s) to session room: ${data.sessionId}`
            );

            // Emit each segment separately so they appear on separate lines
            for (const segment of segments) {
              this.io.to(data.sessionId).emit('transcript-segment', segment);
              socket.emit('transcript-segment', segment);
            }
          } else {
            console.warn(`⚠️ No transcription generated for chunk ${data.chunkIndex}`);
          }
        } catch (error) {
          console.error(`❌ Error processing audio chunk ${data.chunkIndex}:`, error);
          console.error('Error details:', error.message, error.stack);
          socket.emit('error', 'Failed to process audio chunk');
        }
      });

      // Pause recording
      socket.on('pause-recording', async (data) => {
        console.log(`⏸️ Pausing session: ${data.sessionId}`);
        this.io.to(data.sessionId).emit('recording-paused', { sessionId: data.sessionId });
      });

      // Resume recording
      socket.on('resume-recording', async (data) => {
        console.log(`▶️ Resuming session: ${data.sessionId}`);
        this.io.to(data.sessionId).emit('recording-resumed', { sessionId: data.sessionId });
      });

      // Stop recording and generate summary
      socket.on('stop-recording', async (data) => {
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

  getIO() {
    return this.io;
  }
}

module.exports = { SocketServer };
