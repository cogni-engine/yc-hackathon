import { NextResponse } from 'next/server';
import * as Y from 'yjs';
import {
  HocuspocusProvider,
  HocuspocusProviderWebsocket,
} from '@hocuspocus/provider';
import WebSocket from 'ws';

/**
 * Recall.ai real-time transcript webhook.
 *
 * Recall POSTs a `transcript.data` event here every ~1-3s while a bot is in a
 * call. We connect to the hocuspocus server as a Y.js client and append each
 * utterance as a paragraph to the note's shared doc — so it shows up live in
 * every open browser (same path as any edit). Which note it belongs to comes
 * from the bot's `metadata.noteId`, set by `/api/recall/start`.
 *
 * This lives in the Next.js app (public on Vercel) rather than on hocuspocus,
 * because hocuspocus (Render) only exposes its one WebSocket port. Connections
 * are cached per note and reused across events while warm.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HOCUSPOCUS_URL =
  process.env.HOCUSPOCUS_URL ||
  process.env.NEXT_PUBLIC_HOCUSPOCUS_URL ||
  'ws://localhost:1234';

interface Entry {
  ydoc: Y.Doc;
  provider: HocuspocusProvider;
  connected: boolean;
  ready: Promise<void>;
}

// Reused across invocations on a warm serverless instance.
const entries = new Map<string, Entry>();

function connect(noteId: string): Entry {
  const name = `note:${noteId}`;
  const cached = entries.get(name);
  if (cached && cached.connected) return cached;
  if (cached) {
    cached.provider.destroy();
    entries.delete(name);
  }

  const ydoc = new Y.Doc();
  let resolveReady!: () => void;
  const ready = new Promise<void>(res => (resolveReady = res));

  const entry: Entry = { ydoc, provider: null as never, connected: true, ready };
  // Node has no global WebSocket in every runtime, so hand the socket layer the
  // `ws` polyfill explicitly (it lives on the websocket provider, not the doc one).
  const socket = new HocuspocusProviderWebsocket({
    url: HOCUSPOCUS_URL,
    WebSocketPolyfill: WebSocket,
  });
  entry.provider = new HocuspocusProvider({
    websocketProvider: socket,
    name,
    document: ydoc,
    onSynced: () => resolveReady(),
    onDisconnect: () => {
      entry.connected = false;
    },
  });
  entries.set(name, entry);
  return entry;
}

/** Append one line as a TipTap `paragraph` node to the note's shared doc. */
function appendParagraph(ydoc: Y.Doc, line: string): void {
  const fragment = ydoc.getXmlFragment('default');
  const paragraph = new Y.XmlElement('paragraph');
  const text = new Y.XmlText();
  text.insert(0, line);
  paragraph.insert(0, [text]);
  fragment.push([paragraph]);
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

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const parsed = extractLine(payload);
  if (!parsed) return NextResponse.json({ ok: true });

  const entry = connect(parsed.noteId);
  // Don't hang the webhook if hocuspocus is unreachable.
  await Promise.race([
    entry.ready,
    new Promise(res => setTimeout(res, 5000)),
  ]);
  appendParagraph(entry.ydoc, parsed.line);

  return NextResponse.json({ ok: true });
}
