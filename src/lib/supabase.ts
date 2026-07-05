import { createClient } from '@supabase/supabase-js';

// Browser client. RLS is disabled on the project (hackathon), so the
// publishable key has full read/write access.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Single-user / single-workspace app (hackathon). All notes live here.
export const WORKSPACE_ID = 1;

export interface Note {
  id: number;
  title: string | null;
  updated_at: string;
  workspace_id: number;
}
