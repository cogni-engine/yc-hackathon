import { AgentSession, sleep, jitter, type BlockSnapshot } from './session';
import { CognoBrain, pingClaude, brainMode, brainModel, type AgentOp } from './brain';
import { listNotes } from './notes';

const QUIET_MS = 1200; // human stopped typing for this long → consider acting
const COOLDOWN_MS = 2500; // min gap between two agent actions per note
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
  log(`${tag} joined (${session.markdown().length} chars)`);

  let ready = false;
  let executing = false;
  let missed = false;
  let destroyed = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastActEnd = 0;
  let lastHash = hashBlocks(session.blocks());
  let prevBlocks = new Map(
    session.blocks().map(b => [b.id ?? '', b.markdown] as const)
  );

  const act = async () => {
    if (executing || destroyed) return;
    executing = true;
    try {
      const blocks = session.blocks();
      const hash = hashBlocks(blocks);
      if (hash === lastHash) return;

      const changedIds = blocks
        .filter(b => b.id && prevBlocks.get(b.id) !== b.markdown && b.markdown)
        .map(b => b.id as string);

      log(`${tag} thinking… (${blocks.length} blocks, changed: ${changedIds.join(', ') || '-'})`);
      const { thought, ops } = await brain.think({ blocks, changedIds });
      log(`${tag} decision: ${thought} → ${ops.length} op(s)`);
      if (ops.length > 0) {
        await executeOps(session, ops);
        log(`${tag} done editing.`);
      }
    } catch (err) {
      log(`${tag} act failed:`, err instanceof Error ? err.message : err);
    } finally {
      session.clearCursor();
      const after = session.blocks();
      lastHash = hashBlocks(after);
      prevBlocks = new Map(after.map(b => [b.id ?? '', b.markdown] as const));
      lastActEnd = Date.now();
      executing = false;
      if (missed && !destroyed) {
        missed = false;
        schedule();
      }
    }
  };

  const schedule = () => {
    if (destroyed) return;
    if (timer) clearTimeout(timer);
    const wait = Math.max(QUIET_MS, lastActEnd + COOLDOWN_MS - Date.now());
    timer = setTimeout(() => void act(), wait);
  };

  session.ydoc.on('update', (_update: Uint8Array, origin: unknown) => {
    if (!ready || destroyed) return;
    // Only remote (human) changes wake the agent; our own edits carry the
    // y-sync binding as origin, remote ones carry the provider.
    if (origin !== session.provider) return;
    if (executing) {
      missed = true;
      return;
    }
    schedule();
  });

  ready = true;
  return {
    destroy() {
      destroyed = true;
      if (timer) clearTimeout(timer);
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
    log(`Claude OK (${brainMode()} / model=${brainModel()}, reply="${pong}")`);
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
