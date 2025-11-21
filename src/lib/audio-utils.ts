/**
 * Audio utility functions for ScribeAI
 * Handles audio format conversion, validation, and processing
 */

/**
 * Check if browser supports required audio APIs
 * @returns Object with support status for each API
 */
export function checkAudioSupport() {
  return {
    mediaRecorder: typeof MediaRecorder !== 'undefined',
    getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    getDisplayMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia),
    audioContext: typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined',
  };
}

/**
 * Get supported MIME types for MediaRecorder
 * @returns Array of supported MIME types
 */
export function getSupportedMimeTypes(): string[] {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];

  return types.filter((type) => MediaRecorder.isTypeSupported(type));
}

/**
 * Get the best supported MIME type for recording
 * @returns Best MIME type or null if none supported
 */
export function getBestMimeType(): string | null {
  const supported = getSupportedMimeTypes();
  return supported.length > 0 ? supported[0] : null;
}

/**
 * Convert audio blob to base64 string
 * @param blob - Audio blob to convert
 * @returns Promise resolving to base64 string
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert audio blob to array buffer
 * @param blob - Audio blob to convert
 * @returns Promise resolving to ArrayBuffer
 */
export async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * Calculate audio duration from blob
 * @param blob - Audio blob
 * @returns Promise resolving to duration in seconds
 */
export async function getAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.addEventListener('loadedmetadata', () => {
      resolve(audio.duration);
    });
    audio.addEventListener('error', reject);
    audio.src = URL.createObjectURL(blob);
  });
}

/**
 * Validate audio constraints
 * @param constraints - MediaStreamConstraints to validate
 * @returns Validated and normalized constraints
 */
export function validateAudioConstraints(
  constraints: MediaStreamConstraints
): MediaStreamConstraints {
  return {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000,
      channelCount: 1,
      ...(typeof constraints.audio === 'object' ? constraints.audio : {}),
    },
    video: false,
  };
}

/**
 * Format duration in seconds to human-readable string
 * @param seconds - Duration in seconds
 * @returns Formatted string (e.g., "1h 23m 45s")
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Format timestamp in milliseconds to HH:MM:SS
 * @param ms - Timestamp in milliseconds
 * @returns Formatted timestamp string
 */
export function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Check if user has granted microphone permissions
 * @returns Promise resolving to permission state
 */
export async function checkMicrophonePermission(): Promise<PermissionState> {
  try {
    const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return result.state;
  } catch (error) {
    // Fallback for browsers that don't support permissions API
    return 'prompt';
  }
}

/**
 * Request microphone access
 * @returns Promise resolving to MediaStream or null if denied
 */
export async function requestMicrophoneAccess(): Promise<MediaStream | null> {
  try {
    const constraints = validateAudioConstraints({ audio: true });
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return stream;
  } catch (error) {
    console.error('Microphone access denied:', error);
    return null;
  }
}

/**
 * Request tab audio capture
 * @returns Promise resolving to MediaStream or null if denied
 */
export async function requestTabAudioCapture(): Promise<MediaStream | null> {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: false,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 48000,
      } as any,
    });
    return stream;
  } catch (error) {
    console.error('Tab audio capture denied:', error);
    return null;
  }
}

/**
 * Stop all tracks in a media stream
 * @param stream - MediaStream to stop
 */
export function stopMediaStream(stream: MediaStream): void {
  stream.getTracks().forEach((track) => {
    track.stop();
  });
}

/**
 * Estimate audio file size
 * @param durationSeconds - Duration in seconds
 * @param bitrate - Bitrate in bits per second (default: 128000)
 * @returns Estimated size in bytes
 */
export function estimateAudioSize(durationSeconds: number, bitrate: number = 128000): number {
  return Math.ceil((durationSeconds * bitrate) / 8);
}

/**
 * Format file size to human-readable string
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

