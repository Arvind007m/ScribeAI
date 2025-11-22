const { ai } = require('../../ai/genkit');

/**
 * Process audio chunk and generate transcription using Gemini
 * Implements speaker diarization and accurate transcription
 *
 * @param {Buffer} audioData - Raw audio buffer (WebM format)
 * @param {string} sessionId - Recording session ID
 * @param {number} chunkIndex - Sequential chunk number
 * @returns {Promise<Object|null>} Transcript segment with speaker identification
 */
async function processAudioChunk(audioData, sessionId, chunkIndex) {
  try {
    console.log(`🎯 Processing audio chunk ${chunkIndex}, size: ${audioData.length} bytes`);

    // Convert audio buffer to base64 for Gemini API
    const audioBase64 = audioData.toString('base64');

    // Use Gemini 2.5 Flash to transcribe audio with speaker diarization
    const result = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: [
        {
          text: `Transcribe the following audio accurately with speaker identification.

CRITICAL INSTRUCTIONS:
1. Listen carefully for speaker names mentioned in the audio
2. If a speaker's name is mentioned (e.g., "Hi, I'm John"), use that name: [John]
3. If names are not mentioned, use generic labels: [Speaker 1], [Speaker 2], etc.
4. Format each line as: [Speaker Name/Number]: transcribed text
5. Transcribe EXACTLY what is spoken - do not add or invent dialogue
6. If multiple speakers, identify each one separately
7. Maintain chronological order of speech
8. DO NOT include any example text - only transcribe the actual audio`,
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

    // Return array of segments (one per speaker)
    // Each segment will be displayed on a separate line in the UI
    return segments.map((segment, index) => ({
      speaker: segment.speaker,
      text: segment.text,
      timestamp: index === 0 ? timestamp : timestamp, // Same timestamp for all segments in this chunk
      startTime: startTime + index * 1000, // Slight offset for ordering
      chunkIndex,
    }));
  } catch (error) {
    console.error('❌ Error processing audio chunk:', error);
    return null;
  }
}

/**
 * Generate AI summary of the meeting transcripts
 * @param {string} fullTranscript - Complete transcript text
 * @returns {Promise<string>} Summary text with key points and action items
 */
async function generateSummary(fullTranscript) {
  try {
    if (!fullTranscript || fullTranscript.trim().length === 0) {
      return 'No transcription available for this session.';
    }

    console.log(`📝 Generating summary for transcript (${fullTranscript.length} characters)`);

    // Generate summary using Gemini
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
${fullTranscript}

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

    console.log(`✅ Summary generated successfully`);
    return result.text;
  } catch (error) {
    console.error('❌ Error generating summary:', error);
    return 'Failed to generate summary. Please try again.';
  }
}

/**
 * Format milliseconds to HH:MM:SS timestamp
 * @param {number} ms - Milliseconds
 * @returns {string} Formatted timestamp string
 */
function formatTimestamp(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

module.exports = {
  processAudioChunk,
  generateSummary,
};
