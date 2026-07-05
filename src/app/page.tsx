'use client';

import { NotesList } from '@/features/notes/NotesList';

export default function Home() {
  return (
    <main className='mx-auto h-screen w-full max-w-2xl px-6 py-8'>
      <NotesList variant='spacious' />
    </main>
  );
}
