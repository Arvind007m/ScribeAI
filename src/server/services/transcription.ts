import { ai } from '@/ai/genkit';
import { prisma } from '@/lib/prisma';

/**
 * Process audio chunk and generate transcription using Gemini
 * Implements speaker diarization and accurate transcription
 *
 * @param audioData - Raw audio buffer (WebM format)
 * @param sessionId - Recording session ID
 * @param chunkIndex - Sequential chunk number
 * @returns Transcript segment with speaker identification
 */
export async function processAudioChunk(
  audioData: Buffer,
  sessionId: string,
  chunkIndex: number
): Promise<any | null> {
  try {
    console.log(`🎯 Processing audio chunk ${chunkIndex}, size: ${audioData.length} bytes`);

    // Convert audio buffer to base64 for Gemini API
    const audioBase64 = audioData.toString('base64');

    // Use Gemini 2.5 Flash to transcribe audio with speaker diarization
    const result = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: [
        {
          text: `Transcribe the following audio accurately with speaker diarization.

IMPORTANT INSTRUCTIONS:
1. Identify different speakers and label them as Speaker 1, Speaker 2, etc.
2. If only one speaker, label as "Speaker 1"
3. Format each line as: [Speaker X]: transcribed text
4. Be accurate with the transcription
5. Include all spoken words

Example format:
[Speaker 1]: Hello everyone, welcome to the meeting.
[Speaker 2]: Thanks for having me.`,
        },
        {
          media: {
            contentType: 'audio/webm;codecs=opus',
            url: `data:audio/webm;codecs=opus;base64,${audioBase64}`,
          },
        },
      ],
      config: {
        temperature: 0.1, // Low temperature for accurate transcription
        maxOutputTokens: 2048,
      },
    });

    const transcriptionText = result.text;

    if (!transcriptionText || transcriptionText.trim().length === 0) {
      console.warn(`⚠️ No transcription generated for chunk ${chunkIndex}`);
      return null;
    }

    console.log(
      `✅ Transcription received for chunk ${chunkIndex}:`,
      transcriptionText.substring(0, 100) + '...'
    );

    // Parse multiple speakers from the transcription
    // Format: [Speaker X]: text
    const lines = transcriptionText.split('\n').filter((line) => line.trim());
    const segments = [];

    for (const line of lines) {
      const speakerMatch = line.match(/^\[(.*?)\]:\s*(.+)$/);
      if (speakerMatch) {
        segments.push({
          speaker: speakerMatch[1].trim(),
          text: speakerMatch[2].trim(),
        });
      } else if (line.trim()) {
        // Fallback: if no speaker format, use "Speaker 1"
        segments.push({
          speaker: 'Speaker 1',
          text: line.trim(),
        });
      }
    }

    if (segments.length === 0) {
      // No segments parsed, use entire text
      segments.push({
        speaker: 'Speaker 1',
        text: transcriptionText.trim(),
      });
    }

    // Calculate timestamp (assuming 30-second chunks)
    const startTime = chunkIndex * 30000; // milliseconds
    const timestamp = formatTimestamp(startTime);

    // Return the first segment (or combine all segments)
    const combinedText = segments.map((s) => `[${s.speaker}]: ${s.text}`).join(' ');
    const primarySpeaker = segments[0].speaker;

    return {
      speaker: primarySpeaker,
      text: combinedText,
      timestamp,
      startTime,
      chunkIndex,
    };
  } catch (error) {
    console.error('Error processing audio chunk:', error);
    return null;
  }
}

/**
 * Generate AI summary of the meeting transcripts
 * @param fullTranscript - Complete transcript text
 * @returns Summary text with key points and action items
 */
export async function generateSummary(fullTranscript: string): Promise<string> {
  try {
    if (!fullTranscript || fullTranscript.trim().length === 0) {
      return 'No transcription available for this session.';
    }

    console.log(`📝 Generating summary for transcript (${fullTranscript.length} characters)`);

    // Generate summary using Gemini
    const result = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: `Analyze the following meeting transcript and provide a comprehensive summary including:

1. **Main Topics Discussed**: What were the primary subjects covered?
2. **Key Decisions Made**: What important decisions were reached?
3. **Action Items**: What tasks were assigned and to whom?
4. **Important Dates/Deadlines**: Any mentioned timelines?
5. **Overall Outcome**: What was the result of this meeting?

Transcript:
${fullTranscript}

Please provide a well-structured, professional summary:`,
      config: {
        temperature: 0.3,
        maxOutputTokens: 1024,
      },
    });

    console.log(`✅ Summary generated successfully`);
    return result.text;
  } catch (error) {
    console.error('❌ Error generating summary:', error);
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
