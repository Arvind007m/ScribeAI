"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Loader2, Calendar, Clock, Mic } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Transcript {
  id: string;
  speaker: string;
  text: string;
  timestamp: string;
  startTime: number;
}

interface Session {
  id: string;
  title: string;
  audioSource: string;
  status: string;
  duration: number;
  startedAt: string;
  completedAt: string | null;
  summary: string | null;
  transcripts: Transcript[];
}

export default function SessionDetailPage() {
  const params = useParams();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSession() {
      try {
        const response = await fetch(`/api/sessions/${params.id}`);
        
        if (response.status === 404) {
          setSession(null);
          setLoading(false);
          return;
        }
        
        if (!response.ok) {
          throw new Error('Failed to fetch session');
        }
        
        const data = await response.json();
        setSession(data.session);
      } catch (error) {
        console.error('Error fetching session:', error);
        toast({
          title: 'Error',
          description: 'Failed to load session details',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchSession();
    }
  }, [params.id, toast]);

  const exportTranscript = () => {
    if (!session) return;

    const transcriptText = session.transcripts
      .map((t) => `[${t.timestamp}] ${t.speaker}: ${t.text}`)
      .join('\n');
    
    const fullText = `ScribeAI Transcript - ${session.title}\nDate: ${new Date(session.startedAt).toLocaleString()}\n\n${transcriptText}\n\n---\n\nSummary:\n${session.summary || 'No summary available'}`;
    
    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.title.replace(/\s+/g, '-')}-transcript.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Exported',
      description: 'Transcript has been downloaded.',
    });
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Session not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-headline">{session.title}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(session.startedAt).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatDuration(session.duration)}
            </span>
            <span className="flex items-center gap-1">
              <Mic className="h-4 w-4" />
              {session.audioSource === 'microphone' ? 'Microphone' : 'Tab Audio'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={session.status === 'completed' ? 'default' : 'secondary'}>
            {session.status}
          </Badge>
          {session.status === 'completed' && (
            <Button onClick={exportTranscript} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          )}
        </div>
      </div>

      {session.summary && (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{session.summary}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Transcript</CardTitle>
          <CardDescription>
            {session.transcripts.length} segments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] w-full rounded-md border p-4">
            {session.transcripts.length > 0 ? (
              <div className="space-y-4">
                {session.transcripts.map((segment) => (
                  <div key={segment.id} className="pb-3 border-b last:border-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground font-mono">
                        {segment.timestamp}
                      </span>
                      <span className="font-semibold text-sm">{segment.speaker}</span>
                    </div>
                    <p className="text-sm ml-4">{segment.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No transcript available
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
