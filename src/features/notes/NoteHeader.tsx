'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { renameNote } from './api';

/** Editable note title shown above the editor. Delete lives in the sidebar ⋯ menu. */
export function NoteHeader({ id }: { id: number }) {
  const [title, setTitle] = useState('');
  const [loaded, setLoaded] = useState(false);
  const lastSavedTitleRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    supabase
      .from('notes')
      .select('title')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const nextTitle = data?.title ?? '';
        lastSavedTitleRef.current = nextTitle;
        setTitle(nextTitle);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  function save(value: string) {
    const next = value.trim() || 'Untitled';
    setTitle(next);
    if (next === lastSavedTitleRef.current) return;

    lastSavedTitleRef.current = next;
    void renameNote(id, next).catch(() => {
      lastSavedTitleRef.current = null;
    });
  }

  return (
    <input
      value={title}
      onChange={e => setTitle(e.target.value)}
      onBlur={e => save(e.currentTarget.value)}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          save(e.currentTarget.value);
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
