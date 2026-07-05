'use client';

import Link from 'next/link';
import { NotesList } from '@/features/notes/NotesList';

export default function NotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='flex h-screen'>
      <aside className='flex w-64 shrink-0 flex-col border-r border-border-default bg-surface-primary'>
        <Link
          href='/'
          className='px-3 pt-3 text-lg font-semibold text-text-primary'
        >
          Pillow
        </Link>
        <div className='min-h-0 flex-1'>
          <NotesList />
        </div>
      </aside>
      <main className='min-w-0 flex-1 overflow-y-auto'>{children}</main>
    </div>
  );
}
