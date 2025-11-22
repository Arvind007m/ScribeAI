/**
 * Custom Next.js server with Socket.io integration
 * Handles real-time WebSocket connections for audio streaming
 *
 * Architecture:
 * - Next.js handles HTTP requests and server-side rendering
 * - Socket.io handles real-time audio streaming and transcription
 * - Audio chunks (30s) sent from client → server → Gemini → client
 */
require('dotenv').config({ path: '.env.local' });
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '9002', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
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

    // Import and initialize Socket.io server
    try {
      const { SocketServer } = require('./src/server/socket-server.js');
      const socketServer = new SocketServer(httpServer);
      console.log('✅ SocketServer initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize SocketServer:', error);
    }

    httpServer
      .once('error', (err) => {
        console.error('❌ Server error:', err);
        process.exit(1);
      })
      .listen(port, () => {
        console.log(`\n🚀 Server ready!`);
        console.log(`📡 Next.js: http://${hostname}:${port}`);
        console.log(`🔌 Socket.io: ws://${hostname}:${port}/api/socket.io`);
        console.log(`\n✨ ScribeAI is running in ${dev ? 'development' : 'production'} mode\n`);
      });
  })
  .catch((err) => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  });
