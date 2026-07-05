import { AgentSession, sleep, jitter, type BlockSnapshot } from './session';
import {
  CognoBrain,
  quickThink,
  pingBrain,
  brainProvider,
  brainModel,
  fastProvider,
  fastModel,
  type AgentOp,
} from './brain';
import { listNotes } from './notes';

// Two brains, one cursor:
// fast = reflexes — an ENGAGED WORK LOOP that starts ~600ms after a human
//        begins typing and keeps cycling (look → edit → look again) while
//        they write, revising even its own earlier output. Disengages after
//        a couple of idle rounds.
// deep = the thinker — fires after the burst settles, full-document quality.
const FAST_DELAY_MS = 350;
const FAST_LOOP_GAP_MS = 400; // pause between engaged-loop rounds
const FAST_IDLE_ROUNDS = 2; // consecutive no-op rounds before disengaging
const DEEP_QUIET_MS = 2500;
const DEEP_COOLDOWN_MS = 8000;
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
  let fastArmed = true; // leading-edge: re-armed when the loop disengages
  let fastTimer: ReturnType<typeof setTimeout> | null = null;
  let deepTimer: ReturnType<typeof setTimeout> | null = null;
  let lastDeepEnd = 0;
  let lastHash = hashBlocks(session.blocks());
  let prevBlocks = new Map(
    session.blocks().map(b => [b.id ?? '', b.markdown] as const)
  );
  // Blocks Cogno itself authored/edited — passed to the brains so they treat
  // them as revisable drafts, and excluded from "human changed" diffs.
  const ownBlocks = new Set<string>();

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

  /**
   * Record which blocks OUR ops touched. Precision matters: while we edit,
   * the human keeps typing — a naive before/after diff would claim THEIR
   * fresh block as ours, and the next round would happily "revise" (eat) it.
   */
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

  // Deep-brain priority: when the burst has settled long enough, the reflex
  // loop yields so the deep pass isn't starved behind the busy lock.
  let deepDueAt = Infinity;
  const deepDue = () => Date.now() >= deepDueAt;

  // Engaged work loop: the human started typing. Keep cycling — look, make a
  // tiny out-of-the-way edit, look again — until nothing new is happening.
  const fastLoop = async () => {
    if (busy || destroyed) {
      fastArmed = true;
      return;
    }
    busy = true;
    let loopBaseline = new Map(prevBlocks);
    let idleRounds = 0;
    let lastLoopHash = '';
    let rewriteAskActive = false;
    let deleteAskActive = false;
    let blockedRetries = 0;
    try {
      while (!destroyed && idleRounds < FAST_IDLE_ROUNDS) {
        const blocks = session.blocks();
        const hash = hashBlocks(blocks);
        if (hash === lastLoopHash) {
          idleRounds++;
          await sleep(FAST_LOOP_GAP_MS);
          continue;
        }
        lastLoopHash = hash;

        // Any block that changed while we were NOT editing was touched by a
        // human — including blocks we created (they typed into our paragraph).
        // Ownership is revoked on human touch: it's their text now.
        const humanChanged = blocks.filter(
          b => b.id && loopBaseline.get(b.id) !== b.markdown && b.markdown
        );
        for (const b of humanChanged) ownBlocks.delete(b.id as string);
        const changedIds = humanChanged.map(b => b.id as string);
        loopBaseline = new Map(blocks.map(b => [b.id ?? '', b.markdown] as const));
        const activeBlockId = changedIds[changedIds.length - 1] ?? null;

        // Visible reaction FIRST — glide the caret next to where the human is
        // working before any model call, so Cogno always "looks" immediately.
        if (activeBlockId) {
          const hit = session.findBlock(activeBlockId);
          if (hit) {
            session.broadcastCursor(
              Math.min(hit.pos + hit.node.nodeSize, session.docEnd())
            );
          }
        }

        const { thought, ops: rawOps } = await quickThink({
          blocks,
          changedIds,
          activeBlockId,
          ownBlockIds: [...ownBlocks],
        });
        // HARD GUARD: what the human is typing RIGHT NOW is untouchable.
        // The reflex may append anywhere and revise/delete its OWN blocks.
        // Replacing an OLDER human block is allowed only while the human's
        // fresh text contains an explicit rewrite ask (訳して/直して/追加して…)
        // — that enables "この文章を英語に" without ever eating notes.
        const freshHuman = new Set(changedIds);
        const freshText = blocks
          .filter(b => b.id && freshHuman.has(b.id))
          .map(b => b.markdown)
          .join('\n');
        // A rewrite ask stays live for the whole engagement, so multi-round
        // sweeps (translate block by block) keep going after the ask scrolls
        // out of the fresh diff.
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
          log(`${tag} reflex: blocked ${rawOps.length - ops.length} op(s) targeting human text`);
        }
        // All ops blocked = usually round-1 freshness (seed just arrived);
        // give the model a couple of retry rounds before disengaging — the
        // same op is legal once the text is no longer "just typed".
        if (rawOps.length > 0 && ops.length === 0 && blockedRetries < 3) {
          blockedRetries++;
          idleRounds = 0;
          lastLoopHash = ''; // force a fresh look next round
          await sleep(FAST_LOOP_GAP_MS + 400);
          continue;
        }
        if (ops.length > 0) {
          log(`${tag} reflex: ${thought} → ${ops.length} op(s)`);
          const before = new Map(
            session.blocks().map(b => [b.id ?? '', b.markdown] as const)
          );
          session.setTyping(true);
          await executeOps(session, ops);
          session.setTyping(false);
          trackOwn(before, ops, freshHuman);
          idleRounds = 0;
          // Our own edits are part of lastLoopHash next round via re-snapshot.
          lastLoopHash = '';
        } else {
          idleRounds++;
        }
        // The deep brain must not starve behind a chatty reflex loop.
        if (deepDue()) break;
        await sleep(FAST_LOOP_GAP_MS);
      }
    } catch (err) {
      log(`${tag} reflex failed:`, err instanceof Error ? err.message : err);
    } finally {
      // The caret stays on the note (parked out of the way) — Cogno is always
      // visibly in the room, not popping in and out.
      session.setTyping(false);
      session.parkCursor();
      // Reflex edits become part of the next deep diff — do NOT refresh the
      // shared baseline here, so the deep brain still sees what humans changed.
      busy = false;
      fastArmed = true;
    }
  };

  // Deep pass: burst settled. Full-document thinking + layout ownership.
  const deepAct = async () => {
    if (destroyed) return;
    if (busy) {
      // The reflex loop checks deepDue() and yields; retry shortly instead of
      // waiting for the next human keystroke.
      missedDeep = true;
      if (deepTimer) clearTimeout(deepTimer);
      deepTimer = setTimeout(() => void deepAct(), 1500);
      return;
    }
    deepDueAt = Infinity;
    busy = true;
    try {
      const { blocks, hash, changedIds } = snapshot();
      if (hash === lastHash) return;

      log(`${tag} thinking… (${blocks.length} blocks, changed: ${changedIds.join(', ') || '-'})`);
      const { thought, ops: rawOps } = await brain.think({
        blocks,
        changedIds,
        ownBlockIds: [...ownBlocks],
      });
      // GUARD: the human's newest block (their latest message/instruction)
      // may never be deleted or rewritten — even by the deep brain.
      const newestHuman = changedIds[changedIds.length - 1];
      const ops = rawOps.filter(
        op =>
          op.action === 'append_after' ||
          op.blockId == null ||
          op.blockId !== newestHuman ||
          ownBlocks.has(op.blockId)
      );
      if (ops.length < rawOps.length) {
        log(`${tag} blocked ${rawOps.length - ops.length} op(s) on the human's newest block`);
      }
      log(`${tag} decision: ${thought} → ${ops.length} op(s)`);
      if (ops.length > 0) {
        const before = new Map(
          session.blocks().map(b => [b.id ?? '', b.markdown] as const)
        );
        session.setTyping(true);
        await executeOps(session, ops);
        trackOwn(before, ops, new Set(changedIds));
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
    deepDueAt = Date.now() + wait;
    deepTimer = setTimeout(() => void deepAct(), wait);
  };

  // Anticipation: the INSTANT a human's fresh text hints at a target ("図"
  // → the diagram), glide the caret there before any model call returns.
  // Pure heuristics — this is what makes Cogno feel like it's already moving.
  let lastAnticipate = 0;
  let lastAnticipateTarget = '';
  const anticipate = () => {
    if (busy || destroyed) return;
    const now = Date.now();
    if (now - lastAnticipate < 300) return; // sub-second reaction, throttled
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
        // Orient toward the top — translation sweeps start there.
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

  session.ydoc.on('update', (_update: Uint8Array, origin: unknown) => {
    if (!ready || destroyed) return;
    // Only remote (human) changes wake the agent; our own edits carry the
    // y-sync binding as origin, remote ones carry the provider.
    if (origin !== session.provider) return;

    anticipate();

    // Leading edge: first keystroke of a burst engages the reflex work loop
    // (which then keeps cycling on its own while the human writes).
    if (fastArmed) {
      fastArmed = false;
      if (fastTimer) clearTimeout(fastTimer);
      fastTimer = setTimeout(() => void fastLoop(), FAST_DELAY_MS);
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
    const pong = await pingBrain();
    log(
      `brain OK (deep=${brainProvider()}:${brainModel()} fast=${fastProvider()}:${fastModel()}, reply="${pong}")`
    );
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
