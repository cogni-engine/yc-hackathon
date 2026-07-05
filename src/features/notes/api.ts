'use client';

import { supabase, WORKSPACE_ID, type Note } from '@/lib/supabase';

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
  return data as Note;
}

export async function renameNote(id: number, title: string): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function softDeleteNote(id: number): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
