/**
 * Framework-agnostic schema for the Excalidraw drawing node. Parse-side only —
 * the editor extends this with a React node view and the insert command (see
 * ExcalidrawBlock.tsx). The whole scene is stored as a JSON string in the
 * `scene` attribute. The headless converter imports this as-is.
 */
import { Node, mergeAttributes } from '@tiptap/core';
import { escapeHtmlAttribute, type MarkdownJSONNode } from './markdown';

export const ExcalidrawBlock = Node.create({
  name: 'excalidraw',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      scene: {
        default: null,
        parseHTML: element => element.getAttribute('data-scene'),
        renderHTML: attributes =>
          attributes.scene ? { 'data-scene': attributes.scene as string } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="excalidraw"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'excalidraw' }),
    ];
  },

  // Markdown form: a raw-HTML div carrying the scene JSON (round-trippable).
  renderMarkdown(node: MarkdownJSONNode) {
    const scene = node.attrs?.scene;
    return scene
      ? `<div data-type="excalidraw" data-scene="${escapeHtmlAttribute(String(scene))}"></div>`
      : '<div data-type="excalidraw"></div>';
  },
});
