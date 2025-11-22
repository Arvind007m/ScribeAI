import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Genkit AI configuration for ScribeAI
 * Uses Google Gemini 2.5 Flash for audio transcription and text generation
 */
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GEMINI_API_KEY,
    }),
  ],
  model: 'googleai/gemini-2.5-flash',
});
