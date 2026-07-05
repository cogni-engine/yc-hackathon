import { createClient } from '@supabase/supabase-js';

// Browser client. RLS is disabled on the project (hackathon), so the
// publishable key has full read/write access. Fallbacks keep `next build`
// from throwing when the env is missing (e.g. a Vercel build without the vars
// set) — the app still needs the real values at runtime to work.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
);

// Single-user / single-workspace app (hackathon). All notes live here.
export const WORKSPACE_ID = 1;

export interface Note {
  id: number;
  title: string | null;
  updated_at: string;
  workspace_id: number;
}
