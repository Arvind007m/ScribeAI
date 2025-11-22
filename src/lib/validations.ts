/**
 * Zod validation schemas for API request/response payloads
 * Ensures type safety and runtime validation for all API endpoints
 */

import { z } from 'zod';

// ============================================================================
// Authentication Schemas
// ============================================================================

export const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// ============================================================================
// Session Schemas
// ============================================================================

export const audioSourceSchema = z.enum(['microphone', 'tab-audio']);

export const transcriptSegmentSchema = z.object({
  speaker: z.string(),
  text: z.string(),
  timestamp: z.string(),
  startTime: z.number().optional(),
  endTime: z.number().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const createSessionSchema = z.object({
  userId: z.string().cuid(),
  title: z.string().min(1, 'Title is required'),
  audioSource: audioSourceSchema,
  transcript: z.array(transcriptSegmentSchema),
  summary: z.string().optional(),
  duration: z.number().int().min(0),
});

export const updateSessionSchema = z.object({
  title: z.string().min(1).optional(),
  summary: z.string().optional(),
  status: z.enum(['recording', 'paused', 'processing', 'completed', 'failed']).optional(),
});

export const sessionIdSchema = z.object({
  id: z.string().cuid(),
});

// ============================================================================
// AI Summary Schema
// ============================================================================

export const generateSummarySchema = z.object({
  transcript: z.string().min(10, 'Transcript must be at least 10 characters'),
});

// ============================================================================
// WebSocket Event Schemas
// ============================================================================

export const startSessionEventSchema = z.object({
  userId: z.string().cuid().optional(),
  audioSource: audioSourceSchema,
});

export const audioChunkEventSchema = z.object({
  sessionId: z.string(),
  chunkIndex: z.number().int().min(0),
  audioData: z.instanceof(Buffer).or(z.string()), // Buffer on server, base64 string from client
});

export const sessionControlEventSchema = z.object({
  sessionId: z.string(),
});

// ============================================================================
// Type Exports (inferred from schemas)
// ============================================================================

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type GenerateSummaryInput = z.infer<typeof generateSummarySchema>;
export type TranscriptSegment = z.infer<typeof transcriptSegmentSchema>;
export type AudioSource = z.infer<typeof audioSourceSchema>;
export type StartSessionEvent = z.infer<typeof startSessionEventSchema>;
export type AudioChunkEvent = z.infer<typeof audioChunkEventSchema>;
export type SessionControlEvent = z.infer<typeof sessionControlEventSchema>;

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validates data against a Zod schema and returns typed result
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validation result with success flag and data/errors
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Express/Next.js middleware helper for validating request body
 * @param schema - Zod schema to validate against
 * @param data - Request body data
 * @throws Error with validation messages if validation fails
 */
export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Validation failed: ${messages.join(', ')}`);
    }
    throw error;
  }
}
