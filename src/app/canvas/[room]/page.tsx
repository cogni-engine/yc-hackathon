'use client';

import dynamic from 'next/dynamic';
import { use } from 'react';

// The collaborative editor relies on websockets and browser APIs — client only.
const CanvasEditor = dynamic(
  () => import('@/features/canvas/CanvasEditor').then(m => m.CanvasEditor),
  { ssr: false }
);

export default function CanvasRoomPage({
  params,
}: {
  params: Promise<{ room: string }>;
}) {
  const { room } = use(params);
  const roomId = decodeURIComponent(room);

  return (
    <main className='mx-auto min-h-screen w-full max-w-3xl px-6 py-10'>
      <header className='mb-6 flex items-baseline justify-between'>
        <h1 className='text-lg font-semibold text-neutral-800 dark:text-neutral-100'>
          Canvas
        </h1>
        <span className='font-mono text-xs text-neutral-400'>#{roomId}</span>
      </header>
      <CanvasEditor room={roomId} />
    </main>
  );
}
