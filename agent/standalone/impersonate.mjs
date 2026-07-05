/**
 * Cogno impersonator — a local process that joins the shared Hocuspocus canvas
 * as a peer named "Cogno", shows a live labeled cursor, and composes rich
 * content (headings, lists, task lists, tables, code blocks, ```mermaid
 * diagrams, blockquotes, images, columns, embeds…) with human-like timing.
 *
 * It runs the EXACT same collaborative schema as the web app: the standard
 * TipTap extensions plus the framework-agnostic node schemas from
 * `@cogni/editor-schema` and the app's pure `.ts` extensions (BlockId,
 * CognoSectionMarker). Only the React node views and editor-only UI plugins
 * (slash menu, paste handler) are dropped — they're irrelevant headless. Because
 * the schema matches byte-for-byte, every rich node the agent produces renders
 * correctly in every open browser tab on the same room, and the agent can
 * safely coexist with rich nodes other people add.
 *
 * IMPORTANT: run this with tsx from the repo ROOT so it shares the app's single
 * dependency tree (one @tiptap/core instance) and can import the TS schema:
 *   pnpm impersonate -- [flags]           # (root script)
 *   node_modules/.bin/tsx agent/impersonate.mjs [flags]
 *
 * Usage flags:
 *   [--room main] [--name Cogno] [--color '#F98181']
 *   [--prompt "..."] [--text "literal markdown to compose"]
 *   [--wpm 320] [--url ws://localhost:1234]
 *   [--smoke]           # connect + report doc, do NOT type
 *   [--edit] [--rounds 3] [--interval 20]   # read the doc + rewrite it N times
 *   [--watch] [--interval 5]                # continuously improve on change
 *
 * Env:
 *   HOCUSPOCUS_URL     overrides the default server URL
 *   ANTHROPIC_API_KEY  required unless --text is given
 */

import { JSDOM } from 'jsdom';
import WebSocket from 'ws';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';

// ---- jsdom: give TipTap/ProseMirror a DOM before importing the editor ----
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  pretendToBeVisual: true,
});
const g = globalThis;
const setGlobal = (key, val) => {
  try {
    g[key] = val;
  } catch {
    // Some globals (e.g. `navigator` on Node 22+) are read-only getters.
    try {
      Object.defineProperty(g, key, { value: val, configurable: true });
    } catch {}
  }
};
setGlobal('window', dom.window);
setGlobal('document', dom.window.document);
setGlobal('navigator', dom.window.navigator);
setGlobal('DOMParser', dom.window.DOMParser); // markdown → HTML block reparsing
setGlobal('MutationObserver', dom.window.MutationObserver);
setGlobal('getComputedStyle', dom.window.getComputedStyle);
setGlobal('KeyboardEvent', dom.window.KeyboardEvent); // TipTap's Enter shortcut
// NOTE: deliberately do NOT override global `Event`/`Node`/`Element` — jsdom's
// versions clash with the WebSocket/EventTarget machinery (instanceof checks).
if (!g.requestAnimationFrame) {
  g.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
  g.cancelAnimationFrame = (id) => clearTimeout(id);
}

// TipTap + schema must be imported AFTER the DOM globals exist. These resolve
// from the repo-root node_modules (single tree) when run via tsx from root.
const { Editor } = await import('@tiptap/core');
const StarterKit = (await import('@tiptap/starter-kit')).default;
const { Markdown } = await import('@tiptap/markdown');
const Image = (await import('@tiptap/extension-image')).default;
const TaskList = (await import('@tiptap/extension-task-list')).default;
const TaskItem = (await import('@tiptap/extension-task-item')).default;
const { TableKit } = await import('@tiptap/extension-table');
const { CodeBlockLowlight } = await import(
  '@tiptap/extension-code-block-lowlight'
);
const { common, createLowlight } = await import('lowlight');
const Collaboration = (await import('@tiptap/extension-collaboration')).default;
const CollaborationCaret = (
  await import('@tiptap/extension-collaboration-caret')
).default;

