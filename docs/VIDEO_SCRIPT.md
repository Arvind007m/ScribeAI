# Video Walkthrough Script (3-5 minutes)

This script guides you through creating a video demonstration of ScribeAI for the AttackCapital assignment.

## Setup (Before Recording)

1. Ensure app is running at http://localhost:9002
2. Clear browser cache and session data
3. Have a sample meeting or script ready to speak
4. Test microphone and audio levels
5. Close unnecessary browser tabs
6. Set browser zoom to 100%

## Video Structure

### Intro (30 seconds)

**[Show: ScribeAI dashboard]**

> "Hi! This is ScribeAI, an AI-powered meeting transcription app I built for the AttackCapital assignment. It captures audio from your microphone or browser tabs, transcribes it in real-time using Google's Gemini AI, and generates comprehensive meeting summaries. Let me show you how it works."

### Demo 1: Microphone Recording (1 minute)

**[Show: New Session page]**

> "Let's start by recording from my microphone. I'll select the microphone option here..."

**[Click microphone radio button]**

> "...and click Start Session."

**[Click Start Session, grant permissions]**

> "The browser asks for microphone permission, which I'll allow."

**[Start speaking clearly]**

> "Hello, this is a test recording for ScribeAI. I'm demonstrating the real-time transcription feature. As you can see, my words are being transcribed live on the screen. The AI is also identifying me as the speaker."

**[Show: Live transcription appearing]**

> "Notice how the transcription appears in real-time, with timestamps and speaker labels. This is powered by Google's Gemini AI processing 30-second audio chunks."

### Demo 2: Pause/Resume (30 seconds)

**[Click Pause button]**

> "I can pause the recording at any time..."

**[Show: Paused state]**

> "...and resume when ready."

**[Click Resume button]**

> "The session continues seamlessly, maintaining all previous transcripts."

### Demo 3: Stop and Summary (45 seconds)

**[Click Stop button]**

> "When I'm done, I'll click Stop. The app now processes the full session..."

**[Show: Processing state]**

> "...and generates an AI-powered summary."

**[Show: Completed state with summary]**

> "Here's the summary, which includes key points, topics discussed, and any action items mentioned. I can also export this entire transcript as a text file."

**[Click Export button]**

> "And there it is - downloaded and ready to share."

### Demo 4: Tab Audio Capture (45 seconds)

**[Navigate back to dashboard]**

> "ScribeAI also supports capturing audio from browser tabs, perfect for recording Google Meet or Zoom calls."

**[Click New Session or refresh]**

> "I'll select Tab Audio this time..."

**[Select tab audio option, click Start]**

> "...and when I start, the browser asks which tab or window I want to share."

**[Show: Screen share picker]**

> "I can choose any tab with audio - like a YouTube video or a meeting. This captures the system audio directly, ensuring high-quality transcription even in noisy environments."

**[Stop the demo session]**

### Demo 5: Session History (30 seconds)

**[Navigate to Session History]**

> "All my sessions are saved in the history. I can click any session to view the full transcript..."

**[Click on a session]**

> "...see the complete conversation with timestamps, speaker labels, and the AI-generated summary. Everything is searchable and exportable."

### Architecture Highlight (30 seconds)

**[Show: README or architecture diagram if available]**

> "Under the hood, ScribeAI uses a streaming architecture with 30-second audio chunks. This design handles sessions over an hour long without memory issues, provides real-time feedback, and gracefully handles network interruptions with automatic reconnection."

**[Show: Tech stack section]**

> "It's built with Next.js 15, Socket.io for real-time communication, PostgreSQL for data persistence, and Google's Gemini AI for transcription and summarization."

### Closing (15 seconds)

**[Show: Dashboard or GitHub repo]**

> "ScribeAI demonstrates real-time audio processing, AI integration, scalable architecture, and production-ready code. All the source code, documentation, and deployment guides are available in the GitHub repository. Thanks for watching!"

## Recording Tips

### Video Settings
- **Resolution:** 1920x1080 (1080p)
- **Frame Rate:** 30 FPS
- **Format:** MP4 (H.264)
- **Audio:** Clear microphone, no background noise

### Screen Recording Tools
- **Mac:** QuickTime Player, ScreenFlow
- **Windows:** OBS Studio, Camtasia
- **Cross-platform:** Loom (easiest, recommended)

### Best Practices

1. **Speak Clearly:** Enunciate words, moderate pace
2. **Show, Don't Tell:** Let the app speak for itself
3. **Highlight Key Features:** Focus on real-time transcription and AI summary
4. **Keep It Concise:** 3-5 minutes maximum
5. **Test Run:** Record a practice version first
6. **Edit If Needed:** Cut out mistakes or long pauses

## Loom Recording Steps

1. Install Loom browser extension or desktop app
2. Click Loom icon, select "Screen + Camera" or "Screen Only"
3. Choose "Full Screen" or "Current Tab"
4. Click "Start Recording"
5. Follow the script above
6. Click "Stop" when finished
7. Loom automatically uploads and provides shareable link
8. Copy link for submission

## Alternative: YouTube Unlisted

1. Record video using any screen recorder
2. Upload to YouTube
3. Set visibility to "Unlisted"
4. Copy link for submission

## Backup Plan

If live demo has issues:
- Use pre-recorded audio file
- Show screenshots with voiceover
- Focus on code walkthrough instead

## What to Emphasize

✅ **Real-time transcription** - Most impressive feature
✅ **AI-generated summaries** - Shows AI integration
✅ **Pause/resume functionality** - Demonstrates state management
✅ **Session persistence** - Shows database integration
✅ **Tab audio capture** - Unique feature for meeting recording
✅ **Clean, professional UI** - Shows attention to detail

## What to Avoid

❌ Long silences or pauses
❌ Reading code line-by-line
❌ Apologizing for features not implemented
❌ Technical jargon without explanation
❌ Going over 5 minutes

## Post-Recording Checklist

- [ ] Video is 3-5 minutes long
- [ ] Audio is clear and understandable
- [ ] All key features demonstrated
- [ ] No sensitive information visible
- [ ] Video is uploaded and link is shareable
- [ ] Link tested in incognito mode

## Sample Transcript for Recording

Use this if you need something to say during the demo:

> "Hello everyone, welcome to our Q3 planning meeting. Today we'll discuss three main topics: the product roadmap, resource allocation, and timeline for the next quarter. 
>
> First, regarding the product roadmap, we need to prioritize the mobile app features based on user feedback. The data shows that 60% of our users are requesting offline mode functionality.
>
> Second, for resource allocation, we have five engineers available for the next sprint. I propose assigning three to the mobile team and two to the backend infrastructure improvements.
>
> Finally, the timeline. We're aiming to have the initial prototype ready by the end of this month, followed by a two-week testing period. That puts us on track for a mid-November release.
>
> Action items: Sarah will prepare the technical spec, John will coordinate with the design team, and I'll schedule a follow-up meeting for next week. Any questions?"

---

**Good luck with your video! 🎥**

