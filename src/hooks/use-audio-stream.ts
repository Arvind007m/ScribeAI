"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket } from '@/lib/socket-client';
import { setSessionId as setGlobalSessionId, getSessionId as getGlobalSessionId } from '@/lib/transcript-store';

interface UseAudioStreamOptions {
  onTranscriptUpdate?: (transcript: { speaker: string; text: string; timestamp: string }) => void;
  onError?: (error: string) => void;
  chunkDuration?: number; // in milliseconds
}

interface TranscriptSegment {
  speaker: string;
  text: string;
  timestamp: string;
}

export function useAudioStream(options: UseAudioStreamOptions = {}) {
  const { onTranscriptUpdate, onError, chunkDuration = 30000 } = options; // 30 seconds default
  
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunkCountRef = useRef(0);

  // Auto-connect on mount using global socket
  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    // Set initial connection state
    setIsConnected(socket.connected);

    // Listen for connection events
    const handleConnect = () => {
      console.log('✅ Socket connected in hook');
      setIsConnected(true);
    };

    const handleDisconnect = (reason: string) => {
      console.log('🔌 Socket disconnected in hook:', reason);
      setIsConnected(false);
    };

    const handleTranscript = (segment: TranscriptSegment) => {
      console.log('📝 Received transcript segment:', segment);
      onTranscriptUpdate?.(segment);
    };

    const handleError = (error: string) => {
      console.error('❌ Socket error:', error);
      onError?.(error);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('transcript-segment', handleTranscript);
    socket.on('error', handleError);

    // Cleanup listeners (but not socket) on unmount
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('transcript-segment', handleTranscript);
      socket.off('error', handleError);
    };
  }, [onTranscriptUpdate, onError]);

  // Initialize Socket.io connection (for manual connection)
  const connectSocket = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log('Already connected');
      return;
    }
    // Socket is already connected in useEffect
  }, []);

  // Start recording
  const startRecording = useCallback(async (audioSource: 'microphone' | 'tab-audio' = 'microphone') => {
    try {
      if (!socketRef.current?.connected) {
        throw new Error('Socket.io not connected. Please wait and try again.');
      }

      let stream: MediaStream;

      if (audioSource === 'tab-audio') {
        // Capture tab audio with screen share (video required by some browsers)
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true, // Required by Chrome
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });

        // Check if audio track exists
        const audioTracks = displayStream.getAudioTracks();
        if (audioTracks.length === 0) {
          displayStream.getTracks().forEach(track => track.stop());
          throw new Error('No audio track found. Please CHECK "Share tab audio" when selecting the tab.');
        }

        console.log('✅ Tab audio captured:', audioTracks[0].label);

        // Create new stream with only audio (discard video)
        stream = new MediaStream(audioTracks);
        
        // Stop video tracks to save resources
        displayStream.getVideoTracks().forEach(track => track.stop());
      } else {
        // Capture microphone
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100,
          },
        });
      }

      streamRef.current = stream;

      // Create MediaRecorder with appropriate format
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });

      mediaRecorderRef.current = mediaRecorder;
      chunkCountRef.current = 0;

      // Generate session ID
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      setGlobalSessionId(newSessionId); // Store in global (survives HMR)
      console.log('🆔 Session ID set (local + global):', newSessionId);

      // Emit start-recording event
      socketRef.current?.emit('start-recording', {
        sessionId: newSessionId,
        audioSource,
        startTime: new Date().toISOString(),
      });

      // Handle audio data chunks
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          const chunkIndex = chunkCountRef.current++;
          
          console.log(`📦 Audio chunk ${chunkIndex} available, size: ${event.data.size} bytes`);
          
          if (!socketRef.current?.connected) {
            console.error('❌ Socket not connected, attempting to reconnect...');
            socketRef.current?.connect();
            
            // Wait a bit for reconnection
            setTimeout(() => {
              if (!socketRef.current?.connected) {
                console.error('❌ Failed to reconnect, chunk lost');
                return;
              }
            }, 1000);
          }
          
          // Convert Blob to ArrayBuffer and send via Socket.io
          event.data.arrayBuffer().then((arrayBuffer) => {
            const uint8Array = new Uint8Array(arrayBuffer);
            
            console.log(`📤 Sending audio chunk ${chunkIndex}, size: ${uint8Array.length} bytes`);
            
            socketRef.current?.emit('audio-chunk', {
              sessionId: newSessionId,
              chunk: Array.from(uint8Array), // Convert to regular array for Socket.io
              chunkIndex,
              timestamp: new Date().toISOString(),
            });
          }).catch((error) => {
            console.error(`❌ Error processing chunk ${chunkIndex}:`, error);
          });
        }
      };

      mediaRecorder.onerror = (event: any) => {
        console.error('MediaRecorder error:', event.error);
        onError?.(`Recording error: ${event.error?.message || 'Unknown error'}`);
      };

      mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped');
        setIsRecording(false);
      };

      // Start recording with time slicing (chunks every 30s)
      mediaRecorder.start(chunkDuration);
      setIsRecording(true);

      console.log(`Recording started with ${chunkDuration}ms chunks`);
    } catch (error: any) {
      console.error('Failed to start recording:', error);
      onError?.(error.message || 'Failed to start recording');
      throw error;
    }
  }, [connectSocket, chunkDuration, onError]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      
      // Stop all tracks
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;

      // Emit stop-recording event
      if (sessionId) {
        socketRef.current?.emit('stop-recording', {
          sessionId,
          endTime: new Date().toISOString(),
        });
      }

      setIsRecording(false);
    }
  }, [isRecording, sessionId]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause();
      socketRef.current?.emit('pause-recording', { sessionId });
    }
  }, [isRecording, sessionId]);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.resume();
      socketRef.current?.emit('resume-recording', { sessionId });
    }
  }, [isRecording, sessionId]);

  // Cleanup
  const cleanup = useCallback(() => {
    stopRecording();
    socketRef.current?.disconnect();
    socketRef.current = null;
    setIsConnected(false);
    setSessionId(null);
  }, [stopRecording]);

  return {
    isRecording,
    isConnected,
    sessionId,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cleanup,
  };
}

