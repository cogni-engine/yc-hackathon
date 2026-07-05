/**
 * Framework-agnostic schema for the inline document-embed node (PDF / Office /
 * any attachment). Parse-side only — the editor extends this with options
 * (`resolveDownloadUrl`), a React node view, `renderMarkdown` and the insert
 * command (see DocumentEmbedBlock.tsx). Only attachment metadata is stored; the
 * signed URL is resolved on demand. The headless converter imports this as-is.
 */
import { Node, mergeAttributes } from '@tiptap/core';
import { escapeHtmlAttribute, type MarkdownJSONNode } from './markdown';

export const DocumentEmbed = Node.create({
  name: 'documentEmbed',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      attachmentId: {
        default: null,
        parseHTML: element => element.getAttribute('data-attachment-id'),
        renderHTML: attributes =>
          attributes.attachmentId
            ? { 'data-attachment-id': String(attributes.attachmentId) }
            : {},
      },
      fileId: {
        default: null,
        parseHTML: element => element.getAttribute('data-file-id'),
        renderHTML: attributes =>
          attributes.fileId
            ? { 'data-file-id': String(attributes.fileId) }
            : {},
      },
      filename: {
        default: null,
        parseHTML: element => element.getAttribute('data-filename'),
        renderHTML: attributes =>
          attributes.filename
            ? { 'data-filename': String(attributes.filename) }
            : {},
      },
      mimeType: {
        default: null,
        parseHTML: element => element.getAttribute('data-mime-type'),
        renderHTML: attributes =>
          attributes.mimeType
            ? { 'data-mime-type': String(attributes.mimeType) }
            : {},
      },
      fileSize: {
        default: null,
        parseHTML: element => element.getAttribute('data-file-size'),
        renderHTML: attributes =>
          attributes.fileSize
            ? { 'data-file-size': String(attributes.fileSize) }
            : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="document-embed"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'document-embed' }),
    ];
  },

  // Markdown form: a raw-HTML div carrying only attachment metadata.
  renderMarkdown(node: MarkdownJSONNode) {
    const attrs = node.attrs ?? {};
    if (!attrs.attachmentId) return '';
    const parts = [
      'data-type="document-embed"',
      `data-attachment-id="${escapeHtmlAttribute(String(attrs.attachmentId))}"`,
    ];
    if (attrs.fileId)
      parts.push(`data-file-id="${escapeHtmlAttribute(String(attrs.fileId))}"`);
    if (attrs.filename)
      parts.push(
        `data-filename="${escapeHtmlAttribute(String(attrs.filename))}"`
      );
    if (attrs.mimeType)
      parts.push(
        `data-mime-type="${escapeHtmlAttribute(String(attrs.mimeType))}"`
      );
    if (attrs.fileSize)
      parts.push(
        `data-file-size="${escapeHtmlAttribute(String(attrs.fileSize))}"`
      );
    return `<div ${parts.join(' ')}></div>`;
  },
});
