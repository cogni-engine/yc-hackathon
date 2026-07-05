import { createClient } from '@supabase/supabase-js';

/**
 * Same notes table the frontend sidebar uses (src/features/notes/api.ts).
 * The agent joins Hocuspocus docs named `note:{id}`.
 */
const WORKSPACE_ID = 1;

export interface NoteRow {
  id: number;
  title: string | null;
  updated_at: string;
}

let cached: ReturnType<typeof createClient> | null = null;

function client() {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing (.env.local)'
    );
  }
  cached = createClient(url, key);
  return cached;
}

export async function listNotes(limit = 5): Promise<NoteRow[]> {
  const { data, error } = await client()
    .from('notes')
    .select('id,title,updated_at')
    .eq('workspace_id', WORKSPACE_ID)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
