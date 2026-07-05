/**
 * Cogno AI — realtime collaborator agent.
 *
 * Joins a canvas room over WebSocket exactly like a browser tab: same Y.js
 * CRDT sync, same awareness presence (visible caret + name label), same
 * TipTap schema. Watches for human edits, thinks with Gemini, then edits the
 * shared document with human-like cursor choreography.
 *
 *   pnpm agent [room]        # default room: main
 *
 * env (.env.local is auto-loaded): NEXT_PUBLIC_HOCUSPOCUS_URL /
 * AGENT_HOCUSPOCUS_URL, GEMINI_API_KEY, GEMINI_MODEL, AGENT_ROOM,
 * AGENT_NAME, AGENT_COLOR.
 */
import { installDom } from './dom';
import { loadEnv } from './env';

// jsdom must be global BEFORE tiptap/prosemirror load — hence dynamic import.
installDom();
loadEnv();

import('./main')
  .then(m => m.main())
  .catch(err => {
    console.error('[agent] fatal:', err);
    process.exit(1);
  });
