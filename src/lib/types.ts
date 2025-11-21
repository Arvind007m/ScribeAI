export type TranscriptEntry = {
  speaker: string;
  timestamp: string;
  text: string;
};

export type Session = {
  id: string;
  title: string;
  date: string;
  summary: string;
  transcript: TranscriptEntry[];
};
