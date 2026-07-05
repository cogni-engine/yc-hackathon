import { AgentSession, sleep, jitter, type BlockSnapshot } from './session';
import {
  CognoBrain,
  quickThink,
  pingClaude,
  brainMode,
  brainModel,
  fastModel,
  type AgentOp,
} from './brain';
import { listNotes } from './notes';

// Two brains, one cursor:
// fast = reflexes — fires ~600ms after a human STARTS typing (leading edge),
//        tiny scaffolding/completions, never touches their active block.
// deep = the thinker — fires after the burst settles, full-document quality.
const FAST_DELAY_MS = 600;
// Short cooldown: during a long typing burst the reflex keeps re-firing, so
// changes are applied continuously off the human's in-progress writing.
const FAST_COOLDOWN_MS = 2500;
const DEEP_QUIET_MS = 6000;
const DEEP_COOLDOWN_MS = 18000;
const MAX_SESSIONS = 6; // most-recent notes to join concurrently
const NOTES_POLL_MS = 15000; // how often to look for new notes

function log(...args: unknown[]): void {
  const t = new Date().toISOString().slice(11, 19);
  console.log(`[agent ${t}]`, ...args);
}

function hashBlocks(blocks: BlockSnapshot[]): string {
  return blocks.map(b => `${b.id}:${b.markdown}`).join(' ');
}

/** Markdown → segments; fenced code blocks stay intact, else split on blank lines. */
function splitSegments(md: string): string[] {
  const lines = md.split('\n');
  const segments: string[] = [];
  let buf: string[] = [];
  let inFence = false;
  const flush = () => {
    const seg = buf.join('\n').trim();
    if (seg) segments.push(seg);
    buf = [];
  };
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      if (!inFence) {
        flush();
        inFence = true;
        buf.push(line);
      } else {
        buf.push(line);
        inFence = false;
        flush();
      }
      continue;
    }
    if (!inFence && line.trim() === '') {
      flush();
      continue;
    }
    buf.push(line);
  }
  flush();
  return segments;
}

/** Char-typeable prose: single line, no block/inline markdown syntax. */
function isPlainProse(seg: string): boolean {
  if (seg.includes('\n') || seg.length > 400) return false;
  if (/^(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|```|\||<)/.test(seg)) return false;
  if (/[*_`~[\]]/.test(seg)) return false;
  return true;
}

/**
 * Insert markdown at `pos` like a human would: prose paragraphs are typed
 * character-by-character with the caret following; structured blocks
 * (diagrams, lists, tables) drop in whole after a beat.
 */
