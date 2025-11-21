/**
 * Custom Next.js server with Socket.io integration
 * Handles real-time WebSocket connections for audio streaming
 */
require('dotenv').config({ path: '.env.local' });
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '9002', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Initialize Prisma Client with proper configuration for Prisma 7
const prisma = new PrismaClient({
  log: dev ? ['query', 'error', 'warn'] : ['error'],
});

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002',
      methods: ['GET', 'POST'],
    },
    maxHttpBufferSize: 1e7, // 10MB for audio chunks
  });

  // Socket.io event handlers
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    const activeSessions = new Map();

    // Start recording session
    socket.on('start-session', async (data) => {
      try {
        const session = await prisma.recordingSession.create({
          data: {
            userId: data.userId,
            title: data.title || `Session ${new Date().toLocaleString()}`,
            audioSource: data.audioSource,
            status: 'recording',
          },
        });

        activeSessions.set(socket.id, {
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
    socket.on('audio-chunk', async (data) => {
      const sessionInfo = activeSessions.get(socket.id);
      if (!sessionInfo) {
        socket.emit('error', { message: 'No active session' });
        return;
      }

      try {
        // Store audio chunk
        await prisma.audioChunk.create({
          data: {
            recordingSessionId: sessionInfo.sessionId,
            chunkIndex: data.chunkIndex,
            audioData: data.audioData,
            duration: data.duration,
            processed: false,
          },
        });

        // Emit acknowledgment
        socket.emit('chunk-received', { chunkIndex: data.chunkIndex });
      } catch (error) {
        console.error('Error processing audio chunk:', error);
        socket.emit('error', { message: 'Failed to process audio chunk' });
      }
    });

    // Pause session
    socket.on('pause-session', async () => {
      const sessionInfo = activeSessions.get(socket.id);
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
      const sessionInfo = activeSessions.get(socket.id);
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

    // Stop session
    socket.on('stop-session', async () => {
      const sessionInfo = activeSessions.get(socket.id);
      if (!sessionInfo) return;

      try {
        await prisma.recordingSession.update({
          where: { id: sessionInfo.sessionId },
          data: { 
            status: 'processing',
            completedAt: new Date(),
          },
        });

        socket.emit('session-processing', { sessionId: sessionInfo.sessionId });
        activeSessions.delete(socket.id);
      } catch (error) {
        console.error('Error stopping session:', error);
        socket.emit('error', { message: 'Failed to stop session' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`Client disconnected: ${socket.id}`);
      const sessionInfo = activeSessions.get(socket.id);

      if (sessionInfo) {
        try {
          await prisma.recordingSession.update({
            where: { id: sessionInfo.sessionId },
            data: { status: 'paused' },
          });
        } catch (error) {
          console.error('Error auto-pausing session:', error);
        }

        activeSessions.delete(socket.id);
      }
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> Socket.io server running`);
    });
});

