/**
 * Framework-agnostic schema for the link-card node — an atom block that renders
 * a URL (e.g. a PR link) as a clickable card instead of a plain inline link.
 * Parse-side only — the editor extends this with a React node view (see
 * LinkCardBlock.tsx). The headless markdown→Y.Doc converter imports this as-is.
 * Its markdown form is a raw-HTML `<div data-type="link-card" …>` that round-trips
 * through `parseHTML`, mirroring the document-embed node.
 */
import { Node, mergeAttributes } from '@tiptap/core';
import { escapeHtmlAttribute, type MarkdownJSONNode } from './markdown';

export const LinkCard = Node.create({
  name: 'linkCard',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      url: {
        default: null,
        parseHTML: element => element.getAttribute('data-url'),
        renderHTML: attributes =>
          attributes.url ? { 'data-url': String(attributes.url) } : {},
      },
      title: {
        default: null,
        parseHTML: element => element.getAttribute('data-title'),
        renderHTML: attributes =>
          attributes.title ? { 'data-title': String(attributes.title) } : {},
      },
      description: {
        default: null,
        parseHTML: element => element.getAttribute('data-description'),
        renderHTML: attributes =>
          attributes.description
            ? { 'data-description': String(attributes.description) }
            : {},
      },
      image: {
        default: null,
        parseHTML: element => element.getAttribute('data-image'),
        renderHTML: attributes =>
          attributes.image ? { 'data-image': String(attributes.image) } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="link-card"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'link-card' })];
  },

  // Markdown form: a raw-HTML div carrying the URL + optional card metadata.
  renderMarkdown(node: MarkdownJSONNode) {
    const attrs = node.attrs ?? {};
    if (!attrs.url) return '';
    const parts = [
      'data-type="link-card"',
      `data-url="${escapeHtmlAttribute(String(attrs.url))}"`,
    ];
    if (attrs.title)
      parts.push(`data-title="${escapeHtmlAttribute(String(attrs.title))}"`);
    if (attrs.description)
      parts.push(
        `data-description="${escapeHtmlAttribute(String(attrs.description))}"`
      );
    if (attrs.image)
      parts.push(`data-image="${escapeHtmlAttribute(String(attrs.image))}"`);
    return `<div ${parts.join(' ')}></div>`;
  },
});
