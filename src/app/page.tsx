'use client';

import { NotesList } from '@/features/notes/NotesList';

export default function Home() {
  return (
    <main className='mx-auto h-screen w-full max-w-md px-2 py-4'>
      <NotesList />
    </main>
  );
}
