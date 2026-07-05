/**
 * Framework-agnostic schemas for @-member and #-note mentions, including their
 * `@tiptap/markdown` round-trip (the bracket form legacy descriptions use:
 * `[@ id="..." label="..." workspaceMemberId="..."]` / `[# ... noteId="..."]`).
 *
 * The editor's interactive Mention extensions (suggestion popups) reuse these
 * markdown handlers; the headless converter registers these schemas so legacy
 * mention syntax parses into real nodes (backward compatibility).
 *
 * The markdown fields (`markdownName` / `markdownTokenizer` / `parseMarkdown` /
 * `renderMarkdown`) are spread in because they aren't part of the base
 * `@tiptap/core` NodeConfig type (they're read by `@tiptap/markdown`).
 */
import { Node, mergeAttributes } from '@tiptap/core';
import type { MarkdownJSONNode } from './markdown';

const MEMBER_RE =
  /^\[@\s+id="([^"]*)"\s+label="([^"]*)"(?:\s+workspaceMemberId="([^"]*)")?\]/;
const NOTE_RE =
  /^\[#\s+id="([^"]*)"\s+label="([^"]*)"(?:\s+noteId="([^"]*)")?\]/;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MarkedToken = any;

// The bracket form quotes attributes (`label="…"`) and the tokenizer regexes
// capture `[^"]*`, so a literal `"` in a label/id (e.g. `Dwayne "The Rock"`)
// would truncate the value and drop the mention. Encode `&`/`"` as HTML
// entities on render and decode on parse so any value round-trips.
function escapeMentionAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function unescapeMentionAttr(value: string): string {
  return value.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
}

export const mentionMarkdown = {
  markdownName: 'mention',
  markdownTokenizer: {
    name: 'mention',
    level: 'inline' as const,
    start(src: string) {
      const i = src.indexOf('[@');
      return i < 0 ? src.length : i;
    },
    tokenize(src: string) {
      const m = MEMBER_RE.exec(src);
      if (!m) return undefined;
      return {
        type: 'mention',
        raw: m[0],
        id: m[1],
        label: m[2],
        workspaceMemberId: m[3] || null,
      };
    },
  },
  parseMarkdown(token: MarkedToken) {
    return {
      type: 'mention',
      attrs: {
        id: unescapeMentionAttr(String(token.id ?? '')),
        label: unescapeMentionAttr(String(token.label ?? '')),
        workspaceMemberId: token.workspaceMemberId
          ? Number(token.workspaceMemberId)
          : null,
      },
    };
  },
  renderMarkdown(node: MarkdownJSONNode) {
    const a = node.attrs ?? {};
    let s = `[@ id="${escapeMentionAttr(String(a.id ?? ''))}" label="${escapeMentionAttr(String(a.label ?? ''))}"`;
    if (a.workspaceMemberId) s += ` workspaceMemberId="${a.workspaceMemberId}"`;
    return s + ']';
  },
};

export const Mention = Node.create({
  name: 'mention',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: e => e.getAttribute('data-id'),
        renderHTML: a => (a.id ? { 'data-id': String(a.id) } : {}),
      },
      label: {
        default: null,
        parseHTML: e => e.getAttribute('data-label'),
        renderHTML: a => (a.label ? { 'data-label': String(a.label) } : {}),
      },
      workspaceMemberId: {
        default: null,
        parseHTML: e => {
          const v = e.getAttribute('data-workspace-member-id');
          return v ? Number(v) : null;
        },
        renderHTML: a =>
          a.workspaceMemberId
            ? { 'data-workspace-member-id': String(a.workspaceMemberId) }
            : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="mention"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes({ 'data-type': 'mention' }, HTMLAttributes),
      `@${HTMLAttributes['data-label'] || ''}`,
    ];
  },

  ...mentionMarkdown,
});

export const noteMentionMarkdown = {
  markdownName: 'noteMention',
  markdownTokenizer: {
    name: 'noteMention',
    level: 'inline' as const,
    start(src: string) {
      const i = src.indexOf('[#');
      return i < 0 ? src.length : i;
    },
    tokenize(src: string) {
      const m = NOTE_RE.exec(src);
      if (!m) return undefined;
      return {
        type: 'noteMention',
        raw: m[0],
        id: m[1],
        label: m[2],
        noteId: m[3] || null,
      };
    },
  },
  parseMarkdown(token: MarkedToken) {
    return {
      type: 'noteMention',
      attrs: {
        id: unescapeMentionAttr(String(token.id ?? '')),
        label: unescapeMentionAttr(String(token.label ?? '')),
        noteId: token.noteId ? Number(token.noteId) : null,
      },
    };
  },
  renderMarkdown(node: MarkdownJSONNode) {
    const a = node.attrs ?? {};
    let s = `[# id="${escapeMentionAttr(String(a.id ?? ''))}" label="${escapeMentionAttr(String(a.label ?? ''))}"`;
    if (a.noteId) s += ` noteId="${a.noteId}"`;
    return s + ']';
  },
};

export const NoteMention = Node.create({
  name: 'noteMention',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: e => e.getAttribute('data-id'),
        renderHTML: a => (a.id ? { 'data-id': String(a.id) } : {}),
      },
      label: {
        default: null,
        parseHTML: e => e.getAttribute('data-label'),
        renderHTML: a => (a.label ? { 'data-label': String(a.label) } : {}),
      },
      noteId: {
        default: null,
        parseHTML: e => {
          const v = e.getAttribute('data-note-id');
          return v ? Number(v) : null;
        },
        renderHTML: a => (a.noteId ? { 'data-note-id': String(a.noteId) } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="noteMention"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes({ 'data-type': 'noteMention' }, HTMLAttributes),
      `#${HTMLAttributes['data-label'] || ''}`,
    ];
  },

  ...noteMentionMarkdown,
});
