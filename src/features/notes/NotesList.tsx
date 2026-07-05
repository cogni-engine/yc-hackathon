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
import {
  NOTES_MUTATION_EVENT,
  listNotes,
  createNote,
  renameNote,
  softDeleteNote,
  type NotesMutationDetail,
} from './api';
import { supabase, WORKSPACE_ID, type Note } from '@/lib/supabase';
import { useDisplayName } from '@/features/user/identity';

interface NotesListProps {
  variant?: 'compact' | 'spacious';
}

function formatUpdatedAt(updatedAt: string) {
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return 'Updated recently';

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function sortNotesByUpdatedAt(notes: Note[]) {
  return [...notes].sort(
    (a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)
  );
}

function applyNotesMutation(notes: Note[], detail: NotesMutationDetail) {
  if (detail.type === 'delete') {
    return notes.filter(note => note.id !== detail.id);
  }

  if (detail.note.workspace_id !== WORKSPACE_ID) return notes;

  const exists = notes.some(note => note.id === detail.note.id);
  const nextNotes = exists
    ? notes.map(note => (note.id === detail.note.id ? detail.note : note))
    : [detail.note, ...notes];

  return sortNotesByUpdatedAt(nextNotes);
}

/**
 * The list of notes. Used on the home page and in the `/notes/[id]` sidebar.
 * Each row has a ⋯ menu (Rename inline / Delete). Live-updates via realtime.
 */
export function NotesList({ variant = 'compact' }: NotesListProps) {
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
  const { name, setName } = useDisplayName();
  const isSpacious = variant === 'spacious';

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
    function onNotesMutation(event: Event) {
      const { detail } = event as CustomEvent<NotesMutationDetail>;
      if (!detail) return;

      setNotes(prev => applyNotesMutation(prev, detail));
      setLoading(false);
    }

    window.addEventListener(NOTES_MUTATION_EVENT, onNotesMutation);
    return () => {
      window.removeEventListener(NOTES_MUTATION_EVENT, onNotesMutation);
    };
  }, []);

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
    if (id === activeId) router.push('/notes');
  }

  return (
    <div className='flex h-full flex-col'>
      <div
        className={`flex items-center gap-2 py-2 ${
          isSpacious ? 'px-0' : 'px-2'
        }`}
      >
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder='Your name'
          aria-label='Your display name'
          className={`min-w-0 flex-1 rounded-md bg-transparent px-1 text-text-primary outline-none placeholder:text-text-muted hover:bg-interactive-hover focus:bg-interactive-hover ${
            isSpacious ? 'py-2 text-base font-medium' : 'py-1 text-sm'
          }`}
        />
        <button
          type='button'
          onClick={onNew}
          disabled={creating}
          title='New note'
          className={`inline-flex items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-interactive-hover hover:text-text-primary disabled:opacity-50 ${
            isSpacious ? 'size-9' : 'size-7'
          }`}
        >
          {creating ? (
            <Loader2
              className={`${isSpacious ? 'size-5' : 'size-4'} animate-spin`}
            />
          ) : (
            <Plus className={isSpacious ? 'size-5' : 'size-4'} />
          )}
        </button>
      </div>
      <div
        className={`min-h-0 flex-1 overflow-y-auto pb-3 ${
          isSpacious ? 'space-y-2 px-0 pt-2' : 'px-2'
        }`}
      >
        {loading ? (
          <div
            className={`px-2 py-2 text-text-muted ${
              isSpacious ? 'text-sm' : 'text-xs'
            }`}
          >
            Loading…
          </div>
        ) : notes.length === 0 ? (
          <div
            className={`px-2 py-2 text-text-muted ${
              isSpacious ? 'text-sm' : 'text-xs'
            }`}
          >
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
                  className={`w-full rounded-md bg-surface-secondary text-text-primary outline-none ${
                    isSpacious
                      ? 'px-4 py-4 text-base font-medium'
                      : 'px-2 py-1.5 text-sm'
                  }`}
                />
              ) : (
                <Link
                  href={`/notes/${note.id}`}
                  className={
                    isSpacious
                      ? `flex items-center gap-3 rounded-lg border px-4 py-4 pr-12 transition-colors ${
                          note.id === activeId
                            ? 'border-border-strong bg-surface-secondary text-text-primary'
                            : 'border-border-default bg-surface-primary text-text-secondary hover:bg-interactive-hover hover:text-text-primary'
                        }`
                      : `flex items-center gap-2 rounded-md py-1.5 pl-2 pr-8 text-sm transition-colors ${
                          note.id === activeId
                            ? 'bg-surface-secondary text-text-primary'
                            : 'text-text-secondary hover:bg-interactive-hover hover:text-text-primary'
                        }`
                  }
                >
                  <span
                    className={`inline-flex shrink-0 items-center justify-center rounded-md text-text-muted ${
                      isSpacious
                        ? 'size-10 bg-interactive-hover'
                        : 'size-3.5'
                    }`}
                  >
                    <FileText className={isSpacious ? 'size-5' : 'size-3.5'} />
                  </span>
                  {isSpacious ? (
                    <span className='min-w-0'>
                      <span className='block truncate text-base font-medium text-text-primary'>
                        {note.title?.trim() || 'Untitled'}
                      </span>
                      <span className='mt-1 block truncate text-xs text-text-muted'>
                        Updated {formatUpdatedAt(note.updated_at)}
                      </span>
                    </span>
                  ) : (
                    <span className='min-w-0 truncate'>
                      {note.title?.trim() || 'Untitled'}
                    </span>
                  )}
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
                  className={`absolute top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-interactive-hover hover:text-text-primary ${
                    menuId === note.id
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  } ${isSpacious ? 'right-3 size-8' : 'right-1 size-6'}`}
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
                  <div
                    className={`absolute right-1 z-30 w-32 overflow-hidden rounded-md border border-dropdown-border bg-popover py-1 shadow-lg ${
                      isSpacious ? 'top-14' : 'top-8'
                    }`}
                  >
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
