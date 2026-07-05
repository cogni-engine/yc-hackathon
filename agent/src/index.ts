import {
  HocuspocusProvider,
  HocuspocusProviderWebsocket,
} from '@hocuspocus/provider';
import { GoogleGenAI } from '@google/genai';
import WebSocket from 'ws';
import * as Y from 'yjs';

/**
 * Pillow ambient AI teammate.
 *
 * Joins a note's realtime room exactly the way a browser tab does — it opens a
 * Hocuspocus connection to `note:{id}`, appears in awareness as a named
 * participant, and shares the note's Y.Doc. It watches the document and, once
 * human edits go quiet, asks Gemini for one short observation and appends it as
 * a blockquote. That write flows through the shared Y.Doc, so it shows up live
 * in every open browser — identical to any human edit (same path the Recall
 * transcript bot uses in ../hocuspocus/src/recallWebhook.ts).
 *
 * Run alongside the app + hocuspocus server:
 *   cd agent && npm install && AGENT_NOTE_ID=1 npm start
 */

const HOCUSPOCUS_URL =
  process.env.HOCUSPOCUS_URL || 'ws://localhost:1234';
const NOTE_ID = process.env.AGENT_NOTE_ID;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const AGENT_NAME = process.env.AGENT_NAME || 'Agent 🤖';
const AGENT_COLOR = process.env.AGENT_COLOR || '#0ea5e9';

// Wait this long after the last human edit before commenting (debounce), and
// never comment more often than the min-interval — keeps ambient mode calm.
const QUIET_MS = Number(process.env.AGENT_QUIET_MS) || 6000;
const MIN_INTERVAL_MS = Number(process.env.AGENT_MIN_INTERVAL_MS) || 30000;

// Our own edits carry this transaction origin so the observer can ignore them
// (otherwise the agent would react to itself forever).
const AGENT_ORIGIN = 'pillow-agent';
// Every agent comment starts with this so we can strip our own lines out of the
// text we send to Gemini (don't let it react to its own past comments).
const COMMENT_PREFIX = '🤖 ';

if (!NOTE_ID) {
  console.error(
    'AGENT_NOTE_ID is required — the numeric id of the note to join, e.g. AGENT_NOTE_ID=1'
  );
  process.exit(1);
}

const apiKey = process.env.GEMINI_API_KEY;
const mock = process.env.AI_MOCK === '1';
if (!apiKey && !mock) {
  console.error('GEMINI_API_KEY is not set (or set AI_MOCK=1 for offline testing).');
  process.exit(1);
}
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const documentName = `note:${NOTE_ID}`;
const ydoc = new Y.Doc();

// @hocuspocus/provider needs a WebSocket implementation in Node; the polyfill
// lives on the websocket layer, which the provider then rides on.
const socket = new HocuspocusProviderWebsocket({
  url: HOCUSPOCUS_URL,
  WebSocketPolyfill: WebSocket,
});

const provider = new HocuspocusProvider({
  websocketProvider: socket,
  name: documentName,
  document: ydoc,
  onConnect: () => console.log(`connected to ${HOCUSPOCUS_URL} (${documentName})`),
  onSynced: () => {
    // Announce presence so humans see the agent in the collaborator list.
    provider.setAwarenessField('user', {
      name: AGENT_NAME,
      color: AGENT_COLOR,
      id: 'pillow-agent',
    });
    console.log(`joined ${documentName} as "${AGENT_NAME}"`);
  },
  onDisconnect: () => console.log('disconnected'),
});

/** Plain text of the note, one line per block, minus the agent's own comments. */
function readNoteText(): string {
  const fragment = ydoc.getXmlFragment('default');
  const lines: string[] = [];
  const walk = (node: Y.XmlElement | Y.XmlFragment | Y.XmlText): string => {
    if (node instanceof Y.XmlText) return node.toString();
    let text = '';
    node.forEach(child => {
      text += walk(child as Y.XmlElement | Y.XmlText);
    });
    return text;
  };
  fragment.forEach(block => {
    const line = walk(block as Y.XmlElement).trim();
    if (line) lines.push(line);
  });
  return lines
    .filter(line => !line.startsWith(COMMENT_PREFIX.trim()))
    .join('\n');
}

/** Append the agent's comment as a blockquote → paragraph in the shared doc. */
function appendComment(text: string): void {
  ydoc.transact(() => {
    const fragment = ydoc.getXmlFragment('default');
    const blockquote = new Y.XmlElement('blockquote');
    const paragraph = new Y.XmlElement('paragraph');
    const content = new Y.XmlText();
    content.insert(0, `${COMMENT_PREFIX}${text}`);
    paragraph.insert(0, [content]);
    blockquote.insert(0, [paragraph]);
    fragment.push([blockquote]);
  }, AGENT_ORIGIN);
}

async function observe(noteText: string): Promise<string> {
  if (mock || !ai) {
    const words = noteText.split(/\s+/).filter(Boolean).length;
    return `(mock) ~${words} words so far — want me to summarize the key points?`;
  }
  const prompt = `You are an ambient AI teammate quietly reading a shared note as it is written.
Given its current contents, offer ONE brief, genuinely useful observation, follow-up
question, or gap worth filling — at most 25 words. Do not restate the note. If there is
nothing useful to add right now, reply with exactly: PASS

Current note:
${noteText}`;
  const res = await ai.models.generateContent({ model: MODEL, contents: prompt });
  return (res.text ?? '').trim();
}

let timer: NodeJS.Timeout | null = null;
let lastCommentedAt = 0;
let lastCommentedText = '';
let thinking = false;

function scheduleThink() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(think, QUIET_MS);
}

async function think() {
  if (thinking) return;
  const now = Date.now();
  if (now - lastCommentedAt < MIN_INTERVAL_MS) {
    // Too soon since the last comment — try again once the interval passes.
    scheduleThink();
    return;
  }
  const noteText = readNoteText();
  if (!noteText || noteText === lastCommentedText) return;

  thinking = true;
  try {
    const comment = await observe(noteText);
    if (comment && comment.toUpperCase() !== 'PASS') {
      appendComment(comment);
      lastCommentedAt = Date.now();
      lastCommentedText = noteText;
      console.log(`commented: ${comment}`);
    }
  } catch (err) {
    console.error('gemini error:', (err as Error).message);
  } finally {
    thinking = false;
  }
}

// React to human edits only (ignore our own writes and remote awareness noise).
ydoc.getXmlFragment('default').observeDeep((_events, transaction) => {
  if (transaction.origin === AGENT_ORIGIN) return;
  scheduleThink();
});

const shutdown = () => {
  console.log('leaving…');
  provider.destroy();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
