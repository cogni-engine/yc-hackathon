import * as Y from 'yjs';

/**
 * Push notes into the gbrain company brain as pages.
 *
 * Every note becomes the page `notes/note-<id>`, so creating a note and every
 * later edit both write to the same page (gbrain `put` is idempotent by slug).
 * Called from the Hocuspocus store hook, which fires on each debounced change
 * and on disconnect, so the brain tracks the note's current state.
 */

const BRIDGE_URL = process.env.GBRAIN_BRIDGE_URL || 'http://localhost:3131';
const BRIDGE_TOKEN = process.env.GBRAIN_BRIDGE_TOKEN || '';

/** Concatenate the text of one XML node (block or inline), recursively. */
function nodeText(node: Y.XmlElement | Y.XmlFragment | Y.XmlText): string {
  if (node instanceof Y.XmlText) return node.toString();
  let out = '';
  node.forEach(child => {
    out += nodeText(child as Y.XmlElement | Y.XmlText);
  });
  return out;
}

/**
 * Extract readable text from a TipTap/Yjs document. TipTap's Collaboration
 * extension stores the ProseMirror doc in the `default` XML fragment; we emit
 * one line per top-level block (heading, paragraph, list, …). Not full Markdown
 * — good enough for embedding + retrieval; structure fidelity can come later.
 */
export function yDocToText(doc: Y.Doc): string {
  const frag = doc.getXmlFragment('default');
  const blocks: string[] = [];
  frag.forEach(node => {
    blocks.push(nodeText(node as Y.XmlElement | Y.XmlText).trim());
  });
  return blocks.filter(Boolean).join('\n\n').trim();
}

/** Write (create or update) the gbrain page for a note. Best-effort; never throws. */
export async function ingestNote(
  noteId: number,
  title: string | null,
  body: string
): Promise<void> {
  const text = body.trim();
  if (!text) return; // don't create empty pages

  const heading = (title && title.trim()) || `Note ${noteId}`;
  const safeHeading = heading.replace(/\s+/g, ' ');
  const markdown = [
    '---',
    `title: ${safeHeading}`,
    'source: pillow-note',
    `note_id: ${noteId}`,
    '---',
    '',
    `# ${safeHeading}`,
    '',
    text,
  ].join('\n');

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (BRIDGE_TOKEN) headers.Authorization = `Bearer ${BRIDGE_TOKEN}`;

  try {
    const res = await fetch(`${BRIDGE_URL}/write`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ slug: `notes/note-${noteId}`, markdown }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error(`gbrain ingest note-${noteId}: HTTP ${res.status} ${detail}`);
    } else {
      console.log(`gbrain ingest note-${noteId}: ok (${text.length} chars)`);
    }
  } catch (err) {
    console.error(
      `gbrain ingest note-${noteId} failed:`,
      err instanceof Error ? err.message : err
    );
  }
}