// Framework-agnostic node schemas — the SAME source the web app's rich blocks
// wrap with React views. Importing them here guarantees schema parity.
const {
  Column,
  ColumnsContainer,
  IframeEmbed,
  LinkCard,
  ExcalidrawBlock,
  imageMarkdown,
} = await import('../src/vendor/editor-schema/src/index.ts');
const { BlockIdExtension } = await import(
  '../src/lib/tiptap/BlockIdExtension.ts'
);
const { CognoSectionMarker } = await import(
  '../src/features/tasks/components/CognoSectionMarker.ts'
);

const lowlight = createLowlight(common);

/**
 * Headless mirror of the web app's `createCollaborativeExtensions`. Same nodes
 * and marks; no React node views, no slash menu / placeholder / paste plugins
 * (all editor-UI only). MermaidCodeBlock is just a CodeBlockLowlight `codeBlock`
 * node — the diagram render is a browser view concern, so the plain node here is
 * schema-compatible and a ```mermaid fence round-trips as language=mermaid.
 */
function buildExtensions(ydoc, provider, user) {
  return [
    StarterKit.configure({
      undoRedo: false, // Y.js owns history
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      codeBlock: false, // CodeBlockLowlight takes over ``` (incl. mermaid)
    }),
    Markdown,
    Image.extend({ ...imageMarkdown }).configure({
      inline: true,
      allowBase64: false,
      HTMLAttributes: { class: 'editor-image' },
    }),
    TaskList.configure({ HTMLAttributes: { class: 'task-list' } }),
    TaskItem.configure({ nested: true, HTMLAttributes: { class: 'task-item' } }),
    TableKit.configure({
      table: { resizable: true, HTMLAttributes: { class: 'tiptap-table' } },
    }),
    CodeBlockLowlight.configure({
      lowlight,
      HTMLAttributes: { class: 'code-block-highlighted' },
    }),
    Collaboration.configure({ document: ydoc }),
    ...(provider
      ? [CollaborationCaret.configure({ provider, user })]
      : []),
    // Custom collaborative nodes (schema only — views live in the browser).
    ExcalidrawBlock,
    IframeEmbed,
    LinkCard,
    CognoSectionMarker,
    ColumnsContainer,
    Column,
    // Must come last so it can attach block ids to the node types above.
    BlockIdExtension,
  ];
}

// ---------------------------- args ----------------------------
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const URL =
  args.url || process.env.HOCUSPOCUS_URL || 'ws://localhost:1234';
const ROOM = args.room || 'main';
const NAME = args.name || 'Cogno';
const COLOR = args.color || '#F98181';
const WPM = Number(args.wpm) || 320; // typing speed
const SMOKE = Boolean(args.smoke);
const EDIT = Boolean(args.edit); // read the doc + edit it, ROUNDS times
const WATCH = Boolean(args.watch); // continuous: read every INTERVAL s, edit on change
const ROUNDS = Number(args.rounds) || 3; // number of edit passes (--edit)
const INTERVAL = Number(args.interval) || (WATCH ? 5 : 20); // seconds between reads
const LITERAL_TEXT = typeof args.text === 'string' ? args.text : null;
const PROMPT =
  args.prompt ||
  'You are collaborating live on a shared canvas. Draft a short, well-structured set of product notes about what to build next: open with a one-line summary, then a few bullet or numbered points, a small task list of next steps, and — where it helps — a compact table or a ```mermaid flowchart. Keep it concise and natural.';

const DOC_NAME = `canvas:${ROOM}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------ human typing timing ------------------------
// Base per-character delay derived from words-per-minute (avg word ~5 chars).
const baseDelay = 60000 / (WPM * 5);
function delayFor(ch) {
  let d = baseDelay * (0.55 + Math.random() * 0.9); // jitter
  if ('.!?'.includes(ch)) d += 260 + Math.random() * 340; // end of sentence
  else if (',;:'.includes(ch)) d += 120 + Math.random() * 200;
  else if (ch === ' ' && Math.random() < 0.12) d += 150 + Math.random() * 250;
  if (Math.random() < 0.03) d += 400 + Math.random() * 900; // occasional think
  return d;
}

// The rich-markdown "house style" appended to every generation/edit system
// prompt so Claude actually exercises the editor's full component set.
const RICH_STYLE_GUIDE = `Write in GitHub-Flavored Markdown and use the document's full range of blocks where they genuinely help — don't force them:
- # / ## / ### headings to structure the piece
- **bold** and *italic* for emphasis
- "- " bullet lists and "1. " numbered lists
- "- [ ] " / "- [x] " task lists for actionable next steps
- GFM tables ( | col | col | with a |---|---| separator row ) for structured comparisons
- fenced code blocks for code, and \`\`\`mermaid fenced blocks for fl/sequence/graph diagrams
- > blockquotes for callouts
- ![alt](https://…) for images when a real, relevant URL is available
Output ONLY the document body as Markdown — no preamble, no surrounding quotes, no code fence around the whole thing.`;

