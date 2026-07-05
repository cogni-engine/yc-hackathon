import { AgentSession, sleep, jitter, type BlockSnapshot } from './session';
import {
  CognoBrain,
  pingBrain,
  brainProvider,
  brainModel,
  type AgentOp,
} from './brain';
import { listNotes } from './notes';

// ONE work loop per note. It engages ~350ms after a human's first keystroke
// and keeps cycling — look → think briefly → edit → look again — until a
// couple of rounds find nothing to do. One brain, one cursor, no dual paths.
const ENGAGE_DELAY_MS = 350;
const LOOP_GAP_MS = 400; // pause between loop rounds
const IDLE_ROUNDS = 2; // consecutive no-op rounds before disengaging
const MAX_SESSIONS = Number(process.env.AGENT_MAX_SESSIONS) || 6; // concurrent notes
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
 * Join one note's doc and co-edit it until destroyed. One CognoBrain per
 * note — a running conversation, so the agent remembers what it already
 * contributed to THIS note and builds on it.
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
  let busy = false;
  let destroyed = false;
  let armed = true; // leading-edge: re-armed when the loop disengages
  let timer: ReturnType<typeof setTimeout> | null = null;
  // Baseline for "what did humans change" — advances every loop round and
  // after our own edits, so our edits never read as human input.
  let prevBlocks = new Map(
    session.blocks().map(b => [b.id ?? '', b.markdown] as const)
  );
  // Blocks Cogno authored — revisable drafts. Ownership is revoked the
  // moment a human edits one of them.
  const ownBlocks = new Set<string>();

  /** Record which blocks OUR ops touched (never claims fresh human blocks). */
  const trackOwn = (
    before: Map<string, string>,
    ops: AgentOp[],
    humanFresh: Set<string>
  ) => {
    for (const op of ops) {
      if (op.blockId && op.action !== 'delete') ownBlocks.add(op.blockId);
    }
    for (const b of session.blocks()) {
      if (!b.id || humanFresh.has(b.id)) continue;
      if (!before.has(b.id)) ownBlocks.add(b.id); // newly created by us
    }
  };

  // Anticipation: the INSTANT a human's fresh text hints at a target ("図"
  // → the diagram), glide the caret there before any model call.
  let lastAnticipate = 0;
  let lastAnticipateTarget = '';
  const anticipate = () => {
    if (busy || destroyed) return;
    const now = Date.now();
    if (now - lastAnticipate < 300) return;
    lastAnticipate = now;
    try {
      const blocks = session.blocks();
      const fresh = blocks
        .filter(b => b.id && !ownBlocks.has(b.id) && prevBlocks.get(b.id) !== b.markdown)
        .map(b => b.markdown)
        .join('\n');
      if (!fresh) return;
      if (/図|ダイアグラム|チャート|フロー|グラフ|diagram|mermaid|flow|chart/i.test(fresh)) {
        const target = blocks.find(b => b.markdown.startsWith('```mermaid'));
        if (target?.id) {
          const hit = session.findBlock(target.id);
          if (hit) {
            session.broadcastCursor(hit.pos + 1);
            if (lastAnticipateTarget !== target.id) {
              lastAnticipateTarget = target.id;
              log(`${tag} anticipation: caret → diagram (${target.id})`);
            }
          }
          return;
        }
      }
      if (/英語|日本語|english|translate|訳し|翻訳/i.test(fresh)) {
        const first = blocks.find(b => b.markdown && !b.markdown.startsWith('```'));
        if (first?.id) {
          const hit = session.findBlock(first.id);
          if (hit) {
            session.broadcastCursor(hit.pos + 1);
            if (lastAnticipateTarget !== first.id) {
              lastAnticipateTarget = first.id;
              log(`${tag} anticipation: caret → top (translate)`);
            }
          }
        }
      }
    } catch {
      // anticipation is cosmetic — never let it crash the watcher
    }
  };

  // THE work loop: look → think briefly → edit → look again.
  const workLoop = async () => {
    if (busy || destroyed) {
      armed = true;
      return;
    }
    busy = true;
    let idleRounds = 0;
    let lastLoopHash = '';
    let rewriteAskActive = false;
    let deleteAskActive = false;
    let blockedRetries = 0;
    try {
      while (!destroyed && idleRounds < IDLE_ROUNDS) {
        const blocks = session.blocks();
        const hash = hashBlocks(blocks);
        if (hash === lastLoopHash) {
          idleRounds++;
          await sleep(LOOP_GAP_MS);
          continue;
        }
        lastLoopHash = hash;

        // What did HUMANS change since the last look? (Our own edits advance
        // the baseline right after executing, so they never show up here.)
        const humanChanged = blocks.filter(
          b => b.id && prevBlocks.get(b.id) !== b.markdown && b.markdown
        );
        // Ownership is revoked on human touch: it's their text now.
        for (const b of humanChanged) ownBlocks.delete(b.id as string);
        const changedIds = humanChanged.map(b => b.id as string);
        prevBlocks = new Map(blocks.map(b => [b.id ?? '', b.markdown] as const));
        const activeBlockId = changedIds[changedIds.length - 1] ?? null;

        // Visible reaction FIRST — glide the caret next to where the human
        // is working before the model call.
        if (activeBlockId) {
          const hit = session.findBlock(activeBlockId);
          if (hit) {
            session.broadcastCursor(
              Math.min(hit.pos + hit.node.nodeSize, session.docEnd())
            );
          }
        }

        // Sticky asks: a rewrite/delete request stays live for the whole
        // engagement so multi-round sweeps keep going.
        const freshHuman = new Set(changedIds);
        const freshText = humanChanged.map(b => b.markdown).join('\n');
        if (
          /にして|訳し|翻訳|直して|修正|書き換え|追加して|加えて|入れて|translate|rewrite|update|fix|add/i.test(
            freshText
          )
        ) {
          rewriteAskActive = true;
        }
        if (/消して|消せ|けして|削除|消去|delete|remove/i.test(freshText)) {
          deleteAskActive = true;
        }

        const { thought, ops: rawOps } = await brain.think({
          blocks,
          changedIds,
          activeBlockId,
          ownBlockIds: [...ownBlocks],
        });

        // HARD GUARD: what the human just typed is untouchable. Append
        // anywhere; revise/delete own blocks; replace/delete OLDER human
        // blocks only while an explicit ask is live.
        const ops = rawOps.filter(
          op =>
            op.action === 'append_after' ||
            (op.blockId != null && ownBlocks.has(op.blockId)) ||
            (op.action === 'replace' &&
              op.blockId != null &&
              !freshHuman.has(op.blockId) &&
              rewriteAskActive) ||
            (op.action === 'delete' &&
              op.blockId != null &&
              !freshHuman.has(op.blockId) &&
              deleteAskActive)
        );
        if (ops.length < rawOps.length) {
          log(`${tag} blocked ${rawOps.length - ops.length} op(s) targeting human text`);
        }
        // All ops blocked = usually round-1 freshness; retry a few rounds
        // (the same op is legal once the text is no longer "just typed").
        if (rawOps.length > 0 && ops.length === 0 && blockedRetries < 3) {
          blockedRetries++;
          idleRounds = 0;
          lastLoopHash = ''; // force a fresh look next round
          await sleep(LOOP_GAP_MS + 400);
          continue;
        }

        if (ops.length > 0) {
          log(`${tag} ${thought} → ${ops.length} op(s)`);
          const before = new Map(
            session.blocks().map(b => [b.id ?? '', b.markdown] as const)
          );
          session.setTyping(true);
          await executeOps(session, ops);
          session.setTyping(false);
          trackOwn(before, ops, freshHuman);
          // Fold our own edits into the baseline so the next round only sees
          // genuine human changes.
          prevBlocks = new Map(
            session.blocks().map(b => [b.id ?? '', b.markdown] as const)
          );
          idleRounds = 0;
          lastLoopHash = ''; // re-look immediately
        } else {
          idleRounds++;
        }
        await sleep(LOOP_GAP_MS);
      }
    } catch (err) {
      log(`${tag} loop failed:`, err instanceof Error ? err.message : err);
    } finally {
      session.setTyping(false);
      session.parkCursor();
      busy = false;
      armed = true;
    }
  };

  session.ydoc.on('update', (_update: Uint8Array, origin: unknown) => {
    if (!ready || destroyed) return;
    // Only remote (human) changes wake the agent; our own edits carry the
    // y-sync binding as origin, remote ones carry the provider.
    if (origin !== session.provider) return;

    anticipate();

    if (armed) {
      armed = false;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void workLoop(), ENGAGE_DELAY_MS);
    }
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
    const pong = await pingBrain();
    log(`brain OK (${brainProvider()}:${brainModel()}, reply="${pong}")`);
  } catch (err) {
    log(
      `⚠ brain (${brainProvider()}) unreachable — the agent will join but cannot think:`,
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
