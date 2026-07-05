'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { renameNote } from './api';

/** Editable note title shown above the editor. Delete lives in the sidebar ⋯ menu. */
export function NoteHeader({ id }: { id: number }) {
  const [title, setTitle] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('notes')
      .select('title')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setTitle(data?.title ?? '');
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  function save() {
    const next = title.trim() || 'Untitled';
    if (next !== title) setTitle(next);
    void renameNote(id, next);
  }

  return (
    <input
      value={title}
      onChange={e => setTitle(e.target.value)}
      onBlur={save}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
      }}
      placeholder='Untitled'
      disabled={!loaded}
      aria-label='Note title'
      className='mb-2 w-full border-none bg-transparent text-2xl font-semibold text-text-primary outline-none placeholder:text-text-muted'
    />
  );
}
