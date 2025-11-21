"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, Mic, ScreenShare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Session {
  id: string;
  title: string;
  audioSource: string;
  status: string;
  duration: number;
  startedAt: string;
  summary: string | null;
  transcripts: Array<{ text: string }>;
}

export default function SessionsPage() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSessions() {
      try {
        // Get user from localStorage
        const userStr = localStorage.getItem('user');
        if (!userStr) {
          console.error('No user found in localStorage');
          setLoading(false);
          return;
        }
        
        const user = JSON.parse(userStr);
        const response = await fetch(`/api/sessions?userId=${user.id}`);
        
        if (!response.ok) throw new Error('Failed to fetch sessions');
        
        const data = await response.json();
        setSessions(data.sessions);
      } catch (error) {
        console.error('Error fetching sessions:', error);
        toast({
          title: 'Error',
          description: 'Failed to load sessions',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchSessions();
  }, [toast]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold font-headline">Session History</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-headline">Session History</h1>
        <p className="text-sm text-muted-foreground">{sessions.length} sessions</p>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-48">
            <p className="text-muted-foreground">No sessions yet. Start recording to create your first session!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <Link key={session.id} href={`/dashboard/sessions/${session.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="font-headline text-lg line-clamp-2">
                      {session.title}
                    </CardTitle>
                    <Badge variant={session.status === 'completed' ? 'default' : 'secondary'} className="ml-2">
                      {session.status}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-xs">
                      <Calendar className="h-3 w-3" />
                      {new Date(session.startedAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1 text-xs">
                      <Clock className="h-3 w-3" />
                      {formatDuration(session.duration)}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-3">
                    {session.audioSource === 'microphone' ? (
                      <Mic className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ScreenShare className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {session.audioSource === 'microphone' ? 'Microphone' : 'Tab Audio'}
                    </span>
                  </div>
                  {session.summary && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {session.summary}
                    </p>
                  )}
                  {!session.summary && session.transcripts.length > 0 && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {session.transcripts[0].text}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

