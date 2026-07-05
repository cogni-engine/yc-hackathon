import { createServer } from 'node:http';
import * as Y from 'yjs';
import type { Hocuspocus } from '@hocuspocus/server';

/**
 * Recall.ai real-time transcript ingest for Pillow.
 *
 * Recall runs a bot in a Google Meet / Zoom / Teams call and POSTs a
 * `transcript.data` event here every ~1-3s. We turn each utterance into a
 * paragraph and append it to the note's Y.Doc via a server-side direct
 * connection, so it shows up live in every open browser (same path as any edit).
 *
 * Which note a transcript belongs to comes from the bot's `metadata.noteId`,
 * which the Next.js `/api/recall/start` route sets when it creates the bot.
 *
 * Runs on its own port (RECALL_PORT, default hocuspocus port + 1) so the
 * existing WebSocket server is left untouched. Recall (cloud) must be able to
 * reach it — expose it with a tunnel (ngrok/cloudflared) when demoing locally.
 */

// One direct connection per document, reused across utterances to avoid
// reconnect churn / a persistence write on every single event.
const connections = new Map<string, Promise<DirectConn>>();

interface DirectConn {
  transact(fn: (doc: Y.Doc) => void): Promise<void>;
}

function getConnection(server: Hocuspocus, documentName: string): Promise<DirectConn> {
  let conn = connections.get(documentName);
  if (!conn) {
    conn = server.openDirectConnection(documentName) as unknown as Promise<DirectConn>;
    connections.set(documentName, conn);
  }
  return conn;
}

/** Append one line as a TipTap `paragraph` node to the note's shared doc. */
async function appendParagraph(server: Hocuspocus, noteId: string, line: string): Promise<void> {
  const conn = await getConnection(server, `note:${noteId}`);
  await conn.transact(doc => {
    // TipTap/y-prosemirror represents the document as an XmlFragment named
    // 'default' whose children are block nodes (paragraph, heading, ...).
    const fragment = doc.getXmlFragment('default');
    const paragraph = new Y.XmlElement('paragraph');
    const text = new Y.XmlText();
    text.insert(0, line);
    paragraph.insert(0, [text]);
    fragment.push([paragraph]);
  });
}

/** Turn a Recall `transcript.data` payload into `Speaker: words...`. */
function extractLine(payload: any): { noteId: string; line: string } | null {
  if (payload?.event !== 'transcript.data') return null;
  const inner = payload.data?.data ?? {};
  const noteId =
    payload.data?.bot?.metadata?.noteId ?? payload.data?.recording?.metadata?.noteId;
  const words: Array<{ text?: string }> = inner.words ?? [];
  const text = words
    .map(w => w.text ?? '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!noteId || !text) return null;
  const speaker = inner.participant?.name;
  return { noteId: String(noteId), line: speaker ? `${speaker}: ${text}` : text };
}

export function startRecallWebhook(server: Hocuspocus, hocuspocusPort: number): void {
  const port = Number(process.env.RECALL_PORT) || hocuspocusPort + 1;

  createServer((req, res) => {
    if (req.method !== 'POST' || !req.url?.startsWith('/recall/webhook')) {
      res.writeHead(404);
      res.end();
      return;
    }
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', async () => {
      // Ack immediately so Recall doesn't retry while we write to the doc.
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"ok":true}');
      try {
        const parsed = extractLine(JSON.parse(body || '{}'));
        if (parsed) {
          await appendParagraph(server, parsed.noteId, parsed.line);
          console.log(`transcript → note:${parsed.noteId}: ${parsed.line}`);
        }
      } catch (err) {
        console.error('recall webhook error:', (err as Error).message);
      }
    });
  }).listen(port, () => {
    console.log(`recall webhook listening on :${port} (POST /recall/webhook)`);
  });
}