// ------------------------------ AI text ------------------------------
async function generateText(existingMarkdown) {
  if (LITERAL_TEXT) return LITERAL_TEXT;
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn(
      '[cogno] ANTHROPIC_API_KEY not set and no --text given; composing a placeholder block.'
    );
    return '## Cogno\n\nJumping in to help draft this.\n\n- [ ] Outline the goals\n- [ ] Sketch the flow';
  }
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  // We set a jsdom `window` global for TipTap, which makes the SDK think it's a
  // browser. This is a trusted local process, so opt in explicitly.
  const client = new Anthropic({ dangerouslyAllowBrowser: true });
  const contextNote = existingMarkdown?.trim()
    ? `\n\nThe canvas currently reads (Markdown):\n"""\n${existingMarkdown.trim().slice(-2000)}\n"""\nContinue or contribute in a way that fits.`
    : '';
  const msg = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1500,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'low' },
    system: `You are "${NAME}", a friendly human collaborator co-writing in a shared realtime document. Write exactly what should appear in the document — no preamble, no "Sure!". ${RICH_STYLE_GUIDE}`,
    messages: [{ role: 'user', content: PROMPT + contextNote }],
  });
  return msg.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
}

// Ask Claude to EDIT the current document, given its full Markdown as context.
async function aiEditDoc(ctx, round) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is required for --edit mode.');
  }
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ dangerouslyAllowBrowser: true });
  const instruction =
    args.prompt ||
    'Edit and improve this document: fix errors, tighten the wording, group related ideas, promote key structure into headings/lists/tables/task lists/diagrams where it genuinely clarifies, and expand thin spots — without discarding collaborators’ contributions.';
  const msg = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 2000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'low' },
    system: `You are "${NAME}", collaboratively EDITING a shared, live document with other people. You are given the document's current full Markdown. Produce an improved revision that builds on what collaborators wrote WITHOUT discarding their contributions. Output ONLY the new full document body as Markdown. ${RICH_STYLE_GUIDE}`,
    messages: [
      {
        role: 'user',
        content: `Current document (edit pass ${round + 1}):\n"""\n${
          ctx || '(the document is empty — draft a first version)'
        }\n"""\n\n${instruction}`,
      },
    ],
  });
  return msg.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
}

// Replace the whole document with `markdown`, composed like a human.
async function replaceDoc(markdown) {
  editor.commands.selectAll();
  editor.commands.deleteSelection();
  await sleep(200);
  await composeMarkdown(markdown);
}

// Recursively read the live context and edit it, pass after pass.
async function editLoop() {
  for (let i = 0; i < ROUNDS && !shuttingDown; i++) {
    const ctx = currentMarkdown();
    console.log(
      `[cogno] edit pass ${i + 1}/${ROUNDS}: read ${ctx.length} chars of context, asking Claude…`
    );
    const revised = await aiEditDoc(ctx, i);
    console.log(`[cogno] applying revision (${revised.length} chars)…`);
    await replaceDoc(revised);
    if (i < ROUNDS - 1 && !shuttingDown) {
      console.log(`[cogno] waiting ${INTERVAL}s, then re-reading the doc…`);
      await sleep(INTERVAL * 1000);
    }
  }
  console.log('[cogno] edit loop complete. Staying connected (Ctrl-C to leave).');
}

