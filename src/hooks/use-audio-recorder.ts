"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

/**
 * Audio source type
 */
export type AudioSource = 'microphone' | 'tab-audio';

/**
 * Session state type
 */
export type SessionState = 'idle' | 'recording' | 'paused' | 'processing' | 'completed';

/**
 * Transcript segment interface
 */
export interface TranscriptSegment {
  id: string;
  speaker: string;
  text: string;
  timestamp: string;
  startTime: number;
}

/**
 * Hook for managing audio recording with real-time streaming
 * Handles microphone and tab audio capture, chunking, and WebSocket streaming
 */
export function useAudioRecorder() {
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [audioSource, setAudioSource] = useState<AudioSource>('microphone');
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunkIndexRef = useRef<number>(0);
  const audioChunksRef = useRef<Blob[]>([]);

  /**
   * Initialize Socket.io connection
   */
  const initializeSocket = useCallback(() => {
    if (!socketRef.current) {
      socketRef.current = io('http://localhost:9002', {
        transports: ['websocket', 'polling'],
      });

      socketRef.current.on('connect', () => {
        console.log('Socket connected');
      });

      socketRef.current.on('session-started', (data) => {
        setSessionId(data.sessionId);
        setSessionState('recording');
        console.log('Session started:', data.sessionId);
      });

      socketRef.current.on('transcription-update', (segment: TranscriptSegment) => {
        setTranscript((prev) => [...prev, segment]);
      });

      socketRef.current.on('session-paused', () => {
        setSessionState('paused');
      });

      socketRef.current.on('session-resumed', () => {
        setSessionState('recording');
      });

      socketRef.current.on('session-processing', () => {
        setSessionState('processing');
      });

      socketRef.current.on('session-completed', (data) => {
        setSummary(data.summary);
        setTranscript(data.transcripts);
        setSessionState('completed');
      });

      socketRef.current.on('error', (data) => {
        setError(data.message);
        console.error('Socket error:', data.message);
      });

      socketRef.current.on('disconnect', () => {
        console.log('Socket disconnected');
      });
    }
  }, []);

  /**
   * Start recording session
   */
  const startRecording = useCallback(async (userId: string, title?: string) => {
    try {
      setError(null);
      setTranscript([]);
      setSummary('');
      chunkIndexRef.current = 0;
      audioChunksRef.current = [];

      // Initialize socket
      initializeSocket();

      // Get media stream based on audio source
      let stream: MediaStream;
      
      if (audioSource === 'microphone') {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 48000,
          },
        });
      } else {
        // Tab audio capture
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: false,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 48000,
          } as any,
        });
      }

      streamRef.current = stream;

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });

      mediaRecorderRef.current = mediaRecorder;

      // Handle data available (chunk ready)
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          
          // Send chunk to server
          const reader = new FileReader();
          reader.onloadend = () => {
            const arrayBuffer = reader.result as ArrayBuffer;
            const buffer = Buffer.from(arrayBuffer);
            
            socketRef.current?.emit('audio-chunk', {
              audioData: buffer,
              chunkIndex: chunkIndexRef.current,
              duration: 30000, // 30 seconds
            });
            
            chunkIndexRef.current++;
          };
          reader.readAsArrayBuffer(event.data);
        }
      };

      // Start recording with 30-second chunks
      mediaRecorder.start(30000);

      // Emit start session event
      socketRef.current?.emit('start-session', {
        userId,
        audioSource,
        title: title || `Session ${new Date().toLocaleString()}`,
      });

    } catch (err: any) {
      console.error('Error starting recording:', err);
      setError(err.message || 'Failed to start recording');
      setSessionState('idle');
    }
  }, [audioSource, initializeSocket]);

  /**
   * Pause recording
   */
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      socketRef.current?.emit('pause-session');
    }
  }, []);

  /**
   * Resume recording
   */
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      socketRef.current?.emit('resume-session');
    }
  }, []);

  /**
   * Stop recording and process
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      
      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      socketRef.current?.emit('stop-session');
    }
  }, []);

  /**
   * Reset session
   */
  const resetSession = useCallback(() => {
    setSessionState('idle');
    setTranscript([]);
    setSummary('');
    setSessionId(null);
    setError(null);
    chunkIndexRef.current = 0;
    audioChunksRef.current = [];
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return {
    sessionState,
    audioSource,
    setAudioSource,
    transcript,
    summary,
    sessionId,
    error,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetSession,
  };
}

