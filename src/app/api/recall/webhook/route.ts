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

const log = (...a: unknown[]) => console.log('[recall/webhook]', ...a);

interface Entry {
  ydoc: Y.Doc;
  provider: HocuspocusProvider;
  socket: HocuspocusProviderWebsocket;
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

  // Node has no global WebSocket in every runtime, so hand the socket layer the
  // `ws` polyfill explicitly (it lives on the websocket provider, not the doc one).
  const socket = new HocuspocusProviderWebsocket({
    url: HOCUSPOCUS_URL,
    WebSocketPolyfill: WebSocket,
  });
  const entry: Entry = {
    ydoc,
    provider: null as never,
    socket,
    connected: true,
    ready,
  };
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

/**
 * Wait until the outgoing Y.js update has actually left the socket. In a
 * serverless function the instance can freeze the moment we return the HTTP
 * response, dropping any not-yet-flushed WebSocket frame — so block briefly on
 * the raw socket's bufferedAmount before returning.
 */
async function flush(socket: HocuspocusProviderWebsocket): Promise<void> {
  const raw = (socket as unknown as { webSocket?: { bufferedAmount?: number } })
    .webSocket;
  const deadline = Date.now() + 1500;
  while (Date.now() < deadline) {
    if (raw && typeof raw.bufferedAmount === 'number' && raw.bufferedAmount === 0) {
      // Give the TCP layer a beat to actually push the bytes out.
      await new Promise(r => setTimeout(r, 150));
      return;
    }
    await new Promise(r => setTimeout(r, 50));
  }
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

/** GET — quick sanity check that the route is deployed and where it writes. */
export function GET() {
  return NextResponse.json({
    ok: true,
    hocuspocusUrl: HOCUSPOCUS_URL,
    localhost: HOCUSPOCUS_URL.includes('localhost'),
  });
}

export async function POST(req: Request) {
  let payload: any;
  try {
    payload = await req.json();
  } catch (e) {
    log('bad json', (e as Error).message);
    return NextResponse.json({ ok: true });
  }

  // Log the raw event so the exact shape is visible in Vercel logs on the first
  // real delivery (this is where a field-path mismatch shows up).
  log('event=', payload?.event, 'raw=', JSON.stringify(payload).slice(0, 1200));

  const parsed = extractLine(payload);
  if (!parsed) {
    log('no line extracted (event/shape/metadata mismatch or empty words)');
    return NextResponse.json({ ok: true });
  }
  log('extracted', parsed, 'hocuspocus=', HOCUSPOCUS_URL);

  const entry = connect(parsed.noteId);
  const synced = await Promise.race([
    entry.ready.then(() => true),
    new Promise<boolean>(res => setTimeout(() => res(false), 8000)),
  ]);
  log('synced=', synced, 'connected=', entry.connected);

  appendParagraph(entry.ydoc, parsed.line);
  await flush(entry.socket);
  log('appended + flushed');

  return NextResponse.json({ ok: true });
}
