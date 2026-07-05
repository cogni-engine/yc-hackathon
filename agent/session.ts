import WebSocket from 'ws';
import * as Y from 'yjs';
import {
  HocuspocusProvider,
  HocuspocusProviderWebsocket,
} from '@hocuspocus/provider';
import { Editor } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import type { Node as PMNode } from '@tiptap/pm/model';
import {
  ySyncPluginKey,
  absolutePositionToRelativePosition,
  relativePositionToAbsolutePosition,
} from '@tiptap/y-tiptap';
import { buildAgentExtensions } from './schema';

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const jitter = (base: number, spread: number) =>
  base + Math.floor(Math.random() * spread);

export interface SessionOptions {
  url: string;
  /** Full Hocuspocus document name, e.g. `note:12` or `canvas:main`. */
  docName: string;
  /** Presence identity — what humans see on the caret label. */
  name: string;
  color: string;
}

export interface BlockSnapshot {
  id: string | null;
  type: string;
  markdown: string;
}

/**
 * A realtime collaborator session: connects to the Hocuspocus room as a
 * regular WebSocket client (indistinguishable from a browser tab) and drives
 * a headless TipTap editor bound to the shared Y.Doc.
 *
 * - Document edits go through `editor.commands` / ProseMirror transactions —
 *   always schema-safe, same code path as human edits.
 * - Presence (caret + name label) is broadcast through the same y-protocols
 *   awareness the browser's CollaborationCaret reads: `user` {name, color} and
 *   `cursor` {anchor, head} as Y relative positions. Zero frontend changes.
 */
export class AgentSession {
  readonly ydoc: Y.Doc;
  provider!: HocuspocusProvider;
  editor!: Editor;
  private readonly opts: SessionOptions;
  /** Resolves once the initial server sync finished. */
  synced!: Promise<void>;

  constructor(opts: SessionOptions) {
    this.opts = opts;
    this.ydoc = new Y.Doc();
  }

  connect(): Promise<void> {
    let resolveSynced!: () => void;
    this.synced = new Promise<void>(r => (resolveSynced = r));

    // Node has no browser WebSocket wired into Hocuspocus — use `ws`.
    const websocketProvider = new HocuspocusProviderWebsocket({
      url: this.opts.url,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      WebSocketPolyfill: WebSocket as any,
    });

    this.provider = new HocuspocusProvider({
      websocketProvider,
      name: this.opts.docName,
      document: this.ydoc,
      forceSyncInterval: 3000,
      onSynced: () => resolveSynced(),
    });

    // The headless editor. Element lives in jsdom; never painted.
    this.editor = new Editor({
      element: document.createElement('div'),
      extensions: buildAgentExtensions(this.ydoc),
      editable: true,
    });

    this.setPresence();
    // Re-announce on reconnect (awareness state is per-connection).
    this.provider.on('connect', () => this.setPresence());

    return this.synced;
  }

  destroy(): void {
    this.clearCursor();
    this.editor?.destroy();
    this.provider?.destroy();
  }

  private typing = false;

  private setPresence(): void {
    this.provider.setAwarenessField('user', {
      name: this.opts.name,
      color: this.opts.color,
      // Frontend caret renderer: AI caret blinks while idle, solid while
      // typing — the "resident collaborator" tell.
      ai: true,
      typing: this.typing,
    });
  }

  /** Toggle the visible typing state (idle AI caret blinks). */
  setTyping(on: boolean): void {
    if (this.typing === on) return;
    this.typing = on;
    this.setPresence();
  }

  private focusToken = 0;

  /**
   * Highlight the block the AI is working on (frontend draws a colored ring
   * via AiFocusExtension). state 'done' auto-clears after a short fade.
   */
  setFocus(blockId: string | null, state: 'editing' | 'done' = 'editing'): void {
    const token = ++this.focusToken;
    this.provider.setAwarenessField(
      'aiFocus',
      blockId ? { blockId, state, color: this.opts.color } : null
    );
    if (blockId && state === 'done') {
      setTimeout(() => {
        if (this.focusToken === token) {
          this.provider.setAwarenessField('aiFocus', null);
        }
      }, 2000);
    }
  }

  /** blockId of the top-level block containing `pos`, if any. */
  blockIdAt(pos: number): string | null {
    let found: string | null = null;
    this.editor.state.doc.forEach((node, offset) => {
      if (found) return;
      if (pos >= offset && pos <= offset + node.nodeSize) {
        found = (node.attrs?.blockId as string | undefined) ?? null;
      }
    });
    return found;
  }

