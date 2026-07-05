import { createClient } from '@supabase/supabase-js';
import * as Y from 'yjs';
import { yDocToText, ingestNote } from './gbrain.js';

/**
 * One-time backfill: push every existing (non-deleted) note into the gbrain
 * brain. The live afterStoreDocument hook only fires when a note is edited, so
 * notes created before the integration (or never re-opened) need this pass.
 *
 * Run inside the hocuspocus container:
 *   docker compose exec hocuspocus npx tsx src/backfill.ts
 */

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('backfill: SUPABASE_URL / SUPABASE_ANON_KEY required');
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const { data, error } = await supabase
    .from('notes')
    .select('id,title,ydoc_state')
    .is('deleted_at', null)
    .not('ydoc_state', 'is', null);
  if (error) {
    console.error('backfill: fetch failed:', error.message);
    process.exit(1);
  }

  const notes = data ?? [];
  console.log(`backfill: ${notes.length} note(s) to process`);

  let ingested = 0;
  let skipped = 0;
  for (const n of notes) {
    const doc = new Y.Doc();
    Y.applyUpdate(doc, new Uint8Array(Buffer.from(n.ydoc_state as string, 'base64')));
    const text = yDocToText(doc);
    if (!text) {
      console.log(`- note-${n.id}: empty, skipped`);
      skipped++;
      continue;
    }
    await ingestNote(n.id as number, (n.title as string) ?? null, text);
    ingested++;
  }

  console.log(`backfill done: ${ingested} ingested, ${skipped} skipped`);
  process.exit(0);
}

main();
