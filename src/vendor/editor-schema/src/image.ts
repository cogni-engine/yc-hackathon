/**
 * Shared inline image schema. Extends the standard image with task-attachment
 * attributes and a `@tiptap/markdown` round-trip for the legacy
 * `cogno-task-attachment://<id>[?file=<fid>]` URL scheme: it maps that scheme to
 * `data-attachment-id` / `data-file-id` (which the editor resolves to a signed
 * URL), instead of leaving it as a broken `src`. Remote `![alt](https://…)`
 * images pass through unchanged.
 */
import Image from '@tiptap/extension-image';
import { escapeMarkdownAltText, type MarkdownJSONNode } from './markdown';

const ATTACHMENT_RE = /^cogno-task-attachment:\/\/(\d+)(?:\?file=(\d+))?$/;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MarkedToken = any;

// Markdown round-trip for the image node. Spread into the extend config because
// `markdownName`/`parseMarkdown`/`renderMarkdown` are @tiptap/markdown fields not
// present in the base Image NodeConfig type.
export const imageMarkdown = {
  markdownName: 'image',
  parseMarkdown(token: MarkedToken) {
    const href = String(token.href ?? '');
    const alt = token.text ?? token.title ?? null;
    const m = ATTACHMENT_RE.exec(href);
    if (m) {
      return {
        type: 'image',
        attrs: {
          'data-attachment-id': m[1],
          'data-file-id': m[2] ?? null,
          alt,
        },
      };
    }
    return { type: 'image', attrs: { src: href, alt } };
  },
  renderMarkdown(node: MarkdownJSONNode) {
    const a = node.attrs ?? {};
    // Escape `]`/`\` so an alt containing a bracket (e.g. "before ] after")
    // round-trips instead of truncating the alt and leaking the URL as text.
    const alt = escapeMarkdownAltText(String(a.alt ?? ''));
    const attachmentId = a['data-attachment-id'];
    if (attachmentId) {
      const file = a['data-file-id'] ? `?file=${a['data-file-id']}` : '';
      return `![${alt}](cogno-task-attachment://${attachmentId}${file})`;
    }
    return `![${alt}](${a.src ?? ''})`;
  },
};

export const TaskImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-attachment-id': {
        default: null,
        parseHTML: e => e.getAttribute('data-attachment-id'),
        renderHTML: a =>
          a['data-attachment-id']
            ? { 'data-attachment-id': String(a['data-attachment-id']) }
            : {},
      },
      'data-file-id': {
        default: null,
        parseHTML: e => e.getAttribute('data-file-id'),
        renderHTML: a =>
          a['data-file-id']
            ? { 'data-file-id': String(a['data-file-id']) }
            : {},
      },
    };
  },
  ...imageMarkdown,
});
