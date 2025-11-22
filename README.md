# ScribeAI - AI-Powered Audio Scribing and Meeting Transcription

ScribeAI is a full-stack Next.js application that captures and transcribes audio sessions in real-time using Google's Gemini AI. It supports both microphone input and tab audio capture (e.g., from Google Meet, Zoom), with features like live transcription, session management, AI-powered summaries, and export capabilities.

## Key Features

- **Real-time Audio Transcription**: Stream audio and get live transcription using Gemini AI
- **Multiple Audio Sources**: Record from microphone or capture tab audio (screen share)
- **Session Management**: Pause, resume, and stop recording sessions
- **AI-Powered Summaries**: Automatic meeting summaries with key points and action items
- **Speaker Diarization**: Identify and label different speakers in the transcript
- **Session History**: Browse and search past recording sessions
- **Export Functionality**: Download transcripts and summaries as text files
- **Responsive UI**: Modern, accessible interface with dark mode support
- **Real-time Updates**: WebSocket-based streaming for instant feedback

## Architecture Overview

### Tech Stack

- **Frontend**: Next.js 15 (App Router), React 18, TypeScript
- **Backend**: Node.js with custom Next.js server
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Better Auth
- **Real-time Communication**: Socket.io (WebSockets)
- **AI Integration**: Google Gemini 2.5 via Genkit
- **UI Components**: Radix UI + Tailwind CSS
- **Audio Processing**: MediaRecorder API

### System Architecture

```mermaid
graph TB
    Client[Web Browser]
    NextJS[Next.js App Router]
    SocketIO[Socket.io Server]
    Prisma[Prisma ORM]
    Postgres[(PostgreSQL)]
    Gemini[Google Gemini API]
    
    Client -->|HTTP/HTTPS| NextJS
    Client -->|WebSocket| SocketIO
    NextJS -->|Query/Mutation| Prisma
    SocketIO -->|Store Data| Prisma
    Prisma -->|SQL| Postgres
    SocketIO -->|Audio Chunks| Gemini
    Gemini -->|Transcription| SocketIO
    SocketIO -->|Real-time Updates| Client
```

### Audio Streaming Pipeline

```mermaid
sequenceDiagram
    participant Browser
    participant MediaRecorder
    participant Socket.io
    participant Server
    participant Gemini
    participant Database
    
    Browser->>MediaRecorder: Start Recording
    MediaRecorder->>MediaRecorder: Chunk Audio (30s)
    MediaRecorder->>Socket.io: Send Audio Chunk
    Socket.io->>Server: Emit 'audio-chunk'
    Server->>Database: Store Audio Chunk
    Server->>Gemini: Send for Transcription
    Gemini->>Server: Return Transcript
    Server->>Database: Store Transcript
    Server->>Socket.io: Emit 'transcription-update'
    Socket.io->>Browser: Display Transcript
```

## Architecture Comparison: Streaming vs. Upload

### Streaming Approach (Current Implementation)

| Aspect | Details |
|--------|---------|
| **Latency** | Low (2-5 seconds per chunk) |
| **User Experience** | Live transcription, immediate feedback |
| **Memory Usage** | Efficient (chunks processed incrementally) |
| **Scalability** | High (concurrent sessions supported) |
| **Network** | Consistent bandwidth usage |
| **Reliability** | Resilient (auto-reconnect, pause/resume) |
| **Use Case** | Long meetings (1+ hours) |

**Pros:**
- Real-time feedback during recording
- Lower memory footprint on client and server
- Better for long-duration sessions
- Graceful handling of network interruptions

**Cons:**
- More complex implementation
- Requires WebSocket infrastructure
- Slightly higher server load for concurrent sessions

### Upload Approach (Alternative)

| Aspect | Details |
|--------|---------|
| **Latency** | High (30-60 seconds post-recording) |
| **User Experience** | Batch processing, delayed feedback |
| **Memory Usage** | High (entire audio in memory) |
| **Scalability** | Medium (limited by upload size) |
| **Network** | Burst bandwidth usage |
| **Reliability** | Fragile (upload failures require retry) |
| **Use Case** | Short recordings (<10 minutes) |

**Pros:**
- Simpler implementation
- Standard HTTP infrastructure
- Easier error handling

