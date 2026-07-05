'use client';

import { NotesList } from '@/features/notes/NotesList';

export default function Home() {
  return (
    <main className='mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 px-6 py-16'>
      <h1 className='text-2xl font-semibold text-text-primary'>Pillow</h1>
      <p className='text-sm text-text-muted'>Pick a note or create a new one.</p>
      <div className='rounded-lg border border-border-default'>
        <NotesList />
      </div>
    </main>
  );
}
