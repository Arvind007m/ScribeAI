import type { Session } from './types';

export const SESSIONS: Session[] = [
  {
    id: '1',
    title: 'Q3 Project Kickoff',
    date: '2024-07-22',
    summary:
      'The Q3 project kickoff meeting established the main goals for the new product launch. Key decisions included finalizing the marketing strategy and assigning team roles. Action items involve setting up the project board and scheduling a follow-up for next week.',
    transcript: [
      {
        speaker: 'Alice',
        timestamp: '00:01:15',
        text: 'Welcome everyone to the Q3 kickoff. Our main agenda today is to align on the goals for the new product launch.',
      },
      {
        speaker: 'Bob',
        timestamp: '00:02:30',
        text: 'Thanks, Alice. I’ve prepared a deck on the proposed marketing strategy. I think we should focus on social media engagement first.',
      },
      {
        speaker: 'Charlie',
        timestamp: '00:03:45',
        text: 'I agree with Bob. We need to build buzz. What about influencer collaborations?',
      },
      {
        speaker: 'Alice',
        timestamp: '00:05:00',
        text: 'Good point, Charlie. Let\'s earmark that. For action items: Bob, you will lead the marketing stream. Charlie, please draft the initial social media copy. I will set up the project management board by end of day.',
      },
    ],
  },
  {
    id: '2',
    title: 'Weekly Sync - Engineering',
    date: '2024-07-18',
    summary:
      'The engineering team discussed the current sprint progress. A blocker was identified in the payment gateway integration. An action item was assigned to Dave to investigate the API documentation and report back.',
    transcript: [
      {
        speaker: 'Dave',
        timestamp: '00:01:05',
        text: 'Okay team, weekly sync time. Let\'s go over sprint progress. I\'m currently blocked on the payment gateway integration. The API is returning an unexpected error.',
      },
      {
        speaker: 'Eve',
        timestamp: '00:02:10',
        text: 'Have you checked the latest version of their documentation? They pushed an update last week.',
      },
      {
        speaker: 'Dave',
        timestamp: '00:02:45',
        text: 'I haven\'t. That could be it. I\'ll take the action item to investigate the new docs and report back by tomorrow morning.',
      },
    ],
  },
  {
    id: '3',
    title: 'Design Review: New UI',
    date: '2024-07-15',
    summary:
      'The design team reviewed the new user interface mockups. Feedback was generally positive, with minor suggestions for improving color contrast and button placement. The design is approved pending these small revisions.',
    transcript: [
      {
        speaker: 'Frank',
        timestamp: '00:01:20',
        text: 'Here are the latest mockups for the new dashboard UI. I\'m looking for feedback on the overall layout and color scheme.',
      },
      {
        speaker: 'Grace',
        timestamp: '00:03:00',
        text: 'This looks fantastic, Frank! Very clean. My only suggestion would be to increase the contrast on the secondary buttons to meet accessibility standards.',
      },
      {
        speaker: 'Frank',
        timestamp: '00:04:15',
        text: 'Excellent point, Grace. Easy fix. I\'ll make that adjustment. Any other thoughts?',
      },
      {
        speaker: 'Heidi',
        timestamp: '00:04:50',
        text: 'Looks good to me. I approve.',
      },
    ],
  },
];