**Cons:**
- No real-time feedback
- Memory constraints for long sessions
- Poor user experience for extended meetings
- Risk of data loss if browser crashes

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (local or cloud)
- Google Gemini API key ([Get one here](https://ai.google.dev))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Arvind007m/ScribeAI.git
   cd ScribeAI
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/scribeai"
   BETTER_AUTH_SECRET="your-secret-key-min-32-chars"
   BETTER_AUTH_URL="http://localhost:9002"
   GOOGLE_GEMINI_API_KEY="your-gemini-api-key"
   NODE_ENV="development"
   ```

4. **Set up the database**
   
   Run Prisma migrations to create database tables:
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:9002](http://localhost:9002)

### Database Setup Options

#### Option 1: Local PostgreSQL (Docker)

```bash
docker run --name scribeai-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=scribeai \
  -p 5432:5432 \
  -d postgres:16
```

#### Option 2: Cloud Database (Supabase)

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Copy the connection string from Settings > Database
4. Update `DATABASE_URL` in `.env.local`

## Usage Guide

### Starting a Recording Session

1. **Select Audio Source**
   - **Microphone**: Records from your default microphone
   - **Tab Audio**: Captures audio from a browser tab (e.g., Google Meet)

2. **Start Recording**
   - Click "Start Session"
   - Grant browser permissions for audio access
   - For tab audio, select the tab/window to share

3. **During Recording**
   - View live transcription as you speak
   - Pause/resume as needed
   - Monitor recording status

4. **Stop Recording**
   - Click "Stop" to end the session
   - AI processes the full transcript
   - Summary is generated automatically

5. **Review & Export**
   - View complete transcript with timestamps
   - Read AI-generated summary
   - Export as text file

### Session Management

- **View History**: Access past sessions from the sidebar
- **Session Details**: Click any session to view full transcript
- **Export**: Download transcripts for offline use

## Development

### Project Structure

```
scribeai/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   │   ├── auth/         # Authentication endpoints
│   │   │   └── sessions/     # Session management
│   │   └── dashboard/         # Dashboard pages
│   ├── components/            # React components
│   │   └── ui/               # Reusable UI components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utility libraries
│   ├── server/                # Server-side code
│   │   └── services/         # Business logic
│   └── ai/                    # AI/Genkit configuration
├── prisma/
│   └── schema.prisma          # Database schema
├── server.js                  # Custom Next.js server
└── package.json
```

### Available Scripts

```bash
npm run dev              # Start development server with Socket.io
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
npm run typecheck        # Run TypeScript compiler check
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run database migrations
npm run prisma:studio    # Open Prisma Studio (DB GUI)
```

### Key Technologies & Patterns

#### Audio Capture

Uses the **MediaRecorder API** with 30-second chunking:
- Supports WebM/Opus encoding
- Automatic chunk emission
- Graceful handling of stream interruptions

#### Real-time Communication

**Socket.io** events:
- `start-session`: Initialize recording
- `audio-chunk`: Stream audio data
- `transcription-update`: Receive live transcripts
- `pause-session` / `resume-session`: Control recording
- `stop-session`: Finalize and process

#### State Management

React hooks with TypeScript for type-safe state:
- `useAudioStream`: Main recording logic
- `useToast`: User notifications

## Long-Session Scalability

### Challenge: 1-Hour+ Recordings

Recording sessions lasting an hour or more present unique challenges:

1. **Memory Management**: Storing entire audio in memory is impractical
2. **Network Reliability**: Long sessions increase chance of disconnection
3. **User Experience**: Users need real-time feedback, not post-processing delays
4. **Processing Time**: Batch transcription of 1-hour audio takes 5-10 minutes

### Our Solution: Chunked Streaming Architecture

**Key Design Decisions:**

1. **30-Second Chunks**
   - Balance between API call frequency and latency
   - Small enough for quick processing (2-3 seconds)
   - Large enough to capture context for accurate transcription

2. **Client-Side Buffering**
   - MediaRecorder handles chunking automatically
   - Minimal memory footprint (only current chunk in memory)
   - Immediate chunk disposal after transmission

3. **Server-Side Processing**
   - Asynchronous chunk processing with Gemini
   - Database storage for persistence
   - No server-side audio accumulation

4. **Reconnection Strategy**
   - Auto-pause on disconnect
   - Session state persisted in database
   - Resume capability with session ID

5. **Progressive Transcription**
   - Each chunk processed independently
   - Results streamed to client immediately
   - Summary generated only on session completion

### Performance Metrics

For a 1-hour recording session:

- **Memory Usage**: ~5-10 MB (constant, regardless of duration)
- **Network Bandwidth**: ~1-2 MB/minute
- **Transcription Latency**: 2-5 seconds per chunk
- **Total Processing Time**: Real-time (no post-processing delay)
- **Database Storage**: ~50-100 MB per hour (audio + transcripts)

### Scalability Considerations

**Concurrent Sessions:**
- Socket.io handles 10,000+ concurrent connections
- Database connection pooling (Prisma default: 10 connections)
- Gemini API rate limits: 60 requests/minute (free tier)

**Recommendations for Production:**
- Use Redis for session state management
- Implement queue system (Bull/BullMQ) for transcription jobs
- Add CDN for static assets
- Enable database read replicas for session history
- Consider audio compression before transmission

## Security Considerations

- **Authentication**: Better Auth with secure session management
- **API Keys**: Environment variables, never committed to repo
- **Database**: Parameterized queries via Prisma (SQL injection safe)
- **WebSocket**: CORS configured, origin validation
- **Audio Data**: Encrypted in transit (WSS in production)

## Acknowledgments

- [Google Gemini](https://ai.google.dev) for powerful AI capabilities
- [Genkit](https://firebase.google.com/docs/genkit) for AI integration framework
- [Prisma](https://www.prisma.io) for excellent database tooling
- [Socket.io](https://socket.io) for real-time communication
- [Radix UI](https://www.radix-ui.com) for accessible components
- [Tailwind CSS](https://tailwindcss.com) for styling

---

**Built for the AttackCapital Assignment**
