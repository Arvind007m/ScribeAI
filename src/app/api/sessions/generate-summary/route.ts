import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let transcript = '';

  try {
    const body = await request.json();

    const generateSummarySchema = z.object({
      transcript: z.string().min(10, 'Transcript must be at least 10 characters'),
      startTime: z.number().optional(),
    });

    const validationResult = generateSummarySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    transcript = validationResult.data.transcript;
    const { startTime } = validationResult.data;

    console.log('Received transcript, length:', transcript.length);
    console.log('Calling Gemini API...');
    console.log('Transcript preview:', transcript.substring(0, 200));

    const result = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: `Analyze the following meeting transcript and provide a comprehensive summary in PLAIN TEXT format (no markdown, no asterisks, no special formatting).

Include these sections:

1. Main Topics Discussed: What were the primary subjects covered?
2. Key Decisions Made: What important decisions were reached?
3. Action Items: What tasks were assigned and to whom?
4. Important Dates/Deadlines: Any mentioned timelines?
5. Overall Outcome: What was the result of this meeting?

Transcript:
${transcript}

IMPORTANT: 
- Write the summary in plain text only. Do not use markdown formatting, asterisks, or any special characters for emphasis. Use simple paragraphs and line breaks.
- Provide a COMPLETE summary for all 5 sections above. Do not cut off mid-sentence.
- Write at least 3-4 sentences for each section.`,
      config: {
        temperature: 0.3,
        maxOutputTokens: 2048,
        stopSequences: [],
      },
    });

    console.log('Gemini raw result:', JSON.stringify(result, null, 2));

    let summary = '';

    if (typeof result.text === 'string') {
      summary = result.text;
    } else if (typeof result.text === 'function') {
      summary = result.text();
    } else if (result.output) {
      summary = result.output;
    } else {
      console.error('Unknown Genkit response format:', result);
      summary = `Session Summary\n\nTranscript: ${transcript.substring(0, 200)}...\n\n(Unable to parse AI response)`;
    }

    console.log('Gemini response received, length:', summary.length);
    console.log('Summary preview:', summary.substring(0, 200));

    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error('Error generating summary:', error);
    console.error('Error details:', error.message);

    const wordCount = transcript ? transcript.split(' ').length : 0;
    const fallbackSummary = `AI Summary Generation Test\n\nTranscript received: ${wordCount} words\n\nNote: There was an error connecting to Gemini AI. Please check:\n1. GOOGLE_GEMINI_API_KEY is set in .env.local\n2. API key is valid\n3. Internet connection is working\n\nError: ${error.message}`;

    return NextResponse.json({ summary: fallbackSummary }, { status: 200 });
  }
}
