'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Mic,
  Pause,
  Play,
  ScreenShare,
  StopCircle,
  Loader2,
  Download,
  AlertCircle,
  Radio,
} from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from './ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAudioStream } from '@/hooks/use-audio-stream';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  addTranscript,
  getTranscripts,
  clearTranscripts,
  setSessionId as setGlobalSessionId,
  getSessionId as getGlobalSessionId,
  setStartTime as setGlobalStartTime,
  getStartTime as getGlobalStartTime,
} from '@/lib/transcript-store';

type SessionState = 'idle' | 'recording' | 'paused' | 'processing' | 'completed';
type AudioSource = 'microphone' | 'tab-audio';

interface TranscriptSegment {
  speaker: string;
  text: string;
  timestamp: string;
}

export function RecordingInterfaceStream() {
  const { toast } = useToast();
  const router = useRouter();

  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [audioSource, setAudioSource] = useState<AudioSource>('microphone');
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [startTime, setStartTime] = useState<Date | null>(null);

  const {
    isRecording,
    isConnected,
    sessionId,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cleanup,
  } = useAudioStream({
    onTranscriptUpdate: (segment) => {
      console.log('✅ New transcript segment received:', segment);
      addTranscript(segment); // Add to global store
      setTranscripts((prev) => {
        const updated = [...prev, segment];
        console.log('📝 Total transcripts now:', updated.length);
        return updated;
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
    },
    chunkDuration: 30000, // 30 seconds
  });

  // Cleanup on unmount (but not on HMR)
  useEffect(() => {
    return () => {
      // Only cleanup if actually unmounting, not on HMR
      if (sessionState === 'recording' || sessionState === 'paused') {
        console.log('⚠️ Component unmounting during recording, keeping connection');
      } else {
        cleanup();
      }
    };
  }, [cleanup, sessionState]);

  const handleStart = async () => {
    try {
      setTranscripts([]);
      clearTranscripts(); // Clear global store
      setSummary('');
      const now = new Date();
      setStartTime(now);
      setGlobalStartTime(now); // Store in global (survives HMR)

      if (audioSource === 'tab-audio') {
        toast({
          title: 'Select Tab Audio',
          description:
            "In the popup, select the tab you want to record and CHECK 'Share tab audio' before clicking Share.",
          duration: 5000,
        });
      }

      await startRecording(audioSource);
      setSessionState('recording');

      toast({
        title: 'Recording Started',
        description: `Capturing audio from ${audioSource === 'microphone' ? 'microphone' : 'tab audio'}. Audio chunks sent every 30 seconds for AI transcription.`,
      });
    } catch (error: any) {
      toast({
        title: 'Failed to Start',
        description: error.message || 'Could not start recording',
        variant: 'destructive',
      });
    }
  };

  const handlePause = () => {
    pauseRecording();
    setSessionState('paused');
    toast({
      title: 'Recording Paused',
      description: 'Audio capture paused. Click Resume to continue.',
    });
  };

  const handleResume = () => {
    resumeRecording();
    setSessionState('recording');
    toast({
      title: 'Recording Resumed',
      description: 'Audio capture resumed.',
    });
  };

  const handleStop = async () => {
    console.log('🛑 handleStop called');
    console.log('Current sessionId (local):', sessionId);

    // Get sessionId from global store if local is null (HMR issue)
    const actualSessionId = sessionId || getGlobalSessionId();
    console.log('Actual sessionId (global fallback):', actualSessionId);

    stopRecording();
    setSessionState('processing');

    toast({
      title: 'Processing',
      description: 'Generating AI summary with Gemini...',
    });

    try {
      // Get user from localStorage
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      console.log('👤 User from localStorage:', user ? user.id : 'null');

      // Get transcripts from global store (survives HMR)
      const allTranscripts = getTranscripts();
      console.log('📝 Transcripts from global store:', allTranscripts.length);
      console.log('📝 Transcripts from state:', transcripts.length);

      // Use global store as it survives HMR
      const transcriptsToUse = allTranscripts.length > 0 ? allTranscripts : transcripts;

      const fullTranscript = transcriptsToUse
        .map((t) => `[${t.timestamp}] ${t.speaker}: ${t.text}`)
        .join('\n');

      console.log('📝 Full transcript text length:', fullTranscript.length);
      console.log('📝 Full transcript preview:', fullTranscript.substring(0, 200) + '...');

      // Generate summary
      const summaryResponse = await fetch('/api/sessions/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: fullTranscript }),
      });

      let generatedSummary = '';
      if (summaryResponse.ok) {
        const data = await summaryResponse.json();
        generatedSummary = data.summary;
        console.log('✅ Summary generated successfully, length:', generatedSummary.length);
      } else {
        generatedSummary = `Session recorded ${transcripts.length} transcript segments.`;
        console.error('❌ Summary generation failed:', summaryResponse.status);
      }

      setSummary(generatedSummary);
      console.log('📊 Summary set in state');

      // Save to database if user is logged in
      console.log('🔍 Checking database save conditions:', {
        hasUser: !!user,
        userId: user?.id,
        hasSessionId: !!actualSessionId,
        sessionId: actualSessionId,
      });

      if (user && actualSessionId) {
        const actualStartTime = startTime || getGlobalStartTime();
        const duration = actualStartTime
          ? Math.floor((Date.now() - actualStartTime.getTime()) / 1000)
          : 0;

        console.log('💾 Saving session to database...');
        console.log('User ID:', user.id);
        console.log('Transcripts to save:', transcriptsToUse.length);

        const saveResponse = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            title: `Session ${new Date().toLocaleString()}`,
            audioSource,
            transcript: transcriptsToUse, // Array of transcript objects
            summary: generatedSummary,
            duration,
          }),
        });

        if (saveResponse.ok) {
          const savedData = await saveResponse.json();
          console.log('✅ Session saved to database:', savedData.session.id);
        } else {
          console.error('❌ Failed to save session:', await saveResponse.text());
        }
      } else {
        console.warn('⚠️ Not saving to database - user or sessionId missing:', {
          user: !!user,
          sessionId,
        });
      }

      setSessionState('completed');
      toast({
        title: 'Processing Complete',
        description: 'Your session summary is ready!',
      });
    } catch (error) {
      console.error('Error processing session:', error);
      setSessionState('idle');
      toast({
        title: 'Error',
        description: 'Failed to process session.',
        variant: 'destructive',
      });
    }
  };

  const handleReset = () => {
    setSessionState('idle');
    setTranscripts([]);
    setSummary('');
    setStartTime(null);
    cleanup();
  };

  const exportTranscript = () => {
    const transcriptText = transcripts
      .map((t) => `[${t.timestamp}] ${t.speaker}: ${t.text}`)
      .join('\n');

    const fullText = `ScribeAI Transcript\n\n${transcriptText}\n\n---\n\nSummary:\n${summary}`;

    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Exported',
      description: 'Transcript downloaded successfully.',
    });
  };

  const renderControls = () => {
    switch (sessionState) {
      case 'idle':
        return (
          <Button onClick={handleStart} size="lg" disabled={!isConnected}>
            <Play className="mr-2 h-4 w-4" /> Start Session
          </Button>
        );
      case 'recording':
        return (
          <div className="flex gap-4">
            <Button onClick={handlePause} variant="secondary" size="lg">
              <Pause className="mr-2 h-4 w-4" /> Pause
            </Button>
            <Button onClick={handleStop} variant="destructive" size="lg">
              <StopCircle className="mr-2 h-4 w-4" /> Stop
            </Button>
          </div>
        );
      case 'paused':
        return (
          <div className="flex gap-4">
            <Button onClick={handleResume} size="lg">
              <Play className="mr-2 h-4 w-4" /> Resume
            </Button>
            <Button onClick={handleStop} variant="destructive" size="lg">
              <StopCircle className="mr-2 h-4 w-4" /> Stop
            </Button>
          </div>
        );
      case 'processing':
        return (
          <Button disabled size="lg">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
          </Button>
        );
      case 'completed':
        return (
          <div className="flex gap-4">
            <Button onClick={exportTranscript} variant="outline" size="lg">
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
            <Button onClick={handleReset} size="lg">
              <Play className="mr-2 h-4 w-4" /> Start New Session
            </Button>
          </div>
        );
    }
  };

  const isRecordingActive = sessionState === 'recording' || sessionState === 'paused';

  return (
    <div className="flex flex-col items-center justify-center p-6 w-full max-w-6xl mx-auto">
      {/* Show error only if disconnected */}
      {!isConnected && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Connection lost. Please refresh the page.</AlertDescription>
        </Alert>
      )}

      {sessionState === 'idle' && (
        <Card className="w-full border-2 shadow-xl bg-gradient-to-br from-background to-muted/20">
          <CardContent className="pt-12 pb-12">
            <div className="flex flex-col items-center gap-8">
              {/* Hero Icon */}
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
                <div className="relative bg-primary/10 p-8 rounded-full">
                  <Mic className="h-16 w-16 text-primary" />
                </div>
              </div>

              {/* Heading */}
              <div className="text-center space-y-3">
                <h2 className="text-4xl font-bold font-headline bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Ready to Record!
                </h2>
                <p className="text-muted-foreground text-lg max-w-md">
                  Choose your audio source and start capturing your meetings with AI-powered
                  transcription
                </p>
              </div>

              {/* Audio Source Selection */}
              <RadioGroup
                defaultValue="microphone"
                className="grid grid-cols-2 gap-4 w-full max-w-md"
                onValueChange={(value) => setAudioSource(value as AudioSource)}
              >
                <div className="relative">
                  <RadioGroupItem value="microphone" id="microphone" className="peer sr-only" />
                  <Label
                    htmlFor="microphone"
                    className="flex flex-col items-center gap-3 p-6 border-2 rounded-xl cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:shadow-lg"
                  >
                    <Mic className="h-8 w-8 text-primary" />
                    <span className="font-semibold">Microphone</span>
                  </Label>
                </div>
                <div className="relative">
                  <RadioGroupItem value="tab-audio" id="tab-audio" className="peer sr-only" />
                  <Label
                    htmlFor="tab-audio"
                    className="flex flex-col items-center gap-3 p-6 border-2 rounded-xl cursor-pointer transition-all hover:border-primary/50 hover:bg-primary/5 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:shadow-lg"
                  >
                    <ScreenShare className="h-8 w-8 text-primary" />
                    <span className="font-semibold">Tab Audio</span>
                  </Label>
                </div>
              </RadioGroup>

              {/* Start Button */}
              <div className="mt-4">{renderControls()}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {(isRecordingActive || sessionState === 'processing' || sessionState === 'completed') && (
        <Card className="w-full border-2 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-primary/5 to-transparent border-b">
            <CardTitle className="font-headline text-2xl">
              {sessionState === 'completed' ? '✨ Session Complete' : '🎙️ Live Transcription'}
            </CardTitle>
            <div className="flex items-center gap-2">
              {sessionState === 'recording' && (
                <Badge variant="destructive" className="capitalize px-4 py-1.5 text-sm shadow-lg">
                  <div className="w-2 h-2 mr-2 bg-white rounded-full animate-pulse" />
                  Recording
                </Badge>
              )}
              {sessionState === 'paused' && (
                <Badge variant="secondary" className="capitalize px-4 py-1.5 text-sm">
                  Paused
                </Badge>
              )}
              {sessionState === 'processing' && (
                <Badge variant="default" className="capitalize px-4 py-1.5 text-sm shadow-lg">
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  Processing
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96 w-full rounded-lg border-2 p-6 bg-gradient-to-b from-background to-muted/10">
              {transcripts.length > 0 ? (
                <div className="space-y-5">
                  {transcripts.map((segment, index) => (
                    <div
                      key={index}
                      className="group relative border-l-4 border-primary/40 pl-5 py-3 rounded-r-lg hover:border-primary hover:bg-primary/5 transition-all duration-200 hover:shadow-md"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-primary/60 group-hover:bg-primary" />
                        <span className="text-sm font-bold text-primary group-hover:text-primary/80">
                          {segment.speaker}
                        </span>
                      </div>
                      <p className="text-base leading-relaxed text-foreground/90 group-hover:text-foreground">
                        {segment.text}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  {sessionState === 'processing' ? (
                    <>
                      <Loader2 className="h-8 w-8 animate-spin mb-2" />
                      <p>Generating AI summary...</p>
                    </>
                  ) : (
                    <>
                      <Mic className="h-8 w-8 mb-2 animate-pulse" />
                      <p className="text-base font-medium">Listening...</p>
                      <p className="text-xs mt-2">Your transcript will appear here in real-time</p>
                    </>
                  )}
                </div>
              )}
            </ScrollArea>

            {sessionState === 'completed' && summary && (
              <>
                <Separator className="my-8" />
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-primary"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold font-headline bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                      AI Summary
                    </h3>
                  </div>
                  <ScrollArea className="h-96 w-full rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 shadow-inner">
                    <div className="p-6">
                      <p className="text-base leading-relaxed whitespace-pre-wrap">{summary}</p>
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="flex justify-center">{renderControls()}</CardFooter>
        </Card>
      )}
    </div>
  );
}
