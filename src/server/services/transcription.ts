import { ai } from '@/ai/genkit';
import { prisma } from '@/lib/prisma';
import { generate } from 'genkit';

/**
 * Process audio chunk and generate transcription using Gemini
 * @param audioData - Raw audio buffer
 * @param sessionId - Recording session ID
 * @param chunkIndex - Sequential chunk number
 * @returns Transcript segment or null if processing fails
 */
export async function processAudioChunk(
  audioData: Buffer,
  sessionId: string,
  chunkIndex: number
): Promise<any | null> {
  try {
    // Convert audio buffer to base64 for Gemini API
    const audioBase64 = audioData.toString('base64');

    // Use Gemini to transcribe audio
    // Note: Gemini 2.0 supports audio input
    const result = await generate({
      model: ai.model('googleai/gemini-2.0-flash-exp'),
      prompt: [
        {
          text: 'Transcribe the following audio accurately. Include speaker identification if multiple speakers are detected. Format: [Speaker]: text',
        },
        {
          media: {
            contentType: 'audio/webm',
            url: `data:audio/webm;base64,${audioBase64}`,
          },
        },
      ],
      config: {
        temperature: 0.1, // Low temperature for accurate transcription
      },
    });

    const transcriptionText = result.text();

    if (!transcriptionText) {
      console.warn(`No transcription generated for chunk ${chunkIndex}`);
      return null;
    }

    // Parse speaker and text (if format is [Speaker]: text)
    let speaker = 'Unknown';
    let text = transcriptionText;
    const speakerMatch = transcriptionText.match(/^\[(.*?)\]:\s*(.+)$/s);
    if (speakerMatch) {
      speaker = speakerMatch[1];
      text = speakerMatch[2];
    }

    // Calculate timestamp (assuming 30-second chunks)
    const startTime = chunkIndex * 30000; // milliseconds
    const timestamp = formatTimestamp(startTime);

    // Store transcript in database
    const transcript = await prisma.transcript.create({
      data: {
        recordingSessionId: sessionId,
        speaker,
        text,
        timestamp,
        startTime,
        endTime: startTime + 30000,
        confidence: 0.95, // Gemini doesn't provide confidence, using default
      },
    });

    return {
      id: transcript.id,
      speaker: transcript.speaker,
      text: transcript.text,
      timestamp: transcript.timestamp,
      startTime: transcript.startTime,
    };
  } catch (error) {
    console.error('Error processing audio chunk:', error);
    return null;
  }
}

/**
 * Generate AI summary of the meeting transcripts
 * @param transcripts - Array of transcript segments
 * @returns Summary text
 */
export async function generateSummary(transcripts: any[]): Promise<string> {
  try {
    if (transcripts.length === 0) {
      return 'No transcription available for this session.';
    }

    // Combine all transcripts into a single text
    const fullTranscript = transcripts
      .map((t) => `[${t.timestamp}] ${t.speaker}: ${t.text}`)
      .join('\n');

    // Generate summary using Gemini
    const result = await generate({
      model: ai.model('googleai/gemini-2.0-flash-exp'),
      prompt: `Analyze the following meeting transcript and provide a comprehensive summary including:
1. Main topics discussed
2. Key decisions made
3. Action items and assignments
4. Important deadlines or dates mentioned
5. Overall meeting outcome

Transcript:
${fullTranscript}

Please provide a well-structured summary:`,
      config: {
        temperature: 0.3,
        maxOutputTokens: 1024,
      },
    });

    return result.text();
  } catch (error) {
    console.error('Error generating summary:', error);
    return 'Failed to generate summary. Please try again.';
  }
}

/**
 * Extract action items from transcripts
 * @param transcripts - Array of transcript segments
 * @returns Array of action items
 */
export async function extractActionItems(transcripts: any[]): Promise<string[]> {
  try {
    const fullTranscript = transcripts
      .map((t) => `[${t.timestamp}] ${t.speaker}: ${t.text}`)
      .join('\n');

    const result = await generate({
      model: ai.model('googleai/gemini-2.0-flash-exp'),
      prompt: `Extract all action items from this meeting transcript. 
List each action item on a new line, including who is responsible if mentioned.
Format: "- [Person]: Action item" or "- Action item" if no person is specified.

Transcript:
${fullTranscript}

Action items:`,
      config: {
        temperature: 0.2,
        maxOutputTokens: 512,
      },
    });

    const actionItemsText = result.text();
    return actionItemsText
      .split('\n')
      .filter((line) => line.trim().startsWith('-'))
      .map((line) => line.trim().substring(1).trim());
  } catch (error) {
    console.error('Error extracting action items:', error);
    return [];
  }
}

/**
 * Format milliseconds to HH:MM:SS timestamp
 * @param ms - Milliseconds
 * @returns Formatted timestamp string
 */
function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Perform speaker diarization on transcripts
 * Groups consecutive segments by the same speaker
 * @param transcripts - Array of transcript segments
 * @returns Grouped transcripts by speaker
 */
export function groupBySpeaker(transcripts: any[]): any[] {
  const grouped: any[] = [];
  let currentGroup: any = null;

  for (const transcript of transcripts) {
    if (!currentGroup || currentGroup.speaker !== transcript.speaker) {
      if (currentGroup) {
        grouped.push(currentGroup);
      }
      currentGroup = {
        speaker: transcript.speaker,
        text: transcript.text,
        timestamp: transcript.timestamp,
        startTime: transcript.startTime,
        endTime: transcript.endTime,
      };
    } else {
      currentGroup.text += ' ' + transcript.text;
      currentGroup.endTime = transcript.endTime;
    }
  }

  if (currentGroup) {
    grouped.push(currentGroup);
  }

  return grouped;
}

