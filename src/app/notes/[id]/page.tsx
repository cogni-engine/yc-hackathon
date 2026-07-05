'use client';

import dynamic from 'next/dynamic';
import { use } from 'react';
import { NoteHeader } from '@/features/notes/NoteHeader';

// Collaborative editor — client only (websockets + browser APIs).
const CanvasEditor = dynamic(
  () => import('@/features/canvas/CanvasEditor').then(m => m.CanvasEditor),
  { ssr: false }
);

export default function NotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className='mx-auto min-h-full w-full max-w-3xl px-8 py-10'>
      <NoteHeader id={Number(id)} />
      <CanvasEditor noteId={id} />
    </div>
  );
}