// Continuously watch the live doc: every INTERVAL seconds, read it, and if it
// changed since our last edit (i.e. someone else contributed), have Claude
// improve it and apply the changes. Skips unchanged cycles so it doesn't churn.
async function watchLoop() {
  let lastApplied = null; // normalized markdown of the doc right after our last edit
  console.log(
    `[cogno] watching canvas:${ROOM} — reading every ${INTERVAL}s, editing on change.`
  );
  while (!shuttingDown) {
    const ctx = currentMarkdown();
    const norm = ctx.trim();
    if (norm.length === 0) {
      // Empty doc: nothing to improve yet.
    } else if (lastApplied !== null && norm === lastApplied) {
      // Only our own last edit is present — no new input from others.
    } else {
      const why = lastApplied === null ? 'initial content' : 'change detected';
      console.log(`[cogno] ${why} (${ctx.length} chars) — asking Claude to improve…`);
      try {
        const revised = await aiEditDoc(ctx, 0);
        if (shuttingDown) break;
        if (revised && revised.trim() && revised.trim() !== norm) {
          await replaceDoc(revised);
          lastApplied = currentMarkdown().trim();
          console.log('[cogno] applied improvement.');
        } else {
          lastApplied = norm; // nothing to change; mark as seen
          console.log('[cogno] no improvement needed.');
        }
      } catch (e) {
        console.error('[cogno] edit error:', e.message || e);
      }
    }
    if (!shuttingDown) await sleep(INTERVAL * 1000);
  }
}

// ------------------------------ main ------------------------------
console.log(`[cogno] connecting to ${URL}  doc=${DOC_NAME}  as "${NAME}"`);

const ydoc = new Y.Doc();
const provider = new HocuspocusProvider({
  url: URL,
  name: DOC_NAME,
  document: ydoc,
  WebSocketPolyfill: WebSocket,
  onAuthenticationFailed: (d) => console.error('[cogno] auth failed', d),
});

provider.on('status', ({ status }) => console.log(`[cogno] status: ${status}`));

// Headless editor bound to the same Yjs doc + awareness as the browser peers,
// with the full collaborative schema.
const holder = document.createElement('div');
document.body.appendChild(holder);

const editor = new Editor({
  element: holder,
  extensions: buildExtensions(ydoc, provider, { name: NAME, color: COLOR }),
});

// The collaboration-caret plugin only broadcasts our cursor while the view
// "has focus". Headless in jsdom it never does, so force it — this is what
// makes the labeled "Cogno" caret visible (and moving) to the browser peers.
editor.view.hasFocus = () => true;
// jsdom has no layout engine, so ProseMirror's scroll-into-view (which measures
// DOM rects) throws. It's meaningless headless — make it a no-op.
editor.view.scrollToSelection = () => {};

function currentText() {
  return editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n', '\n');
}

// Serialize the live doc to Markdown so the AI sees rich structure (tables,
// task lists, diagrams…), not just flattened text. Falls back to plain text.
function currentMarkdown() {
  try {
    const manager = editor.storage?.markdown?.manager;
    if (manager) {
      const md = manager.serialize(editor.getJSON());
      if (typeof md === 'string' && md.length > 0) return md;
    }
  } catch {
    // fall through
  }
  return currentText();
}

