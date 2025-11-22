const { Server: SocketIOServer } = require('socket.io');
const { processAudioChunk, generateSummary } = require('./services/transcription');

/**
 * WebSocket server for real-time audio streaming and transcription
 * Handles bidirectional communication between client and server for:
 * - Audio chunk streaming (30-second intervals)
 * - Real-time transcript updates via Socket.io
 * - Session state management (start, pause, resume, stop)
 * - Gemini AI integration for transcription
 */
class SocketServer {
  /**
   * Initialize Socket.io server with HTTP server instance
   * @param {http.Server} server - Node.js HTTP server instance
   */
  constructor(server) {
    this.io = new SocketIOServer(server, {
      path: '/api/socket.io',
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      maxHttpBufferSize: 1e8,
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.activeSessions = new Map();
    this.setupEventHandlers();
    console.log('Socket.io server initialized');
  }

  /**
   * Set up Socket.io event handlers for audio streaming workflow
   * Handles: connection, start-recording, audio-chunk, pause, resume, stop, disconnect
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      socket.on('start-recording', async (data) => {
        try {
          console.log(`Starting recording session: ${data.sessionId}`);

          this.activeSessions.set(data.sessionId, {
            sessionId: data.sessionId,
            startTime: new Date(data.startTime),
            audioSource: data.audioSource,
          });

          socket.join(data.sessionId);

          socket.emit('recording-started', {
            sessionId: data.sessionId,
            status: 'recording',
          });

          console.log(`Session started: ${data.sessionId}`);
        } catch (error) {
          console.error('Error starting session:', error);
          socket.emit('error', 'Failed to start session');
        }
      });

      socket.on('audio-chunk', async (data) => {
        try {
          const sessionInfo = this.activeSessions.get(data.sessionId);
          if (!sessionInfo) {
            console.warn(`No active session found for ${data.sessionId}`);
            socket.emit('error', 'No active session');
            return;
          }

          const audioBuffer = Buffer.from(data.chunk);

          console.log(
            `Received audio chunk ${data.chunkIndex} for session ${data.sessionId}, size: ${audioBuffer.length} bytes`
          );

          const transcriptSegment = await processAudioChunk(
            audioBuffer,
            data.sessionId,
            data.chunkIndex
          );

          if (transcriptSegment) {
            const segments = Array.isArray(transcriptSegment)
              ? transcriptSegment
              : [transcriptSegment];

            console.log(
              `Transcription generated for chunk ${data.chunkIndex}: ${segments.length} speaker segment(s)`
            );
            console.log(
              `Emitting ${segments.length} transcript(s) to session room: ${data.sessionId}`
            );

            for (const segment of segments) {
              this.io.to(data.sessionId).emit('transcript-segment', segment);
              socket.emit('transcript-segment', segment);
            }
          } else {
            console.warn(`No transcription generated for chunk ${data.chunkIndex}`);
          }
        } catch (error) {
          console.error(`Error processing audio chunk ${data.chunkIndex}:`, error);
          console.error('Error details:', error.message, error.stack);
          socket.emit('error', 'Failed to process audio chunk');
        }
      });

      socket.on('pause-recording', async (data) => {
        console.log(`Pausing session: ${data.sessionId}`);
        this.io.to(data.sessionId).emit('recording-paused', { sessionId: data.sessionId });
      });

      socket.on('resume-recording', async (data) => {
        console.log(`Resuming session: ${data.sessionId}`);
        this.io.to(data.sessionId).emit('recording-resumed', { sessionId: data.sessionId });
      });

      socket.on('stop-recording', async (data) => {
        const sessionInfo = this.activeSessions.get(data.sessionId);
        if (!sessionInfo) return;

        try {
          console.log(`Stopping session: ${data.sessionId}`);

          this.io.to(data.sessionId).emit('processing-complete', {
            sessionId: data.sessionId,
          });

          this.activeSessions.delete(data.sessionId);

          console.log(`Session stopped: ${data.sessionId}`);
        } catch (error) {
          console.error('Error stopping session:', error);
          socket.emit('error', 'Failed to stop session');
        }
      });

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }

  /**
   * Get Socket.io server instance
   * @returns {SocketIOServer} Socket.io server instance
   */
  getIO() {
    return this.io;
  }
}

module.exports = { SocketServer };
