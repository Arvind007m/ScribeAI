let globalTranscripts: any[] = [];
let globalSessionId: string | null = null;
let globalStartTime: Date | null = null;

export function addTranscript(transcript: any) {
  globalTranscripts.push(transcript);
  console.log('Added transcript to global store, total:', globalTranscripts.length);
}

export function getTranscripts() {
  return globalTranscripts;
}

export function clearTranscripts() {
  globalTranscripts = [];
  console.log('Cleared global transcript store');
}

export function getTranscriptCount() {
  return globalTranscripts.length;
}

export function setSessionId(sessionId: string | null) {
  globalSessionId = sessionId;
  console.log('Set global sessionId:', sessionId);
}

export function getSessionId() {
  return globalSessionId;
}

export function setStartTime(startTime: Date | null) {
  globalStartTime = startTime;
  console.log('Set global startTime:', startTime);
}

export function getStartTime() {
  return globalStartTime;
}