// ------------------------ rich composition ------------------------
// Split Markdown into top-level blocks, keeping fenced code (```/~~~) intact and
// grouping contiguous non-blank lines (a list, a table, a blockquote) together.
function splitBlocks(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let cur = [];
  let inFence = false;
  let fenceMarker = '';
  const flush = () => {
    if (cur.length) {
      blocks.push(cur.join('\n'));
      cur = [];
    }
  };
  for (const line of lines) {
    const fenceMatch = line.match(/^\s*(```|~~~)/);
    if (inFence) {
      cur.push(line);
      if (line.trim().startsWith(fenceMarker)) {
        inFence = false;
        flush();
      }
      continue;
    }
    if (fenceMatch) {
      flush();
      inFence = true;
      fenceMarker = fenceMatch[1];
      cur.push(line);
      continue;
    }
    if (line.trim() === '') {
      flush();
      continue;
    }
    cur.push(line);
  }
  flush();
  return blocks.filter((b) => b.trim().length);
}

// Headless, ProseMirror input rules do NOT fire on programmatic character
// insertion (there's no real text-input event), so char-by-char typing can only
// produce PLAIN paragraph text — markdown syntax would be left literal. So we
// animate only genuinely plain paragraphs and route everything with structure
// or inline marks through the Markdown parser, which builds real rich nodes.
const BLOCK_MARKDOWN_RE =
  /^\s*(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|```|~~~|\||<[a-z])/i;
const INLINE_MARKDOWN_RE =
  /\*\*|__|~~|`[^`]+`|!\[[^\]]*\]\([^)]*\)|\[[^\]]+\]\([^)]*\)|(^|\s)[*_][^*_\s][^*_]*[*_](\s|$)/;

function isPlainParagraph(block) {
  const t = block.trim();
  if (t.includes('\n')) return false; // multi-line → list/table/quote/etc.
  if (BLOCK_MARKDOWN_RE.test(t)) return false; // heading/list/quote/table/html
  if (INLINE_MARKDOWN_RE.test(t)) return false; // bold/italic/code/link/image
  return true;
}

// Type prose char-by-char so the live caret visibly moves as it "types".
async function typeProse(text) {
  for (const ch of text) {
    if (editor.isDestroyed) return;
    if (ch === '\n') editor.commands.enter();
    else editor.commands.insertContent(ch);
    await sleep(delayFor(ch));
  }
}

// Compose full Markdown into the shared doc, block by block, so peers watch it
// build up with the labeled caret moving. Plain paragraphs are typed live,
// char-by-char; every structured or marked block (headings, lists, task lists,
// tables, code/mermaid, quotes, images, embeds, emphasis) is inserted as real
// rich nodes via the Markdown parser. A short pause between blocks reads as
// thinking.
async function composeMarkdown(markdown) {
  const blocks = splitBlocks(markdown);
  for (let i = 0; i < blocks.length; i++) {
    if (editor.isDestroyed || shuttingDown) return;
    const block = blocks[i];
    editor.commands.focus('end');
    if (isPlainParagraph(block)) {
      // Start a new paragraph to separate from prior content, then type it.
      if (currentText().trim().length > 0) {
        editor.commands.enter();
        await sleep(120 + Math.random() * 180);
      }
      await typeProse(block);
    } else {
      // Real rich nodes via the same Markdown parser the web app uses on paste.
      editor.commands.insertContent(block, { contentType: 'markdown' });
      editor.commands.focus('end');
    }
    if (i < blocks.length - 1) await sleep(240 + Math.random() * 360);
  }
}

let shuttingDown = false;
async function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('[cogno] leaving…');
  try {
    provider.awareness?.setLocalState(null); // remove the ghost cursor
    editor.destroy();
    provider.destroy();
  } catch {}
  await sleep(150);
  process.exit(code);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

// Wait for the initial sync, then act.
provider.on('synced', async () => {
  console.log(
    `[cogno] synced. current doc length: ${currentText().length} chars`
  );
  if (SMOKE) {
    console.log('[cogno] --smoke: connected OK, not typing. Exiting.');
    return shutdown(0);
  }
  if (WATCH) {
    try {
      await watchLoop();
    } catch (err) {
      console.error('[cogno] error during watch loop:', err);
      await shutdown(1);
    }
    return;
  }
  if (EDIT) {
    try {
      await editLoop();
    } catch (err) {
      console.error('[cogno] error during edit loop:', err);
      await shutdown(1);
    }
    return;
  }
  try {
    console.log('[cogno] asking Claude for something to compose…');
    const md = await generateText(currentMarkdown());
    console.log(`[cogno] composing ${md.length} chars of markdown:\n${md}\n`);
    await composeMarkdown(md);
    console.log('[cogno] done. Staying connected (Ctrl-C to leave).');
  } catch (err) {
    console.error('[cogno] error while composing:', err);
    await shutdown(1);
  }
});

// Safety: if we never sync, bail after 30s.
setTimeout(() => {
  if (!provider.isSynced && !shuttingDown) {
    console.error('[cogno] timed out waiting to sync. Check the URL/room.');
    shutdown(1);
  }
}, 30000);
