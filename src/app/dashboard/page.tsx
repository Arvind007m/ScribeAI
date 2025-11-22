import { RecordingInterfaceStream } from '@/components/recording-interface-stream';

export default function Dashboard() {
  return (
    <>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl font-headline">New Session</h1>
      </div>
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
        <RecordingInterfaceStream />
      </div>
    </>
  );
}
