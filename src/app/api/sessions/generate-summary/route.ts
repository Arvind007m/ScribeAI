import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/sessions/generate-summary
 * Generate AI summary from transcript using Gemini
 */
export async function POST(request: NextRequest) {
  let transcript = '';
  
  try {
    const body = await request.json();
    transcript = body.transcript || '';
    const { startTime } = body;

    console.log('Received transcript, length:', transcript.length);

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json(
        { summary: 'No transcript available to summarize.' },
        { status: 200 }
      );
    }

    console.log('Calling Gemini API...');

    // Generate summary using Gemini
    const result = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: `Analyze the following transcript and provide a comprehensive summary including:
1. Main topics discussed
2. Key points made
3. Any action items or decisions (if applicable)
4. Overall context

Transcript:
${transcript}

Please provide a well-structured, concise summary:`,
      config: {
        temperature: 0.3,
        maxOutputTokens: 1024,
      },
    });

    const summary = result.text;
    console.log('Gemini response received, length:', summary.length);

    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error('Error generating summary:', error);
    console.error('Error details:', error.message);
    
    // Return fallback summary on error
    const wordCount = transcript ? transcript.split(' ').length : 0;
    const fallbackSummary = `AI Summary Generation Test\n\nTranscript received: ${wordCount} words\n\nNote: There was an error connecting to Gemini AI. Please check:\n1. GOOGLE_GEMINI_API_KEY is set in .env.local\n2. API key is valid\n3. Internet connection is working\n\nError: ${error.message}`;
    
    return NextResponse.json({ summary: fallbackSummary }, { status: 200 });
  }
}

