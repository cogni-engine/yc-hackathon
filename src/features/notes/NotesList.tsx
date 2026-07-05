'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  FileText,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';
import { listNotes, createNote, renameNote, softDeleteNote } from './api';
import { supabase, WORKSPACE_ID, type Note } from '@/lib/supabase';

/**
 * The list of notes. Used on the home page and in the `/notes/[id]` sidebar.
 * Each row has a ⋯ menu (Rename inline / Delete). Live-updates via realtime.
 */
export function NotesList() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [menuId, setMenuId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const router = useRouter();
  const pathname = usePathname();
  const activeId = Number(pathname.match(/^\/notes\/(\d+)/)?.[1]) || null;
  const editInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      setNotes(await listNotes());
    } catch {
      // ignore transient errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel('notes-list')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes',
          filter: `workspace_id=eq.${WORKSPACE_ID}`,
        },
        () => refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  useEffect(() => {
    if (editingId != null) editInputRef.current?.focus();
  }, [editingId]);

  async function onNew() {
    if (creating) return;
    setCreating(true);
    try {
      const note = await createNote();
      router.push(`/notes/${note.id}`);
    } finally {
      setCreating(false);
    }
  }

  function startRename(note: Note) {
    setMenuId(null);
    setEditingTitle(note.title?.trim() || '');
    setEditingId(note.id);
  }

  async function commitRename(id: number) {
    const next = editingTitle.trim() || 'Untitled';
    setEditingId(null);
    setNotes(prev => prev.map(n => (n.id === id ? { ...n, title: next } : n)));
    await renameNote(id, next);
  }

  async function onDelete(id: number) {
    setMenuId(null);
    if (!window.confirm('Delete this note?')) return;
    setNotes(prev => prev.filter(n => n.id !== id));
    await softDeleteNote(id);
    if (id === activeId) router.push('/');
  }

  return (
    <div className='flex h-full flex-col'>
      <div className='flex items-center justify-between px-3 py-3'>
        <span className='text-xs font-medium uppercase tracking-wide text-text-muted'>
          Notes
        </span>
        <button
          type='button'
          onClick={onNew}
          disabled={creating}
          title='New note'
          className='inline-flex size-7 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-interactive-hover hover:text-text-primary disabled:opacity-50'
        >
          {creating ? (
            <Loader2 className='size-4 animate-spin' />
          ) : (
            <Plus className='size-4' />
          )}
        </button>
      </div>
      <div className='min-h-0 flex-1 overflow-y-auto px-2 pb-3'>
        {loading ? (
          <div className='px-2 py-2 text-xs text-text-muted'>Loading…</div>
        ) : notes.length === 0 ? (
          <div className='px-2 py-2 text-xs text-text-muted'>
            No notes yet. Click + to create one.
          </div>
        ) : (
          notes.map(note => (
            <div key={note.id} className='group relative'>
              {editingId === note.id ? (
                <input
                  ref={editInputRef}
                  value={editingTitle}
                  onChange={e => setEditingTitle(e.target.value)}
                  onBlur={() => commitRename(note.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitRename(note.id);
                    } else if (e.key === 'Escape') {
                      setEditingId(null);
                    }
                  }}
                  placeholder='Untitled'
                  className='w-full rounded-md bg-surface-secondary px-2 py-1.5 text-sm text-text-primary outline-none'
                />
              ) : (
                <Link
                  href={`/notes/${note.id}`}
                  className={`flex items-center gap-2 rounded-md py-1.5 pl-2 pr-8 text-sm transition-colors ${
                    note.id === activeId
                      ? 'bg-surface-secondary text-text-primary'
                      : 'text-text-secondary hover:bg-interactive-hover hover:text-text-primary'
                  }`}
                >
                  <FileText className='size-3.5 shrink-0 text-text-muted' />
                  <span className='min-w-0 truncate'>
                    {note.title?.trim() || 'Untitled'}
                  </span>
                </Link>
              )}

              {editingId !== note.id && (
                <button
                  type='button'
                  onClick={e => {
                    e.preventDefault();
                    setMenuId(menuId === note.id ? null : note.id);
                  }}
                  title='More'
                  aria-label='More actions'
                  className={`absolute right-1 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-interactive-hover hover:text-text-primary ${
                    menuId === note.id
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <MoreHorizontal className='size-4' />
                </button>
              )}

              {menuId === note.id && (
                <>
                  <div
                    className='fixed inset-0 z-20'
                    onClick={() => setMenuId(null)}
                  />
                  <div className='absolute right-1 top-8 z-30 w-32 overflow-hidden rounded-md border border-dropdown-border bg-popover py-1 shadow-lg'>
                    <button
                      type='button'
                      onClick={() => startRename(note)}
                      className='flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-text-secondary hover:bg-interactive-hover hover:text-text-primary'
                    >
                      <Pencil className='size-3.5' />
                      Rename
                    </button>
                    <button
                      type='button'
                      onClick={() => onDelete(note.id)}
                      className='flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-500 hover:bg-interactive-hover'
                    >
                      <Trash2 className='size-3.5' />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