async function insertHumanized(
  session: AgentSession,
  pos: number,
  markdown: string
): Promise<number> {
  let cursor = pos;
  for (const seg of splitSegments(markdown)) {
    if (/^\s*```mermaid/.test(seg)) {
      // Diagrams grow line-by-line — watchers see nodes appear one at a time.
      await session.moveCursorTo(cursor, 160);
      cursor = await session.insertMermaidProgressive(cursor, seg);
    } else if (isPlainProse(seg)) {
      session.insertNodeAt(cursor, { type: 'paragraph' });
      await session.moveCursorTo(cursor + 1, 100);
      const end = await session.typeText(seg, cursor + 1);
      cursor = end + 1; // step over the paragraph's closing token
    } else {
      await session.moveCursorTo(cursor, 160);
      cursor = session.insertMarkdownAt(cursor, seg);
      session.broadcastCursor(cursor);
      await sleep(jitter(200, 180));
    }
  }
  return cursor;
}

async function executeOps(session: AgentSession, ops: AgentOp[]): Promise<void> {
  // Consecutive append_after ops on the same anchor chain in document order.
  let lastAppend: { blockId: string | null; end: number } | null = null;

  for (const op of ops) {
    try {
      switch (op.action) {
        case 'append_after': {
          let pos = session.docEnd();
          if (lastAppend && lastAppend.blockId === op.blockId) {
            pos = Math.min(lastAppend.end, session.docEnd());
          } else if (op.blockId) {
            const hit = session.findBlock(op.blockId);
            if (hit) pos = hit.pos + hit.node.nodeSize;
          }
          await session.moveCursorTo(pos);
          const end = await insertHumanized(session, pos, op.markdown ?? '');
          lastAppend = { blockId: op.blockId, end };
          break;
        }
        case 'replace': {
          if (!op.blockId) break;
          const hit = session.findBlock(op.blockId);
          if (!hit) break;
          // Mermaid → mermaid: line-diff edit (part of the diagram is erased
          // and redrawn) instead of wiping the whole block.
          const md = (op.markdown ?? '').trim();
          if (
            hit.node.type.name === 'codeBlock' &&
            hit.node.attrs?.language === 'mermaid' &&
            /^```mermaid[\s\S]*```$/.test(md)
          ) {
            await session.moveCursorTo(hit.pos + hit.node.nodeSize - 1, 200);
            if (await session.editMermaidBlock(op.blockId, md)) break;
          }
          // Human backspace-flow: caret to the end, chars vanish one by one,
          // then the new content is written in place.
          const insertAt = hit.pos;
          await session.moveCursorTo(hit.pos + hit.node.nodeSize - 1, 200);
          await session.deleteBlockBackwards(op.blockId);
          await insertHumanized(session, Math.min(insertAt, session.docEnd()), op.markdown ?? '');
          break;
        }
        case 'delete': {
          if (!op.blockId) break;
          const hit = session.findBlock(op.blockId);
          if (!hit) break;
          await session.moveCursorTo(hit.pos + hit.node.nodeSize - 1, 200);
          await session.deleteBlockBackwards(op.blockId);
          break;
        }
      }
    } catch (err) {
      log(`op ${op.action} failed:`, err instanceof Error ? err.message : err);
    }
    await sleep(jitter(220, 200));
  }
}

interface WatcherHandle {
  destroy(): void;
}

/**
 * Join one note's doc and co-edit it until destroyed. Each note gets its own
 * CognoBrain — a running Claude conversation, so the agent remembers what it
 * already contributed to THIS note and builds on it.
 */
async function watchNote(
  noteId: number | string,
  opts: { url: string; name: string; color: string }
): Promise<WatcherHandle> {
  const tag = `[note:${noteId}]`;
  const brain = new CognoBrain();
  const session = new AgentSession({
    url: opts.url,
    docName: `note:${noteId}`,
    name: opts.name,
    color: opts.color,
  });
  await session.connect();
  // Visible from the first second: Cogno's caret is parked on the note even
  // before it ever edits — the "always in the room" presence.
  session.parkCursor();
  log(`${tag} joined (${session.markdown().length} chars)`);

  let ready = false;
  let busy = false; // ONE cursor — fast and deep actions are serialized
  let missedDeep = false;
  let destroyed = false;
  let fastArmed = true; // leading-edge: re-armed when a burst is handled
  let fastTimer: ReturnType<typeof setTimeout> | null = null;
  let deepTimer: ReturnType<typeof setTimeout> | null = null;
  let lastFastEnd = 0;
  let lastDeepEnd = 0;
  let lastHash = hashBlocks(session.blocks());
  let prevBlocks = new Map(
    session.blocks().map(b => [b.id ?? '', b.markdown] as const)
  );

  /** Diff against the last baseline; refresh baseline after every action. */
  const snapshot = () => {
    const blocks = session.blocks();
    const hash = hashBlocks(blocks);
    const changedIds = blocks
      .filter(b => b.id && prevBlocks.get(b.id) !== b.markdown && b.markdown)
      .map(b => b.id as string);
    return { blocks, hash, changedIds };
  };

  const refreshBaseline = () => {
    const after = session.blocks();
    lastHash = hashBlocks(after);
    prevBlocks = new Map(after.map(b => [b.id ?? '', b.markdown] as const));
  };

  // Reflex pass: the human just started typing. Tiny action, out of their way.
  const fastAct = async () => {
    if (busy || destroyed) {
      fastArmed = true;
      return;
    }
    busy = true;
    try {
      const { blocks, hash, changedIds } = snapshot();
      if (hash === lastHash) return;
      // The block they're editing right now = last changed one.
      const activeBlockId = changedIds[changedIds.length - 1] ?? null;
      const { thought, ops } = await quickThink({ blocks, changedIds, activeBlockId });
      if (ops.length > 0) {
        log(`${tag} reflex: ${thought} → ${ops.length} op(s)`);
        session.setTyping(true);
        await executeOps(session, ops);
      }
    } catch (err) {
      log(`${tag} reflex failed:`, err instanceof Error ? err.message : err);
    } finally {
      // The caret stays on the note (parked at the end) — Cogno is always
      // visibly in the room, not popping in and out.
      session.setTyping(false);
      session.parkCursor();
      // Reflex edits become part of the next deep diff — do NOT refresh the
      // baseline here, so the deep brain still sees what the human changed.
      lastFastEnd = Date.now();
      busy = false;
      fastArmed = true;
    }
  };

  // Deep pass: burst settled. Full-document thinking + layout ownership.
  const deepAct = async () => {
    if (destroyed) return;
    if (busy) {
      missedDeep = true;
      return;
    }
    busy = true;
    try {
      const { blocks, hash, changedIds } = snapshot();
      if (hash === lastHash) return;

      log(`${tag} thinking… (${blocks.length} blocks, changed: ${changedIds.join(', ') || '-'})`);
      const { thought, ops } = await brain.think({ blocks, changedIds });
      log(`${tag} decision: ${thought} → ${ops.length} op(s)`);
      if (ops.length > 0) {
        session.setTyping(true);
        await executeOps(session, ops);
        log(`${tag} done editing.`);
      }
    } catch (err) {
      log(`${tag} act failed:`, err instanceof Error ? err.message : err);
    } finally {
      session.setTyping(false);
      session.parkCursor();
      refreshBaseline();
      lastDeepEnd = Date.now();
      busy = false;
      if (missedDeep && !destroyed) {
        missedDeep = false;
        scheduleDeep();
      }
    }
  };

  const scheduleDeep = () => {
    if (destroyed) return;
    if (deepTimer) clearTimeout(deepTimer);
    const wait = Math.max(DEEP_QUIET_MS, lastDeepEnd + DEEP_COOLDOWN_MS - Date.now());
    deepTimer = setTimeout(() => void deepAct(), wait);
  };

  session.ydoc.on('update', (_update: Uint8Array, origin: unknown) => {
    if (!ready || destroyed) return;
    // Only remote (human) changes wake the agent; our own edits carry the
    // y-sync binding as origin, remote ones carry the provider.
    if (origin !== session.provider) return;

    // Leading edge: first keystroke of a burst arms the reflex brain.
    if (fastArmed && Date.now() - lastFastEnd > FAST_COOLDOWN_MS) {
      fastArmed = false;
      if (fastTimer) clearTimeout(fastTimer);
      fastTimer = setTimeout(() => void fastAct(), FAST_DELAY_MS);
    }

    // Trailing edge: the deep brain waits for the burst to settle.
    scheduleDeep();
  });

  ready = true;
  return {
    destroy() {
      destroyed = true;
      if (fastTimer) clearTimeout(fastTimer);
      if (deepTimer) clearTimeout(deepTimer);
      session.destroy();
    },
  };
}

export async function main(): Promise<void> {
  const url =
    process.env.AGENT_HOCUSPOCUS_URL ||
    process.env.NEXT_PUBLIC_HOCUSPOCUS_URL ||
    'ws://localhost:1234';
  const name = process.env.AGENT_NAME || 'Cogno AI';
  const color = process.env.AGENT_COLOR || '#10B981';
  const pinned = process.env.AGENT_NOTE_ID || process.argv[2];

  try {
    const pong = await pingClaude();
    log(
      `Claude OK (${brainMode()} / deep=${brainModel()} fast=${fastModel()}, reply="${pong}")`
    );
  } catch (err) {
    log(
      `⚠ Claude (${brainMode()}) unreachable — the agent will join but cannot think:`,
      err instanceof Error ? err.message : err
    );
  }

  const watchers = new Map<string, WatcherHandle>();

  const join = async (noteId: number | string) => {
    const key = String(noteId);
    if (watchers.has(key)) return;
    if (watchers.size >= MAX_SESSIONS) return;
    try {
      watchers.set(key, await watchNote(noteId, { url, name, color }));
    } catch (err) {
      watchers.delete(key);
      log(`[note:${noteId}] join failed:`, err instanceof Error ? err.message : err);
    }
  };

  if (pinned) {
    log(`pinned to note:${pinned} (${url})`);
    await join(pinned);
  } else {
    // Follow the sidebar: join the most recent notes, pick up new ones as
    // they are created.
    const refresh = async () => {
      try {
        const notes = await listNotes(MAX_SESSIONS);
        for (const n of notes) await join(n.id);
      } catch (err) {
        log('notes refresh failed:', err instanceof Error ? err.message : err);
      }
    };
    await refresh();
    setInterval(() => void refresh(), NOTES_POLL_MS);
    log(`watching the ${watchers.size} most recent notes (poll ${NOTES_POLL_MS / 1000}s, cap ${MAX_SESSIONS})`);
  }

  log('Cogno AI is in the room. (Ctrl-C to leave)');

  const bye = () => {
    log('leaving all rooms.');
    for (const w of watchers.values()) w.destroy();
    process.exit(0);
  };
  process.on('SIGINT', bye);
  process.on('SIGTERM', bye);
}