  // ---------------------------------------------------------------- reading

  /** Whole document as markdown (same serializer as the browser editor). */
  markdown(): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const manager = (this.editor.storage as any)?.markdown?.manager;
    if (!manager) return this.editor.getText();
    try {
      return manager.serialize(this.editor.getJSON()) ?? '';
    } catch {
      return this.editor.getText();
    }
  }

  /** Top-level blocks with their blockIds — the LLM's addressing scheme. */
  blocks(): BlockSnapshot[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const manager = (this.editor.storage as any)?.markdown?.manager;
    const out: BlockSnapshot[] = [];
    this.editor.state.doc.forEach(node => {
      let md = '';
      try {
        md = manager
          ? manager.serialize({ type: 'doc', content: [node.toJSON()] })
          : node.textContent;
      } catch {
        md = node.textContent;
      }
      out.push({
        id: (node.attrs?.blockId as string | undefined) ?? null,
        type: node.type.name,
        markdown: (md ?? '').trim(),
      });
    });
    return out;
  }

  /** Locate a block by blockId. Positions are re-resolved before every op. */
  findBlock(blockId: string): { pos: number; node: PMNode } | null {
    let found: { pos: number; node: PMNode } | null = null;
    this.editor.state.doc.descendants((node, pos) => {
      if (found) return false;
      if (node.attrs?.blockId === blockId) {
        found = { pos, node };
        return false;
      }
      return true;
    });
    return found;
  }

  docEnd(): number {
    return this.editor.state.doc.content.size;
  }

  // ------------------------------------------------------------- presence

  private ystate() {
    return ySyncPluginKey.getState(this.editor.state) as
      | {
          type: Y.XmlFragment;
          binding?: { mapping: Map<unknown, unknown> };
        }
      | undefined;
  }

  private absToRel(pos: number): unknown | null {
    const ys = this.ystate();
    if (!ys?.binding) return null;
    try {
      return absolutePositionToRelativePosition(
        pos,
        ys.type,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ys.binding.mapping as any
      );
    } catch {
      return null;
    }
  }

  private relToAbs(rel: unknown): number | null {
    const ys = this.ystate();
    if (!ys?.binding) return null;
    try {
      return relativePositionToAbsolutePosition(
        this.ydoc,
        ys.type,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rel as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ys.binding.mapping as any
      );
    } catch {
      return null;
    }
  }

  /**
   * Broadcast the AI caret. Same awareness shape CollaborationCaret publishes
   * for humans, so the browsers render it with the standard caret + label.
   */
  /** Where the caret last worked — the natural parking spot. */
  private lastWorkRel: unknown | null = null;

  broadcastCursor(anchor: number, head: number = anchor): void {
    const relAnchor = this.absToRel(anchor);
    const relHead = this.absToRel(head);
    if (!relAnchor || !relHead) return;
    this.lastWorkRel = relAnchor;
    this.provider.setAwarenessField('cursor', {
      anchor: relAnchor,
      head: relHead,
    });
  }

  /** Absolute positions of other clients' carets (from awareness). */
  private humanCursorPositions(): number[] {
    const out: number[] = [];
    const states = this.provider.awareness?.getStates();
    if (!states) return out;
    for (const [clientId, state] of states) {
      if (clientId === this.ydoc.clientID) continue;
      const cursor = (state as { cursor?: { anchor?: unknown } }).cursor;
      if (!cursor?.anchor) continue;
      try {
        const rel = Y.createRelativePositionFromJSON(cursor.anchor);
        const abs = this.relToAbs(rel);
        if (abs != null) out.push(abs);
      } catch {
        // ignore malformed cursors
      }
    }
    return out;
  }

  clearCursor(): void {
    this.provider.setAwarenessField('cursor', null);
  }

  /**
   * Rest the caret somewhere visible but OUT OF THE WAY: preferably where it
   * last worked, never on top of a human's caret (their native caret + ours
   * overlapping looks broken).
   */
  parkCursor(): void {
    const humans = this.humanCursorPositions();
    const desired = (() => {
      if (this.lastWorkRel) {
        const abs = this.relToAbs(this.lastWorkRel);
        if (abs != null) return Math.min(abs, this.docEnd());
      }
      return this.docEnd();
    })();

    const tooClose = (pos: number) => humans.some(h => Math.abs(h - pos) < 4);
    if (!tooClose(desired)) {
      this.broadcastCursor(desired);
      return;
    }

    // Slide to the nearest top-level block boundary that keeps distance.
    const candidates: number[] = [];
    this.editor.state.doc.forEach((node, offset) => {
      candidates.push(offset + node.nodeSize - 1); // end of each block
    });
    const spot = candidates
      .filter(p => !tooClose(p))
      .sort((a, b) => Math.abs(a - desired) - Math.abs(b - desired))[0];
    this.broadcastCursor(spot ?? Math.max(1, desired - 6));
  }

  // ------------------------------------------------------ humanized editing

  /** Move the visible caret and let it settle — "reading before writing". */
  async moveCursorTo(pos: number, settleMs = 260): Promise<void> {
    const clamped = Math.max(0, Math.min(pos, this.docEnd()));
    const state = this.editor.state;
    // `near` resolves block boundaries (e.g. right after a code block) to the
    // closest valid text position instead of throwing.
    const sel = TextSelection.near(state.doc.resolve(clamped));
    this.editor.view.dispatch(state.tr.setSelection(sel));
    this.broadcastCursor(sel.from);
    await sleep(jitter(settleMs, 200));
  }

  /**
   * Type plain text character-by-character at the current cursor, caret
   * following along. Cursor is tracked as a Y relative position so concurrent
   * human edits elsewhere don't derail the insertion point.
   */
  async typeText(text: string, startPos: number): Promise<number> {
    let rel = this.absToRel(startPos);
    let lastAbs = startPos;
    let i = 0;
    while (i < text.length) {
      const chunkLen = Math.min(2 + Math.floor(Math.random() * 3), text.length - i);
      const chunk = text.slice(i, i + chunkLen);
      i += chunkLen;

      const abs = rel ? this.relToAbs(rel) : lastAbs;
      if (abs == null) break;

      const tr = this.editor.state.tr.insertText(chunk, abs);
      tr.setSelection(TextSelection.create(tr.doc, abs + chunk.length));
      this.editor.view.dispatch(tr);

      lastAbs = abs + chunk.length;
      rel = this.absToRel(lastAbs);
      this.broadcastCursor(lastAbs);
      await sleep(jitter(14, 24));
    }
    return lastAbs;
  }

  /**
   * Insert a markdown fragment at `pos` in one shot (used for structured
   * blocks — diagrams, tables, lists — where char-typing makes no sense).
   * Returns the position right after the inserted content.
   */
  insertMarkdownAt(pos: number, md: string): number {
    const before = this.editor.state.doc.content.size;
    const ok = this.editor
      .chain()
      .insertContentAt(pos, md, { contentType: 'markdown' })
      .run();
    if (!ok) return pos;
    const after = this.editor.state.doc.content.size;
    return pos + (after - before);
  }

  /** Insert a raw ProseMirror node (JSON) at `pos`; returns the end position. */
  insertNodeAt(pos: number, content: object): number {
    const before = this.editor.state.doc.content.size;
    const ok = this.editor.commands.insertContentAt(pos, content);
    if (!ok) return pos;
    return pos + (this.editor.state.doc.content.size - before);
  }

  /** End position of the last text character inside a block, or null. */
  private lastTextEnd(blockId: string): number | null {
    const hit = this.findBlock(blockId);
    if (!hit) return null;
    let end: number | null = null;
    hit.node.descendants((child, childPos) => {
      if (child.isText && child.text) {
        // childPos is relative to the block's content start (pos + 1).
        end = hit.pos + 1 + childPos + child.text.length;
      }
      return true;
    });
    return end;
  }

  /**
   * Delete a block the way a human holding Backspace does: caret at the end,
   * characters vanish one by one (accelerating like key-repeat), then the
   * empty shell goes. Blocks without text (images, embeds) get a brief
   * highlight instead — there is nothing to backspace through.
   */
  async deleteBlockBackwards(blockId: string): Promise<void> {
    const first = this.findBlock(blockId);
    if (!first) return;

    if (!first.node.textContent) {
      await this.selectAndDelete(first.pos, first.pos + first.node.nodeSize, 450);
      return;
    }

    // Mermaid diagrams die line-by-line (bottom-up), so watchers see nodes
    // disappear one at a time instead of the source garbling char-wise.
    if (
      first.node.type.name === 'codeBlock' &&
      first.node.attrs?.language === 'mermaid'
    ) {
      for (;;) {
        const cur = this.findBlock(blockId);
        if (!cur) return;
        const linesNow = cur.node.textContent.split('\n');
        if (linesNow.length <= 1) break;
        let off = 0;
        for (let i = 0; i < linesNow.length - 1; i++) off += linesNow[i].length + 1;
        const from = cur.pos + 1 + off - 1; // include the preceding newline
        const to = cur.pos + 1 + cur.node.content.size;
        const tr = this.editor.state.tr.delete(from, to);
        tr.setSelection(TextSelection.create(tr.doc, from));
        this.editor.view.dispatch(tr);
        this.broadcastCursor(from);
        await sleep(jitter(340, 220));
      }
      const shell = this.findBlock(blockId);
      if (shell) {
        this.editor.commands.deleteRange({
          from: shell.pos,
          to: shell.pos + shell.node.nodeSize,
        });
        this.broadcastCursor(Math.min(shell.pos, this.docEnd()));
      }
      return;
    }

    const totalChars = first.node.textContent.length;
    let delay = 90; // key-repeat: slow first strokes, then accelerate
    let deleted = 0;

    for (;;) {
      const hit = this.findBlock(blockId);
      if (!hit) return; // block vanished (e.g. concurrent human edit)
      if (!hit.node.textContent.length) break;

      const end = this.lastTextEnd(blockId);
      if (end == null) break;

      // Big blocks: after ~80 single chars switch to word-sized bites so the
      // whole deletion stays a few seconds, not half a minute.
      const bite =
        deleted > 80 || totalChars > 400
          ? Math.min(6, hit.node.textContent.length)
          : 1;
      const tr = this.editor.state.tr.delete(end - bite, end);
      tr.setSelection(TextSelection.create(tr.doc, end - bite));
      this.editor.view.dispatch(tr);
      deleted += bite;
      this.broadcastCursor(end - bite);

      await sleep(delay);
      delay = Math.max(14, delay - 9);
    }

    // Remove the now-empty shell (paragraph, list skeleton, …).
    const shell = this.findBlock(blockId);
    if (shell) {
      this.editor.commands.deleteRange({
        from: shell.pos,
        to: shell.pos + shell.node.nodeSize,
      });
      this.broadcastCursor(Math.min(shell.pos, this.docEnd()));
    }
  }

  /**
   * Build a ```mermaid block line by line, so watchers see the diagram grow
   * node-by-node (each complete line keeps the mermaid source valid, so the
   * live preview re-renders progressively).
   */
  async insertMermaidProgressive(pos: number, fence: string): Promise<number> {
    const lines = fence.trim().split('\n');
    const body =
      lines[0]?.startsWith('```') && lines[lines.length - 1]?.startsWith('```')
        ? lines.slice(1, -1)
        : lines;
    if (!body.length) return pos;

    const shellEnd = this.insertNodeAt(pos, {
      type: 'codeBlock',
      attrs: { language: 'mermaid' },
    });
    if (shellEnd === pos) return pos;
    const focusId = this.blockIdAt(pos);
    if (focusId) this.setFocus(focusId, 'editing');

    let cur = pos + 1; // inside the code block
    let rel = this.absToRel(cur);
    for (let i = 0; i < body.length; i++) {
      const abs = rel ? this.relToAbs(rel) : cur;
      if (abs == null) break;
      const text = (i > 0 ? '\n' : '') + body[i];
      const tr = this.editor.state.tr.insertText(text, abs);
      tr.setSelection(TextSelection.create(tr.doc, abs + text.length));
      this.editor.view.dispatch(tr);
      cur = abs + text.length;
      rel = this.absToRel(cur);
      this.broadcastCursor(cur);
      await sleep(jitter(320, 260));
    }
    const doneId = this.blockIdAt(Math.max(0, cur - 1));
    if (doneId) this.setFocus(doneId, 'done');
    return cur + 1; // past the code block's closing token
  }

  /**
   * Edit an existing mermaid block by LINE DIFF: unchanged lines stay, removed
   * lines vanish one by one (bottom-up), new lines are typed in (top-down) —
   * the "AI erases part of the diagram and redraws it" experience.
   */
  async editMermaidBlock(blockId: string, newFence: string): Promise<boolean> {
    const hit = this.findBlock(blockId);
    if (
      !hit ||
      hit.node.type.name !== 'codeBlock' ||
      hit.node.attrs?.language !== 'mermaid'
    ) {
      return false;
    }
    this.setFocus(blockId, 'editing');

    const fenceLines = newFence.trim().split('\n');
    const newBody =
      fenceLines[0]?.startsWith('```') &&
      fenceLines[fenceLines.length - 1]?.startsWith('```')
        ? fenceLines.slice(1, -1)
        : fenceLines;
    const oldBody = hit.node.textContent.split('\n');

    // Line-wise common prefix / suffix.
    let p = 0;
    while (p < oldBody.length && p < newBody.length && oldBody[p] === newBody[p]) p++;
    let s = 0;
    while (
      s < oldBody.length - p &&
      s < newBody.length - p &&
      oldBody[oldBody.length - 1 - s] === newBody[newBody.length - 1 - s]
    ) {
      s++;
    }
    const removed = oldBody.length - p - s;
    const added = newBody.slice(p, newBody.length - s);
    if (removed === 0 && added.length === 0) {
      this.setFocus(blockId, 'done');
      return true;
    }

    /** Absolute [from,to] of line k inside the (re-resolved) block. */
    const lineRange = (k: number): { from: number; to: number } | null => {
      const cur = this.findBlock(blockId);
      if (!cur) return null;
      const linesNow = cur.node.textContent.split('\n');
      if (k >= linesNow.length) return null;
      let off = 0;
      for (let i = 0; i < k; i++) off += linesNow[i].length + 1;
      const from = cur.pos + 1 + off;
      const to = from + linesNow[k].length;
      return { from, to };
    };

    // Remove old lines bottom-up, one line per beat (diagram shrinks visibly).
    for (let i = removed - 1; i >= 0; i--) {
      const range = lineRange(p + i);
      if (!range) break;
      // Also consume the separating newline (before the line, or after when
      // it is the first line).
      const cur = this.findBlock(blockId)!;
      const hasPrev = p + i > 0;
      const from = hasPrev ? range.from - 1 : range.from;
      const to = !hasPrev && cur.node.textContent.split('\n').length > 1 ? range.to + 1 : range.to;
      const tr = this.editor.state.tr.delete(from, to);
      tr.setSelection(TextSelection.create(tr.doc, Math.max(from, cur.pos + 1)));
      this.editor.view.dispatch(tr);
      this.broadcastCursor(from);
      await sleep(jitter(360, 240));
    }

    // Type new lines top-down.
    for (let i = 0; i < added.length; i++) {
      const cur = this.findBlock(blockId);
      if (!cur) break;
      const linesNow = cur.node.textContent.split('\n');
      const insertLineIdx = p + i;
      let off = 0;
      for (let k = 0; k < Math.min(insertLineIdx, linesNow.length); k++) {
        off += linesNow[k].length + 1;
      }
      const blockEmpty = cur.node.textContent.length === 0;
      const atEnd = insertLineIdx >= linesNow.length;
      const base = cur.pos + 1 + Math.min(off, cur.node.content.size);
      const text = blockEmpty
        ? added[i]
        : atEnd
          ? '\n' + added[i]
          : added[i] + '\n';
      const insertAt = atEnd ? cur.pos + 1 + cur.node.content.size : base;
      const tr = this.editor.state.tr.insertText(text, insertAt);
      tr.setSelection(TextSelection.create(tr.doc, insertAt + text.length));
      this.editor.view.dispatch(tr);
      this.broadcastCursor(insertAt + text.length);
      await sleep(jitter(320, 260));
    }

    this.setFocus(blockId, 'done');
    return true;
  }

  /**
   * Select a range so humans see the colored selection highlight, hold it a
   * beat, then delete — the visual grammar of a human select-and-backspace.
   */
  async selectAndDelete(from: number, to: number, holdMs = 650): Promise<void> {
    const state = this.editor.state;
    const clampedTo = Math.min(to, state.doc.content.size);
    const sel = TextSelection.between(
      state.doc.resolve(from),
      state.doc.resolve(clampedTo)
    );
    this.editor.view.dispatch(state.tr.setSelection(sel));
    this.broadcastCursor(from, clampedTo);
    await sleep(jitter(holdMs, 250));
    this.editor.commands.deleteRange({ from, to: clampedTo });
    this.broadcastCursor(Math.min(from, this.docEnd()));
  }
}

export { sleep, jitter };
