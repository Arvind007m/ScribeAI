'use client';

import { io, Socket } from 'socket.io-client';

let globalSocket: Socket | null = null;

export function getSocket(): Socket {
  if (!globalSocket || !globalSocket.connected) {
    console.log('Creating new Socket.io connection...');

    globalSocket = io('http://localhost:9002', {
      path: '/api/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      autoConnect: true,
    });

    globalSocket.on('connect', () => {
      console.log('Socket.io connected:', globalSocket?.id);
    });

    globalSocket.on('disconnect', (reason) => {
      console.log('Socket.io disconnected:', reason);
    });

    globalSocket.on('connect_error', (error) => {
      console.error('Socket.io connection error:', error);
    });

    globalSocket.onAny((eventName, ...args) => {
      console.log(`Socket event received: ${eventName}`, args);
    });
  } else {
    console.log('Reusing existing Socket.io connection');
  }

  return globalSocket;
}

export function disconnectSocket() {
  if (globalSocket) {
    globalSocket.disconnect();
    globalSocket = null;
  }
}
