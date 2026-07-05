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
  room: string;
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

  /** Last caret we broadcast (absolute positions) — re-announced on heartbeat. */
  private lastCursor: { anchor: number; head: number } | null = null;
  /** Keeps our awareness fresh so idle presence isn't pruned (~30s timeout). */
  private heartbeat: ReturnType<typeof setInterval> | null = null;

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
      name: `canvas:${this.opts.room}`,
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
    // Keep presence alive while idle: y-protocols prunes any awareness state
    // not refreshed within ~30s, and an idle agent sends no updates. This
    // re-announces our identity + parked caret so Cogno stays visible between
    // edits, the way a human teammate's cursor lingers where they stopped.
    this.startHeartbeat();

    return this.synced;
  }

  destroy(): void {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
    this.clearCursor();
    this.editor?.destroy();
    this.provider?.destroy();
  }

  private setPresence(): void {
    this.provider.setAwarenessField('user', {
      name: this.opts.name,
      color: this.opts.color,
    });
  }

  /**
   * Refresh the whole local awareness state every 15s (well inside the ~30s
   * prune window). Re-resolving the caret from stored absolute positions keeps
   * it correct even if the document shifted under us while we were idle.
   */
  private startHeartbeat(): void {
    if (this.heartbeat) return;
    this.heartbeat = setInterval(() => {
      this.setPresence();
      if (this.lastCursor) {
        this.broadcastCursor(this.lastCursor.anchor, this.lastCursor.head);
      }
    }, 15000);
    // Don't hold the process open just for the heartbeat.
    this.heartbeat.unref?.();
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
  broadcastCursor(anchor: number, head: number = anchor): void {
    const relAnchor = this.absToRel(anchor);
    const relHead = this.absToRel(head);
    if (!relAnchor || !relHead) return;
    this.lastCursor = { anchor, head };
    this.provider.setAwarenessField('cursor', {
      anchor: relAnchor,
      head: relHead,
    });
  }

  /**
   * Remove the caret entirely. Used on shutdown — NOT between edits: an idle
   * agent keeps its caret parked where it stopped, like a human collaborator.
   */
  clearCursor(): void {
    this.lastCursor = null;
    this.provider.setAwarenessField('cursor', null);
  }

  // ------------------------------------------------------ humanized editing

  /** Move the visible caret and let it settle — "reading before writing". */
  async moveCursorTo(pos: number, settleMs = 400): Promise<void> {
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
      const chunkLen = Math.min(1 + Math.floor(Math.random() * 3), text.length - i);
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
      await sleep(jitter(24, 46));
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
