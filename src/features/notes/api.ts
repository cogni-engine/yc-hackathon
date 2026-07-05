'use client';

import { supabase, WORKSPACE_ID, type Note } from '@/lib/supabase';

export const NOTES_MUTATION_EVENT = 'pillow:notes-mutation';

export type NotesMutationDetail =
  | { type: 'upsert'; note: Note }
  | { type: 'delete'; id: number };

function emitNotesMutation(detail: NotesMutationDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<NotesMutationDetail>(NOTES_MUTATION_EVENT, { detail })
  );
}

export async function listNotes(): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('id,title,updated_at,workspace_id')
    .eq('workspace_id', WORKSPACE_ID)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createNote(title = 'Untitled'): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .insert({ workspace_id: WORKSPACE_ID, title })
    .select('id,title,updated_at,workspace_id')
    .single();
  if (error) throw error;
  const note = data as Note;
  emitNotesMutation({ type: 'upsert', note });
  return note;
}

export async function renameNote(id: number, title: string): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id,title,updated_at,workspace_id')
    .single();
  if (error) throw error;
  const note = data as Note;
  emitNotesMutation({ type: 'upsert', note });
  return note;
}

export async function softDeleteNote(id: number): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
  emitNotesMutation({ type: 'delete', id });
}
