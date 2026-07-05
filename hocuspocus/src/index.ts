import { Server } from '@hocuspocus/server';
import { Database } from '@hocuspocus/extension-database';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { yDocToText, ingestNote } from './gbrain.js';

/**
 * Realtime collaboration server for Pillow notes.
 *
 * - No auth (hackathon): any client may connect to any `note:{id}` document.
 * - Persistence: each note's Y.Doc is stored as base64 in `public.notes.ydoc_state`.
 *   Load on first open, save (debounced) on change and disconnect. If Supabase
 *   env is missing it falls back to in-memory only.
 * - Company brain: on each store the note is also pushed to gbrain as a page
 *   (`notes/note-{id}`) so the AI can retrieve it — see ./gbrain.ts.
 *
 * Deploy alone (e.g. to Render). The Next.js app connects via
 * NEXT_PUBLIC_HOCUSPOCUS_URL.
 */

const port = Number(process.env.PORT) || 1234;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

function parseNoteId(documentName: string): number | null {
  const m = documentName.match(/^note:(\d+)$/);
  return m ? Number(m[1]) : null;
}

let supabase: SupabaseClient | null = null;
const extensions = [];

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  extensions.push(
    new Database({
      fetch: async ({ documentName }) => {
        const id = parseNoteId(documentName);
        if (id == null) return null;
        const { data, error } = await supabase!
          .from('notes')
          .select('ydoc_state')
          .eq('id', id)
          .maybeSingle();
        if (error) {
          console.error(`fetch ${documentName}:`, error.message);
          return null;
        }
        if (!data?.ydoc_state) return null;
        return new Uint8Array(Buffer.from(data.ydoc_state, 'base64'));
      },
      store: async ({ documentName, state }) => {
        const id = parseNoteId(documentName);
        if (id == null) return;
        const base64 = Buffer.from(state).toString('base64');
        const { error } = await supabase!
          .from('notes')
          .update({ ydoc_state: base64, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) console.error(`store ${documentName}:`, error.message);
      },
    })
  );
  console.log('Supabase persistence enabled');
} else {
  console.warn(
    'SUPABASE_URL / SUPABASE_ANON_KEY not set — running in-memory (no persistence)'
  );
}

/** Push the note's current content to the gbrain company brain. Best-effort. */
async function syncNoteToBrain(documentName: string, document: unknown) {
  const id = parseNoteId(documentName);
  if (id == null) return;

  const text = yDocToText(document as Parameters<typeof yDocToText>[0]);
  if (!text) return; // nothing to index yet

  let title: string | null = null;
  if (supabase) {
    const { data } = await supabase
      .from('notes')
      .select('title')
      .eq('id', id)
      .maybeSingle();
    title = data?.title ?? null;
  }

  await ingestNote(id, title, text);
}

const server = Server.configure({
  port,
  name: 'pillow-hocuspocus',
  extensions,

  async onConnect({ documentName }) {
    console.log(`+ connect ${documentName}`);
  },
  async onDisconnect({ documentName }) {
    console.log(`- disconnect ${documentName}`);
  },
  // Fires after each debounced store and on disconnect — the natural choke
  // point to keep every note (create + edits) mirrored into the brain.
  async afterStoreDocument({ documentName, document }) {
    try {
      await syncNoteToBrain(documentName, document);
    } catch (err) {
      console.error(
        `gbrain sync ${documentName}:`,
        err instanceof Error ? err.message : err
      );
    }
  },
});

server.listen().then(() => {
  console.log(`pillow-hocuspocus listening on :${port}`);
});
