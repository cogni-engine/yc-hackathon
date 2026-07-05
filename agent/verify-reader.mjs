// Verification peer: connects as a plain reader, reports the awareness users it
// sees (proves the labeled cursor) and the shared doc text (proves typing).
import WebSocket from 'ws';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';

const room = process.argv[2] || 'main';
const seconds = Number(process.argv[3] || 30);
const url = process.env.HOCUSPOCUS_URL || 'wss://yc-hackathon-uqng.onrender.com';

const ydoc = new Y.Doc();
const provider = new HocuspocusProvider({
  url,
  name: `canvas:${room}`,
  document: ydoc,
  WebSocketPolyfill: WebSocket,
});

const seenUsers = new Set();
const seenCursor = new Set();
provider.on('synced', () => console.log(`[reader] synced to canvas:${room}`));
provider.awareness.on('change', () => {
  for (const [id, state] of provider.awareness.getStates()) {
    if (state?.user?.name) seenUsers.add(state.user.name);
    if (state?.cursor) seenCursor.add(state.user?.name || String(id));
  }
});

setTimeout(() => {
  const frag = ydoc.getXmlFragment('default');
  console.log('\n[reader] === RESULTS ===');
  console.log('[reader] awareness users seen:', [...seenUsers]);
  console.log('[reader] users with a live cursor:', [...seenCursor]);
  console.log('[reader] doc XML:\n' + frag.toString());
  provider.destroy();
  process.exit(0);
}, seconds * 1000);
